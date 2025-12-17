/**
 * Fraud Detection System
 * Comprehensive fraud prevention for payment and subscription flows
 */

import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"
import crypto from "crypto"

export interface FraudCheckResult {
  allowed: boolean
  reason?: string
  severity?: "low" | "medium" | "high" | "critical"
}

export interface FraudCheckContext {
  userId?: string
  ipAddress: string
  userAgent?: string
  requestPath: string
  requestMethod: string
  creatorId?: string
  tierId?: string
  amount?: number
  currency?: string
  cardHash?: string
  webhookSignature?: string
  provider?: string
}

/**
 * Get client IP address from request
 */
export function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")
  const realIP = req.headers.get("x-real-ip")
  const cfConnectingIP = req.headers.get("cf-connecting-ip")

  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  if (realIP) {
    return realIP
  }
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  return "unknown"
}

/**
 * Check IP address against known suspicious IPs
 */
async function checkSuspiciousIP(ipAddress: string): Promise<FraudCheckResult> {
  // Check if IP has been flagged in fraud logs
  const recentFraud = await prisma.fraudLog.findFirst({
    where: {
      ipAddress,
      blocked: true,
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      },
    },
  })

  if (recentFraud) {
    await logFraudAttempt({
      userId: undefined,
      ipAddress,
      requestPath: "",
      requestMethod: "",
      fraudType: "suspicious_ip",
      severity: "high",
      details: { reason: "IP previously flagged", fraudLogId: recentFraud.id },
    })

    return {
      allowed: false,
      reason: "IP address has been flagged for suspicious activity",
      severity: "high",
    }
  }

  return { allowed: true }
}

/**
 * Rate limiting per user
 */
async function checkUserRateLimit(
  userId: string,
  windowMinutes: number = 5,
  maxRequests: number = 10
): Promise<FraudCheckResult> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000)

  const recentRequests = await prisma.fraudLog.count({
    where: {
      userId,
      createdAt: {
        gte: windowStart,
      },
      fraudType: {
        not: "resolved",
      },
    },
  })

  if (recentRequests >= maxRequests) {
    await logFraudAttempt({
      userId,
      ipAddress: "",
      requestPath: "",
      requestMethod: "",
      fraudType: "rate_limit",
      severity: "medium",
      details: {
        reason: `Too many requests: ${recentRequests} in ${windowMinutes} minutes`,
        maxRequests,
      },
    })

    return {
      allowed: false,
      reason: `Rate limit exceeded. Please try again in ${windowMinutes} minutes.`,
      severity: "medium",
    }
  }

  return { allowed: true }
}

/**
 * Rate limiting per card (using card hash)
 */
async function checkCardRateLimit(
  cardHash: string,
  windowMinutes: number = 15,
  maxTransactions: number = 3
): Promise<FraudCheckResult> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000)

  const recentTransactions = await prisma.paymentTransaction.count({
    where: {
      metadata: {
        path: ["cardHash"],
        equals: cardHash,
      },
      createdAt: {
        gte: windowStart,
      },
    },
  })

  if (recentTransactions >= maxTransactions) {
    await logFraudAttempt({
      userId: undefined,
      ipAddress: "",
      requestPath: "",
      requestMethod: "",
      fraudType: "rate_limit",
      severity: "high",
      details: {
        reason: `Too many transactions with same card: ${recentTransactions} in ${windowMinutes} minutes`,
        cardHash: cardHash.substring(0, 8) + "***", // Partial hash for logging
      },
    })

    return {
      allowed: false,
      reason: "Too many transactions with this payment method. Please try again later.",
      severity: "high",
    }
  }

  return { allowed: true }
}

/**
 * Check for duplicate transactions
 */
async function checkDuplicateTransaction(
  userId: string,
  creatorId: string,
  amount: number,
  currency: string,
  windowMinutes: number = 5
): Promise<FraudCheckResult> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000)

  const duplicate = await prisma.payment.findFirst({
    where: {
      userId,
      creatorId,
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      createdAt: {
        gte: windowStart,
      },
      status: {
        in: ["pending", "success"],
      },
    },
  })

  if (duplicate) {
    await logFraudAttempt({
      userId,
      ipAddress: "",
      requestPath: "",
      requestMethod: "",
      fraudType: "duplicate_transaction",
      severity: "high",
      details: {
        reason: "Duplicate transaction detected",
        duplicatePaymentId: duplicate.id,
        amount,
        currency,
      },
    })

    return {
      allowed: false,
      reason: "Duplicate transaction detected. Please wait before trying again.",
      severity: "high",
    }
  }

  return { allowed: true }
}

/**
 * Verify creator and tier validity
 */
async function verifyCreatorAndTier(
  creatorId: string,
  tierId?: string,
  tierName?: string
): Promise<FraudCheckResult> {
  const creator = await prisma.user.findUnique({
    where: {
      id: creatorId,
      role: "creator",
      isApproved: true,
      isBanned: false,
    },
    include: {
      creatorProfile: true,
    },
  })

  if (!creator || !creator.creatorProfile) {
    await logFraudAttempt({
      userId: undefined,
      ipAddress: "",
      requestPath: "",
      requestMethod: "",
      fraudType: "invalid_creator",
      severity: "medium",
      details: {
        reason: "Invalid or unapproved creator",
        creatorId,
      },
    })

    return {
      allowed: false,
      reason: "Creator not found or not approved",
      severity: "medium",
    }
  }

  // Verify tier exists
  if (tierId || tierName) {
    const tiers = creator.creatorProfile.tiers as any[]
    const tier = tiers.find(
      (t: any) => t.id === tierId || t.name === tierName
    )

    if (!tier) {
      await logFraudAttempt({
        userId: undefined,
        ipAddress: "",
        requestPath: "",
        requestMethod: "",
        fraudType: "invalid_creator",
        severity: "medium",
        details: {
          reason: "Invalid tier",
          creatorId,
          tierId,
          tierName,
        },
      })

      return {
        allowed: false,
        reason: "Tier not found",
        severity: "medium",
      }
    }
  }

  return { allowed: true }
}

/**
 * Check if subscription already active
 */
async function checkActiveSubscription(
  userId: string,
  creatorId: string
): Promise<FraudCheckResult> {
  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      fanId: userId,
      creatorId,
      status: "active",
    },
  })

  if (activeSubscription) {
    // This is not fraud, but we should still log it
    return {
      allowed: false,
      reason: "You already have an active subscription to this creator",
      severity: "low",
    }
  }

  return { allowed: true }
}

/**
 * Check for currency mismatch attacks
 */
async function checkCurrencyMismatch(
  userId: string,
  creatorId: string,
  currency: string,
  expectedCurrency?: string
): Promise<FraudCheckResult> {
  // Get creator's default currency from profile or previous payments
  if (expectedCurrency) {
    if (currency !== expectedCurrency) {
      await logFraudAttempt({
        userId,
        ipAddress: "",
        requestPath: "",
        requestMethod: "",
        fraudType: "currency_mismatch",
        severity: "high",
        details: {
          reason: "Currency mismatch detected",
          providedCurrency: currency,
          expectedCurrency,
        },
      })

      return {
        allowed: false,
        reason: "Currency mismatch detected",
        severity: "high",
      }
    }
  }

  return { allowed: true }
}

/**
 * Validate webhook origin
 */
export async function validateWebhookOrigin(
  provider: "STRIPE" | "PAYSTACK" | "FLUTTERWAVE",
  payload: string | any,
  signature?: string
): Promise<FraudCheckResult> {
  try {
    switch (provider) {
      case "STRIPE":
        if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
          return {
            allowed: false,
            reason: "Missing Stripe webhook signature",
            severity: "critical",
          }
        }
        // Stripe signature validation is done in stripe.ts handleWebhook
        // This is just a placeholder check
        break

      case "PAYSTACK":
        if (!signature || !process.env.PAYSTACK_SECRET_KEY) {
          return {
            allowed: false,
            reason: "Missing Paystack signature",
            severity: "critical",
          }
        }
        // Verify Paystack signature
        const hash = crypto
          .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
          .update(JSON.stringify(payload))
          .digest("hex")
        if (hash !== signature) {
          await logFraudAttempt({
            userId: undefined,
            ipAddress: "",
            requestPath: "",
            requestMethod: "",
            fraudType: "webhook_invalid",
            severity: "critical",
            details: {
              reason: "Invalid Paystack webhook signature",
              provider,
            },
          })
          return {
            allowed: false,
            reason: "Invalid Paystack webhook signature",
            severity: "critical",
          }
        }
        break

      case "FLUTTERWAVE":
        if (!signature || !process.env.FLUTTERWAVE_SECRET_KEY) {
          return {
            allowed: false,
            reason: "Missing Flutterwave hash",
            severity: "critical",
          }
        }
        // Flutterwave uses verif-hash header
        const expectedHash = crypto
          .createHash("sha256")
          .update(process.env.FLUTTERWAVE_SECRET_KEY + JSON.stringify(payload))
          .digest("hex")
        if (signature !== expectedHash) {
          await logFraudAttempt({
            userId: undefined,
            ipAddress: "",
            requestPath: "",
            requestMethod: "",
            fraudType: "webhook_invalid",
            severity: "critical",
            details: {
              reason: "Invalid Flutterwave webhook hash",
              provider,
            },
          })
          return {
            allowed: false,
            reason: "Invalid Flutterwave webhook hash",
            severity: "critical",
          }
        }
        break

      // M-Pesa is handled via Flutterwave or Paystack, so no separate case needed
    }

    return { allowed: true }
  } catch (error) {
    await logFraudAttempt({
      userId: undefined,
      ipAddress: "",
      requestPath: "",
      requestMethod: "",
      fraudType: "webhook_invalid",
      severity: "critical",
      details: {
        reason: "Webhook validation error",
        error: String(error),
        provider,
      },
    })

    return {
      allowed: false,
      reason: "Webhook validation failed",
      severity: "critical",
    }
  }
}

/**
 * Log fraud attempt
 */
export async function logFraudAttempt(context: {
  userId?: string
  ipAddress: string
  requestPath: string
  requestMethod: string
  fraudType: string
  severity: "low" | "medium" | "high" | "critical"
  details?: any
  userAgent?: string
}): Promise<void> {
  try {
    await prisma.fraudLog.create({
      data: {
        userId: context.userId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        requestPath: context.requestPath,
        requestMethod: context.requestMethod,
        fraudType: context.fraudType,
        severity: context.severity,
        details: context.details || {},
        blocked: context.severity === "critical" || context.severity === "high",
      },
    })
  } catch (error) {
    console.error("Failed to log fraud attempt:", error)
  }
}

/**
 * Comprehensive fraud check
 */
export async function performFraudChecks(
  context: FraudCheckContext
): Promise<FraudCheckResult> {
  // 1. Check suspicious IP
  const ipCheck = await checkSuspiciousIP(context.ipAddress)
  if (!ipCheck.allowed) {
    return ipCheck
  }

  // 2. Rate limiting per user
  if (context.userId) {
    const userRateCheck = await checkUserRateLimit(context.userId)
    if (!userRateCheck.allowed) {
      return userRateCheck
    }
  }

  // 3. Rate limiting per card
  if (context.cardHash) {
    const cardRateCheck = await checkCardRateLimit(context.cardHash)
    if (!cardRateCheck.allowed) {
      return cardRateCheck
    }
  }

  // 4. Duplicate transaction check
  if (
    context.userId &&
    context.creatorId &&
    context.amount &&
    context.currency
  ) {
    const duplicateCheck = await checkDuplicateTransaction(
      context.userId,
      context.creatorId,
      context.amount,
      context.currency
    )
    if (!duplicateCheck.allowed) {
      return duplicateCheck
    }
  }

  // 5. Verify creator and tier
  if (context.creatorId) {
    const creatorCheck = await verifyCreatorAndTier(
      context.creatorId,
      context.tierId,
      undefined // tierName not in context, but can be added
    )
    if (!creatorCheck.allowed) {
      return creatorCheck
    }
  }

  // 6. Check active subscription
  if (context.userId && context.creatorId) {
    const subscriptionCheck = await checkActiveSubscription(
      context.userId,
      context.creatorId
    )
    if (!subscriptionCheck.allowed) {
      return subscriptionCheck
    }
  }

  // 7. Currency mismatch check
  if (context.userId && context.creatorId && context.currency) {
    const currencyCheck = await checkCurrencyMismatch(
      context.userId,
      context.creatorId,
      context.currency
    )
    if (!currencyCheck.allowed) {
      return currencyCheck
    }
  }

  return { allowed: true }
}

