/**
 * AML Risk Engine
 * Calculates risk scores and enforces limits
 */

import { prisma } from "@/lib/prisma"

export interface RiskFlags {
  chargebackCount: number
  suspiciousCountry: boolean
  mismatchingIpCountry: boolean
  tooManyCards: boolean
  tooManyFailedPayments: boolean
  suddenSubscriberSpike: boolean
  largePayoutBeforeKyc: boolean
  kycStatus?: "pending" | "approved" | "rejected" | null
}

export interface RiskScoreResult {
  riskScore: number
  flags: RiskFlags
  monthlyLimit: number
  dailyLimit: number
  blocked: boolean
}

/**
 * Calculate risk score for a user
 */
export async function calculateRiskScore(userId: string): Promise<RiskScoreResult> {
  let riskScore = 0
  const flags: RiskFlags = {
    chargebackCount: 0,
    suspiciousCountry: false,
    mismatchingIpCountry: false,
    tooManyCards: false,
    tooManyFailedPayments: false,
    suddenSubscriberSpike: false,
    largePayoutBeforeKyc: false,
  }

  // Get user data
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      kycVerification: true,
      amlRiskProfile: true,
      paymentsReceived: {
        where: { status: "success" },
        take: 100,
      },
    },
  })

  if (!user) {
    return {
      riskScore: 100,
      flags,
      monthlyLimit: 0,
      dailyLimit: 0,
      blocked: true,
    }
  }

  flags.kycStatus = (user.kycVerification?.status as "pending" | "approved" | "rejected" | undefined) || null

  // Check KYC status
  if (!user.kycVerification || user.kycVerification.status !== "approved") {
    riskScore += 20
    flags.largePayoutBeforeKyc = true
  }

  // Check chargebacks
  const chargebacks = await (prisma as any).chargeback.count({
    where: {
      creatorId: userId,
      status: "open",
    },
  })

  flags.chargebackCount = chargebacks
  if (chargebacks > 0) {
    riskScore += chargebacks * 15
  }

  // Check failed payments
  const failedPayments = await prisma.payment.count({
    where: {
      userId,
      status: "failed",
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      },
    },
  })

  if (failedPayments > 5) {
    riskScore += 20
    flags.tooManyFailedPayments = true
  }

  // Check for sudden subscriber spike (potential bot)
  const subscriptions = await prisma.subscription.count({
    where: {
      creatorId: userId,
      createdAt: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      },
    },
  })

  const previousWeekSubs = await prisma.subscription.count({
    where: {
      creatorId: userId,
      createdAt: {
        gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    },
  })

  if (previousWeekSubs > 0 && subscriptions > previousWeekSubs * 5) {
    riskScore += 25
    flags.suddenSubscriberSpike = true
  }

  // Check IP country mismatches (would need to track login IPs)
  // This is a placeholder - implement IP tracking in auth middleware
  flags.mismatchingIpCountry = false

  // Calculate limits based on risk score
  let monthlyLimit = 500 // Default $500 USD
  let dailyLimit = 100 // Default $100 USD

  if (riskScore >= 80) {
    monthlyLimit = 0
    dailyLimit = 0
  } else if (riskScore >= 60) {
    monthlyLimit = 100
    dailyLimit = 20
  } else if (riskScore >= 40) {
    monthlyLimit = 250
    dailyLimit = 50
  } else if (riskScore >= 20) {
    monthlyLimit = 500
    dailyLimit = 100
  } else {
    monthlyLimit = 10000
    dailyLimit = 1000
  }

  // Update or create risk profile
  if (user.amlRiskProfile) {
    await (prisma as any).amlRiskProfile.update({
      where: { userId },
      data: {
        riskScore,
        monthlyLimit,
        dailyLimit,
        flags,
        lastRiskUpdate: new Date(),
      },
    })
  } else {
    await (prisma as any).amlRiskProfile.create({
      data: {
        userId,
        riskScore,
        monthlyLimit,
        dailyLimit,
        flags,
      },
    })
  }

  return {
    riskScore,
    flags,
    monthlyLimit,
    dailyLimit,
    blocked: riskScore >= 80,
  }
}

/**
 * Check if transaction is allowed based on risk profile
 */
export async function checkTransactionAllowed(
  userId: string,
  amount: number,
  currency: string = "USD"
): Promise<{ allowed: boolean; reason?: string }> {
  const riskProfile = await prisma.amlRiskProfile.findUnique({
    where: { userId },
  })

  if (!riskProfile) {
    // Create risk profile if doesn't exist
    await calculateRiskScore(userId)
    return { allowed: true }
  }

  // Check if blocked
  if (riskProfile.riskScore >= 80) {
    return {
      allowed: false,
      reason: "Account blocked due to high risk score",
    }
  }

  // Check daily limit
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const wallet = await (prisma as any).creatorWallet.findUnique({
    where: { userId },
  })

  if (wallet) {
    const todayPayouts = await (prisma as any).payoutHistory.aggregate({
      where: {
        walletId: wallet.id,
        createdAt: {
          gte: today,
        },
        status: {
          in: ["pending", "processing", "completed"],
        },
      },
      _sum: {
        amount: true,
      },
    })

    const todayTotal = (todayPayouts._sum.amount || 0) + amount

    if (todayTotal > riskProfile.dailyLimit) {
      return {
        allowed: false,
        reason: `Daily limit exceeded. Limit: $${riskProfile.dailyLimit}, Used: $${todayTotal - amount}`,
      }
    }

    // Check monthly limit
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    const monthPayouts = await (prisma as any).payoutHistory.aggregate({
      where: {
        walletId: wallet.id,
        createdAt: {
          gte: monthStart,
        },
        status: {
          in: ["pending", "processing", "completed"],
        },
      },
      _sum: {
        amount: true,
      },
    })

    const monthTotal = (monthPayouts._sum.amount || 0) + amount

    if (monthTotal > riskProfile.monthlyLimit) {
      return {
        allowed: false,
        reason: `Monthly limit exceeded. Limit: $${riskProfile.monthlyLimit}, Used: $${monthTotal - amount}`,
      }
    }
  }

  return { allowed: true }
}

