export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Calculate pending payouts (revenue from active subscriptions)
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        status: "active",
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            creatorProfile: {
              select: {
                username: true,
              },
            },
          },
        },
      },
    })

    // Group by creator and calculate totals
    const payoutsByCreator = activeSubscriptions.reduce((acc, sub) => {
      const creatorId = sub.creatorId
      if (!acc[creatorId]) {
        acc[creatorId] = {
          creatorId,
          creator: sub.creator,
          totalRevenue: 0,
          subscriptionCount: 0,
          monthlyRevenue: 0,
        }
      }
      acc[creatorId].totalRevenue += sub.tierPrice
      acc[creatorId].subscriptionCount += 1
      acc[creatorId].monthlyRevenue += sub.tierPrice
      return acc
    }, {} as Record<string, any>)

    const payouts = Object.values(payoutsByCreator).map((payout: any) => ({
      ...payout,
      // Platform fee (10% for example)
      platformFee: payout.monthlyRevenue * 0.1,
      creatorEarnings: payout.monthlyRevenue * 0.9,
    }))

    return NextResponse.json({ payouts })
  } catch (error) {
    console.error("Admin payouts fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

