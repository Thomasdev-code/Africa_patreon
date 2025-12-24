import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import {
  createPaystackPayment,
  normalizeCountry,
  type PaymentProvider,
} from "@/lib/payments"
import {
  calculatePlatformFee,
  calculateCreatorPayout,
} from "@/app/config/platform"
import { resolvePaystackCurrency, type PaystackCurrency } from "@/lib/payments/currency"

const PRO_PRICE = 9.99 // USD equivalent, will be charged in KES by Paystack

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Only creators can upgrade to Pro" },
        { status: 403 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionPlan: true },
    })

    if (user?.subscriptionPlan === "pro") {
      return NextResponse.json(
        { error: "You already have a Pro subscription" },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { country } = body

    // Default to Kenya for KES currency
    const normalizedCountry = normalizeCountry(country || "KE")
    const selectedProvider: PaymentProvider = "PAYSTACK"
    
    // CRITICAL: Always use KES for Kenya-based Paystack accounts
    const finalCurrency: PaystackCurrency = "KES"
    
    // Convert PRO_PRICE to KES
    // Approximate rate: 1 USD ≈ 130 KES
    const convertedPrice = PRO_PRICE * 130

    // Fee: 100% to platform for Pro/AI upgrade
    const amountMinor = Math.round(convertedPrice * 100)
    const platformFee = amountMinor // 100% platform fee for Pro upgrades
    const creatorEarnings = 0
    
    // Defensive logging
    console.info("[PRO_SUBSCRIPTION_CREATE]", {
      userId: session.user.id,
      currency: finalCurrency,
      provider: selectedProvider,
      amountMinor,
      platformFee,
      creatorEarnings,
      country: normalizedCountry,
    })

    const metadata = {
      userId: session.user.id,
      creatorId: session.user.id,
      tierName: "Pro Subscription",
      subscriptionType: "pro",
      recurring: true,
      interval: "month",
      email: session.user.email || undefined,
      type: "ai_upgrade",
      platformFeeOverride: platformFee,
      creatorEarningsOverride: creatorEarnings,
      countryCode: normalizedCountry,
    }

    const paymentResult = await createPaystackPayment(
      convertedPrice, // Use converted price
      session.user.email || "",
      finalCurrency,
      metadata
    )

    if (!paymentResult.payment_url) {
      throw new Error("PAYSTACK did not return a payment URL")
    }

    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        creatorId: session.user.id,
        tierName: "Pro Subscription",
        tierPrice: convertedPrice,
        provider: selectedProvider,
        reference: paymentResult.reference,
        amount: amountMinor,
        currency: finalCurrency,
        status: "pending",
        type: "ai_upgrade",
        platformFee,
        creatorEarnings,
        metadata,
      },
    })

    await prisma.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        provider: selectedProvider,
        type: "ai_upgrade",
        reference: paymentResult.reference,
        externalId: paymentResult.reference,
        amount: amountMinor,
        currency: finalCurrency,
        status: "pending",
        platformFee,
        creatorEarnings,
        metadata,
      },
    })

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      provider: selectedProvider,
      reference: paymentResult.reference,
      payment_url: paymentResult.payment_url,
      redirectUrl: paymentResult.payment_url,
    })
  } catch (error: any) {
    console.error("Pro subscription creation error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create Pro subscription" },
      { status: 500 }
    )
  }
}


