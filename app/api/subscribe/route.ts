import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createCheckoutSession, getProviderNameForCountry } from "@/lib/payments"
import type { CreateSubscriptionInput, PaymentProvider } from "@/lib/types"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "fan") {
      return NextResponse.json(
        { error: "Only fans can subscribe to creators" },
        { status: 403 }
      )
    }

    const body: CreateSubscriptionInput & { 
      paymentProvider?: PaymentProvider
      country?: string
    } = await req.json()
    const { creatorId, tierName, tierPrice, paymentProvider, country } = body

    // Validate input
    if (!creatorId || !tierName || !tierPrice || tierPrice <= 0) {
      return NextResponse.json(
        { error: "Invalid subscription data" },
        { status: 400 }
      )
    }

    // Verify creator exists and has this tier
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      include: {
        creatorProfile: true,
      },
    })

    if (!creator || creator.role !== "creator" || !creator.creatorProfile) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 }
      )
    }

    const tiers = creator.creatorProfile.tiers as Array<{
      name: string
      price: number
    }>
    const tier = tiers.find((t) => t.name === tierName && t.price === tierPrice)

    if (!tier) {
      return NextResponse.json(
        { error: "Tier not found for this creator" },
        { status: 400 }
      )
    }

    // Check if fan already has an active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        fanId: session.user.id,
        creatorId: creatorId,
        status: "active",
      },
    })

    if (existingSubscription) {
      return NextResponse.json(
        {
          error: "You already have an active subscription to this creator",
          subscriptionId: existingSubscription.id,
        },
        { status: 400 }
      )
    }

    // Check if user was referred
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { referredBy: true },
    })

    // Find active referral if user was referred
    let referralId: string | null = null
    if (user?.referredBy) {
      const referral = await prisma.referral.findFirst({
        where: {
          referrerId: user.referredBy,
          referredUserId: session.user.id,
          status: { in: ["signed_up", "credited"] },
        },
        orderBy: { createdAt: "desc" },
      })

      if (referral) {
        referralId = referral.id
      }
    }

    // Create pending subscription
    const subscription = await prisma.subscription.create({
      data: {
        fanId: session.user.id,
        creatorId: creatorId,
        tierName: tierName,
        tierPrice: tierPrice,
        status: "pending",
        paymentProvider: paymentProvider,
        referralId: referralId,
      },
    })

    // Determine provider
    const finalProvider: PaymentProvider = paymentProvider || getProviderNameForCountry(country || "US")

    // Create checkout session
    const paymentResult = await createCheckoutSession({
      userId: session.user.id,
      creatorId: creatorId,
      tierName: tierName,
      tierPrice: tierPrice,
      currency: "USD", // Default, can be made dynamic
      country: country,
      provider: finalProvider,
      metadata: {
        subscriptionId: subscription.id,
        creatorUsername: creator.creatorProfile.username,
        email: session.user.email,
      },
    })

    if (!paymentResult.success) {
      // Update subscription status to failed
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "cancelled" },
      })

      return NextResponse.json(
        { error: paymentResult.error || "Payment initialization failed" },
        { status: 500 }
      )
    }

    // Update subscription with payment reference
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { 
        paymentReference: paymentResult.reference,
        paymentProvider: finalProvider,
      },
    })

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      paymentUrl: paymentResult.redirectUrl,
      redirectUrl: paymentResult.redirectUrl,
      reference: paymentResult.reference,
      provider: paymentResult.provider,
      clientSecret: paymentResult.clientSecret,
      accessCode: paymentResult.accessCode,
      flwRef: paymentResult.flwRef,
    })
  } catch (error) {
    console.error("Subscribe error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

