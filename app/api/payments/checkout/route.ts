export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { startOneTimePayment } from "@/lib/payments/payment-router"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const checkoutSchema = z.object({
  creatorId: z.string(),
  tierId: z.string().optional(),
  tierName: z.string(),
  amount: z.number().optional(),
  currency: z.string().default("USD"),
  country: z.string().optional(),
  providerPreference: z.array(z.enum(["PAYSTACK"])).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = checkoutSchema.parse(body)

    // Get creator and tier details
    const creator = await prisma.user.findUnique({
      where: { id: validated.creatorId },
      include: { creatorProfile: true },
    })

    if (!creator || !creator.creatorProfile) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 }
      )
    }

    const tiers = creator.creatorProfile.tiers as any[]
    const tier = validated.tierId
      ? tiers.find((t: any) => t.id === validated.tierId)
      : tiers.find((t: any) => t.name === validated.tierName)

    if (!tier) {
      return NextResponse.json(
        { error: "Tier not found" },
        { status: 404 }
      )
    }

    const tierPrice = validated.amount || tier.price

    // Check for existing subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        fanId: session.user.id,
        creatorId: validated.creatorId,
        status: "active",
      },
    })

    if (existingSubscription) {
      return NextResponse.json(
        { error: "You already have an active subscription" },
        { status: 400 }
      )
    }

    // Start payment with PAYSTACK (only supported provider)
    const result = await startOneTimePayment({
      amount: tierPrice,
      currency: validated.currency,
      userId: session.user.id,
      creatorId: validated.creatorId,
      tierId: tier.id,
      tierName: tier.name,
      country: validated.country,
      providerPreference: validated.providerPreference ? ["PAYSTACK"] : undefined,
      metadata: {
        email: session.user.email,
        tierId: tier.id,
      },
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Payment initialization failed" },
        { status: 500 }
      )
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        creatorId: validated.creatorId,
        tierName: tier.name,
        tierPrice: tierPrice,
        provider: result.provider,
        reference: result.reference,
        amount: Math.round(tierPrice * 100),
        currency: validated.currency,
        status: "pending",
        metadata: {
          ...result.metadata,
          tierId: tier.id,
        },
      },
    })

    // Create pending subscription
    const subscription = await prisma.subscription.create({
      data: {
        fanId: session.user.id,
        creatorId: validated.creatorId,
        tierName: tier.name,
        tierPrice: tierPrice,
        status: "pending",
        paymentProvider: result.provider,
        paymentReference: result.reference,
        paymentId: payment.id,
        autoRenew: true,
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    })

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      subscriptionId: subscription.id,
      provider: result.provider,
      reference: result.reference,
      redirectUrl: result.redirectUrl,
      accessCode: result.accessCode,
      metadata: result.metadata,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Checkout error:", error)
    return NextResponse.json(
      { error: error.message || "Checkout failed" },
      { status: 500 }
    )
  }
}

