/**
 * Payment Guard Middleware
 * Ensures payment safety through KYC, AML, and validation checks
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { checkTransactionAllowed } from "./risk-engine"
import { getCurrencyForCountryCode, normalizeToUSD, type SupportedCurrency } from "./payments/currency"

export interface PaymentGuardContext {
  userId?: string
  creatorId?: string
  amount?: number
  currency?: SupportedCurrency
  country?: string
  requireKyc?: boolean
}

/**
 * Payment guard - validates payment requests
 */
export async function paymentGuard(
  req: NextRequest,
  context: PaymentGuardContext
): Promise<NextResponse | null> {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = context.userId || session.user.id

  // Check if user is banned
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      kycVerification: true,
      amlRiskProfile: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  if (user.isBanned) {
    return NextResponse.json(
      { error: "Account is banned" },
      { status: 403 }
    )
  }

  // KYC check for withdrawals
  if (context.requireKyc !== false) {
    if (!user.kycVerification || user.kycVerification.status !== "approved") {
      return NextResponse.json(
        {
          error: "KYC verification required",
          kycRequired: true,
          kycStatus: user.kycVerification?.status || "pending",
        },
        { status: 403 }
      )
    }
  }

  // AML risk check
  if (context.amount) {
    const normalizedAmount = normalizeToUSD(
      context.amount,
      context.currency || "USD"
    )

    const riskCheck = await checkTransactionAllowed(
      userId,
      normalizedAmount,
      "USD"
    )

    if (!riskCheck.allowed) {
      return NextResponse.json(
        {
          error: riskCheck.reason || "Transaction not allowed",
          code: "AML_BLOCKED",
        },
        { status: 403 }
      )
    }
  }

  // Currency validation
  if (context.currency && context.country) {
    const expectedCurrency = getCurrencyForCountryCode(context.country)
    if (context.currency !== expectedCurrency) {
      // Allow but log for review
      console.warn(
        `Currency mismatch: ${context.currency} vs expected ${expectedCurrency} for country ${context.country}`
      )
    }
  }

  // Check wallet freeze (for creators)
  if (context.creatorId) {
    const wallet = await (prisma as any).creatorWallet.findUnique({
      where: { userId: context.creatorId },
    })

    if (wallet?.frozen) {
      return NextResponse.json(
        {
          error: "Wallet is frozen",
          reason: wallet.frozenReason,
        },
        { status: 403 }
      )
    }
  }

  return null // All checks passed
}

/**
 * Withdrawal guard - specific checks for withdrawals
 */
export async function withdrawalGuard(
  req: NextRequest,
  amount: number,
  currency: SupportedCurrency = "USD"
): Promise<NextResponse | null> {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // KYC is mandatory for withdrawals
  const kycCheck = await paymentGuard(req, {
    userId: session.user.id,
    amount,
    currency,
    requireKyc: true,
  })

  if (kycCheck) {
    return kycCheck
  }

  // Check wallet balance
  const wallet = await (prisma as any).creatorWallet.findUnique({
    where: { userId: session.user.id },
  })

  if (!wallet) {
    return NextResponse.json(
      { error: "Wallet not found" },
      { status: 404 }
    )
  }

  const normalizedAmount = normalizeToUSD(amount, currency)

  if (wallet.balance < normalizedAmount) {
    return NextResponse.json(
      { error: "Insufficient balance" },
      { status: 400 }
    )
  }

  // Check pending payouts
  const availableBalance = wallet.balance - wallet.pendingPayouts

  if (availableBalance < normalizedAmount) {
    return NextResponse.json(
      {
        error: "Insufficient available balance",
        availableBalance,
        pendingPayouts: wallet.pendingPayouts,
      },
      { status: 400 }
    )
  }

  return null
}

