export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's referral code
    const referralCode = await prisma.referralCode.findUnique({
      where: { userId: session.user.id },
      include: {
        referrals: {
          where: {
            status: {
              in: ["converted", "credited"],
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
      },
    })

    if (!referralCode) {
      return NextResponse.json({
        code: null,
        referralLink: null,
        stats: {
          totalReferrals: 0,
          totalEarnings: 0,
          pendingPayouts: 0,
        },
      })
    }

    // Calculate stats
    const totalReferrals = await prisma.referral.count({
      where: {
        referralCode: referralCode.code,
      },
    })

    const totalEarnings = await prisma.referral.aggregate({
      where: {
        referralCode: referralCode.code,
        status: "credited",
      },
      _sum: {
        creditsEarned: true,
      },
    })

    const pendingPayouts = await prisma.referralPayout.aggregate({
      where: {
        creatorId: session.user.id,
        status: "pending",
      },
      _sum: {
        amount: true,
      },
    })

    return NextResponse.json({
      code: referralCode.code,
      referralLink: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/signup?ref=${referralCode.code}`,
      isActive: referralCode.isActive,
      stats: {
        totalReferrals,
        totalEarnings: totalEarnings._sum.creditsEarned || 0,
        pendingPayouts: pendingPayouts._sum.amount || 0,
      },
      recentReferrals: referralCode.referrals,
    })
  } catch (error: any) {
    console.error("Get referral code error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get referral code" },
      { status: 500 }
    )
  }
}

