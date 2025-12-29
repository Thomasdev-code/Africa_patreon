/**
 * Paystack-only Payment Router
 */

import { paystackSDK } from "./payment-providers"
import type { PaymentProvider, PaymentStatus } from "./types"
import { sendMpesaStkPush } from "./mpesa"
import { getProviderNameForCountry } from "./payment-utils"

export interface PaymentRequest {
  amount: number
  currency: string
  userId: string
  creatorId: string
  tierId?: string
  tierName: string
  country?: string
  providerPreference?: PaymentProvider[]
  metadata?: Record<string, any>
}

export interface SubscriptionRequest extends PaymentRequest {
  autoRenew?: boolean
  interval?: "month" | "year"
}

export interface PayoutRequest {
  amount: number
  currency: string
  creatorId: string
  method: "bank" | "mobile_money"
  accountDetails: {
    phoneNumber?: string
    accountNumber?: string
    bankCode?: string
    recipientCode?: string
  }
  metadata?: Record<string, any>
}

/**
 * Start a one-time payment (Paystack-only).
 */
export async function startOneTimePayment(
  request: PaymentRequest
): Promise<{
  success: boolean
  provider: PaymentProvider
  reference: string
  redirectUrl?: string
  accessCode?: string
  metadata?: Record<string, any>
  error?: string
}> {
  const provider: PaymentProvider = "PAYSTACK"
  try {
    const result = await paystackSDK.initializePayment({
      amount: request.amount,
      currency: request.currency,
      userId: request.userId,
      creatorId: request.creatorId,
      tierName: request.tierName,
      metadata: request.metadata,
    })

    return {
      success: true,
      provider,
      reference: result.reference,
      redirectUrl: result.redirectUrl,
      accessCode: result.accessCode,
      metadata: result.metadata,
    }
  } catch (error: any) {
    console.error("Paystack payment failed:", error)
    return {
      success: false,
      provider,
      reference: "",
      error: error.message || "Paystack payment failed",
    }
  }
}

/**
 * Create subscription with auto-renewal (Paystack-only).
 * Currently uses one-time payment initialization; Paystack plan handling
 * is managed in higher-level subscription flows.
 */
export async function startSubscription(
  request: SubscriptionRequest
): Promise<{
  success: boolean
  provider: PaymentProvider
  subscriptionId?: string
  reference: string
  redirectUrl?: string
  metadata?: Record<string, any>
  error?: string
}> {
  const result = await startOneTimePayment(request)
  return {
    success: result.success,
    provider: result.provider,
    reference: result.reference,
    redirectUrl: result.redirectUrl,
    metadata: result.metadata,
    error: result.error,
  }
}

/**
 * Cancel subscription (no-op for Paystack; handled in DB/state).
 */
export async function cancelSubscription(
  _provider: PaymentProvider,
  _subscriptionId: string
): Promise<{
  success: boolean
  error?: string
}> {
  return { success: true }
}

/**
 * Process Paystack webhook.
 */
export async function processWebhook(
  _provider: PaymentProvider,
  payload: any,
  signature?: string
): Promise<{
  event: string
  reference: string
  status: PaymentStatus
  amount: number
  currency: string
  metadata?: Record<string, any>
}> {
  return await paystackSDK.handleWebhook(payload, signature)
}

/**
 * Route payout request to Paystack.
 */
export async function routePayout(
  request: PayoutRequest
): Promise<{
  success: boolean
  provider: PaymentProvider
  payoutId: string
  status: PaymentStatus
  metadata?: Record<string, any>
  error?: string
}> {
  try {
    // Paystack payout implementation not yet available
    // TODO: Implement Paystack transfer/recipient API for payouts
    throw new Error("Paystack payout not yet implemented. Please use manual payout methods.")
  } catch (error: any) {
    return {
      success: false,
      provider: "PAYSTACK" as PaymentProvider,
      payoutId: "",
      status: "failed" as PaymentStatus,
      error: error.message || "Failed to process payout",
    }
  }
}

/**
 * Start M-Pesa payment (alias for sendMpesaStkPush)
 */
export async function startMpesaPayment(
  request: {
    amount: number
    currency: string
    phoneNumber: string
    userId: string
    creatorId: string
    tierId?: string
    tierName: string
    metadata?: Record<string, any>
  }
): Promise<{
  success: boolean
  provider: PaymentProvider
  reference: string
  status: PaymentStatus
  metadata?: Record<string, any>
  error?: string
}> {
  const result = await sendMpesaStkPush({
    amount: request.amount,
    currency: request.currency,
    phoneNumber: request.phoneNumber,
    userId: request.userId,
    creatorId: request.creatorId,
    tierId: request.tierId,
    tierName: request.tierName,
    metadata: request.metadata,
  })

  return {
    success: result.success,
    provider: result.provider,
    reference: result.reference,
    status: result.status,
    metadata: result.metadata,
    error: result.error,
  }
}

// Re-export getProviderNameForCountry for convenience
export { getProviderNameForCountry }

