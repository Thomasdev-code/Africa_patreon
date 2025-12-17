export const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 10)

export function calculatePlatformFee(amountMinor: number) {
  return Math.floor((amountMinor * PLATFORM_FEE_PERCENT) / 100)
}

export function calculateCreatorPayout(amountMinor: number) {
  return amountMinor - calculatePlatformFee(amountMinor)
}

export async function getPlatformFeePercent(): Promise<number> {
  // Optional DB override via Config table (key = "platform_fee_percent")
  try {
    const { prisma } = await import("@/lib/prisma")
    const config = await prisma.config.findUnique({
      where: { key: "platform_fee_percent" },
    })
    if (config) {
      const value = Number(config.value)
      return Number.isFinite(value) ? value : PLATFORM_FEE_PERCENT
    }
  } catch (error) {
    // fail open to env/default to avoid blocking payments
  }
  return PLATFORM_FEE_PERCENT
}

