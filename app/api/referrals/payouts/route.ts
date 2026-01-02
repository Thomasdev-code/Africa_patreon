export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const payoutSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default("USD"),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all referral payouts for creator
    const payouts = await prisma.referralPayout.findMany({
      where: {
        creatorId: session.user.id,
      },
      include: {
        referral: {
          include: {
            referred: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Calculate totals
    const totals = await prisma.referralPayout.aggregate({
      where: {
        creatorId: session.user.id,
      },
      _sum: {
        amount: true,
      },
      _count: true,
    })

    const pendingTotal = await prisma.referralPayout.aggregate({
      where: {
        creatorId: session.user.id,
        status: "pending",
      },
      _sum: {
        amount: true,
      },
    })

    return NextResponse.json({
      payouts,
      totals: {
        total: totals._sum.amount || 0,
        count: totals._count,
        pending: pendingTotal._sum.amount || 0,
      },
    })
  } catch (error: any) {
    console.error("Get referral payouts error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get referral payouts" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Only creators can request referral payouts" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const validated = payoutSchema.parse(body)

    // Get total available referral earnings
    const totalEarnings = await prisma.referral.aggregate({
      where: {
        referrerId: session.user.id,
        status: "credited",
      },
      _sum: {
        creditsEarned: true,
      },
    })

    const totalPaid = await prisma.referralPayout.aggregate({
      where: {
        creatorId: session.user.id,
        status: "paid",
      },
      _sum: {
        amount: true,
      },
    })

    const available = (totalEarnings._sum.creditsEarned || 0) - (totalPaid._sum.amount || 0)

    if (validated.amount > available) {
      return NextResponse.json(
        { error: "Insufficient referral earnings" },
        { status: 400 }
      )
    }

    // Get referrals that haven't been paid out yet
    const unpaidReferrals = await prisma.referral.findMany({
      where: {
        referrerId: session.user.id,
        status: "credited",
        payouts: {
          none: {
            status: "paid",
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    // Create payout records
    let remainingAmount = validated.amount
    const payoutRecords = []

    for (const referral of unpaidReferrals) {
      if (remainingAmount <= 0) break

      const payoutAmount = Math.min(remainingAmount, referral.creditsEarned || 0)
      
      const payout = await prisma.referralPayout.create({
        data: {
          referralId: referral.id,
          creatorId: session.user.id,
          amount: payoutAmount,
          currency: validated.currency,
          status: "pending",
        },
      })

      payoutRecords.push(payout)
      remainingAmount -= payoutAmount
    }

    return NextResponse.json({
      success: true,
      payouts: payoutRecords,
      totalAmount: validated.amount,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Request referral payout error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to request payout" },
      { status: 500 }
    )
  }
}

