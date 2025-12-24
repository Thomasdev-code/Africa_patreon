/**
 * Fraud Prevention Layer
 * Velocity checks, duplicate detection, BIN validation, mobile money fraud flags
 */

import { prisma } from "@/lib/prisma"
import type { PaymentProvider } from "./types"

export interface FraudCheckResult {
  allowed: boolean
  reason?: string
  severity?: "low" | "medium" | "high" | "critical"
  flags?: string[]
}

/**
 * Check payment velocity (too many payments in short time)
 */
export async function checkPaymentVelocity(
  userId: string,
  timeWindowMinutes: number = 60,
  maxPayments: number = 5
): Promise<FraudCheckResult> {
  const timeWindow = new Date(Date.now() - timeWindowMinutes * 60 * 1000)

  const recentPayments = await prisma.payment.count({
    where: {
      userId,
      createdAt: {
        gte: timeWindow,
      },
    },
  })

  if (recentPayments >= maxPayments) {
    return {
      allowed: false,
      reason: `Too many payments (${recentPayments}) in the last ${timeWindowMinutes} minutes`,
      severity: "high",
      flags: ["velocity_check_failed"],
    }
  }

  return { allowed: true }
}

/**
 * Detect duplicate payment attempts
 */
export async function detectDuplicatePayment(
  userId: string,
  creatorId: string,
  amount: number,
  currency: string,
  timeWindowMinutes: number = 5
): Promise<FraudCheckResult> {
  const timeWindow = new Date(Date.now() - timeWindowMinutes * 60 * 1000)

  const duplicate = await prisma.payment.findFirst({
    where: {
      userId,
      creatorId,
      amount: Math.round(amount * 100),
      currency,
      createdAt: {
        gte: timeWindow,
      },
      status: {
        in: ["pending", "success"],
      },
    },
  })

  if (duplicate) {
    return {
      allowed: false,
      reason: "Duplicate payment detected",
      severity: "medium",
      flags: ["duplicate_payment"],
    }
  }

  return { allowed: true }
}

/**
 * Verify card BIN country vs IP address
 */
export async function verifyCardBinCountry(
  cardBin: string,
  ipAddress: string
): Promise<FraudCheckResult> {
  // In production, use a BIN lookup service (e.g., Binlist.net)
  // For now, this is a placeholder
  
  try {
    // Get IP geolocation
    const ipResponse = await fetch(`https://ipapi.co/${ipAddress}/json/`)
    const ipData = await ipResponse.json()
    
    // Get card BIN country (would need BIN lookup API)
    // For now, we'll skip this check but log it
    
    // If countries don't match, flag as suspicious
    // This is a simplified check - in production, use proper BIN lookup
    
    return { allowed: true }
  } catch (error) {
    // If we can't verify, allow but flag
    return {
      allowed: true,
      flags: ["bin_verification_failed"],
      severity: "low",
    }
  }
}

/**
 * Check mobile money fraud flags
 */
export async function checkMobileMoneyFraud(
  phoneNumber: string,
  userId: string
): Promise<FraudCheckResult> {
  const flags: string[] = []

  // Check if phone number has been used by multiple accounts
  const accountsWithPhone = await prisma.payment.groupBy({
    by: ["userId"],
    where: {
      metadata: {
        path: ["phoneNumber"],
        equals: phoneNumber,
      },
    },
  })

  if (accountsWithPhone.length > 3) {
    flags.push("phone_used_multiple_accounts")
    return {
      allowed: false,
      reason: "Phone number associated with too many accounts",
      severity: "high",
      flags,
    }
  }

  // Check for rapid mobile money payments
  const recentMobilePayments = await prisma.payment.count({
    where: {
      userId,
      provider: {
        in: ["PAYSTACK"],
      },
      metadata: {
        path: ["phoneNumber"],
        equals: phoneNumber,
      },
      createdAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
      },
    },
  })

  if (recentMobilePayments > 3) {
    flags.push("rapid_mobile_payments")
    return {
      allowed: false,
      reason: "Too many mobile money payments in short time",
      severity: "medium",
      flags,
    }
  }

  return { allowed: true, flags: flags.length > 0 ? flags : undefined }
}

/**
 * Check for too many failed payment attempts
 */
export async function checkFailedAttempts(
  userId: string,
  timeWindowHours: number = 24,
  maxFailures: number = 5
): Promise<FraudCheckResult> {
  const timeWindow = new Date(Date.now() - timeWindowHours * 60 * 60 * 1000)

  const failedPayments = await prisma.payment.count({
    where: {
      userId,
      status: "failed",
      createdAt: {
        gte: timeWindow,
      },
    },
  })

  if (failedPayments >= maxFailures) {
    // Block user temporarily
    await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: true,
      },
    })

    return {
      allowed: false,
      reason: `Too many failed payment attempts (${failedPayments}). Account temporarily blocked.`,
      severity: "critical",
      flags: ["account_blocked"],
    }
  }

  return { allowed: true }
}

/**
 * Comprehensive fraud check
 */
export async function performFraudChecks(params: {
  userId: string
  creatorId: string
  amount: number
  currency: string
  provider: PaymentProvider
  phoneNumber?: string
  cardBin?: string
  ipAddress?: string
}): Promise<FraudCheckResult> {
  const checks: FraudCheckResult[] = []

  // Velocity check
  const velocityCheck = await checkPaymentVelocity(params.userId)
  checks.push(velocityCheck)

  // Duplicate check
  const duplicateCheck = await detectDuplicatePayment(
    params.userId,
    params.creatorId,
    params.amount,
    params.currency
  )
  checks.push(duplicateCheck)

  // Failed attempts check
  const failedCheck = await checkFailedAttempts(params.userId)
  checks.push(failedCheck)

  // Mobile money fraud check
  if (params.phoneNumber) {
    const mobileCheck = await checkMobileMoneyFraud(
      params.phoneNumber,
      params.userId
    )
    checks.push(mobileCheck)
  }

  // Card BIN check
  if (params.cardBin && params.ipAddress) {
    const binCheck = await verifyCardBinCountry(params.cardBin, params.ipAddress)
    checks.push(binCheck)
  }

  // Find any blocking checks
  const blockingCheck = checks.find((check) => !check.allowed)
  if (blockingCheck) {
    return blockingCheck
  }

  // Collect all flags
  const allFlags = checks
    .flatMap((check) => check.flags || [])
    .filter(Boolean)

  return {
    allowed: true,
    flags: allFlags.length > 0 ? allFlags : undefined,
    severity: allFlags.length > 0 ? "low" : undefined,
  }
}

/**
 * Log fraud attempt
 */
export async function logFraudAttempt(params: {
  userId: string
  fraudType: string
  reason: string
  severity: "low" | "medium" | "high" | "critical"
  metadata?: Record<string, any>
}): Promise<void> {
  await prisma.fraudLog.create({
    data: {
      userId: params.userId,
      ipAddress: params.metadata?.ipAddress || "",
      userAgent: params.metadata?.userAgent || "",
      requestPath: params.metadata?.requestPath || "",
      requestMethod: params.metadata?.requestMethod || "",
      fraudType: params.fraudType,
      severity: params.severity,
      details: params.metadata,
      blocked: params.severity === "critical",
    },
  })
}

