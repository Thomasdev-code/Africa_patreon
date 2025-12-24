/**
 * Multi-Currency Support
 * Handles currency conversion and formatting
 */

/**
 * Paystack-supported currencies (single source of truth)
 * Paystack officially supports: NGN, GHS, ZAR, USD, KES
 */
export const PAYSTACK_SUPPORTED_CURRENCIES = ["NGN", "GHS", "ZAR", "USD", "KES"] as const

export type PaystackCurrency = typeof PAYSTACK_SUPPORTED_CURRENCIES[number]

/**
 * Resolve currency to Paystack-compatible currency
 * Never trust frontend currency - always resolve server-side
 * 
 * NOTE: By default, resolves to KES for Kenya-based Paystack accounts.
 * If your account has other currencies enabled, you can configure 
 * PAYSTACK_ENABLED_CURRENCIES env var (comma-separated).
 * 
 * IMPORTANT: If you're getting "Currency not supported" errors, ensure
 * PAYSTACK_ENABLED_CURRENCIES is set correctly or leave it unset to use KES.
 */
export function resolvePaystackCurrency(input?: string): PaystackCurrency {
  // Check if merchant has specific currencies enabled via env var
  const enabledCurrenciesEnv = process.env.PAYSTACK_ENABLED_CURRENCIES
  let enabledCurrencies: PaystackCurrency[] = ["KES"] // Default to KES for Kenya-based accounts
  
  if (enabledCurrenciesEnv) {
    const parsed = enabledCurrenciesEnv
      .split(",")
      .map(c => c.trim().toUpperCase())
      .filter(c => PAYSTACK_SUPPORTED_CURRENCIES.includes(c as PaystackCurrency)) as PaystackCurrency[]
    
    if (parsed.length > 0) {
      enabledCurrencies = parsed
    }
  }

  // Always default to KES if no input
  if (!input) {
    return "KES"
  }

  const currency = input.toUpperCase().trim()

  // If currency is KES, always use it
  if (currency === "KES") {
    return "KES"
  }

  // If currency is in enabled list, use it
  if (enabledCurrencies.includes(currency as PaystackCurrency)) {
    return currency as PaystackCurrency
  }

  // If currency is Paystack-supported but not enabled, default to KES
  if (PAYSTACK_SUPPORTED_CURRENCIES.includes(currency as PaystackCurrency)) {
    // Currency is supported by Paystack but not enabled for this merchant
    // Always fall back to KES
    return "KES"
  }

  // Map unsupported currencies to KES (default for Kenya)
  const currencyMapping: Record<string, PaystackCurrency> = {
    // Unsupported currencies → KES (default for Kenya)
    UGX: "KES", // Uganda → KES
    TZS: "KES", // Tanzania → KES
    NGN: enabledCurrencies.includes("NGN") ? "NGN" : "KES", // Nigeria → KES if NGN not enabled
    EUR: enabledCurrencies.includes("USD") ? "USD" : "KES",
    GBP: enabledCurrencies.includes("USD") ? "USD" : "KES",
    // Add more mappings as needed
  }

  if (currencyMapping[currency]) {
    return currencyMapping[currency]
  }

  // Safe default: always KES
  return "KES"
}

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
// These are approximate rates - in production, fetch from Paystack or FX API
// Updated for Kenya-based accounts (KES as base)
const EXCHANGE_RATES: Record<SupportedCurrency, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  KES: 130.0, // 1 USD ≈ 130 KES
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

  return symbols[currency] || currency
}

/**
 * Get currency for country (for display purposes)
 * Note: For Paystack payments, use resolvePaystackCurrency() instead
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
 * In production, this should call Paystack or a dedicated FX API
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

