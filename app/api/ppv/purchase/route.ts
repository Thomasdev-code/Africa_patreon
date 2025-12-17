import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma, executeWithReconnect } from "@/lib/prisma"
import {
  getBestProviderForCountry,
  getCurrencyForProvider,
  getCurrencyForCountry,
  convertPrice,
  normalizeCountry,
  isMobileMoney,
  createStripePayment,
  createPaystackPayment,
  createFlutterwavePayment,
  createMpesaPayment,
  type PaymentProvider,
} from "@/lib/payments"
import { convertCurrency } from "@/lib/payments/currency"
import { calculateTax } from "@/lib/tax/tax-engine"
import { toUnifiedPayment } from "@/lib/payments/unified-api"
import type { SupportedCurrency } from "@/lib/payments/currency"
import {
  calculatePlatformFee,
  calculateCreatorPayout,
} from "@/app/config/platform"

export async function POST(req: NextRequest) {
  try {
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
    const { postId, provider, country, phone } = body

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      )
    }

    // Get post details
    const post = await executeWithReconnect(() =>
      prisma.post.findUnique({
        where: { id: postId },
        include: {
          creator: {
            include: {
              creatorProfile: true,
            },
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

    // Check if user already has active subscription (auto-unlock, no payment needed)
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

    // Check if user already purchased
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

    // Detect country
    let detectedCountry = country || "US"
    const normalizedCountry = normalizeCountry(detectedCountry)

    // Select payment provider
    let selectedProvider: PaymentProvider
    if (!provider) {
      selectedProvider = getBestProviderForCountry(normalizedCountry)
    } else {
      const validProviders = [
        "STRIPE",
        "PAYSTACK",
        "FLUTTERWAVE",
        "MPESA_FLW",
        "MPESA_PAYSTACK",
      ]
      const normalizedProvider = provider.toUpperCase().trim()

      if (!validProviders.includes(normalizedProvider)) {
        return NextResponse.json(
          {
            error: `Invalid payment provider. Must be one of: ${validProviders.join(", ")}`,
          },
          { status: 400 }
        )
      }
      selectedProvider = normalizedProvider as PaymentProvider
    }

    // Determine currency
    let finalCurrency: SupportedCurrency
    const providerCurrency = getCurrencyForProvider(selectedProvider)
    const countryCurrency = getCurrencyForCountry(normalizedCountry)

    if (isMobileMoney(selectedProvider)) {
      finalCurrency = "KES"
    } else if (selectedProvider === "PAYSTACK") {
      finalCurrency = "NGN"
    } else if (selectedProvider === "FLUTTERWAVE") {
      const flutterwaveCurrencies: SupportedCurrency[] = ["KES", "NGN", "GHS", "ZAR", "USD"]
      finalCurrency = flutterwaveCurrencies.includes(countryCurrency) ? countryCurrency : providerCurrency
    } else {
      const stripeCurrencies: SupportedCurrency[] = ["USD", "EUR", "GBP", "CAD"]
      finalCurrency = stripeCurrencies.includes(countryCurrency) ? countryCurrency : providerCurrency
    }

    // Convert price from post currency to final currency
    // Assume post.ppvPrice is in cents, and post.ppvCurrency is the base currency
    const postCurrency = (post.ppvCurrency || "USD") as SupportedCurrency
    const priceInPostCurrency = post.ppvPrice / 100
    
    // Convert to USD first (for internal calculation)
    const priceUSD = postCurrency === "USD" 
      ? priceInPostCurrency
      : convertCurrency(priceInPostCurrency, postCurrency, "USD")
    
    // Convert from USD to target currency
    const convertedPrice = await convertPrice(priceUSD, finalCurrency)
    const priceInCents = Math.round(convertedPrice * 100)

    // Calculate tax
    const taxCalculation = calculateTax(convertedPrice, normalizedCountry)
    const totalAmount = taxCalculation.totalAmount
    const totalAmountInCents = Math.round(totalAmount * 100)
    const platformFee = calculatePlatformFee(totalAmountInCents)
    const creatorEarnings = calculateCreatorPayout(totalAmountInCents)

    // Create payment session
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
    }

    let paymentResult: { reference: string; payment_url: string }

    try {
      if (isMobileMoney(selectedProvider)) {
        if (!phone) {
          return NextResponse.json(
            { error: "Phone number is required for M-Pesa payments" },
            { status: 400 }
          )
        }

        if (selectedProvider === "MPESA_PAYSTACK") {
          paymentResult = await createMpesaPayment(
            totalAmount,
            phone,
            "MPESA_PAYSTACK",
            metadata
          )
        } else {
          paymentResult = await createMpesaPayment(
            totalAmount,
            phone,
            "MPESA_FLW",
            metadata
          )
        }
      } else if (selectedProvider === "STRIPE") {
        paymentResult = await createStripePayment(
          totalAmount,
          session.user.email || "",
          finalCurrency,
          metadata
        )
      } else if (selectedProvider === "PAYSTACK") {
        paymentResult = await createPaystackPayment(
          totalAmount,
          session.user.email || "",
          finalCurrency,
          metadata
        )
      } else if (selectedProvider === "FLUTTERWAVE") {
        paymentResult = await createFlutterwavePayment(
          totalAmount,
          session.user.email || "",
          finalCurrency,
          metadata
        )
      } else {
        throw new Error(`Unsupported payment provider: ${selectedProvider}`)
      }

      if (!paymentResult.payment_url) {
        throw new Error(`${selectedProvider} did not return a payment URL`)
      }
    } catch (error: any) {
      console.error(`PPV payment creation failed for ${selectedProvider}:`, error)
      return NextResponse.json(
        {
          error: `Payment creation failed: ${error.message}`,
          provider: selectedProvider,
        },
        { status: 500 }
      )
    }

    // Create payment record
    const unifiedPayment = toUnifiedPayment({
      provider: selectedProvider,
      externalId: paymentResult.reference,
      amount: totalAmountInCents,
      currency: finalCurrency,
      status: "pending",
      userId: session.user.id,
      creatorId: post.creatorId,
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
          tierName: "PPV", // Special tier name for PPV
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

    // Create payment transaction
    await executeWithReconnect(() =>
      prisma.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          provider: selectedProvider,
          type: "payment",
          reference: paymentResult.reference,
          externalId: paymentResult.reference,
          amount: unifiedPayment.amount,
          currency: unifiedPayment.currency,
          status: "pending",
          type: "ppv",
          platformFee,
          creatorEarnings,
          platformFee,
          creatorEarnings,
          taxAmount: unifiedPayment.taxAmount,
          taxRate: unifiedPayment.taxRate,
          countryCode: unifiedPayment.countryCode,
          metadata: unifiedPayment.metadata,
        },
      })
    )

    // Create pending PPV purchase (will be confirmed via webhook)
    await executeWithReconnect(() =>
      prisma.pPVPurchase.create({
        data: {
          postId: postId,
          fanId: session.user.id,
          pricePaid: priceInCents,
          provider: selectedProvider,
          currency: finalCurrency,
          paymentId: payment.id,
        },
      })
    )

    return NextResponse.json({
      success: true,
      provider: selectedProvider,
      currency: finalCurrency,
      price: convertedPrice,
      totalAmount: totalAmount,
      payment_url: paymentResult.payment_url,
      reference: paymentResult.reference,
    })
  } catch (error: any) {
    console.error("PPV purchase error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

