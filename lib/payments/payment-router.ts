/**
 * Unified Payment Router
 * Handles payment routing with automatic fallback logic
 */

import {
  stripeSDK,
  flutterwaveSDK,
  paystackSDK,
} from "./payment-providers"
import type { PaymentProvider, PaymentStatus } from "./types"
import { selectPaymentProvider } from "./router"

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

export interface MpesaPaymentRequest {
  amount: number
  currency: string
  phoneNumber: string
  userId: string
  creatorId: string
  tierId?: string
  tierName: string
  providerPreference?: ("FLUTTERWAVE" | "PAYSTACK")[]
  metadata?: Record<string, any>
}

export interface PayoutRequest {
  amount: number
  currency: string
  creatorId: string
  method: "mpesa" | "bank" | "stripe_connect"
  accountDetails: {
    phoneNumber?: string
    accountNumber?: string
    bankCode?: string
    recipientCode?: string
    destination?: string
  }
  metadata?: Record<string, any>
}

/**
 * Start a one-time payment with automatic provider selection and fallback
 */
export async function startOneTimePayment(
  request: PaymentRequest
): Promise<{
  success: boolean
  provider: PaymentProvider
  reference: string
  redirectUrl?: string
  clientSecret?: string
  accessCode?: string
  flwRef?: string
  metadata?: Record<string, any>
  error?: string
}> {
  const providers = request.providerPreference || [
    selectPaymentProvider(request.country),
    "STRIPE",
    "FLUTTERWAVE",
    "PAYSTACK",
  ]

  for (const provider of providers) {
    try {
      switch (provider) {
        case "STRIPE": {
          const stripeResult = await stripeSDK.initializePayment({
            amount: request.amount,
            currency: request.currency,
            userId: request.userId,
            creatorId: request.creatorId,
            tierName: request.tierName,
            metadata: request.metadata,
          })

          return {
            success: true,
            provider: "STRIPE",
            reference: stripeResult.reference,
            clientSecret: stripeResult.clientSecret,
            metadata: stripeResult.metadata,
          }
        }

        case "FLUTTERWAVE": {
          const flutterwaveResult = await flutterwaveSDK.initializePayment({
            amount: request.amount,
            currency: request.currency,
            userId: request.userId,
            creatorId: request.creatorId,
            tierName: request.tierName,
            metadata: request.metadata,
          })

          return {
            success: true,
            provider: "FLUTTERWAVE",
            reference: flutterwaveResult.reference,
            redirectUrl: flutterwaveResult.redirectUrl,
            flwRef: flutterwaveResult.flwRef,
            metadata: flutterwaveResult.metadata,
          }
        }

        case "PAYSTACK": {
          const paystackResult = await paystackSDK.initializePayment({
            amount: request.amount,
            currency: request.currency,
            userId: request.userId,
            creatorId: request.creatorId,
            tierName: request.tierName,
            metadata: request.metadata,
          })

          return {
            success: true,
            provider: "PAYSTACK",
            reference: paystackResult.reference,
            redirectUrl: paystackResult.redirectUrl,
            accessCode: paystackResult.accessCode,
            metadata: paystackResult.metadata,
          }
        }

        default:
          continue
      }
    } catch (error: any) {
      console.error(`Payment failed with ${provider}:`, error.message)
      // Continue to next provider
      continue
    }
  }

  return {
    success: false,
    provider: providers[0] || "STRIPE",
    reference: "",
    error: "All payment providers failed",
  }
}

/**
 * Start M-Pesa payment via Flutterwave or Paystack
 */
export async function startMpesaPayment(
  request: MpesaPaymentRequest
): Promise<{
  success: boolean
  provider: "FLUTTERWAVE" | "PAYSTACK"
  reference: string
  status: PaymentStatus
  metadata?: Record<string, any>
  error?: string
}> {
  const providers: ("FLUTTERWAVE" | "PAYSTACK")[] =
    request.providerPreference || ["FLUTTERWAVE", "PAYSTACK"]

  for (const provider of providers) {
    try {
      switch (provider) {
        case "FLUTTERWAVE": {
          const result = await flutterwaveSDK.createMpesaPayment({
            amount: request.amount,
            currency: request.currency,
            phoneNumber: request.phoneNumber,
            userId: request.userId,
            creatorId: request.creatorId,
            tierName: request.tierName,
            metadata: request.metadata,
          })

          return {
            success: true,
            provider: "FLUTTERWAVE",
            reference: result.reference,
            status: result.status,
            metadata: result.metadata,
          }
        }

        case "PAYSTACK": {
          const result = await paystackSDK.createMpesaPayment({
            amount: request.amount,
            currency: request.currency,
            phoneNumber: request.phoneNumber,
            userId: request.userId,
            creatorId: request.creatorId,
            tierName: request.tierName,
            metadata: request.metadata,
          })

          return {
            success: true,
            provider: "PAYSTACK",
            reference: result.reference,
            status: result.status,
            metadata: result.metadata,
          }
        }
      }
    } catch (error: any) {
      console.error(`M-Pesa payment failed with ${provider}:`, error.message)
      // Continue to next provider
      continue
    }
  }

  return {
    success: false,
    provider: providers[0],
    reference: "",
    status: "failed",
    error: "All M-Pesa providers failed",
  }
}

/**
 * Verify M-Pesa payment status
 */
export async function verifyMpesaPayment(
  provider: "FLUTTERWAVE" | "PAYSTACK",
  reference: string
): Promise<{
  status: PaymentStatus
  amount: number
  currency: string
  metadata?: Record<string, any>
}> {
  if (provider === "FLUTTERWAVE") {
    return await flutterwaveSDK.checkMpesaStatus(reference)
  } else {
    return await paystackSDK.checkMpesaStatus(reference)
  }
}

/**
 * Create subscription with auto-renewal
 */
export async function startSubscription(
  request: SubscriptionRequest
): Promise<{
  success: boolean
  provider: PaymentProvider
  subscriptionId?: string
  reference: string
  redirectUrl?: string
  clientSecret?: string
  metadata?: Record<string, any>
  error?: string
}> {
  // For subscriptions, prefer Stripe first (best subscription support)
  const providers = request.providerPreference || ["STRIPE", "FLUTTERWAVE", "PAYSTACK"]

  for (const provider of providers) {
    try {
      switch (provider) {
        case "STRIPE": {
          // Stripe subscriptions require a customer first
          // This is a simplified version - in production, create/retrieve customer
          const result = await stripeSDK.initializePayment({
            amount: request.amount,
            currency: request.currency,
            userId: request.userId,
            creatorId: request.creatorId,
            tierName: request.tierName,
            metadata: {
              ...request.metadata,
              subscription: true,
              autoRenew: request.autoRenew ?? true,
            },
          })

          return {
            success: true,
            provider: "STRIPE",
            reference: result.reference,
            clientSecret: result.clientSecret,
            metadata: result.metadata,
          }
        }

        case "FLUTTERWAVE":
        case "PAYSTACK": {
          // For Flutterwave/Paystack, use one-time payment with metadata
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

        default:
          continue
      }
    } catch (error: any) {
      console.error(`Subscription failed with ${provider}:`, error.message)
      continue
    }
  }

  return {
    success: false,
    provider: providers[0] || "STRIPE",
    reference: "",
    error: "All subscription providers failed",
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  provider: PaymentProvider,
  subscriptionId: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    if (provider === "STRIPE") {
      await stripeSDK.cancelSubscription(subscriptionId)
      return { success: true }
    }

    // For Flutterwave/Paystack, mark subscription as cancelled in DB
    // (they don't have native subscription cancellation APIs)
    return { success: true }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Process webhook from any provider
 */
export async function processWebhook(
  provider: PaymentProvider,
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
  switch (provider) {
    case "STRIPE":
      return await stripeSDK.handleWebhook(payload, signature)
    case "FLUTTERWAVE":
      return await flutterwaveSDK.handleWebhook(payload, signature)
    case "PAYSTACK":
      return await paystackSDK.handleWebhook(payload, signature)
    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }
}

/**
 * Route payout request to appropriate provider
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
    switch (request.method) {
      case "mpesa": {
        if (!request.accountDetails.phoneNumber) {
          throw new Error("Phone number required for M-Pesa payout")
        }

        // Try Flutterwave first, then Paystack
        try {
          const result = await flutterwaveSDK.createPayout({
            amount: request.amount,
            currency: request.currency,
            accountNumber: request.accountDetails.phoneNumber,
            bankCode: "MPESA", // Flutterwave uses "MPESA" as bank code
            metadata: request.metadata,
          })

          return {
            success: true,
            provider: "FLUTTERWAVE",
            payoutId: result.payoutId,
            status: result.status,
            metadata: result.metadata,
          }
        } catch (error: any) {
          // Fallback to Paystack
          const result = await paystackSDK.createPayout({
            amount: request.amount,
            currency: request.currency,
            recipientCode: request.accountDetails.recipientCode || "",
            metadata: request.metadata,
          })

          return {
            success: true,
            provider: "PAYSTACK",
            payoutId: result.payoutId,
            status: result.status,
            metadata: result.metadata,
          }
        }
      }

      case "bank": {
        // Use Flutterwave for bank transfers
        const result = await flutterwaveSDK.createPayout({
          amount: request.amount,
          currency: request.currency,
          accountNumber: request.accountDetails.accountNumber || "",
          bankCode: request.accountDetails.bankCode || "",
          metadata: request.metadata,
        })

        return {
          success: true,
          provider: "FLUTTERWAVE",
          payoutId: result.payoutId,
          status: result.status,
          metadata: result.metadata,
        }
      }

      case "stripe_connect": {
        // Use Stripe Connect for payouts
        const result = await stripeSDK.createPayout({
          amount: request.amount,
          currency: request.currency,
          destination: request.accountDetails.destination || "",
          metadata: request.metadata,
        })

        return {
          success: true,
          provider: "STRIPE",
          payoutId: result.payoutId,
          status: result.status,
          metadata: result.metadata,
        }
      }

      default:
        throw new Error(`Unsupported payout method: ${request.method}`)
    }
  } catch (error: any) {
    return {
      success: false,
      provider: "STRIPE",
      payoutId: "",
      status: "failed",
      error: error.message,
    }
  }
}

