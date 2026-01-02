export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { sendMpesaStkPush } from "@/lib/payments/mpesa"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { creatorId, tierId, tierName, phoneNumber, amount, currency = "KES" } = body

    if (!creatorId || !tierName || !phoneNumber) {
      return NextResponse.json(
        { error: "Creator ID, tier name, and phone number are required" },
        { status: 400 }
      )
    }

    // Get creator and tier details
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      include: { creatorProfile: true },
    })

    if (!creator || !creator.creatorProfile) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 }
      )
    }

    const tiers = creator.creatorProfile.tiers as any[]
    const tier = tierId
      ? tiers.find((t: any) => t.id === tierId)
      : tiers.find((t: any) => t.name === tierName)

    if (!tier) {
      return NextResponse.json(
        { error: "Tier not found" },
        { status: 404 }
      )
    }

    const tierPrice = amount || tier.price

    // Check for existing subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        fanId: session.user.id,
        creatorId: creatorId,
        status: "active",
      },
    })

    if (existingSubscription) {
      return NextResponse.json(
        { error: "You already have an active subscription" },
        { status: 400 }
      )
    }

    // Initiate M-Pesa payment via Paystack
    const result = await sendMpesaStkPush({
      amount: tierPrice,
      currency,
      phoneNumber,
      userId: session.user.id,
      creatorId,
      tierId: tier.id,
      tierName: tier.name,
      metadata: {
        email: session.user.email,
      },
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "M-Pesa payment initialization failed" },
        { status: 500 }
      )
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        creatorId: creatorId,
        tierName: tier.name,
        tierPrice: tierPrice,
        provider: result.provider,
        reference: result.reference,
        amount: Math.round(tierPrice * 100),
        currency,
        status: result.status === "success" ? "success" : "pending",
        metadata: result.metadata || {},
      },
    })

    // Create pending subscription if payment is pending
    if (result.status === "pending") {
      await prisma.subscription.create({
        data: {
          fanId: session.user.id,
          creatorId: creatorId,
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
    }

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      reference: result.reference,
      provider: result.provider,
      status: result.status,
      message:
        result.status === "success"
          ? "Payment successful"
          : "Please check your phone to complete the payment",
      metadata: result.metadata,
    })
  } catch (error: any) {
    console.error("M-Pesa payment error:", error)
    return NextResponse.json(
      { error: error.message || "Payment initialization failed" },
      { status: 500 }
    )
  }
}

