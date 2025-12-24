/**
 * Paystack-only Payment Router
 */

import { paystackSDK } from "./payment-providers"
import type { PaymentProvider, PaymentStatus } from "./types"

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
    const result = await paystackSDK.createPayout({
      amount: request.amount,
      currency: request.currency,
      recipientCode: request.accountDetails.recipientCode || "",
      metadata: request.metadata,
    })

    return {
      success: result.status === "success",
      provider: "PAYSTACK",
      payoutId: result.payoutId,
      status: result.status,
      metadata: result.metadata,
    }
  } catch (error: any) {
    return {
      success: false,
      provider: "PAYSTACK",
      payoutId: "",
      status: "failed",
      error: error.message || "Failed to process payout",
    }
  }
}

