export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateReferralCode, getReferralStats } from "@/lib/referrals"
import type { ReferralDashboard } from "@/lib/types"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get or generate referral code
    let user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        creatorProfile: {
          select: {
            username: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Generate referral code if doesn't exist
    if (!user.referralCode) {
      const code = await generateReferralCode(
        user.id,
        user.creatorProfile?.username
      )
      user.referralCode = code
    }

    const referralLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/r/${user.referralCode}`

    // Get stats
    const stats = await getReferralStats(user.id)

    // Get credits
    const credits = await prisma.referralCredit.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    // Format credits for response
    const formattedCredits = credits.map((credit) => ({
      id: credit.id,
      userId: credit.userId,
      referralId: credit.referralId,
      amount: credit.amount,
      type: credit.type,
      status: credit.status,
      description: credit.description,
      withdrawalId: credit.withdrawalId,
      convertedTo: credit.convertedTo,
      createdAt: credit.createdAt.toISOString(),
    }))

    // Format recent referrals for stats
    const recentReferrals = stats.recentReferrals.map((ref) => ({
      id: ref.id,
      referrerId: ref.referrerId,
      referredUserId: ref.referredUserId,
      referralCode: ref.referralCode,
      referralLink: ref.referralLink,
      type: ref.type,
      subscriptionId: ref.subscriptionId,
      subscriptionValue: ref.subscriptionValue,
      creditsEarned: ref.creditsEarned,
      status: ref.status,
      clickedAt: ref.clickedAt.toISOString(),
      convertedAt: ref.convertedAt?.toISOString() || null,
      createdAt: ref.createdAt.toISOString(),
    }))

    // Return in the correct ReferralDashboard structure
    return NextResponse.json({
      referralCode: user.referralCode,
      referralLink,
      stats: {
        totalClicks: stats.totalClicks,
        totalSignups: stats.totalSignups,
        totalConversions: stats.totalConversions,
        totalCreditsEarned: stats.totalCreditsEarned,
        availableCredits: stats.availableCredits,
        withdrawnCredits: stats.withdrawnCredits,
        tierBreakdown: stats.tierBreakdown,
        recentReferrals: recentReferrals,
      },
      credits: formattedCredits,
    })
  } catch (error) {
    console.error("Referral dashboard error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

