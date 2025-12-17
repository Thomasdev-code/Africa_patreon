import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { startSubscription } from "@/lib/payments/payment-router"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import {
  calculatePlatformFee,
  calculateCreatorPayout,
} from "@/app/config/platform"

const subscriptionSchema = z.object({
  creatorId: z.string(),
  tierId: z.string().optional(),
  tierName: z.string(),
  amount: z.number().optional(),
  currency: z.string().default("USD"),
  country: z.string().optional(),
  autoRenew: z.boolean().default(true),
  interval: z.enum(["month", "year"]).default("month"),
  providerPreference: z.array(z.enum(["STRIPE", "PAYSTACK", "FLUTTERWAVE"])).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = subscriptionSchema.parse(body)

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
    const amountMinor = Math.round(tierPrice * 100)
    const platformFee = calculatePlatformFee(amountMinor)
    const creatorEarnings = calculateCreatorPayout(amountMinor)

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

    // Start subscription with automatic provider selection
    const result = await startSubscription({
      amount: tierPrice,
      currency: validated.currency,
      userId: session.user.id,
      creatorId: validated.creatorId,
      tierId: tier.id,
      tierName: tier.name,
      country: validated.country,
      autoRenew: validated.autoRenew,
      interval: validated.interval,
      providerPreference: validated.providerPreference,
      metadata: {
        email: session.user.email,
        tierId: tier.id,
        interval: validated.interval,
      },
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Subscription creation failed" },
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
        amount: amountMinor,
        currency: validated.currency,
        status: "pending",
        type: "subscription",
        metadata: {
          ...result.metadata,
          tierId: tier.id,
          subscription: true,
          platformFee,
          creatorEarnings,
        },
        platformFee,
        creatorEarnings,
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
        autoRenew: validated.autoRenew,
        nextBillingDate: new Date(
          Date.now() +
            (validated.interval === "year" ? 365 : 30) * 24 * 60 * 60 * 1000
        ),
      },
    })

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      subscriptionId: subscription.id,
      provider: result.provider,
      reference: result.reference,
      redirectUrl: result.redirectUrl,
      clientSecret: result.clientSecret,
      metadata: result.metadata,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Subscription creation error:", error)
    return NextResponse.json(
      { error: error.message || "Subscription creation failed" },
      { status: 500 }
    )
  }
}

