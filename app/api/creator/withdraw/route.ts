import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { withdrawalGuard } from "@/lib/payment-guard"
import { normalizeToUSD, type SupportedCurrency } from "@/lib/payments/currency"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "creator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { amount, method, accountDetails, currency } = body

    if (!amount || !method || !accountDetails) {
      return NextResponse.json(
        { error: "Amount, method, and account details are required" },
        { status: 400 }
      )
    }

    const finalCurrency = (currency || "USD") as SupportedCurrency

    // Withdrawal guard checks (KYC, AML, balance)
    const guardCheck = await withdrawalGuard(req, amount, finalCurrency)
    if (guardCheck) {
      return guardCheck
    }

    // Get or create wallet (will work after Prisma generate)
    let wallet = await (prisma as any).creatorWallet.findUnique({
      where: { userId: session.user.id },
    })

    if (!wallet) {
      wallet = await (prisma as any).creatorWallet.create({
        data: {
          userId: session.user.id,
          balance: 0,
          currency: "USD",
        },
      })
    }

    const normalizedAmount = normalizeToUSD(amount, finalCurrency)

    if (normalizedAmount < 10) {
      return NextResponse.json(
        { error: "Minimum withdrawal amount is $10" },
        { status: 400 }
      )
    }

    // Validate method-specific account details
    const validMethods = [
      "mpesa",
      "bank",
      "stripe_connect",
      "flutterwave",
      "paystack",
    ]

    if (!validMethods.includes(method)) {
      return NextResponse.json(
        { error: "Invalid withdrawal method" },
        { status: 400 }
      )
    }

    // Method-specific validation
    if (method === "mpesa" && !accountDetails.phoneNumber) {
      return NextResponse.json(
        { error: "Phone number required for M-Pesa" },
        { status: 400 }
      )
    }

    if (method === "bank" && !accountDetails.accountNumber) {
      return NextResponse.json(
        { error: "Account number required for bank transfer" },
        { status: 400 }
      )
    }

    // Create payout in new wallet system
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
      availableBalance: wallet.balance - wallet.pendingPayouts - normalizedAmount,
    })
  } catch (error: any) {
    console.error("Withdrawal request error:", error)
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

    // Get wallet with payout history
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
        payouts: [],
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
      payouts: wallet.payoutHistory.map((p: any) => ({
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
    console.error("Withdrawal fetch error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

