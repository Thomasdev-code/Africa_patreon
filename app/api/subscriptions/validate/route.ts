import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const creatorId = searchParams.get("creatorId")
    const tierName = searchParams.get("tierName")

    if (!creatorId || !tierName) {
      return NextResponse.json(
        { error: "Creator ID and tier name are required" },
        { status: 400 }
      )
    }

    // Check if user has active subscription to this creator and tier
    const subscription = await prisma.subscription.findFirst({
      where: {
        fanId: session.user.id,
        creatorId: creatorId,
        tierName: tierName,
        status: "active",
      },
      include: {
        payment: true,
      },
    })

    if (!subscription) {
      return NextResponse.json({
        hasAccess: false,
        message: "No active subscription found",
      })
    }

    // Check if subscription is still valid (not expired)
    const now = new Date()
    if (subscription.endDate && subscription.endDate < now) {
      // Subscription expired, update status
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: "cancelled" },
      })

      return NextResponse.json({
        hasAccess: false,
        message: "Subscription has expired",
      })
    }

    return NextResponse.json({
      hasAccess: true,
      subscription: {
        id: subscription.id,
        tierName: subscription.tierName,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        provider: subscription.paymentProvider,
      },
    })
  } catch (error) {
    console.error("Subscription validation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

