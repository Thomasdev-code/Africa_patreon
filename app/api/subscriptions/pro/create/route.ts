import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import {
  getPaymentProvider,
  getProviderForCountry,
  createStripePayment,
  createPaystackPayment,
  createFlutterwavePayment,
  type PaymentProvider,
} from "@/lib/payments"
import {
  calculatePlatformFee,
  calculateCreatorPayout,
} from "@/app/config/platform"

const PRO_PRICE = 9.99 // $9.99/month
const PRO_MONTHLY_CREDITS = 50

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

    // Check if already Pro
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
    const { provider, country } = body

    // Select provider using new unified system
    const selectedProvider: PaymentProvider = getPaymentProvider(
      provider || null,
      country || "US"
    )

    // Pro upgrades should avoid Paystack USD currency issues; restrict to Stripe/Flutterwave
    if (selectedProvider === "PAYSTACK") {
      return NextResponse.json(
        { error: "Pro upgrades use Stripe or Flutterwave. Please choose a supported provider." },
        { status: 400 }
      )
    }

    console.log("Selected provider for Pro upgrade:", selectedProvider)

    // Compute fee as 100% to platform for AI upgrade
    const amountMinor = Math.round(PRO_PRICE * 100)
    const platformFee = amountMinor // all revenue to platform
    const creatorEarnings = 0

    // Create payment using unified functions
    let paymentResult: { reference: string; payment_url: string }
    const metadata = {
      userId: session.user.id,
      creatorId: session.user.id, // Creator is paying for their own Pro subscription
      tierName: "Pro Subscription",
      subscriptionType: "pro",
      recurring: true,
      interval: "month",
      email: session.user.email || undefined,
      type: "ai_upgrade",
      platformFeeOverride: platformFee,
      creatorEarningsOverride: creatorEarnings,
    }

    try {
      if (selectedProvider === "STRIPE") {
        paymentResult = await createStripePayment(
          PRO_PRICE,
          session.user.email || "",
          "USD",
          metadata
        )
      } else if (selectedProvider === "PAYSTACK") {
        paymentResult = await createPaystackPayment(
          PRO_PRICE,
          session.user.email || "",
          "USD",
          metadata
        )
      } else if (selectedProvider === "FLUTTERWAVE") {
        paymentResult = await createFlutterwavePayment(
          PRO_PRICE,
          session.user.email || "",
          "USD",
          metadata
        )
      } else {
        throw new Error(`Unsupported payment provider: ${selectedProvider}`)
      }

      // Ensure payment_url exists
      if (!paymentResult.payment_url) {
        throw new Error(`${selectedProvider} did not return a payment URL`)
      }
    } catch (error: any) {
      console.error(`Payment creation failed for ${selectedProvider}:`, error)
      return NextResponse.json(
        {
          error: `Payment creation failed: ${error.message}`,
          provider: selectedProvider,
        },
        { status: 500 }
      )
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        creatorId: session.user.id,
        tierName: "Pro Subscription",
        tierPrice: PRO_PRICE,
        provider: selectedProvider,
        reference: paymentResult.reference,
        amount: Math.round(PRO_PRICE * 100),
        currency: "USD",
        status: "pending",
        type: "ai_upgrade",
        platformFee,
        creatorEarnings,
        metadata: {
          subscriptionType: "pro",
          recurring: true,
          interval: "month",
          platformFeeOverride: platformFee,
          creatorEarningsOverride: creatorEarnings,
        },
      },
    })

    // Log pending transaction for audit
    await prisma.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        provider: selectedProvider,
        type: "ai_upgrade",
        reference: paymentResult.reference,
        externalId: paymentResult.reference,
        amount: amountMinor,
        currency: "USD",
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
      redirectUrl: paymentResult.payment_url, // Legacy support
    })
  } catch (error: any) {
    console.error("Pro subscription creation error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create Pro subscription" },
      { status: 500 }
    )
  }
}

