/**
 * Payment Provider Router
 * Auto-selects the best payment provider based on user location
 */

import type { PaymentProvider } from "./types"

// African countries list
const AFRICAN_COUNTRIES = [
  "NG", // Nigeria
  "GH", // Ghana
  "ZA", // South Africa
  "KE", // Kenya
  "EG", // Egypt
  "TZ", // Tanzania
  "UG", // Uganda
  "ET", // Ethiopia
  "DZ", // Algeria
  "SD", // Sudan
  "MA", // Morocco
  "AO", // Angola
  "MZ", // Mozambique
  "MG", // Madagascar
  "CM", // Cameroon
  "CI", // Côte d'Ivoire
  "NE", // Niger
  "BF", // Burkina Faso
  "ML", // Mali
  "MW", // Malawi
  "ZM", // Zambia
  "SN", // Senegal
  "TD", // Chad
  "SO", // Somalia
  "ZW", // Zimbabwe
  "GN", // Guinea
  "RW", // Rwanda
  "BJ", // Benin
  "TN", // Tunisia
  "BI", // Burundi
  "SS", // South Sudan
  "TG", // Togo
  "SL", // Sierra Leone
  "LY", // Libya
  "LR", // Liberia
  "CG", // Republic of the Congo
  "CF", // Central African Republic
  "MR", // Mauritania
  "ER", // Eritrea
  "GM", // Gambia
  "BW", // Botswana
  "GA", // Gabon
  "NA", // Namibia
  "GW", // Guinea-Bissau
  "LS", // Lesotho
  "MU", // Mauritius
  "DJ", // Djibouti
  "RE", // Réunion
  "KM", // Comoros
  "EH", // Western Sahara
  "SH", // Saint Helena
  "SC", // Seychelles
  "CV", // Cape Verde
  "ST", // São Tomé and Príncipe
]

/**
 * Select payment provider based on country code
 */
export function selectPaymentProvider(
  country?: string,
  preferredProvider?: PaymentProvider
): PaymentProvider {
  // If provider is explicitly requested, use it
  if (preferredProvider) {
    return preferredProvider
  }

  // If no country provided, default to Stripe (global)
  if (!country) {
    return "STRIPE"
  }

  const countryCode = country.toUpperCase()

  // For Kenya, prefer Flutterwave or Paystack (both support M-Pesa)
  if (countryCode === "KE") {
    return "FLUTTERWAVE" // Flutterwave has better M-Pesa support
  }

  // Paystack for Nigeria, Ghana, South Africa
  if (["NG", "GH", "ZA"].includes(countryCode)) {
    return "PAYSTACK"
  }

  // Flutterwave for other African countries
  if (AFRICAN_COUNTRIES.includes(countryCode)) {
    return "FLUTTERWAVE"
  }

  // Stripe for rest of the world
  return "STRIPE"
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

