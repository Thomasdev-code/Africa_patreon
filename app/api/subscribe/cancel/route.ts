export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notifySubscriptionCancellation } from "@/lib/notifications"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { subscriptionId } = body

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      )
    }

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    })

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      )
    }

    // Verify ownership (fan can only cancel their own subscription)
    if (subscription.fanId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Cancel subscription
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: "cancelled",
        endDate: new Date(),
      },
    })

    // Notify creator of cancellation
    const fan = await prisma.user.findUnique({
      where: { id: subscription.fanId },
    })

    if (fan) {
      await notifySubscriptionCancellation(
        subscription.creatorId,
        fan.email,
        subscription.tierName
      )
    }

    return NextResponse.json({
      success: true,
      message: "Subscription cancelled successfully",
    })
  } catch (error) {
    console.error("Subscription cancellation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

