/**
 * Fraud Detection Middleware
 * Applies fraud checks to all payment and subscription routes
 */

import { NextRequest, NextResponse } from "next/server"
import {
  performFraudChecks,
  getClientIP,
  type FraudCheckContext,
  logFraudAttempt,
} from "./fraud"

/**
 * Middleware to check fraud before processing payment/subscription
 */
export async function fraudCheckMiddleware(
  req: NextRequest,
  context: {
    userId?: string
    creatorId?: string
    tierId?: string
    amount?: number
    currency?: string
    cardHash?: string
  }
): Promise<NextResponse | null> {
  const ipAddress = getClientIP(req)
  const userAgent = req.headers.get("user-agent") || undefined

  const fraudContext: FraudCheckContext = {
    userId: context.userId,
    ipAddress,
    userAgent,
    requestPath: req.nextUrl.pathname,
    requestMethod: req.method,
    creatorId: context.creatorId,
    tierId: context.tierId,
    amount: context.amount,
    currency: context.currency,
    cardHash: context.cardHash,
  }

  const result = await performFraudChecks(fraudContext)

  if (!result.allowed) {
    await logFraudAttempt({
      userId: context.userId,
      ipAddress,
      userAgent,
      requestPath: req.nextUrl.pathname,
      requestMethod: req.method,
      fraudType: result.reason || "fraud_check_failed",
      severity: result.severity || "medium",
      details: {
        reason: result.reason,
        context: {
          creatorId: context.creatorId,
          tierId: context.tierId,
          amount: context.amount,
          currency: context.currency,
        },
      },
    })

    return NextResponse.json(
      {
        error: result.reason || "Fraud check failed",
        code: "FRAUD_CHECK_FAILED",
      },
      { status: 403 }
    )
  }

  return null // Pass through
}

