import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma, executeWithReconnect } from "@/lib/prisma"
import type { SubscriptionWithCreator } from "@/lib/types"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "fan") {
      return NextResponse.json(
        { error: "Only fans can access this endpoint" },
        { status: 403 }
      )
    }

    const subscriptions = await executeWithReconnect(() =>
      prisma.subscription.findMany({
      where: {
        fanId: session.user.id,
        status: "active",
      },
      include: {
        creator: {
          include: {
            creatorProfile: {
              select: {
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      })
    )

    const formattedSubscriptions: SubscriptionWithCreator[] = subscriptions.map(
      (sub) => ({
        id: sub.id,
        tierName: sub.tierName,
        tierPrice: sub.tierPrice,
        status: sub.status as "active" | "cancelled" | "pending",
        startDate: sub.startDate,
        creator: {
          id: sub.creator.id,
          username: sub.creator.creatorProfile?.username || "unknown",
          avatarUrl: sub.creator.creatorProfile?.avatarUrl || null,
        },
      })
    )

    return NextResponse.json({
      subscriptions: formattedSubscriptions,
      count: formattedSubscriptions.length,
    })
  } catch (error) {
    console.error("Subscriptions fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

