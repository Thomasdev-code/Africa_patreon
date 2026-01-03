/**
 * Paystack-only payment utilities
 * Provides a compatibility surface for existing routes while removing
 * Stripe and Flutterwave dependencies.
 */

import {
  convertCurrency,
  getCurrencyForCountryCode,
  type SupportedCurrency,
} from "./payments/currency"
import { paystackSDK } from "./payments/payment-providers"
import { getAppUrl } from "@/lib/app-url"

export type PaymentProvider = "PAYSTACK"

const availableProviders: Set<PaymentProvider> = new Set(["PAYSTACK"])

export function normalizeCountry(countryInput: string): string {
  if (!countryInput || typeof countryInput !== "string") return "US"
  const trimmed = countryInput.trim()
  if (!trimmed) return "US"

  const countryNameMap: Record<string, string> = {
    kenya: "KE",
    nigeria: "NG",
    ghana: "GH",
    uganda: "UG",
    tanzania: "TZ",
    rwanda: "RW",
    "united states": "US",
    "united kingdom": "GB",
    "south africa": "ZA",
    "united states of america": "US",
    uk: "GB",
    usa: "US",
  }

  const normalized = trimmed.toLowerCase()
  if (countryNameMap[normalized]) return countryNameMap[normalized]
  if (trimmed.length === 2) return trimmed.toUpperCase()
  return "US"
}

export function isMobileMoney(provider: string): boolean {
  const normalized = provider?.toUpperCase?.() || ""
  return normalized === "MPESA_PAYSTACK" || normalized === "MPESA"
}

export function getProviderForCountry(_countryCode: string): PaymentProvider {
  return "PAYSTACK"
}

export function getBestProviderForCountry(countryCode: string): PaymentProvider {
  const provider = getProviderForCountry(countryCode)
  if (!availableProviders.has(provider)) {
    throw new Error("Paystack is not configured. Set PAYSTACK_SECRET_KEY.")
  }
  return provider
}

export function getPaymentProvider(): PaymentProvider {
  return "PAYSTACK"
}

export function getCurrencyForCountry(country: string): SupportedCurrency {
  return getCurrencyForCountryCode(normalizeCountry(country))
}

export function getCurrencyForProvider(_provider: PaymentProvider): SupportedCurrency {
  return "NGN"
}

export async function convertPrice(
  amountUSD: number,
  targetCurrency: SupportedCurrency
): Promise<number> {
  if (targetCurrency === "USD") return amountUSD
  return convertCurrency(amountUSD, "USD", targetCurrency)
}

/**
 * Paystack payment creation.
 * amount is expected in normal currency units (not kobo); conversion to kobo is handled by the SDK.
 * 
 * CRITICAL: Currency is resolved inside paystackSDK.createPayment, but we ensure
 * it's at least a valid Paystack currency here as well.
 */
export async function createPaystackPayment(
  amount: number,
  email: string,
  currency: string,
  metadata?: Record<string, any>
): Promise<{ reference: string; payment_url: string }> {
  // Defensive: Ensure currency is valid (will be resolved again in SDK, but this prevents issues)
  const { resolvePaystackCurrency } = await import("./payments/currency")
  const safeCurrency = resolvePaystackCurrency(currency)
  
  console.info("[createPaystackPayment]", {
    originalCurrency: currency,
    resolvedCurrency: safeCurrency,
    amount,
    userId: metadata?.userId,
  })
  
  const result = await paystackSDK.createPayment(
    amount,
    safeCurrency, // Use resolved currency
    metadata?.userId || "",
    metadata?.creatorId || "",
    metadata?.tierName || "",
    { ...metadata, email }
  )

  if (!result.redirectUrl) {
    throw new Error("Paystack did not return a payment URL")
  }

  return {
    reference: result.reference,
    payment_url: result.redirectUrl,
  }
}

/**
 * Deprecated shims to keep existing imports compiling.
 * These all route to Paystack.
 */
export const createStripePayment = createPaystackPayment
export const createFlutterwavePayment = createPaystackPayment

/**
 * M-Pesa via Paystack
 */
export async function createMpesaPayment(
  amount: number,
  phone: string,
  _provider: "MPESA_PAYSTACK" | "MPESA_FLW" | "MPESA" | undefined,
  metadata?: Record<string, any>
): Promise<{ reference: string; payment_url: string }> {
  const baseUrl = getAppUrl()
  const result = await paystackSDK.createMpesaPayment({
    amount,
    currency: "KES",
    phoneNumber: phone,
    userId: metadata?.userId || "",
    creatorId: metadata?.creatorId || "",
    tierName: metadata?.tierName || "",
    metadata: {
      ...metadata,
      phone,
    },
  })

  const payment_url = `${baseUrl}/payment/mpesa/status?reference=${result.reference}&provider=paystack`

  return {
    reference: result.reference,
    payment_url,
  }
}

export function validateProvider(_provider: string): boolean {
  return true
}

// Re-export verifyPayment from payments/unified for compatibility
export { verifyPayment } from "./payments/unified"

