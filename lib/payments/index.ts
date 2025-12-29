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
  },
}

// Export types first (no dependencies)
export * from "./types"
export * from "./currency"

// Export payment-utils (selective to avoid conflicts)
// Note: calculatePlatformFee and calculateCreatorPayout are NOT exported here
// to avoid conflicts with @/app/config/platform. Import directly from payment-utils if needed.
export {
  generatePaymentReference,
  toSmallestUnit,
  fromSmallestUnit,
  formatCurrency,
  getCurrencySymbol,
  isPaymentProcessed,
  validateAmount,
  calculateCreatorEarnings,
  getCurrentPlatformFee,
  retryWithBackoff,
  getProviderNameForCountry,
} from "./payment-utils"

// Export provider implementations
export * from "./payment-providers"
export * from "./router"
export * from "./payment-router"
export * from "./unified"
export * from "./mpesa"

// Explicitly export verifyPayment for better Turbopack compatibility
export { verifyPayment } from "./unified"

// Note: getProviderForCountry and getPaymentProvider are already exported above
// as functions that return PaymentProviderInterface instances (SDK objects)
// The string-based provider selection functions are in ../payments.ts
