/**
 * Paystack-only provider factory.
 */
import { paystackSDK } from "./payment-providers"
import type { PaymentProvider, PaymentProviderInterface } from "./types"

export function getProviderForCountry(): PaymentProviderInterface {
  return paystackSDK
}

export function getPaymentProvider(): PaymentProviderInterface {
  return paystackSDK
}

// Export provider instances as objects
export const providers = {
  paystack: {
    name: "paystack",
    createPayment: paystackSDK.createPayment.bind(paystackSDK),
    verifyWebhook: paystackSDK.handleWebhook.bind(paystackSDK),
    chargeSubscription: paystackSDK.createSubscription?.bind(paystackSDK),
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
export * from "./unified"
export * from "./mpesa"

// Note: getProviderForCountry and getPaymentProvider are already exported above
// as functions that return PaymentProviderInterface instances (SDK objects)
// The string-based provider selection functions are in ../payments.ts
