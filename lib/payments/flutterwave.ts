/**
 * Flutterwave Payment Provider Implementation
 */

import crypto from "crypto"
import type {
  PaymentProviderInterface,
  PaymentVerification,
  PaymentStatus,
} from "./types"
import { convertToSmallestUnit } from "./router"

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY
const FLUTTERWAVE_PUBLIC_KEY = process.env.FLUTTERWAVE_PUBLIC_KEY

if (!FLUTTERWAVE_SECRET_KEY || !FLUTTERWAVE_PUBLIC_KEY) {
  throw new Error(
    "FLUTTERWAVE_SECRET_KEY and FLUTTERWAVE_PUBLIC_KEY are required"
  )
}

const FLUTTERWAVE_BASE_URL =
  process.env.FLUTTERWAVE_BASE_URL || "https://api.flutterwave.com/v3"

export class FlutterwaveProvider implements PaymentProviderInterface {
  private async makeRequest(
    endpoint: string,
    method: string = "GET",
    body?: any
  ): Promise<any> {
    const url = `${FLUTTERWAVE_BASE_URL}${endpoint}`
    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    const response = await fetch(url, options)
    const data = await response.json()

    if (data.status !== "success") {
      throw new Error(data.message || "Flutterwave API error")
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
    const amountInSmallestUnit = convertToSmallestUnit(amount, currency)
    const txRef = `ref_${Date.now()}_${userId}`

    const response = await this.makeRequest("/payments", "POST", {
      tx_ref: txRef,
      amount: amountInSmallestUnit,
      currency: currency.toUpperCase(),
      redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/success?tx_ref=${txRef}`,
      payment_options: "card,account,ussd,banktransfer",
      customer: {
        email: metadata?.email || `user-${userId}@example.com`,
        name: metadata?.name || `User ${userId}`,
      },
      customizations: {
        title: `${tierName} Tier Subscription`,
        description: `Monthly subscription to ${tierName} tier`,
      },
      meta: {
        userId,
        creatorId,
        tierName,
        ...metadata,
      },
    })

    return {
      reference: txRef,
      redirectUrl: response.link,
      metadata: {
        flwRef: response.flw_ref,
      },
      platformFee: metadata?.platformFee,
      creatorEarnings: metadata?.creatorEarnings,
      providerChargeAmount: amountInSmallestUnit,
    }
  }

  async verifyPayment(reference: string): Promise<PaymentVerification> {
    const response = await this.makeRequest(
      `/transactions/verify_by_reference?tx_ref=${reference}`
    )

    let status: PaymentStatus = "pending"
    if (response.status === "successful") {
      status = "success"
    } else if (response.status === "failed") {
      status = "failed"
    }

    return {
      status,
      reference: response.tx_ref,
      amount: response.amount,
      currency: response.currency,
      metadata: {
        flwRef: response.flw_ref,
        transactionId: response.id,
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
    if (signature && process.env.FLUTTERWAVE_WEBHOOK_SECRET) {
      const hash = crypto
        .createHmac("sha256", process.env.FLUTTERWAVE_WEBHOOK_SECRET)
        .update(JSON.stringify(payload))
        .digest("hex")

      if (hash !== signature) {
        throw new Error("Invalid Flutterwave webhook signature")
      }
    }

    const event = payload.event
    const data = payload.data

    let status: PaymentStatus = "pending"
    let reference = ""
    let amount = 0
    let currency = "USD"

    switch (event) {
      case "charge.completed":
        if (data.status === "successful") {
          status = "success"
        } else if (data.status === "failed") {
          status = "failed"
        }
        reference = data.tx_ref
        amount = data.amount
        currency = data.currency
        break

      default:
        throw new Error(`Unhandled Flutterwave event: ${event}`)
    }

    return {
      event,
      reference,
      status,
      amount,
      currency,
      metadata: {
        flwRef: data.flw_ref,
        transactionId: data.id,
      },
    }
  }
}

export const flutterwaveProvider = new FlutterwaveProvider()

