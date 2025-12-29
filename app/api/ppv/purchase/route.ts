import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma, executeWithReconnect } from "@/lib/prisma"
import { paymentRateLimit } from "@/lib/rate-limit"
import {
  getBestProviderForCountry,
  normalizeCountry,
  createPaystackPayment,
  createMpesaPayment,
  type PaymentProvider,
} from "@/lib/payments"
import { resolvePaystackCurrency, type PaystackCurrency } from "@/lib/payments/currency"
import { calculateTax } from "@/lib/tax/tax-engine"
import { toUnifiedPayment } from "@/lib/payments/unified-api"
import {
  calculatePlatformFee,
  calculateCreatorPayout,
} from "@/app/config/platform"

export async function POST(req: NextRequest) {
  try {
    // Rate limiting: 10 requests per minute per user/IP
    const rateLimitResult = await paymentRateLimit(req)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `Too many payment requests. Please try again after ${rateLimitResult.retryAfter} seconds.`,
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfter || 60),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
          },
        }
      )
    }

    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "fan") {
      return NextResponse.json(
        { error: "Only fans can purchase PPV posts" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { postId, country, phone } = body

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      )
    }

    const post = await executeWithReconnect(() =>
      prisma.post.findUnique({
        where: { id: postId },
        include: {
          creator: {
            include: { creatorProfile: true },
          },
        },
      })
    )

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    if (!post.isPPV || !post.ppvPrice) {
      return NextResponse.json(
        { error: "This post is not available for purchase" },
        { status: 400 }
      )
    }

    const subscription = await executeWithReconnect(() =>
      prisma.subscription.findFirst({
        where: {
          fanId: session.user.id,
          creatorId: post.creatorId,
          status: "active",
        },
      })
    )

    if (subscription) {
      return NextResponse.json({
        success: true,
        unlocked: true,
        reason: "subscription",
        message: "You have an active subscription, content is unlocked",
      })
    }

    const existingPurchase = await executeWithReconnect(() =>
      prisma.pPVPurchase.findUnique({
        where: {
          fanId_postId: {
            fanId: session.user.id,
            postId: postId,
          },
        },
      })
    )

    if (existingPurchase) {
      return NextResponse.json({
        success: true,
        unlocked: true,
        reason: "already_purchased",
        message: "You have already purchased this content",
      })
    }

    const detectedCountry = country || "US"
    const normalizedCountry = normalizeCountry(detectedCountry)

    const selectedProvider: PaymentProvider = "PAYSTACK"
    
    // CRITICAL: Always use KES for Kenya-based Paystack accounts
    const finalCurrency: PaystackCurrency = "KES"

    // Convert post price to KES
    const postCurrency = post.ppvCurrency || "USD"
    const priceInPostCurrency = post.ppvPrice / 100
    // Simplified conversion (in production use real rates)
    // Approximate rate: 1 USD ≈ 130 KES
    const convertedPrice = postCurrency === "USD"
      ? priceInPostCurrency * 130
      : priceInPostCurrency * (postCurrency === "KES" ? 1 : postCurrency === "NGN" ? 130/1500 : postCurrency === "GHS" ? 130/12 : postCurrency === "ZAR" ? 130/18.5 : 130)
    const priceInCents = Math.round(convertedPrice * 100)

    const taxCalculation = calculateTax(convertedPrice, normalizedCountry)
    const totalAmount = taxCalculation.totalAmount
    const totalAmountInCents = Math.round(totalAmount * 100)
    const platformFee = await calculatePlatformFee(totalAmountInCents)
    const creatorEarnings = await calculateCreatorPayout(totalAmountInCents)

    // Defensive logging
    console.info("[PPV_PURCHASE]", {
      userId: session.user.id,
      creatorId: post.creatorId,
      postId,
      currency: finalCurrency,
      provider: selectedProvider,
      amountInMinor: totalAmountInCents,
      platformFee,
      creatorEarnings,
      country: normalizedCountry,
    })

    const metadata = {
      userId: session.user.id,
      creatorId: post.creatorId,
      postId: postId,
      type: "ppv",
      countryCode: normalizedCountry,
      taxAmount: taxCalculation.taxAmount,
      taxRate: taxCalculation.taxRate,
      email: session.user.email || undefined,
      platformFee,
      creatorEarnings,
      paystackCurrency: finalCurrency, // Store resolved currency
    }

    let paymentResult: { reference: string; payment_url: string }

    if (phone && normalizedCountry === "KE") {
      paymentResult = await createMpesaPayment(
        totalAmount,
        phone,
        "MPESA_PAYSTACK",
        metadata
      )
    } else {
      paymentResult = await createPaystackPayment(
        totalAmount,
        session.user.email || "",
        finalCurrency,
        metadata
      )
    }

    if (!paymentResult.payment_url) {
      throw new Error(`PAYSTACK did not return a payment URL`)
    }

    const unifiedPayment = toUnifiedPayment({
      provider: selectedProvider,
      externalId: paymentResult.reference,
      amount: totalAmountInCents,
      currency: finalCurrency,
      status: "pending",
      userId: session.user.id,
      creatorId: post.creatorId,
      tierId: "", // PPV purchases don't have a tier
      countryCode: normalizedCountry,
      metadata: {
        postId: postId,
        type: "ppv",
        taxAmount: taxCalculation.taxAmount,
        taxRate: taxCalculation.taxRate,
        phone: phone || undefined,
        platformFee,
        creatorEarnings,
      },
    })

    const payment = await executeWithReconnect(() =>
      prisma.payment.create({
        data: {
          userId: session.user.id,
          creatorId: post.creatorId,
          tierName: "PPV",
          tierPrice: convertedPrice,
          provider: selectedProvider,
          reference: paymentResult.reference,
          amount: unifiedPayment.amount,
          currency: unifiedPayment.currency,
          status: "pending",
          type: "ppv",
          metadata: {
            ...unifiedPayment.metadata,
            type: "ppv",
            postId: postId,
          },
          platformFee,
          creatorEarnings,
        },
      })
    )

    await executeWithReconnect(() =>
      prisma.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          provider: selectedProvider,
          type: "ppv",
          reference: paymentResult.reference,
          externalId: paymentResult.reference,
          amount: unifiedPayment.amount,
          currency: unifiedPayment.currency,
          status: "pending",
          platformFee,
          creatorEarnings,
          metadata: {
            ...unifiedPayment.metadata,
            type: "ppv",
            postId: postId,
          },
        },
      })
    )

    return NextResponse.json({
      success: true,
      provider: selectedProvider,
      payment_url: paymentResult.payment_url,
      reference: paymentResult.reference,
      platformFee,
      creatorEarnings,
    })
  } catch (error: any) {
    console.error("PPV purchase error:", error)
    return NextResponse.json(
      { error: error.message || "Payment creation failed" },
      { status: 500 }
    )
  }
}


