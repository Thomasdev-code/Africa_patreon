/**
 * Payment Provider Router
 * Auto-selects the best payment provider based on user location
 */

import type { PaymentProvider } from "./types"

/**
 * Paystack-only provider selection.
 */
export function selectPaymentProvider(
  country?: string,
  preferredProvider?: PaymentProvider
): PaymentProvider {
  if (preferredProvider) return preferredProvider
  return "PAYSTACK"
}

/**
 * Convert amount to provider's smallest currency unit (cents/kobo)
 */
export function convertToSmallestUnit(
  amount: number,
  currency: string = "USD"
): number {
  // Most currencies use 2 decimal places
  // Some like JPY don't, but we'll handle USD, NGN, ZAR, GHS, etc.
  return Math.round(amount * 100)
}

/**
 * Convert from smallest unit back to normal amount
 */
export function convertFromSmallestUnit(
  amount: number,
  currency: string = "USD"
): number {
  return amount / 100
}

/**
 * Get currency code for country
 */
export function getCurrencyForCountry(country?: string): string {
  if (!country) return "USD"

  const countryCode = country.toUpperCase()
  const currencyMap: Record<string, string> = {
    NG: "NGN", // Nigeria - Naira
    GH: "GHS", // Ghana - Cedi
    ZA: "ZAR", // South Africa - Rand
    KE: "KES", // Kenya - Shilling
    EG: "EGP", // Egypt - Pound
    TZ: "TZS", // Tanzania - Shilling
    UG: "UGX", // Uganda - Shilling
    // Add more as needed
  }

  return currencyMap[countryCode] || "USD"
}

