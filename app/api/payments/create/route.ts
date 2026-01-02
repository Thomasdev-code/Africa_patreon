export const runtime = "nodejs"

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
import { notifyNewSubscription } from "@/lib/notifications"
import { calculateReferralCredits, awardReferralCredits } from "@/lib/referrals"
import { fraudCheckMiddleware } from "@/lib/security/fraud-middleware"
import { calculateTax } from "@/lib/tax/tax-engine"
import { resolvePaystackCurrency, type PaystackCurrency } from "@/lib/payments/currency"
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

    const body = await req.json()
    const { creatorId, tierName, tierId, country, phone } = body

    if (!creatorId || (!tierName && !tierId)) {
      return NextResponse.json(
        { error: "Creator ID and tier name/ID are required" },
        { status: 400 }
      )
    }

    // Detect country
    let detectedCountry = country
    if (!detectedCountry) {
      const url = new URL(req.url)
      detectedCountry = url.searchParams.get("country") || undefined
    }
    if (!detectedCountry) detectedCountry = "US"
    const normalizedCountry = normalizeCountry(detectedCountry)

    // Paystack-only provider
    const selectedProvider: PaymentProvider = "PAYSTACK"

    // Fraud check placeholder (amount set after pricing)
    const fraudCheck = await fraudCheckMiddleware(req, {
      userId: session.user.id,
      creatorId,
      tierId,
      amount: undefined,
      currency: "KES",
    })
    if (fraudCheck) return fraudCheck

    // Get creator and tier
    const creator = await executeWithReconnect(() =>
      prisma.user.findUnique({
        where: { id: creatorId },
        include: { creatorProfile: true },
      })
    )
    if (!creator || !creator.creatorProfile) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 }
      )
    }

    const tiers = creator.creatorProfile.tiers as any[]
    const tier = tiers.find((t: any) => t.name === tierName || t.id === tierId)
    if (!tier) {
      return NextResponse.json(
        { error: "Tier not found" },
        { status: 404 }
      )
    }
    const finalTierName = tierName || tier.name
    const finalTierId = tierId || tier.id

    // Prevent duplicate active subscription
    const existingSubscription = await executeWithReconnect(() =>
      prisma.subscription.findFirst({
        where: {
          fanId: session.user.id,
          creatorId: creatorId,
          status: "active",
        },
      })
    )
    if (existingSubscription) {
      return NextResponse.json(
        { error: "You already have an active subscription to this creator" },
        { status: 400 }
      )
    }

    // CRITICAL: Always use KES for Kenya-based Paystack accounts
    // Set PAYSTACK_ENABLED_CURRENCIES env var if you have other currencies enabled
    const finalCurrency: PaystackCurrency = "KES" // Default to KES for Kenya

    // Pricing: server-side from tier.price (assume USD)
    const tierPriceUSD = tier.price
    // Convert USD to KES (simplified - in production use real rates)
    // Approximate rate: 1 USD ≈ 130 KES
    const convertedPrice = tierPriceUSD * 130 // Convert to KES

    const taxCalculation = calculateTax(convertedPrice, normalizedCountry)
    const totalAmount = taxCalculation.totalAmount
    const amountMinor = Math.round(totalAmount * 100)
    const platformFee = await calculatePlatformFee(amountMinor)
    const creatorEarnings = await calculateCreatorPayout(amountMinor)

    // Defensive logging
    console.info("[PAYMENT_CREATE]", {
      userId: session.user.id,
      creatorId,
      tierName: finalTierName,
      currency: finalCurrency,
      provider: selectedProvider,
      amountMinor,
      platformFee,
      creatorEarnings,
      country: normalizedCountry,
    })

    const metadata = {
      userId: session.user.id,
      creatorId: creatorId,
      tierId: finalTierId,
      tierName: finalTierName,
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
      amount: amountMinor,
      currency: finalCurrency,
      status: "pending",
      userId: session.user.id,
      creatorId: creatorId,
      tierId: finalTierId,
      countryCode: normalizedCountry,
      metadata: {
        tierName: finalTierName,
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
          creatorId: creatorId,
          tierName: finalTierName,
          tierPrice: tier.price,
          provider: selectedProvider,
          reference: paymentResult.reference,
          amount: unifiedPayment.amount,
          currency: unifiedPayment.currency,
          status: "pending",
          type: "subscription",
          metadata: {
            ...unifiedPayment.metadata,
            tierId: finalTierId,
            amountUSD: unifiedPayment.amountUSD,
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
          type: "payment",
          reference: paymentResult.reference,
          externalId: paymentResult.reference,
          amount: unifiedPayment.amount,
          currency: unifiedPayment.currency,
          status: "pending",
          platformFee,
          creatorEarnings,
          taxAmount: unifiedPayment.taxAmount,
          taxRate: unifiedPayment.taxRate,
          countryCode: unifiedPayment.countryCode,
          metadata: unifiedPayment.metadata,
        },
      })
    )

    const subscription = await executeWithReconnect(() =>
      prisma.subscription.create({
        data: {
          fanId: session.user.id,
          creatorId: creatorId,
          tierName: finalTierName,
          tierPrice: tier.price,
          status: "pending",
          paymentProvider: selectedProvider,
          paymentReference: paymentResult.reference,
          paymentId: payment.id,
        },
      })
    )

    await executeWithReconnect(() =>
      prisma.payment.update({
        where: { id: payment.id },
        data: { subscriptionId: subscription.id },
      })
    )

    // Referrals (server-side) - handled after subscription is created and linked
    // Referral credits are typically processed via webhook when payment is confirmed
    // This ensures the referral is properly linked to the subscription

    // Notify creator (async best-effort)
    notifyNewSubscription(
      creatorId,
      session.user.email || "Unknown",
      finalTierName
    ).catch(() => {})

    return NextResponse.json({
      success: true,
      provider: selectedProvider,
      currency: finalCurrency,
      price: convertedPrice,
      priceUSD: tierPriceUSD,
      totalAmount: totalAmount,
      payment_url: paymentResult.payment_url,
      reference: paymentResult.reference,
    })
  } catch (error: any) {
    console.error("Payment creation error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}


