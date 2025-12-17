import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma, executeWithReconnect } from "@/lib/prisma"
import {
  createStripePayment,
  createPaystackPayment,
  createFlutterwavePayment,
  createMpesaPayment,
  getBestProviderForCountry,
  getCurrencyForProvider,
  normalizeCountry,
  isMobileMoney,
  type PaymentProvider,
} from "@/lib/payments"
import { calculatePlatformFee, calculateCreatorPayout } from "@/app/config/platform"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { creatorId, amount, currency = "USD", country = "US", provider, phone, note } = body

    if (!creatorId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "creatorId and positive amount are required" },
        { status: 400 }
      )
    }

    const normalizedCountry = normalizeCountry(country || "US")
    const selectedProvider: PaymentProvider = provider
      ? (provider.toUpperCase().trim() as PaymentProvider)
      : getBestProviderForCountry(normalizedCountry)

    // For mobile money, ensure phone is provided
    if (isMobileMoney(selectedProvider) && !phone) {
      return NextResponse.json(
        { error: "Phone number is required for M-Pesa payments" },
        { status: 400 }
      )
    }

    const finalCurrency = getCurrencyForProvider(selectedProvider) || currency
    const amountMinor = Math.round(amount * 100)
    const platformFee = calculatePlatformFee(amountMinor)
    const creatorEarnings = calculateCreatorPayout(amountMinor)

    const metadata = {
      userId: session.user.id,
      creatorId,
      type: "tip",
      note: note || "",
      countryCode: normalizedCountry,
      platformFee,
      creatorEarnings,
      phone: phone || undefined,
    }

    let paymentResult: { reference: string; payment_url: string }
    if (isMobileMoney(selectedProvider)) {
      paymentResult = await createMpesaPayment(amount, phone, selectedProvider, metadata)
    } else if (selectedProvider === "PAYSTACK") {
      paymentResult = await createPaystackPayment(
        amount,
        session.user.email || "",
        finalCurrency,
        metadata
      )
    } else if (selectedProvider === "FLUTTERWAVE") {
      paymentResult = await createFlutterwavePayment(
        amount,
        session.user.email || "",
        finalCurrency,
        metadata
      )
    } else {
      paymentResult = await createStripePayment(
        amount,
        session.user.email || "",
        finalCurrency,
        metadata
      )
    }

    if (!paymentResult.payment_url) {
      throw new Error(`${selectedProvider} did not return a payment URL`)
    }

    const payment = await executeWithReconnect(() =>
      prisma.payment.create({
        data: {
          userId: session.user.id,
          creatorId,
          tierName: "TIP",
          tierPrice: amount,
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

