import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { withdrawalGuard } from "@/lib/payment-guard"
import { normalizeToUSD, type SupportedCurrency } from "@/lib/payments/currency"
import type { PayoutHistory } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "creator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { amount, currency, method, accountDetails } = body

    if (!amount || !method || !accountDetails) {
      return NextResponse.json(
        { error: "Amount, method, and account details are required" },
        { status: 400 }
      )
    }

    const finalCurrency = (currency || "USD") as SupportedCurrency

    // Withdrawal guard checks
    const guardCheck = await withdrawalGuard(req, amount, finalCurrency)
    if (guardCheck) {
      return guardCheck
    }

    // Get wallet
    const wallet = await (prisma as any).creatorWallet.findUnique({
      where: { userId: session.user.id },
    })

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 404 }
      )
    }

    const normalizedAmount = normalizeToUSD(amount, finalCurrency)

    // Create payout request
    const payout = await (prisma as any).payoutHistory.create({
      data: {
        walletId: wallet.id,
        amount: normalizedAmount,
        currency: finalCurrency,
        method,
        status: "pending",
        accountDetails,
      },
    })

    // Update wallet pending payouts
    await (prisma as any).creatorWallet.update({
      where: { userId: session.user.id },
      data: {
        pendingPayouts: wallet.pendingPayouts + normalizedAmount,
      },
    })

    return NextResponse.json({
      success: true,
      payout: {
        id: payout.id,
        amount: payout.amount,
        currency: payout.currency,
        method: payout.method,
        status: payout.status,
        createdAt: payout.createdAt,
      },
    })
  } catch (error: any) {
    console.error("Payout request error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "creator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const wallet = await (prisma as any).creatorWallet.findUnique({
      where: { userId: session.user.id },
      include: {
        payoutHistory: {
          orderBy: {
            createdAt: "desc",
          },
          take: 50,
        },
      },
    })

    if (!wallet) {
      return NextResponse.json({
        wallet: null,
        balance: 0,
        pendingPayouts: 0,
        availableBalance: 0,
      })
    }

    const availableBalance = wallet.balance - wallet.pendingPayouts

    return NextResponse.json({
      wallet: {
        balance: wallet.balance,
        pendingPayouts: wallet.pendingPayouts,
        availableBalance,
        currency: wallet.currency,
        frozen: wallet.frozen,
        frozenReason: wallet.frozenReason,
      },
      payouts: wallet.payoutHistory.map((p: PayoutHistory) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        method: p.method,
        status: p.status,
        createdAt: p.createdAt,
        processedAt: p.processedAt,
      })),
    })
  } catch (error: any) {
    console.error("Wallet fetch error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

