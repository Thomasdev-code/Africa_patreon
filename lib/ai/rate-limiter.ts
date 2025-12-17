/**
 * Rate Limiter for AI Endpoints
 * Prevents abuse by limiting requests per creator
 */

import { prisma, executeWithReconnect } from "@/lib/prisma"

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour
const MAX_REQUESTS_PER_HOUR = 20 // Max 20 AI requests per hour per creator

export async function checkRateLimit(
  userId: string
): Promise<RateLimitResult> {
  try {
    const oneHourAgo = new Date(Date.now() - RATE_LIMIT_WINDOW)

    // Count requests in the last hour
    const recentRequests = await executeWithReconnect(() =>
      prisma.aiUsageHistory.count({
        where: {
          userId,
          createdAt: {
            gte: oneHourAgo,
          },
        },
      })
    )

    const remaining = Math.max(0, MAX_REQUESTS_PER_HOUR - recentRequests)
    const resetAt = new Date(Date.now() + RATE_LIMIT_WINDOW)

    return {
      allowed: remaining > 0,
      remaining,
      resetAt,
    }
  } catch (error) {
    console.error("Rate limit check error:", error)
    // On error, allow the request but log it
    return {
      allowed: true,
      remaining: MAX_REQUESTS_PER_HOUR,
      resetAt: new Date(Date.now() + RATE_LIMIT_WINDOW),
    }
  }
}

