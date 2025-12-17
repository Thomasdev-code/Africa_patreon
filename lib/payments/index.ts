/**
 * Payment Provider Factory & Utilities
 * Unified payment system for Stripe, Paystack, Flutterwave, and M-Pesa
 */

import { stripeSDK, flutterwaveSDK, paystackSDK } from "./payment-providers"
import type { PaymentProvider, PaymentProviderInterface } from "./types"

/**
 * Get payment provider for a given country code
 * Returns the appropriate provider object based on country
 * 
 * @param country - ISO country code (e.g., "US", "NG", "KE")
 * @returns PaymentProviderInterface instance
 */
export function getProviderForCountry(country: string): PaymentProviderInterface {
  const countryCode = country.toUpperCase()
  
  // Log for debugging
  console.log("Selected provider for country:", countryCode)
  
  // Paystack: Nigeria, Ghana, Kenya
  if (["NG", "GH", "KE"].includes(countryCode)) {
    console.log("Selected provider: PAYSTACK")
    return paystackSDK
  }
  
  // Flutterwave: Kenya, Uganda, Tanzania, Rwanda, and other African countries
  const flutterwaveCountries = [
    "KE", // Kenya (also supports M-Pesa)
    "UG", // Uganda
    "TZ", // Tanzania
    "RW", // Rwanda
    "EG", "ET", "DZ", "SD", "MA", "AO", "MZ", "MG",
    "CM", "CI", "NE", "BF", "ML", "MW", "ZM", "SN", "TD", "SO",
    "ZW", "GN", "BJ", "TN", "BI", "SS", "TG", "SL", "LY",
  ]
  
  if (flutterwaveCountries.includes(countryCode)) {
    console.log("Selected provider: FLUTTERWAVE")
    return flutterwaveSDK
  }
  
  // Default fallback: Stripe (global)
  console.log("Selected provider: STRIPE (default)")
  return stripeSDK
}

/**
 * Get payment provider by provider name
 * @param provider - Provider name (STRIPE, PAYSTACK, FLUTTERWAVE)
 * @returns PaymentProviderInterface instance
 */
export function getPaymentProvider(
  provider: PaymentProvider
): PaymentProviderInterface {
  switch (provider) {
    case "STRIPE":
      return stripeSDK
    case "PAYSTACK":
      return paystackSDK
    case "FLUTTERWAVE":
      return flutterwaveSDK
    default:
      throw new Error(`Unknown payment provider: ${provider}`)
  }
}

/**
 * Process subscription payment
 * @param params - Subscription parameters
 */
export async function processSubscription(params: {
  userId: string
  creatorId: string
  tierName: string
  tierPrice: number
  currency: string
  country?: string
  provider?: PaymentProvider
  metadata?: Record<string, any>
}): Promise<{
  success: boolean
  reference: string
  redirectUrl: string
  provider: PaymentProvider
  clientSecret?: string
  metadata?: Record<string, any>
  error?: string
}> {
  try {
    // Determine provider
    let providerName: PaymentProvider
    let provider: PaymentProviderInterface
    
    if (params.provider) {
      providerName = params.provider
      provider = getPaymentProvider(params.provider)
    } else {
      provider = getProviderForCountry(params.country || "US")
      // Determine provider name from instance
      if (provider === paystackSDK) {
        providerName = "PAYSTACK"
      } else if (provider === flutterwaveSDK) {
        providerName = "FLUTTERWAVE"
      } else {
        providerName = "STRIPE"
      }
    }
    
    // Create payment
    const result = await provider.createPayment(
      params.tierPrice,
      params.currency,
      params.userId,
      params.creatorId,
      params.tierName,
      params.metadata
    )
    
    return {
      success: true,
      reference: result.reference,
      redirectUrl: result.redirectUrl,
      provider: providerName,
      clientSecret: result.metadata?.clientSecret,
      metadata: result.metadata,
    }
  } catch (error: any) {
    console.error("Process subscription error:", error)
    return {
      success: false,
      reference: "",
      redirectUrl: "",
      provider: "STRIPE",
      error: error.message || "Failed to process subscription",
    }
  }
}

/**
 * Create checkout session
 * @param params - Checkout parameters
 */
export async function createCheckoutSession(params: {
  userId: string
  creatorId: string
  tierName: string
  tierPrice: number
  currency: string
  country?: string
  provider?: PaymentProvider
  metadata?: Record<string, any>
}): Promise<{
  success: boolean
  sessionId?: string
  reference: string
  redirectUrl: string
  provider: PaymentProvider
  clientSecret?: string
  accessCode?: string
  flwRef?: string
  metadata?: Record<string, any>
  error?: string
}> {
  try {
    // Determine provider
    let providerName: PaymentProvider
    let provider: PaymentProviderInterface
    
    if (params.provider) {
      providerName = params.provider
      provider = getPaymentProvider(params.provider)
    } else {
      provider = getProviderForCountry(params.country || "US")
      // Determine provider name from instance
      if (provider === paystackSDK) {
        providerName = "PAYSTACK"
      } else if (provider === flutterwaveSDK) {
        providerName = "FLUTTERWAVE"
      } else {
        providerName = "STRIPE"
      }
    }
    
    // Initialize payment
    const result = await provider.createPayment(
      params.tierPrice,
      params.currency,
      params.userId,
      params.creatorId,
      params.tierName,
      params.metadata
    )
    
    return {
      success: true,
      sessionId: result.metadata?.sessionId || result.reference,
      reference: result.reference,
      redirectUrl: result.redirectUrl,
      provider: providerName,
      clientSecret: result.metadata?.clientSecret,
      accessCode: result.metadata?.accessCode,
      flwRef: result.metadata?.flwRef,
      metadata: result.metadata,
    }
  } catch (error: any) {
    console.error("Create checkout session error:", error)
    return {
      success: false,
      reference: "",
      redirectUrl: "",
      provider: "STRIPE",
      error: error.message || "Failed to create checkout session",
    }
  }
}

/**
 * Verify payment webhook
 * @param provider - Payment provider
 * @param payload - Webhook payload
 * @param signature - Webhook signature
 */
export async function verifyPaymentWebhook(
  provider: PaymentProvider,
  payload: any,
  signature?: string
): Promise<{
  success: boolean
  event: string
  reference: string
  status: "pending" | "success" | "failed" | "cancelled"
  amount: number
  currency: string
  metadata?: Record<string, any>
  error?: string
}> {
  try {
    const providerInstance = getPaymentProvider(provider)
    const result = await providerInstance.handleWebhook(payload, signature)
    
    return {
      success: true,
      event: result.event,
      reference: result.reference,
      status: result.status,
      amount: result.amount,
      currency: result.currency,
      metadata: result.metadata,
    }
  } catch (error: any) {
    console.error("Verify payment webhook error:", error)
    return {
      success: false,
      event: "",
      reference: "",
      status: "failed",
      amount: 0,
      currency: "USD",
      error: error.message || "Failed to verify webhook",
    }
  }
}

/**
 * Get creator payout method
 * @param creatorId - Creator user ID
 */
export async function getCreatorPayoutMethod(creatorId: string): Promise<{
  success: boolean
  method?: {
    type: "bank" | "mobile_money" | "card"
    accountNumber?: string
    bankCode?: string
    bankName?: string
    recipientCode?: string
    phoneNumber?: string
    metadata?: Record<string, any>
  }
  error?: string
}> {
  try {
    const { prisma } = await import("@/lib/prisma")
    
    // Get creator wallet/payout info
    const wallet = await prisma.creatorWallet.findUnique({
      where: { userId: creatorId },
    })
    
    if (!wallet) {
      return {
        success: false,
        error: "Creator wallet not found",
      }
    }
    
    const payoutMethod = wallet.payoutMethod as any
    
    return {
      success: true,
      method: payoutMethod || undefined,
    }
  } catch (error: any) {
    console.error("Get creator payout method error:", error)
    return {
      success: false,
      error: error.message || "Failed to get payout method",
    }
  }
}

/**
 * Payout to creator
 * @param params - Payout parameters
 */
export async function payoutToCreator(params: {
  creatorId: string
  amount: number
  currency: string
  provider: PaymentProvider
  metadata?: Record<string, any>
}): Promise<{
  success: boolean
  payoutId?: string
  status?: "pending" | "success" | "failed"
  metadata?: Record<string, any>
  error?: string
}> {
  try {
    const provider = getPaymentProvider(params.provider)
    
    // Get creator payout method
    const payoutMethod = await getCreatorPayoutMethod(params.creatorId)
    
    if (!payoutMethod.success || !payoutMethod.method) {
      return {
        success: false,
        error: "Creator payout method not configured",
      }
    }
    
    // Create payout based on provider
    if (params.provider === "STRIPE") {
      const result = await (provider as any).createPayout({
        amount: params.amount,
        currency: params.currency,
        destination: payoutMethod.method.recipientCode || payoutMethod.method.accountNumber || "",
        metadata: params.metadata,
      })
      
      return {
        success: result.status === "success",
        payoutId: result.payoutId,
        status: result.status,
        metadata: result.metadata,
      }
    } else if (params.provider === "PAYSTACK") {
      const result = await (provider as any).createPayout({
        amount: params.amount,
        currency: params.currency,
        recipientCode: payoutMethod.method.recipientCode || "",
        metadata: params.metadata,
      })
      
      return {
        success: result.status === "success",
        payoutId: result.payoutId,
        status: result.status,
        metadata: result.metadata,
      }
    } else if (params.provider === "FLUTTERWAVE") {
      const result = await (provider as any).createPayout({
        amount: params.amount,
        currency: params.currency,
        accountNumber: payoutMethod.method.accountNumber || "",
        bankCode: payoutMethod.method.bankCode || "",
        metadata: params.metadata,
      })
      
      return {
        success: result.status === "success",
        payoutId: result.payoutId,
        status: result.status,
        metadata: result.metadata,
      }
    }
    
    return {
      success: false,
      error: "Unsupported provider for payout",
    }
  } catch (error: any) {
    console.error("Payout to creator error:", error)
    return {
      success: false,
      error: error.message || "Failed to process payout",
    }
  }
}

// Export provider instances as objects
export const providers = {
  stripe: {
    name: "stripe",
    createPayment: stripeSDK.createPayment.bind(stripeSDK),
    verifyWebhook: stripeSDK.handleWebhook.bind(stripeSDK),
    chargeSubscription: stripeSDK.createSubscription?.bind(stripeSDK),
  },
  paystack: {
    name: "paystack",
    createPayment: paystackSDK.createPayment.bind(paystackSDK),
    verifyWebhook: paystackSDK.handleWebhook.bind(paystackSDK),
    chargeSubscription: paystackSDK.createSubscription?.bind(paystackSDK),
  },
  flutterwave: {
    name: "flutterwave",
    createPayment: flutterwaveSDK.createPayment.bind(flutterwaveSDK),
    verifyWebhook: flutterwaveSDK.handleWebhook.bind(flutterwaveSDK),
    chargeSubscription: flutterwaveSDK.createSubscription?.bind(flutterwaveSDK),
  },
}

// Export types first (no dependencies)
export * from "./types"
export * from "./currency"

// Export payment-utils (selective to avoid conflicts)
export {
  generatePaymentReference,
  toSmallestUnit,
  fromSmallestUnit,
  formatCurrency,
  getCurrencySymbol,
  isPaymentProcessed,
  validateAmount,
  calculatePlatformFee,
  calculateCreatorEarnings,
  getCurrentPlatformFee,
  calculateCreatorPayout,
  retryWithBackoff,
  getProviderNameForCountry,
} from "./payment-utils"

// Export provider implementations
export * from "./payment-providers"
export * from "./router"
export * from "./payment-router"

// Note: getProviderForCountry and getPaymentProvider are already exported above
// as functions that return PaymentProviderInterface instances (SDK objects)
// The string-based provider selection functions are in ../payments.ts
