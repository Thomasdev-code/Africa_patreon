export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "creator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payouts = await prisma.payoutRequest.findMany({
      where: {
        creatorId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Calculate earnings summary (including renewals)
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
    })

    // Calculate total earnings from payments and renewal transactions
    const totalEarnings = payments.reduce((sum, p) => {
      const paymentAmount = p.amount / 100
      const renewalAmount = p.PaymentTransaction
        .filter((t) => t.type === "renewal" && t.status === "success")
        .reduce((s, t) => s + t.amount / 100, 0)
      return sum + paymentAmount + renewalAmount
    }, 0)

    const paidPayouts = payouts.filter((p) => p.status === "paid")
    const totalWithdrawn = paidPayouts.reduce((sum, p) => sum + p.amount, 0)

    const pendingPayouts = payouts.filter(
      (p) => p.status === "pending" || p.status === "approved"
    )
    const totalPending = pendingPayouts.reduce((sum, p) => sum + p.amount, 0)

    const availableBalance = totalEarnings - totalPending - totalWithdrawn

    return NextResponse.json({
      payouts: payouts.map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        status: p.status,
        createdAt: p.createdAt,
        processedAt: p.processedAt,
        adminNotes: p.adminNotes,
        // Don't expose full account details for security
        accountDetails: {
          method: p.method,
          // Only show partial info
          ...(p.method === "mpesa" && {
            phoneNumber: (p.accountDetails as any)?.phoneNumber
              ? `****${(p.accountDetails as any).phoneNumber.slice(-4)}`
              : undefined,
          }),
        },
      })),
      summary: {
        totalEarnings,
        totalWithdrawn,
        totalPending,
        availableBalance,
      },
    })
  } catch (error) {
    console.error("Payouts fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

