/**
 * Unified Internal Payment API
 * All payment providers map to this internal shape
 */

import type { PaymentProvider } from "./types"
import { normalizeToUSD, type SupportedCurrency } from "./currency"
import { calculateTax } from "@/lib/tax/tax-engine"

export interface UnifiedPaymentRequest {
  provider: PaymentProvider
  externalId: string
  amount: number
  currency: SupportedCurrency
  status: "pending" | "success" | "failed"
  userId: string
  creatorId: string
  tierId: string
  countryCode?: string
  metadata?: Record<string, any>
}

export interface UnifiedPaymentResponse {
  provider: PaymentProvider
  externalId: string
  amount: number // Amount in cents/smallest currency unit
  currency: SupportedCurrency
  status: "pending" | "success" | "failed"
  userId: string
  creatorId: string
  tierId: string
  taxAmount: number // Tax in cents
  taxRate: number // Tax rate percentage
  countryCode?: string
  referralCommission?: number // Referral commission in cents
  amountUSD: number // Normalized to USD for internal storage
  metadata?: Record<string, any>
}

/**
 * Convert payment request to unified format
 */
export function toUnifiedPayment(
  request: UnifiedPaymentRequest
): UnifiedPaymentResponse {
  // Calculate tax if country code provided
  let taxAmount = 0
  let taxRate = 0

  if (request.countryCode) {
    const taxCalculation = calculateTax(
      request.amount / 100, // Convert from cents to dollars
      request.countryCode
    )
    taxAmount = Math.round(taxCalculation.taxAmount * 100) // Convert back to cents
    taxRate = taxCalculation.taxRate
  }

  // Normalize to USD for internal storage
  const amountUSD = normalizeToUSD(
    request.amount / 100,
    request.currency
  )

  return {
    provider: request.provider,
    externalId: request.externalId,
    amount: request.amount,
    currency: request.currency,
    status: request.status,
    userId: request.userId,
    creatorId: request.creatorId,
    tierId: request.tierId,
    taxAmount,
    taxRate,
    countryCode: request.countryCode,
    referralCommission: request.metadata?.referralCommission
      ? Math.round(request.metadata.referralCommission * 100)
      : undefined,
    amountUSD: Math.round(amountUSD * 100), // Convert to cents
    metadata: request.metadata,
  }
}

