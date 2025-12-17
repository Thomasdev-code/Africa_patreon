import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { calculateRiskScore } from "@/lib/risk-engine"
import { createNotification } from "@/lib/notifications"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { chargebackId, status } = body

    if (!chargebackId || !status) {
      return NextResponse.json(
        { error: "Chargeback ID and status are required" },
        { status: 400 }
      )
    }

    if (!["won", "lost"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be 'won' or 'lost'" },
        { status: 400 }
      )
    }

    const chargeback = await (prisma as any).chargeback.findUnique({
      where: { id: chargebackId },
      include: {
        creator: true,
      },
    })

    if (!chargeback) {
      return NextResponse.json(
        { error: "Chargeback not found" },
        { status: 404 }
      )
    }

    // Update chargeback status
    await (prisma as any).chargeback.update({
      where: { id: chargebackId },
      data: {
        status,
        resolvedAt: new Date(),
      },
    })

    const wallet = await (prisma as any).creatorWallet.findUnique({
      where: { userId: chargeback.creatorId },
    })

    if (status === "won") {
      // Unfreeze wallet
      if (wallet) {
        await (prisma as any).creatorWallet.update({
          where: { userId: chargeback.creatorId },
          data: {
            frozen: false,
            frozenReason: null,
          },
        })
      }

      await createNotification(
        chargeback.creatorId,
        "chargeback",
        "Chargeback Resolved",
        `Chargeback for ${chargeback.amount / 100} ${chargeback.currency} has been resolved in your favor. Your wallet has been unfrozen.`,
        "/creator/dashboard"
      )
    } else {
      // Lost - deduct from wallet
      if (wallet) {
        const amountUSD = chargeback.amount / 100 // Assuming already in USD cents

        await (prisma as any).creatorWallet.update({
          where: { userId: chargeback.creatorId },
          data: {
            balance: Math.max(0, wallet.balance - amountUSD),
            frozen: false,
            frozenReason: null,
          },
        })
      }

      await createNotification(
        chargeback.creatorId,
        "chargeback",
        "Chargeback Resolved",
        `Chargeback for ${chargeback.amount / 100} ${chargeback.currency} has been resolved against you. Amount deducted from wallet.`,
        "/creator/dashboard"
      )
    }

    // Recalculate risk score
    await calculateRiskScore(chargeback.creatorId)

    return NextResponse.json({
      success: true,
      chargeback: {
        id: chargeback.id,
        status,
        resolvedAt: new Date(),
      },
    })
  } catch (error: any) {
    console.error("Chargeback resolve error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

