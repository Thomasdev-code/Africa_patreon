/**
 * Paystack Payment Provider Implementation
 * Uses centralized Paystack service for amount conversion and plan management
 */

import type {
  PaymentProviderInterface,
  PaymentVerification,
  PaymentStatus,
} from "./types"
import {
  initializePaystackPayment,
  verifyPaystackPayment,
  convertFromPaystackAmount,
  getOrCreatePaystackPlan,
  parsePaystackWebhook,
  verifyPaystackWebhookSignature,
} from "./paystack-service"
import { resolvePaystackCurrency } from "./currency"

export class PaystackProvider implements PaymentProviderInterface {
  async createPayment(
    amount: number, // Display amount (e.g., 100.50)
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
    // Get or create Paystack plan for this tier
    let planCode: string | undefined
    try {
      planCode = await getOrCreatePaystackPlan(tierName, amount, currency)
    } catch (error: any) {
      console.warn("[PAYSTACK] Plan creation failed, using one-time payment", {
        tierName,
        error: error.message,
      })
      // Continue without plan if plan creation fails
    }

    // Initialize payment using centralized service (amount conversion happens here)
    const result = await initializePaystackPayment({
      amount, // Display amount - conversion happens inside
      currency,
      userId,
      creatorId,
      tierName,
      email: metadata?.email,
      planCode,
      metadata,
    })

    return {
      reference: result.reference,
      redirectUrl: result.redirectUrl,
      metadata: {
        accessCode: result.accessCode,
        planCode,
      },
      platformFee: metadata?.platformFee,
      creatorEarnings: metadata?.creatorEarnings,
      providerChargeAmount: result.amountInMinor, // Already in minor units
    }
  }

  async verifyPayment(reference: string): Promise<PaymentVerification> {
    const result = await verifyPaystackPayment(reference)

    let status: PaymentStatus = "pending"
    if (result.status === "success") {
      status = "success"
    } else if (result.status === "failed") {
      status = "failed"
    }

    return {
      status,
      reference: result.reference,
      amount: result.amount, // Already in minor units from Paystack
      currency: result.currency,
      metadata: result.metadata,
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
      if (!verifyPaystackWebhookSignature(payload, signature)) {
        throw new Error("Invalid Paystack webhook signature")
      }
    }

    const parsed = parsePaystackWebhook(payload)

    return {
      event: parsed.event,
      reference: parsed.reference,
      status: parsed.status,
      amount: parsed.amount, // Already in minor units
      currency: parsed.currency,
      metadata: parsed.metadata,
    }
  }

  /**
   * Create M-Pesa payment via Paystack
   */
  async createMpesaPayment(params: {
    amount: number // Display amount
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
    // M-Pesa via Paystack - use centralized service for amount conversion
    const validatedCurrency = resolvePaystackCurrency(params.currency) || "KES"
    
    // Initialize payment (amount conversion happens inside)
    const result = await initializePaystackPayment({
      amount: params.amount, // Display amount
      currency: validatedCurrency,
      userId: params.userId,
      creatorId: params.creatorId,
      tierName: params.tierName,
      email: params.metadata?.email,
      metadata: params.metadata,
    })

    // Format phone number (254XXXXXXXXX)
    let phone = params.phoneNumber.replace(/\D/g, "")
    if (phone.startsWith("0")) {
      phone = `254${phone.substring(1)}`
    } else if (!phone.startsWith("254")) {
      phone = `254${phone}`
    }

    // Create M-Pesa charge using Paystack API
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error("PAYSTACK_SECRET_KEY is required")
    }

    try {
      const response = await fetch("https://api.paystack.co/charge", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: params.metadata?.email || `user-${params.userId}@example.com`,
          amount: result.amountInMinor, // Already in minor units from initializePaystackPayment
          currency: result.currency,
          reference: result.reference,
          mobile_money: {
            phone,
            provider: "mpesa",
          },
          metadata: {
            userId: params.userId,
            creatorId: params.creatorId,
            tierName: params.tierName,
            ...params.metadata,
          },
        }),
      })

      const data = await response.json()

      if (!data.status) {
        throw new Error(data.message || "M-Pesa payment failed")
      }

      let status: PaymentStatus = "pending"
      if (data.data.status === "success") {
        status = "success"
      } else if (data.data.status === "pending") {
        status = "pending"
      } else {
        status = "failed"
      }

      return {
        reference: result.reference,
        status,
        metadata: {
          ...data.data,
          phone,
        },
      }
    } catch (error: any) {
      console.error("[MPESA_PAYMENT] Failed:", {
        error: error.message,
        userId: params.userId,
        amount: result.amountInMinor,
        currency: result.currency,
      })
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
    amount: number // Display amount
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
