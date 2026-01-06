/**
 * Centralized Paystack Payment Service
 * 
 * Responsibilities:
 * - Single source of truth for Paystack amount conversion
 * - Per-tier Paystack plan management
 * - Currency validation and safety guards
 * - Production environment checks
 */

import crypto from "crypto"
import { resolvePaystackCurrency, type PaystackCurrency } from "./currency"
import { getAppUrl } from "@/lib/app-url"

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY
const PAYSTACK_BASE_URL = process.env.NODE_ENV === "production" 
  ? "https://api.paystack.co"
  : "https://api.paystack.co" // Use production API even in dev (test keys)

// Validate environment (lazy check - only when functions are called)
function validatePaystackKeys() {
  if (!PAYSTACK_SECRET_KEY || !PAYSTACK_PUBLIC_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY and PAYSTACK_PUBLIC_KEY are required")
  }

  // Ensure production keys in production (runtime check only)
  if (process.env.NODE_ENV === "production") {
    if (PAYSTACK_SECRET_KEY.startsWith("sk_test_") || PAYSTACK_PUBLIC_KEY.startsWith("pk_test_")) {
      throw new Error("Production environment must use production Paystack keys (sk_live_/pk_live_)")
    }
  }
}

/**
 * Tier to Paystack Plan Code Mapping
 * Each tier gets its own unique plan code for scalability
 * Format: {TIER_NAME}_{CURRENCY}_{AMOUNT_IN_MINOR}
 */
export function getTierPlanCode(tierName: string, currency: string, amountInMinor: number): string {
  const normalizedTier = tierName.toUpperCase().replace(/\s+/g, "_")
  return `${normalizedTier}_${currency}_${amountInMinor}`
}

/**
 * Convert display amount to Paystack smallest unit (kobo/cents)
 * CRITICAL: This is the ONLY place where amount conversion should happen
 * 
 * @param displayAmount - Amount in display currency (e.g., 100.50 for $100.50)
 * @param currency - Currency code (NGN, KES, USD, etc.)
 * @returns Amount in smallest unit (kobo for NGN, cents for USD, etc.)
 */
export function convertToPaystackAmount(displayAmount: number, currency: string): number {
  if (typeof displayAmount !== "number" || isNaN(displayAmount) || displayAmount < 0) {
    throw new Error(`Invalid amount: ${displayAmount}. Must be a positive number.`)
  }

  // Paystack uses 100 as the multiplier for all supported currencies
  // NGN: kobo, USD: cents, KES: cents, etc.
  const amountInMinor = Math.round(displayAmount * 100)

  if (amountInMinor <= 0) {
    throw new Error(`Amount too small: ${displayAmount}. Minimum is 0.01.`)
  }

  return amountInMinor
}

/**
 * Convert Paystack amount back to display amount
 * 
 * @param paystackAmount - Amount in smallest unit (kobo/cents)
 * @returns Display amount (e.g., 100.50)
 */
export function convertFromPaystackAmount(paystackAmount: number): number {
  return paystackAmount / 100
}

/**
 * Validate currency before sending to Paystack
 */
export function validatePaystackCurrency(currency: string): PaystackCurrency {
  const resolved = resolvePaystackCurrency(currency)
  
  if (!resolved) {
    throw new Error(`Unsupported currency: ${currency}. Paystack supports: NGN, KES, ZAR, GHS, USD`)
  }

  return resolved
}

/**
 * Get Paystack plan code for a tier
 * Creates plan if it doesn't exist
 */
export async function getOrCreatePaystackPlan(
  tierName: string,
  amount: number,
  currency: string,
  interval: "monthly" | "yearly" = "monthly"
): Promise<string> {
  const validatedCurrency = validatePaystackCurrency(currency)
  const amountInMinor = convertToPaystackAmount(amount, validatedCurrency)
  const planCode = getTierPlanCode(tierName, validatedCurrency, amountInMinor)

  // Check if plan exists
  try {
    const existingPlan = await makePaystackRequest(`/plan/${planCode}`, "GET")
    if (existingPlan && existingPlan.amount === amountInMinor && existingPlan.currency === validatedCurrency) {
      return planCode
    }
    // Plan exists but amount/currency mismatch - log warning
    console.warn(`[PAYSTACK_PLAN] Plan ${planCode} exists but amount/currency mismatch`, {
      existing: { amount: existingPlan.amount, currency: existingPlan.currency },
      requested: { amount: amountInMinor, currency: validatedCurrency },
    })
  } catch (error: any) {
    // Plan doesn't exist, create it
    if (error.paystackResponse?.message?.includes("not found") || error.paystackResponse?.status === false) {
      console.info(`[PAYSTACK_PLAN] Creating plan: ${planCode}`, {
        amount: amountInMinor,
        currency: validatedCurrency,
        interval,
      })

      const newPlan = await makePaystackRequest("/plan", "POST", {
        name: `${tierName} Tier - ${interval}`,
        interval: interval === "monthly" ? "monthly" : "annually",
        amount: amountInMinor,
        currency: validatedCurrency,
        plan_code: planCode,
      })

      return newPlan.plan_code || planCode
    }
    throw error
  }

  return planCode
}

/**
 * Internal Paystack API request helper
 */
async function makePaystackRequest(
  endpoint: string,
  method: string = "GET",
  body?: any
): Promise<any> {
  // Validate keys on first use (lazy validation)
  validatePaystackKeys()
  
  const url = `${PAYSTACK_BASE_URL}${endpoint}`
  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  }

  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(url, options)
  const data = await response.json()

  if (!data.status) {
    const error = new Error(data.message || "Paystack API error") as any
    error.paystackResponse = data
    error.paystackMessage = data.message
    throw error
  }

  return data.data
}

/**
 * Initialize Paystack payment
 * CRITICAL: Amount conversion happens here exactly once
 */
export async function initializePaystackPayment(params: {
  amount: number // Display amount (e.g., 100.50)
  currency: string
  userId: string
  creatorId: string
  tierName: string
  email?: string
  planCode?: string // Optional: use Paystack plan if provided
  metadata?: Record<string, any>
}): Promise<{
  reference: string
  redirectUrl: string
  accessCode: string
  amountInMinor: number
  currency: PaystackCurrency
}> {
  // Validate currency
  const validatedCurrency = validatePaystackCurrency(params.currency)
  
  // Convert amount exactly once
  const amountInMinor = convertToPaystackAmount(params.amount, validatedCurrency)

  // Safety guard: ensure amount is positive
  if (amountInMinor <= 0) {
    throw new Error(`Invalid payment amount: ${params.amount}. Must be greater than 0.`)
  }

  // Log payment initialization (no secrets)
  console.info("[PAYSTACK_PAYMENT]", {
    userId: params.userId,
    creatorId: params.creatorId,
    tierName: params.tierName,
    displayAmount: params.amount,
    amountInMinor,
    currency: validatedCurrency,
    planCode: params.planCode,
  })

  try {
    const requestBody: any = {
      email: params.email || `user-${params.userId}@example.com`,
      amount: amountInMinor,
      currency: validatedCurrency,
      reference: `ref_${Date.now()}_${params.userId}`,
      metadata: {
        userId: params.userId,
        creatorId: params.creatorId,
        tierName: params.tierName,
        originalCurrency: params.currency,
        paystackCurrency: validatedCurrency,
        ...params.metadata,
      },
      callback_url: `${getAppUrl()}/payment/success?reference={reference}`,
    }

    // Use plan if provided
    if (params.planCode) {
      requestBody.plan = params.planCode
    }

    const response = await makePaystackRequest("/transaction/initialize", "POST", requestBody)

    return {
      reference: response.reference,
      redirectUrl: response.authorization_url,
      accessCode: response.access_code,
      amountInMinor,
      currency: validatedCurrency,
    }
  } catch (error: any) {
    console.error("[PAYSTACK_PAYMENT] Failed:", {
      error: error.message || error.paystackMessage,
      code: error.paystackResponse?.status === false ? "API_ERROR" : "UNKNOWN",
      userId: params.userId,
      amountInMinor,
      currency: validatedCurrency,
    })
    throw error
  }
}

/**
 * Verify Paystack payment
 */
export async function verifyPaystackPayment(reference: string): Promise<{
  status: "success" | "failed" | "pending"
  reference: string
  amount: number // In minor units
  currency: string
  metadata?: Record<string, any>
}> {
  const response = await makePaystackRequest(`/transaction/verify/${reference}`)

  let status: "success" | "failed" | "pending" = "pending"
  if (response.status === "success") {
    status = "success"
  } else if (response.status === "failed") {
    status = "failed"
  }

  return {
    status,
    reference: response.reference,
    amount: response.amount, // Already in minor units from Paystack
    currency: response.currency,
    metadata: {
      authorization: response.authorization,
      customer: response.customer,
    },
  }
}

/**
 * Verify webhook signature
 */
export function verifyPaystackWebhookSignature(
  payload: any,
  signature: string
): boolean {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY is required for webhook verification")
  }

  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(JSON.stringify(payload))
    .digest("hex")

  return hash === signature
}

/**
 * Handle Paystack webhook
 */
export function parsePaystackWebhook(payload: any): {
  event: string
  reference: string
  status: "success" | "failed" | "pending"
  amount: number // In minor units
  currency: string
  metadata?: Record<string, any>
} {
  const event = payload.event
  const data = payload.data

  let status: "success" | "failed" | "pending" = "pending"
  let reference = ""
  let amount = 0
  let currency = "NGN"

  switch (event) {
    case "charge.success":
      reference = data.reference
      amount = data.amount // Already in minor units
      currency = data.currency
      status = "success"
      break

    case "charge.failed":
      reference = data.reference
      amount = data.amount // Already in minor units
      currency = data.currency
      status = "failed"
      break

    default:
      throw new Error(`Unhandled Paystack event: ${event}`)
  }

  return {
    event,
    reference,
    status,
    amount,
    currency,
    metadata: {
      customer: data.customer,
      authorization: data.authorization,
    },
  }
}

