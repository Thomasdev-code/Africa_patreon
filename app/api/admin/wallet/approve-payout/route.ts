import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { payoutId, status, adminNotes, providerReference } = body

    if (!payoutId || !status) {
      return NextResponse.json(
        { error: "Payout ID and status are required" },
        { status: 400 }
      )
    }

    if (!["processing", "completed", "failed", "cancelled"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      )
    }

    const payout = await (prisma as any).payoutHistory.findUnique({
      where: { id: payoutId },
      include: {
        wallet: true,
      },
    })

    if (!payout) {
      return NextResponse.json(
        { error: "Payout not found" },
        { status: 404 }
      )
    }

    // Update payout
    await (prisma as any).payoutHistory.update({
      where: { id: payoutId },
      data: {
        status,
        adminNotes,
        providerReference,
        processedAt: status === "completed" || status === "failed" ? new Date() : null,
      },
    })

    // Update wallet if completed or failed
    if (status === "completed") {
      await (prisma as any).creatorWallet.update({
        where: { id: payout.walletId },
        data: {
          balance: payout.wallet.balance - payout.amount,
          pendingPayouts: payout.wallet.pendingPayouts - payout.amount,
        },
      })
    } else if (status === "failed" || status === "cancelled") {
      await (prisma as any).creatorWallet.update({
        where: { id: payout.walletId },
        data: {
          pendingPayouts: payout.wallet.pendingPayouts - payout.amount,
        },
      })
    }

    return NextResponse.json({
      success: true,
      payout: {
        id: payout.id,
        status,
        processedAt: status === "completed" || status === "failed" ? new Date() : null,
      },
    })
  } catch (error: any) {
    console.error("Payout approval error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")

    const where: any = {}
    if (status) {
      where.status = status
    }

    const payouts = await (prisma as any).payoutHistory.findMany({
      where,
      include: {
        wallet: {
          include: {
            user: {
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
      take: 100,
    })

    return NextResponse.json({
      payouts: payouts.map((p) => ({
        id: p.id,
        userId: p.wallet.userId,
        userEmail: p.wallet.user.email,
        amount: p.amount,
        currency: p.currency,
        method: p.method,
        status: p.status,
        accountDetails: p.accountDetails,
        adminNotes: p.adminNotes,
        providerReference: p.providerReference,
        createdAt: p.createdAt,
        processedAt: p.processedAt,
      })),
    })
  } catch (error: any) {
    console.error("Payout list error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

