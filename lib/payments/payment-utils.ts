/**
 * Payment Utility Functions
 * Common helpers for payment processing
 */

import { prisma } from "@/lib/prisma"
import { PLATFORM_FEE_PERCENT, getPlatformFeePercent } from "@/app/config/platform"
import type { PaymentProvider } from "./types"

/**
 * Generate unique payment reference
 */
export function generatePaymentReference(
  provider: PaymentProvider,
  userId: string
): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${provider}_${timestamp}_${userId}_${random}`
}

/**
 * Convert amount to smallest currency unit (cents/kobo)
 */
export function toSmallestUnit(amount: number, currency: string): number {
  // Most currencies use 2 decimal places
  // JPY, KRW, etc. don't, but we'll handle common ones
  const noDecimalCurrencies = ["JPY", "KRW", "VND", "CLP"]
  
  if (noDecimalCurrencies.includes(currency.toUpperCase())) {
    return Math.round(amount)
  }
  
  return Math.round(amount * 100)
}

/**
 * Convert from smallest unit back to normal amount
 */
export function fromSmallestUnit(amount: number, currency: string): number {
  const noDecimalCurrencies = ["JPY", "KRW", "VND", "CLP"]
  
  if (noDecimalCurrencies.includes(currency.toUpperCase())) {
    return amount
  }
  
  return amount / 100
}

/**
 * Format currency for display
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale: string = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount)
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    KES: "KSh",
    NGN: "₦",
    ZAR: "R",
    GHS: "₵",
    JPY: "¥",
    CAD: "C$",
    AUD: "A$",
  }
  
  return symbols[currency.toUpperCase()] || currency.toUpperCase()
}

/**
 * Check if payment is idempotent (already processed)
 */
export async function isPaymentProcessed(
  reference: string,
  provider: PaymentProvider
): Promise<boolean> {
  const payment = await prisma.payment.findUnique({
    where: { reference },
  })
  
  if (!payment) {
    return false
  }
  
  // Check if payment was already successfully processed
  return payment.status === "success" && payment.webhookReceived
}

/**
 * Validate payment amount
 */
export function validateAmount(amount: number, currency: string): {
  valid: boolean
  error?: string
} {
  if (amount <= 0) {
    return { valid: false, error: "Amount must be greater than 0" }
  }
  
  // Minimum amounts per currency
  const minimums: Record<string, number> = {
    USD: 0.5,
    EUR: 0.5,
    GBP: 0.5,
    KES: 50,
    NGN: 100,
    ZAR: 5,
    GHS: 1,
  }
  
  const min = minimums[currency.toUpperCase()] || 0.5
  if (amount < min) {
    return {
      valid: false,
      error: `Minimum amount is ${formatCurrency(min, currency)}`,
    }
  }
  
  return { valid: true }
}

/**
 * Get payment provider name (string) from country code
 * @deprecated Use getProviderForCountry from @/lib/payments instead
 * This function is kept for backward compatibility but returns a string type
 */
export function getProviderNameForCountry(countryCode: string): PaymentProvider {
  const code = countryCode.toUpperCase()
  
  // Kenya - prefer Flutterwave for M-Pesa
  if (code === "KE") {
    return "FLUTTERWAVE"
  }
  
  // Nigeria, Ghana, South Africa - Paystack
  if (["NG", "GH", "ZA"].includes(code)) {
    return "PAYSTACK"
  }
  
  // Other African countries - Flutterwave
  const africanCountries = [
    "EG", "TZ", "UG", "ET", "DZ", "SD", "MA", "AO", "MZ", "MG",
    "CM", "CI", "NE", "BF", "ML", "MW", "ZM", "SN", "TD", "SO",
    "ZW", "GN", "RW", "BJ", "TN", "BI", "SS", "TG", "SL", "LY",
  ]
  
  if (africanCountries.includes(code)) {
    return "FLUTTERWAVE"
  }
  
  // Default to Stripe for rest of world
  return "STRIPE"
}

/**
 * Calculate platform fee
 */
export function calculatePlatformFee(
  amount: number,
  feePercentage: number = PLATFORM_FEE_PERCENT
): number {
  return (amount * feePercentage) / 100
}

/**
 * Calculate creator earnings (after platform fee)
 */
export function calculateCreatorEarnings(
  amount: number,
  feePercentage: number = PLATFORM_FEE_PERCENT
): number {
  return amount - calculatePlatformFee(amount, feePercentage)
}

/**
 * Get current platform fee percentage from database
 */
export async function getCurrentPlatformFee(): Promise<number> {
  // Prefer Config override if present
  const configValue = await prisma.config.findUnique({
    where: { key: "platform_fee_percent" },
  })

  if (configValue) {
    const parsed = Number(configValue.value)
    if (Number.isFinite(parsed)) return parsed
  }

  const platformFee = await prisma.platformFee.findFirst({
    orderBy: { updatedAt: "desc" },
  })

  return platformFee?.percentage ?? PLATFORM_FEE_PERCENT
}

/**
 * Calculate creator payout breakdown
 * Returns gross amount, platform fee, and creator net earnings
 * @param amount - Gross payment amount (in normal currency units, not cents)
 * @returns Object with grossAmount, platformFee, and creatorNet
 */
export async function calculateCreatorPayout(
  amount: number
): Promise<{
  grossAmount: number
  platformFee: number
  creatorNet: number
}> {
  const feePercentage = await getCurrentPlatformFee()
  const platformFee = calculatePlatformFee(amount, feePercentage)
  const creatorNet = amount - platformFee

  return {
    grossAmount: amount,
    platformFee,
    creatorNet,
  }
}

/**
 * Retry payment with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError || new Error("Retry failed")
}

