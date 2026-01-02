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

    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Only creators can view withdrawal history" },
        { status: 403 }
      )
    }

    // Get wallet
    const wallet = await prisma.creatorWallet.findUnique({
      where: { userId: session.user.id },
    })

    if (!wallet) {
      return NextResponse.json({
        balance: 0,
        pendingPayouts: 0,
        availableAfterKycApproval: 0,
        history: [],
      })
    }

    // Get payout history
    const history = await prisma.payoutHistory.findMany({
      where: {
        walletId: wallet.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    })

    // Calculate totals
    const totals = await prisma.payoutHistory.aggregate({
      where: {
        walletId: wallet.id,
      },
      _sum: {
        amount: true,
      },
      _count: true,
    })

    const pendingTotal = await prisma.payoutHistory.aggregate({
      where: {
        walletId: wallet.id,
        status: "pending",
      },
      _sum: {
        amount: true,
      },
    })

    return NextResponse.json({
      balance: wallet.balance,
      pendingPayouts: wallet.pendingPayouts,
      availableAfterKycApproval: wallet.availableAfterKycApproval || wallet.balance,
      currency: wallet.currency,
      frozen: wallet.frozen,
      frozenReason: wallet.frozenReason,
      totals: {
        totalWithdrawn: totals._sum.amount || 0,
        totalCount: totals._count,
        pending: pendingTotal._sum.amount || 0,
      },
      history,
    })
  } catch (error: any) {
    console.error("Get withdrawal history error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get withdrawal history" },
      { status: 500 }
    )
  }
}

