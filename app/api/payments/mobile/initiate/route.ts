export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import {
  normalizeCountry,
  type PaymentProvider,
} from "@/lib/payments"
import { paystackSDK } from "@/lib/payments/payment-providers"
import { calculateTax } from "@/lib/tax/tax-engine"
import { resolvePaystackCurrency, type PaystackCurrency } from "@/lib/payments/currency"
import { calculatePlatformFee, calculateCreatorPayout } from "@/app/config/platform"

// CORS headers for mobile apps
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Bundle-ID, X-Package-Name",
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      )
    }

    const body = await req.json()
    const {
      amount,
      creatorId,
      tierId,
      tierName,
      platform = "web",
      country,
      metadata = {},
    } = body

    if (!creatorId || (!tierId && !tierName)) {
      return NextResponse.json(
        { error: "Creator ID and tier name/ID are required" },
        { status: 400, headers: corsHeaders }
      )
    }

    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      include: { creatorProfile: true },
    })

    if (!creator || !creator.creatorProfile) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404, headers: corsHeaders }
      )
    }

    const tiers = creator.creatorProfile.tiers as any[]
    const tier = tiers.find((t: any) => t.id === tierId || t.name === tierName)
    if (!tier) {
      return NextResponse.json(
        { error: "Tier not found" },
        { status: 404, headers: corsHeaders }
      )
    }

    const paymentAmount = amount || tier.price
    const amountMinor = Math.round(paymentAmount * 100)
    const platformFee = await calculatePlatformFee(amountMinor)
    const creatorEarnings = await calculateCreatorPayout(amountMinor)
    const finalTierName = tierName || tier.name

    const selectedProvider: PaymentProvider = "PAYSTACK"
    
    // CRITICAL: Always use KES for Kenya-based Paystack accounts
    const normalizedCountry = normalizeCountry(country || "KE")
    const finalCurrency: PaystackCurrency = "KES"
    
    // Convert amount to KES if needed
    // Approximate rate: 1 USD ≈ 130 KES
    const convertedAmount = paymentAmount * 130
    
    // Defensive logging
    console.info("[MOBILE_PAYMENT_INITIATE]", {
      userId: session.user.id,
      creatorId,
      currency: finalCurrency,
      provider: selectedProvider,
      amountInMinor: Math.round(convertedAmount * 100),
      platformFee,
      creatorEarnings,
      country: normalizedCountry,
    })

    const paymentResult = await paystackSDK.createPayment(
      convertedAmount, // Use converted amount
      finalCurrency,
      session.user.id,
      creatorId,
      finalTierName,
      {
        email: session.user.email || undefined,
        platform,
        platformFee,
        creatorEarnings,
        paystackCurrency: finalCurrency, // Store resolved currency
        ...metadata,
      }
    )

    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        creatorId: creatorId,
        tierName: finalTierName,
        tierPrice: convertedAmount,
        provider: selectedProvider,
        reference: paymentResult.reference,
        amount: Math.round(convertedAmount * 100),
        currency: finalCurrency,
        status: "pending",
        type: "subscription",
        platformFee,
        creatorEarnings,
        metadata: {
          ...paymentResult.metadata,
          platform,
        },
      },
    })

    const subscription = await prisma.subscription.create({
      data: {
        fanId: session.user.id,
        creatorId: creatorId,
        tierName: finalTierName,
        tierPrice: convertedAmount,
        status: "pending",
        paymentProvider: selectedProvider,
        paymentReference: paymentResult.reference,
        paymentId: payment.id,
      },
    })

    await prisma.payment.update({
      where: { id: payment.id },
      data: { subscriptionId: subscription.id },
    })

    await prisma.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        provider: selectedProvider,
        type: "subscription",
        reference: paymentResult.reference,
        externalId: paymentResult.reference,
        amount: amountMinor,
        currency: finalCurrency,
        status: "pending",
        platformFee,
        creatorEarnings,
        metadata: {
          ...paymentResult.metadata,
          platform,
        },
      },
    })

    const response = {
      success: true,
      paymentId: payment.id,
      subscriptionId: subscription.id,
      provider: selectedProvider,
      reference: paymentResult.reference,
      platformFee,
      creatorEarnings,
      redirectUrl: paymentResult.redirectUrl,
    }

    return NextResponse.json(response, { headers: corsHeaders })
  } catch (error: any) {
    console.error("Mobile payment initiation error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500, headers: corsHeaders }
    )
  }
}


