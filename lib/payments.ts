/**
 * Payment Provider Utilities
 * Complete payment provider selection, currency handling, and payment creation
 * 
 * Supports: Stripe, Paystack, Flutterwave, and M-Pesa via Paystack/Flutterwave
 */

import type { SupportedCurrency } from "./payments/currency"
import { stripeSDK, paystackSDK, flutterwaveSDK } from "./payments/payment-providers"
import Stripe from "stripe"

/**
 * Payment Provider Types
 * Includes M-Pesa variants for Paystack and Flutterwave
 */
export type PaymentProvider =
  | "STRIPE"
  | "PAYSTACK"
  | "FLUTTERWAVE"
  | "MPESA_PAYSTACK"
  | "MPESA_FLW"

/**
 * Available providers based on env variables
 */
let availableProviders: Set<PaymentProvider> = new Set()

// Check which providers are available based on env variables
if (process.env.STRIPE_SECRET_KEY?.trim()) {
  const key = process.env.STRIPE_SECRET_KEY.trim()
  if (key.startsWith("sk_test_") || key.startsWith("sk_live_")) {
    availableProviders.add("STRIPE")
  }
}

if (process.env.PAYSTACK_SECRET_KEY?.trim()) {
  availableProviders.add("PAYSTACK")
  // M-Pesa via Paystack is available if MPESA_PROVIDER is set to "paystack"
  if (process.env.MPESA_PROVIDER?.toLowerCase() === "paystack") {
    availableProviders.add("MPESA_PAYSTACK")
  }
}

if (process.env.FLUTTERWAVE_SECRET_KEY?.trim()) {
  availableProviders.add("FLUTTERWAVE")
  // M-Pesa via Flutterwave is available if MPESA_PROVIDER is set to "flutterwave"
  if (process.env.MPESA_PROVIDER?.toLowerCase() === "flutterwave") {
    availableProviders.add("MPESA_FLW")
  }
}

// Default: If MPESA_PROVIDER is not set but we have Flutterwave, enable M-Pesa via Flutterwave for KE
if (!process.env.MPESA_PROVIDER && availableProviders.has("FLUTTERWAVE")) {
  availableProviders.add("MPESA_FLW")
}

/**
 * Normalize country code to uppercase ISO 2-letter code
 * Handles full country names, 2-letter codes, and invalid inputs
 */
function normalizeCountry(countryInput: string): string {
  if (!countryInput || typeof countryInput !== "string") {
    return "US"
  }

  const trimmed = countryInput.trim()

  if (!trimmed) {
    return "US"
  }

  // Handle full country names
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
    "uk": "GB",
    "usa": "US",
  }

  const normalized = trimmed.toLowerCase()
  if (countryNameMap[normalized]) {
    return countryNameMap[normalized]
  }

  // If already a 2-letter code, return uppercase
  if (trimmed.length === 2) {
    return trimmed.toUpperCase()
  }

  // Default fallback
  return "US"
}

/**
 * Check if provider supports mobile money (M-Pesa)
 */
function isMobileMoney(provider: string): boolean {
  if (!provider) {
    return false
  }

  const normalized = provider.toUpperCase().trim()
  return (
    normalized === "MPESA_PAYSTACK" ||
    normalized === "MPESA_FLW" ||
    normalized === "MPESA"
  )
}

/**
 * Get payment provider for a country
 * Auto-detects based on country code and available providers
 * 
 * Rules:
 * - KE → FLUTTERWAVE (M-Pesa support) or PAYSTACK if Flutterwave unavailable
 * - NG → PAYSTACK
 * - GH → PAYSTACK (or Flutterwave if Paystack unavailable)
 * - US, UK, EU → STRIPE
 * - Fallback → STRIPE (or first available provider)
 */
function getProviderForCountry(countryCode: string): PaymentProvider {
  const normalized = normalizeCountry(countryCode)

  // Kenya → Flutterwave (M-Pesa support) or Paystack
  if (normalized === "KE") {
    if (availableProviders.has("FLUTTERWAVE")) {
      return "FLUTTERWAVE"
    }
    if (availableProviders.has("PAYSTACK")) {
      return "PAYSTACK"
    }
  }

  // Nigeria → Paystack
  if (normalized === "NG") {
    if (availableProviders.has("PAYSTACK")) {
      return "PAYSTACK"
    }
  }

  // Ghana → Paystack (can also use Flutterwave, but Paystack is default)
  if (normalized === "GH") {
    if (availableProviders.has("PAYSTACK")) {
      return "PAYSTACK"
    }
    if (availableProviders.has("FLUTTERWAVE")) {
      return "FLUTTERWAVE"
    }
  }

  // Uganda → Flutterwave (M-Pesa support)
  if (normalized === "UG") {
    if (availableProviders.has("FLUTTERWAVE")) {
      return "FLUTTERWAVE"
    }
  }

  // Tanzania → Flutterwave (M-Pesa support)
  if (normalized === "TZ") {
    if (availableProviders.has("FLUTTERWAVE")) {
      return "FLUTTERWAVE"
    }
  }

  // Rwanda → Flutterwave
  if (normalized === "RW") {
    if (availableProviders.has("FLUTTERWAVE")) {
      return "FLUTTERWAVE"
    }
  }

  // EU countries → Stripe
  const euCountries = [
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE",
    "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT",
    "RO", "SK", "SI", "ES", "SE"
  ]
  if (euCountries.includes(normalized)) {
    if (availableProviders.has("STRIPE")) {
      return "STRIPE"
    }
  }

  // US, UK, and rest of world → Stripe
  if (normalized === "US" || normalized === "GB") {
    if (availableProviders.has("STRIPE")) {
      return "STRIPE"
    }
  }

  // Default fallback → First available provider or Stripe
  if (availableProviders.has("STRIPE")) {
    return "STRIPE"
  }
  if (availableProviders.has("PAYSTACK")) {
    return "PAYSTACK"
  }
  if (availableProviders.has("FLUTTERWAVE")) {
    return "FLUTTERWAVE"
  }

  // If no providers available, throw error
  throw new Error(
    "No payment providers configured. Please set at least one of: STRIPE_SECRET_KEY, PAYSTACK_SECRET_KEY, or FLUTTERWAVE_SECRET_KEY"
  )
}

/**
 * Get payment provider by name
 * If provider is specified and valid, returns it
 * Otherwise, auto-detects based on country
 * 
 * @param provider - Provider name (string or null/undefined)
 * @param country - Optional country code for auto-detection
 */
function getPaymentProvider(
  provider?: string | null,
  country?: string
): PaymentProvider {
  // If no provider specified, auto-detect from country
  if (!provider || provider.trim() === "") {
    if (country) {
      return getProviderForCountry(country)
    }
    // Default fallback
    if (availableProviders.has("STRIPE")) {
      return "STRIPE"
    }
    if (availableProviders.has("PAYSTACK")) {
      return "PAYSTACK"
    }
    if (availableProviders.has("FLUTTERWAVE")) {
      return "FLUTTERWAVE"
    }
    throw new Error("No payment providers available")
  }

  const normalized = provider.toUpperCase().trim()

  // Validate and return if it's a valid provider
  const validProviders: PaymentProvider[] = [
    "STRIPE",
    "PAYSTACK",
    "FLUTTERWAVE",
    "MPESA_PAYSTACK",
    "MPESA_FLW",
  ]

  if (validProviders.includes(normalized as PaymentProvider)) {
    // Check if provider is available
    if (normalized === "STRIPE" && !availableProviders.has("STRIPE")) {
      console.warn("Stripe not available, falling back to country-based selection")
      return country ? getProviderForCountry(country) : "PAYSTACK"
    }
    if (normalized === "PAYSTACK" && !availableProviders.has("PAYSTACK")) {
      console.warn("Paystack not available, falling back to country-based selection")
      return country ? getProviderForCountry(country) : "STRIPE"
    }
    if (normalized === "FLUTTERWAVE" && !availableProviders.has("FLUTTERWAVE")) {
      console.warn("Flutterwave not available, falling back to country-based selection")
      return country ? getProviderForCountry(country) : "STRIPE"
    }
    if (normalized.startsWith("MPESA_") && !availableProviders.has(normalized as PaymentProvider)) {
      console.warn(`M-Pesa provider ${normalized} not available, falling back to country-based selection`)
      return country ? getProviderForCountry(country) : "STRIPE"
    }
    return normalized as PaymentProvider
  }

  // Handle M-Pesa aliases
  if (normalized === "MPESA") {
    // Auto-select M-Pesa provider based on country or MPESA_PROVIDER env
    if (country) {
      const countryCode = normalizeCountry(country)
      // Kenya: Auto-select M-Pesa if phone starts with 254
      if (countryCode === "KE") {
        if (availableProviders.has("MPESA_FLW")) {
          return "MPESA_FLW"
        }
        if (availableProviders.has("MPESA_PAYSTACK")) {
          return "MPESA_PAYSTACK"
        }
        // Fallback to Flutterwave or Paystack for KE
        return getProviderForCountry(countryCode)
      }
    }
    // Default M-Pesa provider from env or Flutterwave
    if (availableProviders.has("MPESA_FLW")) {
      return "MPESA_FLW"
    }
    if (availableProviders.has("MPESA_PAYSTACK")) {
      return "MPESA_PAYSTACK"
    }
    // Fallback to Flutterwave if available
    if (availableProviders.has("FLUTTERWAVE")) {
      return "FLUTTERWAVE"
    }
  }

  // If invalid provider, auto-detect from country or default
  if (country) {
    return getProviderForCountry(country)
  }

  // Final fallback
  if (availableProviders.has("STRIPE")) {
    return "STRIPE"
  }
  if (availableProviders.has("PAYSTACK")) {
    return "PAYSTACK"
  }
  if (availableProviders.has("FLUTTERWAVE")) {
    return "FLUTTERWAVE"
  }

  throw new Error("No payment providers available")
}

/**
 * Exchange rates (static rates - can be overridden with API)
 * Base currency: USD
 */
const EXCHANGE_RATES: Record<SupportedCurrency, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.35,
  KES: 129.0,
  NGN: 1650.0,
  GHS: 14.0,
  ZAR: 18.0,
  UGX: 3700.0,
}

/**
 * Fetch exchange rates from API (optional)
 * Falls back to static rates if API key not configured
 */
async function fetchExchangeRates(): Promise<Record<SupportedCurrency, number>> {
  const apiKey = process.env.EXCHANGE_RATE_API_KEY
  
  if (!apiKey) {
    // Return static rates if no API key
    return EXCHANGE_RATES
  }

  try {
    // Example: Using exchangerate-api.com (free tier available)
    const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`)
    const data = await response.json()
    
    if (data.result === "success" && data.conversion_rates) {
      return {
        USD: 1.0,
        EUR: data.conversion_rates.EUR || EXCHANGE_RATES.EUR,
        GBP: data.conversion_rates.GBP || EXCHANGE_RATES.GBP,
        CAD: data.conversion_rates.CAD || EXCHANGE_RATES.CAD,
        KES: data.conversion_rates.KES || EXCHANGE_RATES.KES,
        NGN: data.conversion_rates.NGN || EXCHANGE_RATES.NGN,
        GHS: data.conversion_rates.GHS || EXCHANGE_RATES.GHS,
        ZAR: data.conversion_rates.ZAR || EXCHANGE_RATES.ZAR,
        UGX: data.conversion_rates.UGX || EXCHANGE_RATES.UGX,
      }
    }
  } catch (error) {
    console.warn("Failed to fetch exchange rates from API, using static rates:", error)
  }

  return EXCHANGE_RATES
}

/**
 * Convert price from USD to target currency
 * @param amountUSD - Amount in USD
 * @param targetCurrency - Target currency code
 * @returns Converted amount in target currency
 */
async function convertPrice(
  amountUSD: number,
  targetCurrency: SupportedCurrency
): Promise<number> {
  if (targetCurrency === "USD") {
    return amountUSD
  }

  const rates = await fetchExchangeRates()
  const rate = rates[targetCurrency] || 1.0
  
  // Round to 2 decimal places for most currencies, or whole number for some
  const converted = amountUSD * rate
  
  // Round based on currency (some currencies don't use decimals)
  if (["KES", "NGN", "UGX"].includes(targetCurrency)) {
    return Math.round(converted)
  }
  
  return Math.round(converted * 100) / 100
}

/**
 * Get currency for a payment provider
 * Each provider supports specific currencies
 */
function getCurrencyForProvider(provider: PaymentProvider): SupportedCurrency {
  const providerUpper = provider.toUpperCase()
  
  // Stripe supports: USD, EUR, GBP, CAD
  if (providerUpper === "STRIPE") {
    return "USD" // Default, but can be changed based on country
  }
  
  // Paystack supports: NGN only
  if (providerUpper === "PAYSTACK" || providerUpper === "MPESA_PAYSTACK") {
    return "NGN"
  }
  
  // Flutterwave supports: KES, NGN, GHS, ZAR, USD
  if (providerUpper === "FLUTTERWAVE" || providerUpper === "MPESA_FLW") {
    return "KES" // Default for M-Pesa, but can be changed based on country
  }
  
  // Default fallback
  return "USD"
}

/**
 * Get best provider for a country
 * This is an alias for getProviderForCountry for consistency
 */
function getBestProviderForCountry(countryCode: string): PaymentProvider {
  return getProviderForCountry(countryCode)
}

/**
 * Get currency for country
 * Returns the appropriate currency code for the given country
 */
function getCurrencyForCountry(countryCode: string): SupportedCurrency {
  const normalized = normalizeCountry(countryCode)

  const currencyMap: Record<string, SupportedCurrency> = {
    // African countries
    KE: "KES", // Kenya
    NG: "NGN", // Nigeria
    GH: "GHS", // Ghana
    UG: "UGX", // Uganda
    ZA: "ZAR", // South Africa
    TZ: "KES", // Tanzania (uses KES for M-Pesa)
    // Major countries
    US: "USD", // United States
    GB: "GBP", // United Kingdom
    CA: "CAD", // Canada
    // EU countries
    AT: "EUR", // Austria
    BE: "EUR", // Belgium
    BG: "EUR", // Bulgaria
    HR: "EUR", // Croatia
    CY: "EUR", // Cyprus
    CZ: "EUR", // Czech Republic
    DK: "EUR", // Denmark
    EE: "EUR", // Estonia
    FI: "EUR", // Finland
    FR: "EUR", // France
    DE: "EUR", // Germany
    GR: "EUR", // Greece
    HU: "EUR", // Hungary
    IE: "EUR", // Ireland
    IT: "EUR", // Italy
    LV: "EUR", // Latvia
    LT: "EUR", // Lithuania
    LU: "EUR", // Luxembourg
    MT: "EUR", // Malta
    NL: "EUR", // Netherlands
    PL: "EUR", // Poland
    PT: "EUR", // Portugal
    RO: "EUR", // Romania
    SK: "EUR", // Slovakia
    SI: "EUR", // Slovenia
    ES: "EUR", // Spain
    SE: "EUR", // Sweden
  }

  return currencyMap[normalized] || "USD"
}

/**
 * Create Stripe payment
 * Uses Checkout Session to get a redirect URL
 */
async function createStripePayment(
  amount: number,
  email: string,
  currency: string,
  metadata?: Record<string, any>
): Promise<{ reference: string; payment_url: string }> {
  if (!availableProviders.has("STRIPE")) {
    throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY in your .env file")
  }

  try {
    // Use Stripe directly to create a Checkout Session (for redirect URL)
    const stripeKey = process.env.STRIPE_SECRET_KEY?.trim()
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set")
    }
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-11-20.acacia",
    })

    // Convert amount to cents
    const amountInCents = Math.round(amount * 100)
    
    // Create a Checkout Session for redirect-based payment
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: metadata?.tierName || "Subscription",
              description: `Subscription to ${metadata?.tierName || "tier"}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/cancel`,
      customer_email: email,
      metadata: {
        userId: metadata?.userId || "",
        creatorId: metadata?.creatorId || "",
        tierName: metadata?.tierName || "",
        tierId: metadata?.tierId || "",
        ...metadata,
      },
    })

    if (!session.url) {
      throw new Error("Stripe Checkout Session did not return a URL")
    }

    return {
      reference: session.id,
      payment_url: session.url,
    }
  } catch (error: any) {
    throw new Error(`Stripe payment creation failed: ${error.message}`)
  }
}

/**
 * Create Paystack payment
 */
async function createPaystackPayment(
  amount: number,
  email: string,
  currency: string,
  metadata?: Record<string, any>
): Promise<{ reference: string; payment_url: string }> {
  if (!availableProviders.has("PAYSTACK")) {
    throw new Error("Paystack is not configured. Please set PAYSTACK_SECRET_KEY in your .env file")
  }

  try {
    const result = await paystackSDK.createPayment(
      amount,
      currency,
      metadata?.userId || "",
      metadata?.creatorId || "",
      metadata?.tierName || "",
      {
        ...metadata,
        email,
      }
    )

    if (!result.redirectUrl) {
      throw new Error("Paystack did not return a payment URL")
    }

    return {
      reference: result.reference,
      payment_url: result.redirectUrl,
    }
  } catch (error: any) {
    throw new Error(`Paystack payment creation failed: ${error.message}`)
  }
}

/**
 * Create Flutterwave payment
 */
async function createFlutterwavePayment(
  amount: number,
  email: string,
  currency: string,
  metadata?: Record<string, any>
): Promise<{ reference: string; payment_url: string }> {
  if (!availableProviders.has("FLUTTERWAVE")) {
    throw new Error("Flutterwave is not configured. Please set FLUTTERWAVE_SECRET_KEY in your .env file")
  }

  try {
    const result = await flutterwaveSDK.createPayment(
      amount,
      currency,
      metadata?.userId || "",
      metadata?.creatorId || "",
      metadata?.tierName || "",
      {
        ...metadata,
        email,
      }
    )

    if (!result.redirectUrl) {
      throw new Error("Flutterwave did not return a payment URL")
    }

    return {
      reference: result.reference,
      payment_url: result.redirectUrl,
    }
  } catch (error: any) {
    throw new Error(`Flutterwave payment creation failed: ${error.message}`)
  }
}

/**
 * Create M-Pesa payment
 * Uses Paystack or Flutterwave based on MPESA_PROVIDER env or provider parameter
 * M-Pesa is push-based, so we return a status check URL instead of redirect URL
 */
async function createMpesaPayment(
  amount: number,
  phone: string,
  provider: "MPESA_PAYSTACK" | "MPESA_FLW",
  metadata?: Record<string, any>
): Promise<{ reference: string; payment_url: string }> {
  // Validate phone number for Kenya (254 prefix)
  const phoneNormalized = phone.replace(/\D/g, "")
  if (!phoneNormalized.startsWith("254") && phoneNormalized.length !== 12) {
    throw new Error("Invalid M-Pesa phone number. Must be a Kenyan number starting with 254")
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  if (provider === "MPESA_PAYSTACK") {
    if (!availableProviders.has("MPESA_PAYSTACK")) {
      throw new Error("M-Pesa via Paystack is not configured. Set MPESA_PROVIDER=paystack and PAYSTACK_SECRET_KEY")
    }

    try {
      // Use the M-Pesa specific method from Paystack SDK
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

      // M-Pesa is push-based - return status check URL
      const payment_url = `${baseUrl}/payment/mpesa/status?reference=${result.reference}&provider=paystack`

      return {
        reference: result.reference,
        payment_url,
      }
    } catch (error: any) {
      throw new Error(`Paystack M-Pesa payment creation failed: ${error.message}`)
    }
  } else if (provider === "MPESA_FLW") {
    if (!availableProviders.has("MPESA_FLW")) {
      throw new Error("M-Pesa via Flutterwave is not configured. Set MPESA_PROVIDER=flutterwave and FLUTTERWAVE_SECRET_KEY")
    }

    try {
      // Use the M-Pesa specific method from Flutterwave SDK
      const result = await flutterwaveSDK.createMpesaPayment({
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

      // M-Pesa is push-based - return status check URL
      const payment_url = `${baseUrl}/payment/mpesa/status?reference=${result.reference}&provider=flutterwave`

      return {
        reference: result.reference,
        payment_url,
      }
    } catch (error: any) {
      throw new Error(`Flutterwave M-Pesa payment creation failed: ${error.message}`)
    }
  } else {
    throw new Error(`Invalid M-Pesa provider: ${provider}. Must be MPESA_PAYSTACK or MPESA_FLW`)
  }
}

// Main export block - helper functions only
export {
  getPaymentProvider,
  getProviderForCountry,
  getBestProviderForCountry,
  getCurrencyForCountry,
  getCurrencyForProvider,
  convertPrice,
  normalizeCountry,
  isMobileMoney,
}

// Export type
export type { PaymentProvider }

// Payment creation functions - exported for API route use
// These are internal implementation details but needed by routes
export {
  createStripePayment,
  createPaystackPayment,
  createFlutterwavePayment,
  createMpesaPayment,
}
