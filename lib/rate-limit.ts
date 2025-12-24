/**
 * Rate Limiting Middleware for API Routes
 * Prevents abuse and DDoS attacks on payment and sensitive endpoints
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Maximum requests per window
  keyGenerator?: (req: NextRequest) => string // Custom key generator
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  retryAfter?: number
}

const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

/**
 * Simple in-memory rate limiter
 * For production, use Redis or a dedicated rate limiting service
 */
export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = config.keyGenerator
    ? config.keyGenerator(req)
    : getDefaultKey(req)

  const now = Date.now()
  const windowStart = now - config.windowMs

  // Clean up old entries
  if (rateLimitStore.size > 10000) {
    // Prevent memory leak - clear old entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetAt < now) {
        rateLimitStore.delete(k)
      }
    }
  }

  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetAt < now) {
    // New window or expired
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(now + config.windowMs),
    }
  }

  if (entry.count >= config.maxRequests) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(entry.resetAt),
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    }
  }

  // Increment count
  entry.count++
  rateLimitStore.set(key, entry)

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: new Date(entry.resetAt),
  }
}

function getDefaultKey(req: NextRequest): string {
  // Use IP address + user ID if authenticated
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
  const userId = req.headers.get("x-user-id") || "anonymous"
  return `${ip}:${userId}`
}

/**
 * Rate limit middleware for payment endpoints
 * Limits: 10 requests per minute per user/IP
 */
export async function paymentRateLimit(req: NextRequest): Promise<RateLimitResult> {
  return rateLimit(req, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyGenerator: (req) => {
      const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
      const userId = req.headers.get("x-user-id") || "anonymous"
      return `payment:${ip}:${userId}`
    },
  })
}

/**
 * Rate limit middleware for webhook endpoints
 * Limits: 100 requests per minute per IP (webhooks come from payment providers)
 */
export async function webhookRateLimit(req: NextRequest): Promise<RateLimitResult> {
  return rateLimit(req, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyGenerator: (req) => {
      const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"
      return `webhook:${ip}`
    },
  })
}

/**
 * Rate limit middleware wrapper for API routes
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  rateLimitFn: (req: NextRequest) => Promise<RateLimitResult>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const result = await rateLimitFn(req)

    if (!result.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `Too many requests. Please try again after ${result.retryAfter} seconds.`,
          retryAfter: result.retryAfter,
          resetAt: result.resetAt.toISOString(),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(result.retryAfter || 60),
            "X-RateLimit-Limit": "10",
            "X-RateLimit-Remaining": String(result.remaining),
            "X-RateLimit-Reset": String(Math.floor(result.resetAt.getTime() / 1000)),
          },
        }
      )
    }

    return handler(req)
  }
}

