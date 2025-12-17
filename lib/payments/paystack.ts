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
      throw new Error(data.message || "Paystack API error")
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
    const amountInKobo = convertToSmallestUnit(amount, currency)

    const response = await this.makeRequest("/transaction/initialize", "POST", {
      email: metadata?.email || `user-${userId}@example.com`,
      amount: amountInKobo,
      currency: currency.toUpperCase(),
      reference: `ref_${Date.now()}_${userId}`,
      metadata: {
        userId,
        creatorId,
        tierName,
        ...metadata,
      },
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/success?reference={reference}`,
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
    let currency = "NGN"

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
}

export const paystackProvider = new PaystackProvider()

