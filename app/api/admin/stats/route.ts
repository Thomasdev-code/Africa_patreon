export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getPlatformFeePercent } from "@/app/config/platform"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [totalUsers, totalCreators, totalFans, subscriptions, activeSubscriptions, ppvPosts, ppvPurchases, ppvPayments, successfulPayments, feePercent] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "creator" } }),
      prisma.user.count({ where: { role: "fan" } }),
      prisma.subscription.findMany({
        select: { tierPrice: true, status: true },
      }),
      prisma.subscription.count({ where: { status: "active" } }),
      prisma.post.count({ where: { isPPV: true } }),
      prisma.pPVPurchase.count(),
      prisma.payment.findMany({
        where: {
          metadata: {
            path: ["type"],
            equals: "ppv",
          },
          status: "success",
        },
        select: { amount: true, currency: true },
      }),
      prisma.payment.findMany({
        where: { status: "success" },
        select: { currency: true, platformFee: true, creatorEarnings: true },
      }),
      getPlatformFeePercent(),
    ])

    const totalRevenue = subscriptions
      .filter((s) => s.status === "active")
      .reduce((sum, s) => sum + s.tierPrice, 0)

    // Calculate PPV revenue (sum of all successful PPV payments)
    const ppvRevenue = ppvPayments.reduce((sum, p) => {
      // Convert from cents to dollars
      return sum + (p.amount / 100)
    }, 0)

    // Get PPV purchases by creator
    const ppvPurchasesByCreator = await prisma.pPVPurchase.groupBy({
      by: ["postId"],
      _count: true,
      _sum: {
        pricePaid: true,
      },
    })

    // Get creator info for top PPV earners
    const topPPVCreators = await prisma.post.findMany({
      where: {
        isPPV: true,
        ppvPurchases: {
          some: {},
        },
      },
      include: {
        creator: {
          include: {
            creatorProfile: {
              select: {
                username: true,
              },
            },
          },
        },
        ppvPurchases: {
          select: {
            pricePaid: true,
          },
        },
      },
    })

    const creatorPPVEarnings = topPPVCreators.map((post) => ({
      creatorId: post.creatorId,
      username: post.creator.creatorProfile?.username || "Unknown",
      postId: post.id,
      postTitle: post.title,
      purchases: post.ppvPurchases.length,
      revenue: post.ppvPurchases.reduce((sum, p) => sum + (p.pricePaid / 100), 0),
    }))

    // Aggregate platform revenue and creator earnings by currency
    const platformRevenueByCurrency: Record<string, number> = {}
    const creatorEarningsByCurrency: Record<string, number> = {}
    successfulPayments.forEach((p) => {
      platformRevenueByCurrency[p.currency] =
        (platformRevenueByCurrency[p.currency] || 0) + (p.platformFee || 0)
      creatorEarningsByCurrency[p.currency] =
        (creatorEarningsByCurrency[p.currency] || 0) + (p.creatorEarnings || 0)
    })

    return NextResponse.json({
      totalUsers,
      totalCreators,
      totalFans,
      totalSubscriptions: subscriptions.length,
      activeSubscriptions,
      totalRevenue,
      platformFeePercent: feePercent,
      platformRevenueByCurrency,
      creatorEarningsByCurrency,
      ppvStats: {
        totalPPVPosts: ppvPosts,
        totalPPVPurchases: ppvPurchases,
        totalPPVRevenue: ppvRevenue,
        topCreators: creatorPPVEarnings
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10),
      },
    })
  } catch (error) {
    console.error("Admin stats error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

