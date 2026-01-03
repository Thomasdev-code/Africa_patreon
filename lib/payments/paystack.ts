/**
 * Paystack Payment Provider Implementation
 */

import crypto from "crypto"
import type {
  PaymentProviderInterface,
  PaymentVerification,
  PaymentStatus,
} from "./types"
import { convertToSmallestUnit } from "./router"
import { resolvePaystackCurrency, type PaystackCurrency } from "./currency"
import { getAppUrl } from "@/lib/app-url"

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY

if (!PAYSTACK_SECRET_KEY || !PAYSTACK_PUBLIC_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY and PAYSTACK_PUBLIC_KEY are required")
}

const PAYSTACK_BASE_URL = "https://api.paystack.co"

export class PaystackProvider implements PaymentProviderInterface {
  private async makeRequest(
    endpoint: string,
    method: string = "GET",
    body?: any
  ): Promise<any> {
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
      // Create error with full Paystack response for better error detection
      const error = new Error(data.message || "Paystack API error") as any
      error.paystackResponse = data
      error.paystackMessage = data.message
      throw error
    }

    return data.data
  }

  async createPayment(
    amount: number,
    currency: string,
    userId: string,
    creatorId: string,
    tierName: string,
    metadata?: Record<string, any>
  ): Promise<{
    reference: string
    redirectUrl: string
    metadata?: Record<string, any>
    platformFee?: number
    creatorEarnings?: number
    providerChargeAmount?: number
  }> {
    // CRITICAL: Resolve to Paystack-compatible currency (never trust input)
    let paystackCurrency = resolvePaystackCurrency(currency)
    
    // Defensive logging
    console.info("[PAYMENT]", {
      userId,
      originalCurrency: currency,
      paystackCurrency,
      provider: "paystack",
      amount,
      amountInMinor: convertToSmallestUnit(amount, paystackCurrency),
      creatorId,
      tierName,
    })

    let amountInKobo = convertToSmallestUnit(amount, paystackCurrency)

    try {
      const response = await this.makeRequest("/transaction/initialize", "POST", {
        email: metadata?.email || `user-${userId}@example.com`,
        amount: amountInKobo,
        currency: paystackCurrency, // Use resolved currency
        reference: `ref_${Date.now()}_${userId}`,
        metadata: {
          userId,
          creatorId,
          tierName,
          originalCurrency: currency, // Store original for audit
          paystackCurrency, // Store resolved currency
          ...metadata,
        },
        callback_url: `${getAppUrl()}/payment/success?reference={reference}`,
      })

      return {
        reference: response.reference,
        redirectUrl: response.authorization_url,
        metadata: {
          accessCode: response.access_code,
        },
        platformFee: metadata?.platformFee,
        creatorEarnings: metadata?.creatorEarnings,
        providerChargeAmount: amountInKobo,
      }
    } catch (error: any) {
      // Check if this is a currency-related error
      const errorMessage = error.message || error.paystackMessage || ""
      const isCurrencyError = 
        errorMessage.toLowerCase().includes("currency") ||
        errorMessage.toLowerCase().includes("not supported") ||
        (paystackCurrency !== "NGN" && errorMessage)

      // If currency is not supported by merchant, fallback to KES
      if (isCurrencyError && paystackCurrency !== "NGN") {
        console.warn(`[PAYMENT] Currency ${paystackCurrency} not supported, falling back to KES`, {
          userId,
          originalCurrency: currency,
          attemptedCurrency: paystackCurrency,
          error: errorMessage,
          paystackResponse: error.paystackResponse,
        })

        // Convert amount to KES if needed
        // Simplified conversion - in production use real rates
        // Note: paystackCurrency is already narrowed to exclude "NGN" by the if condition
        const conversionRate = paystackCurrency === "USD" ? 130 : paystackCurrency === "GHS" ? 130/12 : paystackCurrency === "ZAR" ? 130/18.5 : 1
        const kesAmount = amount * conversionRate
        const kesAmountInCents = convertToSmallestUnit(kesAmount, "KES")

        try {
          // Retry with KES
          const response = await this.makeRequest("/transaction/initialize", "POST", {
            email: metadata?.email || `user-${userId}@example.com`,
            amount: kesAmountInCents,
            currency: "KES",
            reference: `ref_${Date.now()}_${userId}`,
            metadata: {
              userId,
              creatorId,
              tierName,
              originalCurrency: currency, // Store original for audit
              paystackCurrency: "KES", // Store fallback currency
              currencyFallback: true, // Flag that we fell back
              originalAmount: amount,
              convertedAmount: kesAmount,
              ...metadata,
            },
            callback_url: `${getAppUrl()}/payment/success?reference={reference}`,
          })

          return {
            reference: response.reference,
            redirectUrl: response.authorization_url,
            metadata: {
              accessCode: response.access_code,
            },
            platformFee: metadata?.platformFee,
            creatorEarnings: metadata?.creatorEarnings,
            providerChargeAmount: kesAmountInCents,
          }
        } catch (retryError: any) {
          // If even KES fails, log and throw
          console.error(`[PAYMENT] Even KES fallback failed`, {
            userId,
            error: retryError.message || retryError.paystackMessage,
            paystackResponse: retryError.paystackResponse,
          })
          throw retryError
        }
      }

      // Re-throw if it's not a currency error or if we're already using KES
      throw error
    }
  }

  async verifyPayment(reference: string): Promise<PaymentVerification> {
    const response = await this.makeRequest(
      `/transaction/verify/${reference}`
    )

    let status: PaymentStatus = "pending"
    if (response.status === "success") {
      status = "success"
    } else if (response.status === "failed") {
      status = "failed"
    }

    return {
      status,
      reference: response.reference,
      amount: response.amount,
      currency: response.currency,
      metadata: {
        authorization: response.authorization,
        customer: response.customer,
      },
    }
  }

  async handleWebhook(
    payload: any,
    signature?: string
  ): Promise<{
    event: string
    reference: string
    status: PaymentStatus
    amount: number
    currency: string
    metadata?: Record<string, any>
  }> {
    // Verify webhook signature
    if (signature) {
      if (!PAYSTACK_SECRET_KEY) {
        throw new Error("PAYSTACK_SECRET_KEY is required for webhook verification")
      }
      const hash = crypto
        .createHmac("sha512", PAYSTACK_SECRET_KEY)
        .update(JSON.stringify(payload))
        .digest("hex")

      if (hash !== signature) {
        throw new Error("Invalid Paystack webhook signature")
      }
    }

    const event = payload.event
    const data = payload.data

    let status: PaymentStatus = "pending"
    let reference = ""
    let amount = 0
    let currency = "KES"

    switch (event) {
      case "charge.success":
        reference = data.reference
        amount = data.amount
        currency = data.currency
        status = "success"
        break

      case "charge.failed":
        reference = data.reference
        amount = data.amount
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

  /**
   * Create M-Pesa payment via Paystack
   */
  async createMpesaPayment(params: {
    amount: number
    currency: string
    phoneNumber: string
    userId: string
    creatorId: string
    tierName: string
    metadata?: Record<string, any>
  }): Promise<{
    reference: string
    status: PaymentStatus
    metadata?: Record<string, any>
  }> {
    // CRITICAL: M-Pesa via Paystack uses NGN (Paystack doesn't support KES directly)
    let paystackCurrency = resolvePaystackCurrency(params.currency)
    
    // Defensive logging
    console.info("[MPESA_PAYMENT]", {
      userId: params.userId,
      originalCurrency: params.currency,
      paystackCurrency,
      provider: "paystack",
      amount: params.amount,
      amountInMinor: convertToSmallestUnit(params.amount, paystackCurrency),
      creatorId: params.creatorId,
      tierName: params.tierName,
    })
    
    let amount = params.amount
    let amountInKobo = convertToSmallestUnit(amount, paystackCurrency)
    
    // Format phone number (254XXXXXXXXX)
    let phone = params.phoneNumber.replace(/\D/g, "")
    if (phone.startsWith("0")) {
      phone = `254${phone.substring(1)}`
    } else if (!phone.startsWith("254")) {
      phone = `254${phone}`
    }

    try {
      const response = await this.makeRequest("/charge", "POST", {
        email: params.metadata?.email || `user-${params.userId}@example.com`,
        amount: amountInKobo,
        currency: paystackCurrency, // Use resolved currency
        reference: `ref_${Date.now()}_${params.userId}`,
        mobile_money: {
          phone,
          provider: "mpesa",
        },
        metadata: {
          userId: params.userId,
          creatorId: params.creatorId,
          tierName: params.tierName,
          originalCurrency: params.currency, // Store original for audit
          paystackCurrency, // Store resolved currency
          ...params.metadata,
        },
      })

      let status: PaymentStatus = "pending"
      if (response.status === "success") {
        status = "success"
      } else if (response.status === "pending") {
        status = "pending"
      } else {
        status = "failed"
      }

      return {
        reference: response.reference,
        status,
        metadata: {
          ...response,
          phone,
        },
      }
    } catch (error: any) {
      // Check if this is a currency-related error
      const errorMessage = error.message || error.paystackMessage || ""
      const isCurrencyError = 
        errorMessage.toLowerCase().includes("currency") ||
        errorMessage.toLowerCase().includes("not supported") ||
        (paystackCurrency !== "KES" && errorMessage)

      // If currency is not supported by merchant, fallback to KES
      if (isCurrencyError && paystackCurrency !== "KES") {
        console.warn(`[MPESA_PAYMENT] Currency ${paystackCurrency} not supported, falling back to KES`, {
          userId: params.userId,
          originalCurrency: params.currency,
          attemptedCurrency: paystackCurrency,
          error: errorMessage,
          paystackResponse: error.paystackResponse,
        })

        // Convert amount to KES if needed
        // Note: paystackCurrency is already narrowed to exclude "KES" by the if condition
        const conversionRate = paystackCurrency === "USD" ? 130 : paystackCurrency === "NGN" ? 130/1500 : paystackCurrency === "GHS" ? 130/12 : paystackCurrency === "ZAR" ? 130/18.5 : 1
        const kesAmount = amount * conversionRate
        const kesAmountInCents = convertToSmallestUnit(kesAmount, "KES")

        try {
          // Retry with KES
          const response = await this.makeRequest("/charge", "POST", {
            email: params.metadata?.email || `user-${params.userId}@example.com`,
            amount: kesAmountInCents,
            currency: "KES",
            reference: `ref_${Date.now()}_${params.userId}`,
            mobile_money: {
              phone,
              provider: "mpesa",
            },
            metadata: {
              userId: params.userId,
              creatorId: params.creatorId,
              tierName: params.tierName,
              originalCurrency: params.currency, // Store original for audit
              paystackCurrency: "KES", // Store fallback currency
              currencyFallback: true, // Flag that we fell back
              originalAmount: amount,
              convertedAmount: kesAmount,
              ...params.metadata,
            },
          })

          let status: PaymentStatus = "pending"
          if (response.status === "success") {
            status = "success"
          } else if (response.status === "pending") {
            status = "pending"
          } else {
            status = "failed"
          }

          return {
            reference: response.reference,
            status,
            metadata: {
              ...response,
              phone,
            },
          }
        } catch (retryError: any) {
          // If even KES fails, log and throw
          console.error(`[MPESA_PAYMENT] Even KES fallback failed`, {
            userId: params.userId,
            error: retryError.message || retryError.paystackMessage,
            paystackResponse: retryError.paystackResponse,
          })
          throw retryError
        }
      }

      // Re-throw if it's not a currency error or if we're already using KES
      throw error
    }
  }

  /**
   * Check M-Pesa payment status
   */
  async checkMpesaStatus(reference: string): Promise<{
    status: PaymentStatus
    amount: number
    currency: string
    metadata?: Record<string, any>
  }> {
    return await this.verifyPayment(reference)
  }

  /**
   * Initialize payment (alias for createPayment for compatibility)
   */
  async initializePayment(params: {
    amount: number
    currency: string
    userId: string
    creatorId: string
    tierName: string
    metadata?: Record<string, any>
  }): Promise<{
    reference: string
    redirectUrl: string
    accessCode?: string
    metadata?: Record<string, any>
  }> {
    const result = await this.createPayment(
      params.amount,
      params.currency,
      params.userId,
      params.creatorId,
      params.tierName,
      params.metadata
    )

    return {
      reference: result.reference,
      redirectUrl: result.redirectUrl,
      accessCode: result.metadata?.accessCode,
      metadata: result.metadata,
    }
  }
}

export const paystackProvider = new PaystackProvider()

