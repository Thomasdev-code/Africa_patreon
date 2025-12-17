import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "creator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all successful payments (including renewals)
    const payments = await prisma.payment.findMany({
      where: {
        creatorId: session.user.id,
        status: "success",
      },
      include: {
        PaymentTransaction: {
          where: {
            type: { in: ["payment", "renewal"] },
            status: "success",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Calculate total earnings from Earnings records (which already contain net amounts after platform fee)
    const earningsRecords = await prisma.earnings.findMany({
      where: {
        creatorId: session.user.id,
        type: { in: ["payment", "renewal"] },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Get PPV purchases for this creator's posts
    const ppvPosts = await prisma.post.findMany({
      where: {
        creatorId: session.user.id,
        isPPV: true,
      },
      select: {
        id: true,
      },
    })

    const ppvPostIds = ppvPosts.map((p) => p.id)

    // Get PPV purchases and their associated payments
    const ppvPurchases = await prisma.pPVPurchase.findMany({
      where: {
        postId: { in: ppvPostIds },
      },
      include: {
        post: {
          select: {
            id: true,
            title: true,
          },
        },
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

    // Get PPV earnings from successful payments
    const ppvPayments = await prisma.payment.findMany({
      where: {
        creatorId: session.user.id,
        status: "success",
        metadata: {
          path: ["type"],
          equals: "ppv",
        },
      },
      include: {
        PaymentTransaction: {
          where: {
            status: "success",
          },
        },
      },
    })

    // Calculate PPV revenue from Earnings records (net amounts after platform fee)
    const ppvEarningsRecords = await prisma.earnings.findMany({
      where: {
        creatorId: session.user.id,
        paymentId: {
          in: ppvPayments.map((p) => p.id),
        },
      },
    })

    const ppvRevenue = ppvEarningsRecords.reduce((sum, e) => sum + e.amount, 0)

    // Calculate subscription earnings (excluding PPV)
    const subscriptionEarnings = earningsRecords
      .filter((e) => {
        const payment = payments.find((p) => p.id === e.paymentId)
        return payment && payment.metadata && (payment.metadata as any).type !== "ppv"
      })
      .reduce((sum, e) => sum + e.amount, 0)

    const totalEarnings = earningsRecords.reduce((sum, e) => sum + e.amount, 0)
    const totalPlatformFees = payments.reduce((sum, p) => sum + (p.platformFee || 0), 0)

    // Get payout requests
    const payouts = await prisma.payoutRequest.findMany({
      where: {
        creatorId: session.user.id,
      },
    })

    const paidPayouts = payouts.filter((p) => p.status === "paid")
    const totalWithdrawn = paidPayouts.reduce((sum, p) => sum + p.amount, 0)

    const pendingPayouts = payouts.filter(
      (p) => p.status === "pending" || p.status === "approved"
    )
    const totalPending = pendingPayouts.reduce((sum, p) => sum + p.amount, 0)

    const availableBalance = totalEarnings - totalPending - totalWithdrawn

    // Calculate earnings by tier from Earnings records (net amounts)
    const earningsByTier: Record<string, number> = {}
    earningsRecords.forEach((earning) => {
      const payment = payments.find((p) => p.id === earning.paymentId)
      if (payment) {
        // Skip PPV payments in tier breakdown
        if (payment.metadata && (payment.metadata as any).type === "ppv") {
          return
        }
        if (!earningsByTier[payment.tierName]) {
          earningsByTier[payment.tierName] = 0
        }
        earningsByTier[payment.tierName] += earning.amount
      }
    })

    // Add PPV as a separate category
    if (ppvRevenue > 0) {
      earningsByTier["PPV"] = ppvRevenue
    }

    // Calculate monthly revenue (last 12 months)
    const monthlyRevenue: Record<string, number> = {}
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      monthlyRevenue[monthKey] = 0
    }

    // Calculate monthly revenue from Earnings records (net amounts)
    earningsRecords.forEach((earning) => {
      const earningDate = new Date(earning.createdAt)
      const monthKey = `${earningDate.getFullYear()}-${String(earningDate.getMonth() + 1).padStart(2, "0")}`
      if (monthlyRevenue.hasOwnProperty(monthKey)) {
        monthlyRevenue[monthKey] += earning.amount
      }
    })

    // Get subscriber count and growth
    const subscriptions = await prisma.subscription.findMany({
      where: {
        creatorId: session.user.id,
        status: "active",
      },
    })

    const subscriberCount = subscriptions.length

    // Calculate growth (new subscribers this month vs last month)
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const thisMonthSubs = subscriptions.filter(
      (s) => new Date(s.createdAt) >= thisMonth
    ).length

    const lastMonthSubs = subscriptions.filter(
      (s) =>
        new Date(s.createdAt) >= lastMonth &&
        new Date(s.createdAt) < thisMonth
    ).length

    const subscriberGrowth =
      lastMonthSubs > 0
        ? ((thisMonthSubs - lastMonthSubs) / lastMonthSubs) * 100
        : thisMonthSubs > 0
        ? 100
        : 0

    // Calculate PPV stats
    const ppvStats = {
      totalPPVPosts: ppvPosts.length,
      totalPPVPurchases: ppvPurchases.length,
      totalPPVRevenue: ppvRevenue,
      subscriptionRevenue: subscriptionEarnings,
      purchases: ppvPurchases.map((p) => ({
        id: p.id,
        postId: p.postId,
        postTitle: p.post.title,
        fanEmail: p.fan.email,
        pricePaid: p.pricePaid / 100, // Convert from cents
        currency: p.currency,
        provider: p.provider,
        createdAt: p.createdAt,
      })),
    }

    return NextResponse.json({
      totalEarnings,
      platformFees: totalPlatformFees / 100,
      totalWithdrawn,
      totalPending,
      availableBalance,
      earningsByTier,
      monthlyRevenue: Object.entries(monthlyRevenue).map(([month, revenue]) => ({
        month,
        revenue,
      })),
      subscriberCount,
      subscriberGrowth,
      payoutHistory: payouts.map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        status: p.status,
        createdAt: p.createdAt,
        processedAt: p.processedAt,
      })),
      ppvStats,
    })
  } catch (error) {
    console.error("Earnings fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

