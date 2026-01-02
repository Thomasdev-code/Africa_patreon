export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { RevenueAnalytics, RevenueDataPoint } from "@/lib/types"

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

    // Get all successful payments
    const payments = await prisma.payment.findMany({
      where: {
        creatorId: session.user.id,
        status: "success",
      },
      select: {
        tierName: true,
        tierPrice: true,
        amount: true,
        currency: true,
        provider: true,
        createdAt: true,
      },
    })

    // Get active subscriptions for monthly recurring revenue
    const subscriptions = await prisma.subscription.findMany({
      where: {
        creatorId: session.user.id,
        status: "active",
      },
      select: {
        tierName: true,
        tierPrice: true,
        startDate: true,
        createdAt: true,
      },
    })

    // Calculate revenue by tier from payments
    const byTier: Record<string, { count: number; monthlyRevenue: number; totalRevenue: number }> =
      {}
    let totalMonthly = 0
    let totalAllTime = 0

    // From active subscriptions (monthly recurring)
    subscriptions.forEach((sub) => {
      if (!byTier[sub.tierName]) {
        byTier[sub.tierName] = { count: 0, monthlyRevenue: 0, totalRevenue: 0 }
      }
      byTier[sub.tierName].count++
      byTier[sub.tierName].monthlyRevenue += sub.tierPrice
      totalMonthly += sub.tierPrice
    })

    // From actual payments (total revenue)
    payments.forEach((payment) => {
      if (!byTier[payment.tierName]) {
        byTier[payment.tierName] = { count: 0, monthlyRevenue: 0, totalRevenue: 0 }
      }
      const amountInDollars = payment.amount / 100 // Convert from cents
      byTier[payment.tierName].totalRevenue += amountInDollars
      totalAllTime += amountInDollars
    })

    // Calculate growth over time
    const now = new Date()
    const dataPoints: Record<string, number> = {}

    let daysBack = 30
    if (period === "daily") daysBack = 7
    if (period === "weekly") daysBack = 12 * 7

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

    // Calculate revenue by period from actual payments
    payments.forEach((payment) => {
      const paymentDate = new Date(payment.createdAt)
      let dateKey: string

      if (period === "daily") {
        dateKey = paymentDate.toISOString().split("T")[0]
      } else if (period === "weekly") {
        const weekStart = new Date(paymentDate)
        weekStart.setDate(paymentDate.getDate() - paymentDate.getDay())
        dateKey = weekStart.toISOString().split("T")[0]
      } else {
        dateKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, "0")}`
      }

      if (dataPoints.hasOwnProperty(dateKey)) {
        const amountInDollars = payment.amount / 100
        dataPoints[dateKey] += amountInDollars
      }
    })

    // Convert to cumulative revenue
    const growth: RevenueDataPoint[] = []
    let cumulative = 0
    Object.keys(dataPoints)
      .sort()
      .forEach((dateKey) => {
        cumulative += dataPoints[dateKey]
        growth.push({
          date: dateKey,
          revenue: cumulative,
        })
      })

    // Calculate change from last period
    let changeFromLastPeriod: number | undefined
    if (growth.length >= 2) {
      const current = growth[growth.length - 1].revenue
      const previous = growth[growth.length - 2].revenue
      if (previous > 0) {
        changeFromLastPeriod = ((current - previous) / previous) * 100
      }
    }

    const analytics: RevenueAnalytics = {
      totalMonthly,
      totalAllTime,
      byTier,
      growth,
      period,
      changeFromLastPeriod,
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error("Revenue analytics error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

