/**
 * Multi-Currency Support
 * Handles currency conversion and formatting
 */

export type SupportedCurrency =
  | "USD"
  | "EUR"
  | "GBP"
  | "KES"
  | "NGN"
  | "ZAR"
  | "GHS"
  | "UGX"

export interface CurrencyConversion {
  from: SupportedCurrency
  to: SupportedCurrency
  amount: number
  convertedAmount: number
  rate: number
  timestamp: Date
}

// Exchange rates (should be fetched from provider in production)
// These are approximate rates - in production, fetch from Stripe/Flutterwave/Paystack
const EXCHANGE_RATES: Record<SupportedCurrency, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  KES: 130.0,
  NGN: 1500.0,
  ZAR: 18.5,
  GHS: 12.0,
  UGX: 3700.0,
}

/**
 * Get exchange rate between two currencies
 */
export function getExchangeRate(
  from: SupportedCurrency,
  to: SupportedCurrency
): number {
  if (from === to) {
    return 1.0
  }

  // Convert via USD
  const fromRate = EXCHANGE_RATES[from]
  const toRate = EXCHANGE_RATES[to]

  return toRate / fromRate
}

/**
 * Convert amount from one currency to another
 */
export function convertCurrency(
  amount: number,
  from: SupportedCurrency,
  to: SupportedCurrency
): number {
  if (from === to) {
    return amount
  }

  const rate = getExchangeRate(from, to)
  return amount * rate
}

/**
 * Normalize amount to USD (for internal storage)
 */
export function normalizeToUSD(
  amount: number,
  currency: SupportedCurrency
): number {
  return convertCurrency(amount, currency, "USD")
}

/**
 * Format currency for display
 */
export function formatCurrency(
  amount: number,
  currency: SupportedCurrency,
  locale: string = "en-US"
): string {
  const currencyMap: Record<SupportedCurrency, string> = {
    USD: "USD",
    EUR: "EUR",
    GBP: "GBP",
    KES: "KES",
    NGN: "NGN",
    ZAR: "ZAR",
    GHS: "GHS",
    UGX: "UGX",
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyMap[currency],
  }).format(amount)
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: SupportedCurrency): string {
  const symbols: Record<SupportedCurrency, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    KES: "KSh",
    NGN: "₦",
    ZAR: "R",
    GHS: "₵",
    UGX: "USh",
  }

  return symbols[currency]
}

/**
 * Get currency for country
 */
export function getCurrencyForCountryCode(
  countryCode: string
): SupportedCurrency {
  const code = countryCode.toUpperCase()

  const countryCurrencyMap: Record<string, SupportedCurrency> = {
    US: "USD",
    GB: "GBP",
    KE: "KES",
    NG: "NGN",
    ZA: "ZAR",
    GH: "GHS",
    UG: "UGX",
    // EU countries
    AT: "EUR",
    BE: "EUR",
    BG: "EUR",
    HR: "EUR",
    CY: "EUR",
    CZ: "EUR",
    DK: "EUR",
    EE: "EUR",
    FI: "EUR",
    FR: "EUR",
    DE: "EUR",
    GR: "EUR",
    HU: "EUR",
    IE: "EUR",
    IT: "EUR",
    LV: "EUR",
    LT: "EUR",
    LU: "EUR",
    MT: "EUR",
    NL: "EUR",
    PL: "EUR",
    PT: "EUR",
    RO: "EUR",
    SK: "EUR",
    SI: "EUR",
    ES: "EUR",
    SE: "EUR",
  }

  return countryCurrencyMap[code] || "USD"
}

/**
 * Fetch live exchange rates from provider
 * In production, this should call Stripe/Flutterwave/Paystack APIs
 */
export async function fetchLiveExchangeRates(): Promise<
  Record<SupportedCurrency, number>
> {
  // TODO: Implement actual API calls to payment providers
  // For now, return cached rates
  return EXCHANGE_RATES
}

/**
 * Update exchange rates (should be called periodically)
 */
export async function updateExchangeRates(): Promise<void> {
  try {
    const rates = await fetchLiveExchangeRates()
    // In production, store in database or cache
    Object.assign(EXCHANGE_RATES, rates)
  } catch (error) {
    console.error("Failed to update exchange rates:", error)
  }
}

