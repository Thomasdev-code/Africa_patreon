export const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 10)

// In-memory cache for platform fee (5 minute TTL)
// For production, consider using Redis for distributed caching
let platformFeeCache: { value: number; expiresAt: number } | null = null
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Get platform fee percentage from database (Config table) or fallback to env/default
 * This is the single source of truth for platform fee percentage
 * Uses in-memory caching to reduce database queries
 */
export async function getPlatformFeePercent(): Promise<number> {
  // Check cache first
  if (platformFeeCache && platformFeeCache.expiresAt > Date.now()) {
    return platformFeeCache.value
  }

  try {
    const { prisma } = await import("@/lib/prisma")
    const config = await prisma.config.findUnique({
      where: { key: "platform_fee_percent" },
    })
    if (config) {
      const value = Number(config.value)
      if (Number.isFinite(value) && value >= 0 && value <= 100) {
        // Update cache
        platformFeeCache = {
          value,
          expiresAt: Date.now() + CACHE_TTL_MS,
        }
        return value
      }
    }
  } catch (error) {
    console.error("Error fetching platform fee from database:", error)
    // fail open to env/default to avoid blocking payments
  }
  
  // Cache default value
  platformFeeCache = {
    value: PLATFORM_FEE_PERCENT,
    expiresAt: Date.now() + CACHE_TTL_MS,
  }
  return PLATFORM_FEE_PERCENT
}

/**
 * Invalidate platform fee cache (call after updating fee in admin dashboard)
 */
export function invalidatePlatformFeeCache(): void {
  platformFeeCache = null
}

/**
 * Calculate platform fee from amount (in minor units)
 * Uses current platform fee percentage from database
 */
export async function calculatePlatformFee(amountMinor: number): Promise<number> {
  const feePercent = await getPlatformFeePercent()
  return Math.floor((amountMinor * feePercent) / 100)
}

/**
 * Calculate creator payout (amount after platform fee)
 * Uses current platform fee percentage from database
 */
export async function calculateCreatorPayout(amountMinor: number): Promise<number> {
  const fee = await calculatePlatformFee(amountMinor)
  return amountMinor - fee
}

/**
 * Synchronous version for backwards compatibility (uses env/default)
 * Use async version in new code
 */
export function calculatePlatformFeeSync(amountMinor: number, feePercent?: number): number {
  const percent = feePercent ?? PLATFORM_FEE_PERCENT
  return Math.floor((amountMinor * percent) / 100)
}

/**
 * Synchronous version for backwards compatibility (uses env/default)
 * Use async version in new code
 */
export function calculateCreatorPayoutSync(amountMinor: number, feePercent?: number): number {
  const fee = calculatePlatformFeeSync(amountMinor, feePercent)
  return amountMinor - fee
}

