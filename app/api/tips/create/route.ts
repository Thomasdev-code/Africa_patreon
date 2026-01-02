export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma, executeWithReconnect } from "@/lib/prisma"
import {
  getBestProviderForCountry,
  normalizeCountry,
  createPaystackPayment,
  createMpesaPayment,
  type PaymentProvider,
} from "@/lib/payments"
import { resolvePaystackCurrency, type PaystackCurrency } from "@/lib/payments/currency"
import { calculatePlatformFee, calculateCreatorPayout } from "@/app/config/platform"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { creatorId, amount, currency, country = "NG", phone, note } = body

    if (!creatorId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "creatorId and positive amount are required" },
        { status: 400 }
      )
    }

    const normalizedCountry = normalizeCountry(country || "NG")
    const selectedProvider: PaymentProvider = "PAYSTACK"

    // CRITICAL: Always use KES for Kenya-based Paystack accounts
    const finalCurrency: PaystackCurrency = "KES"
    
    // Convert amount to KES if needed
    // Approximate rate: 1 USD ≈ 130 KES
    const convertedAmount = currency === "KES"
      ? amount
      : amount * (currency === "USD" ? 130 : currency === "NGN" ? 130/1500 : currency === "GHS" ? 130/12 : currency === "ZAR" ? 130/18.5 : 130)
    
    const amountMinor = Math.round(convertedAmount * 100)
    const platformFee = await calculatePlatformFee(amountMinor)
    const creatorEarnings = await calculateCreatorPayout(amountMinor)

    // Defensive logging
    console.info("[TIP_CREATE]", {
      userId: session.user.id,
      creatorId,
      currency: finalCurrency,
      provider: selectedProvider,
      amountMinor,
      platformFee,
      creatorEarnings,
      country: normalizedCountry,
    })

    const metadata = {
      userId: session.user.id,
      creatorId,
      type: "tip",
      note: note || "",
      countryCode: normalizedCountry,
      platformFee,
      creatorEarnings,
      phone: phone || undefined,
      email: session.user.email || undefined,
      paystackCurrency: finalCurrency, // Store resolved currency
    }

    let paymentResult: { reference: string; payment_url: string }
    if (phone && normalizedCountry === "KE") {
      paymentResult = await createMpesaPayment(convertedAmount, phone, "MPESA_PAYSTACK", metadata)
    } else {
      paymentResult = await createPaystackPayment(
        convertedAmount,
        session.user.email || "",
        finalCurrency,
        metadata
      )
    }

    if (!paymentResult.payment_url) {
      throw new Error(`PAYSTACK did not return a payment URL`)
    }

    const payment = await executeWithReconnect(() =>
      prisma.payment.create({
        data: {
          userId: session.user.id,
          creatorId,
          tierName: "TIP",
          tierPrice: convertedAmount,
          provider: selectedProvider,
          reference: paymentResult.reference,
          amount: amountMinor,
          currency: finalCurrency,
          status: "pending",
          type: "tip",
          platformFee,
          creatorEarnings,
          metadata,
        },
      })
    )

    await executeWithReconnect(() =>
      prisma.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          provider: selectedProvider,
          type: "tip",
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
    console.error("Tip creation error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create tip payment" },
      { status: 500 }
    )
  }
}


