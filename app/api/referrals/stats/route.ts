export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { ReferralStats } from "@/lib/types"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all referrals by this user
    const referrals = await prisma.referral.findMany({
      where: {
        referrerId: session.user.id,
      },
      include: {
        subscription: {
          select: {
            tierName: true,
            tierPrice: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Calculate stats
    const totalClicks = referrals.length
    const totalSignups = referrals.filter(
      (r) => r.status === "signed_up" || r.status === "converted"
    ).length
    const totalConversions = referrals.filter(
      (r) => r.status === "converted" || r.status === "credited"
    ).length

    // Get credits
    const credits = await prisma.referralCredit.findMany({
      where: {
        userId: session.user.id,
      },
    })

    const totalCreditsEarned = credits.reduce((sum, c) => sum + c.amount, 0)
    const availableCredits = credits
      .filter((c) => c.status === "available")
      .reduce((sum, c) => sum + c.amount, 0)
    const pendingCredits = credits
      .filter((c) => c.status === "pending")
      .reduce((sum, c) => sum + c.amount, 0)
    const withdrawnCredits = credits
      .filter((c) => c.status === "withdrawn")
      .reduce((sum, c) => sum + c.amount, 0)

    // Tier breakdown
    const tierBreakdown: Record<string, { count: number; credits: number; revenue: number }> = {}

    referrals
      .filter((r) => r.subscription)
      .forEach((r) => {
        const tierName = r.subscription!.tierName
        if (!tierBreakdown[tierName]) {
          tierBreakdown[tierName] = { count: 0, credits: 0, revenue: 0 }
        }
        tierBreakdown[tierName].count++
        tierBreakdown[tierName].revenue += r.subscription!.tierPrice
        tierBreakdown[tierName].credits += r.creditsEarned
      })

    // Recent referrals (last 10)
    const recentReferrals = referrals.slice(0, 10).map((r) => ({
      id: r.id,
      referrerId: r.referrerId,
      referredUserId: r.referredUserId,
      referralCode: r.referralCode,
      referralLink: r.referralLink,
      type: r.type as "signup" | "subscription",
      subscriptionId: r.subscriptionId,
      subscriptionValue: r.subscriptionValue,
      creditsEarned: r.creditsEarned,
      status: r.status as "clicked" | "signed_up" | "converted" | "credited",
      clickedAt: r.clickedAt,
      convertedAt: r.convertedAt,
      createdAt: r.createdAt,
    }))

    const stats: ReferralStats = {
      totalClicks,
      totalSignups,
      totalConversions,
      totalCreditsEarned,
      availableCredits,
      pendingCredits,
      withdrawnCredits,
      tierBreakdown,
      recentReferrals,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Referral stats error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

