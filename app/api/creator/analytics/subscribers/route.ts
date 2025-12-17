import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { SubscriberAnalytics, SubscriberDataPoint } from "@/lib/types"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Only creators can access analytics" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(req.url)
    const period = (searchParams.get("period") || "monthly") as
      | "daily"
      | "weekly"
      | "monthly"

    // Get all active subscriptions
    const subscriptions = await prisma.subscription.findMany({
      where: {
        creatorId: session.user.id,
        status: "active",
      },
      select: {
        tierName: true,
        startDate: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    // Calculate total and by tier
    const total = subscriptions.length
    const byTier: Record<string, number> = {}
    subscriptions.forEach((sub) => {
      byTier[sub.tierName] = (byTier[sub.tierName] || 0) + 1
    })

    // Calculate growth over time
    const growth: SubscriberDataPoint[] = []
    const now = new Date()
    const dataPoints: Record<string, number> = {}

    // Determine date range based on period
    let daysBack = 30
    if (period === "daily") daysBack = 7
    if (period === "weekly") daysBack = 12 * 7 // 12 weeks

    for (let i = daysBack; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)

      let dateKey: string
      if (period === "daily") {
        dateKey = date.toISOString().split("T")[0]
      } else if (period === "weekly") {
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        dateKey = weekStart.toISOString().split("T")[0]
      } else {
        dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      }

      dataPoints[dateKey] = 0
    }

    // Count subscribers by period
    subscriptions.forEach((sub) => {
      const subDate = new Date(sub.startDate || sub.createdAt)
      let dateKey: string

      if (period === "daily") {
        dateKey = subDate.toISOString().split("T")[0]
      } else if (period === "weekly") {
        const weekStart = new Date(subDate)
        weekStart.setDate(subDate.getDate() - subDate.getDay())
        dateKey = weekStart.toISOString().split("T")[0]
      } else {
        dateKey = `${subDate.getFullYear()}-${String(subDate.getMonth() + 1).padStart(2, "0")}`
      }

      if (dataPoints.hasOwnProperty(dateKey)) {
        dataPoints[dateKey]++
      }
    })

    // Convert to cumulative growth
    let cumulative = 0
    Object.keys(dataPoints)
      .sort()
      .forEach((dateKey) => {
        cumulative += dataPoints[dateKey]
        growth.push({
          date: dateKey,
          count: cumulative,
        })
      })

    const analytics: SubscriberAnalytics = {
      total,
      byTier,
      growth,
      period,
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error("Subscriber analytics error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

