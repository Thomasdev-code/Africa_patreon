export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

/**
 * GET /api/admin/platform-fee/analytics
 * Get platform fee analytics (admin only)
 * Returns:
 * - Total platform fees collected
 * - Total fees per payment provider
 * - Fee history (audit trail)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all successful payments with fee metadata
    const payments = await prisma.payment.findMany({
      where: {
        status: "success",
        metadata: {
          path: ["platformFee"],
          not: Prisma.JsonNull,
        },
      },
      select: {
        id: true,
        provider: true,
        amount: true,
        currency: true,
        createdAt: true,
        metadata: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Calculate total platform fees collected
    let totalFees = 0
    const feesByProvider: Record<string, number> = {}
    const feeHistory: Array<{
      paymentId: string
      provider: string
      grossAmount: number
      platformFee: number
      creatorNet: number
      currency: string
      createdAt: Date
    }> = []

    payments.forEach((payment) => {
      const metadata = payment.metadata as any
      if (metadata?.platformFee) {
        const fee = parseFloat(metadata.platformFee) || 0
        totalFees += fee

        // Group by provider
        const provider = payment.provider
        if (!feesByProvider[provider]) {
          feesByProvider[provider] = 0
        }
        feesByProvider[provider] += fee

        // Add to fee history
        feeHistory.push({
          paymentId: payment.id,
          provider: payment.provider,
          grossAmount: metadata.grossAmount || payment.amount / 100,
          platformFee: fee,
          creatorNet: metadata.creatorNet || (payment.amount / 100 - fee),
          currency: payment.currency,
          createdAt: payment.createdAt,
        })
      }
    })

    // Get current platform fee percentage
    const currentFee = await prisma.platformFee.findFirst({
      orderBy: { updatedAt: "desc" },
    })

    // Calculate fees by month for the last 12 months
    const monthlyFees: Record<string, number> = {}
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      monthlyFees[monthKey] = 0
    }

    feeHistory.forEach((fee) => {
      const feeDate = new Date(fee.createdAt)
      const monthKey = `${feeDate.getFullYear()}-${String(feeDate.getMonth() + 1).padStart(2, "0")}`
      if (monthlyFees.hasOwnProperty(monthKey)) {
        monthlyFees[monthKey] += fee.platformFee
      }
    })

    // Get fee change history (audit trail)
    const feeHistoryRecords = await prisma.platformFee.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        percentage: true,
        updatedAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      currentFeePercentage: currentFee?.percentage || 5.0,
      totalFeesCollected: totalFees,
      feesByProvider,
      monthlyFees: Object.entries(monthlyFees).map(([month, fees]) => ({
        month,
        fees,
      })),
      feeHistory: feeHistory.slice(0, 100), // Last 100 transactions
      feeChangeHistory: feeHistoryRecords,
      totalTransactions: feeHistory.length,
    })
  } catch (error) {
    console.error("Platform fee analytics error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

