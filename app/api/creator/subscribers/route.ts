export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { SubscriberInfo } from "@/lib/types"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Only creators can access this endpoint" },
        { status: 403 }
      )
    }

    const subscriptions = await prisma.subscription.findMany({
      where: {
        creatorId: session.user.id,
        status: "active",
      },
      include: {
        fan: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    const formattedSubscribers: SubscriberInfo[] = subscriptions.map((sub) => ({
      id: sub.id,
      fanId: sub.fanId,
      tierName: sub.tierName,
      tierPrice: sub.tierPrice,
      status: sub.status as "active" | "cancelled" | "pending",
      startDate: sub.startDate,
      fan: {
        id: sub.fan.id,
        email: sub.fan.email,
      },
    }))

    // Calculate revenue summary
    const revenueSummary = {
      totalSubscribers: formattedSubscribers.length,
      monthlyRevenue: formattedSubscribers.reduce(
        (sum, sub) => sum + sub.tierPrice,
        0
      ),
      byTier: formattedSubscribers.reduce(
        (acc, sub) => {
          if (!acc[sub.tierName]) {
            acc[sub.tierName] = { count: 0, revenue: 0 }
          }
          acc[sub.tierName].count += 1
          acc[sub.tierName].revenue += sub.tierPrice
          return acc
        },
        {} as Record<string, { count: number; revenue: number }>
      ),
    }

    return NextResponse.json({
      subscribers: formattedSubscribers,
      revenueSummary,
    })
  } catch (error: any) {
    console.error("Subscribers fetch error:", error)
    
    // Handle Prisma connection errors
    if (error?.code === "P1001") {
      return NextResponse.json(
        {
          error: "Database connection error. Please try again in a moment.",
          code: "DATABASE_CONNECTION_ERROR",
        },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}

