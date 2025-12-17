/**
 * Unified Payment Provider SDK Wrappers
 * Implements Stripe, Flutterwave, and Paystack with M-Pesa support via Flutterwave/Paystack
 */

import Stripe from "stripe"
import crypto from "crypto"
import type {
  PaymentProviderInterface,
  PaymentVerification,
  PaymentStatus,
} from "./types"
import { convertToSmallestUnit } from "./router"

// ============================================================================
// STRIPE PROVIDER
// ============================================================================

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required. Please set it in your .env file")
}

// Validate Stripe key format
const stripeKey = process.env.STRIPE_SECRET_KEY.trim()
if (!stripeKey.startsWith("sk_test_") && !stripeKey.startsWith("sk_live_")) {
  throw new Error(
    `Invalid Stripe secret key format. Key must start with 'sk_test_' or 'sk_live_'. ` +
    `Current key starts with: ${stripeKey.substring(0, 8)}...`
  )
}

const stripe = new Stripe(stripeKey, {
  apiVersion: "2024-11-20.acacia",
})

export class StripeProviderSDK implements PaymentProviderInterface {
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
    clientSecret?: string
    metadata?: Record<string, any>
  }> {
    const amountInCents = convertToSmallestUnit(params.amount, params.currency)

    // Use Payment Intents for 3D Secure support
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: params.currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: params.userId,
        creatorId: params.creatorId,
        tierName: params.tierName,
        ...params.metadata,
      },
    })

    return {
      reference: paymentIntent.id,
      redirectUrl: "",
      clientSecret: paymentIntent.client_secret || undefined,
      metadata: {
        paymentIntentId: paymentIntent.id,
      },
    }
  }

  async createSubscription(params: {
    customerId: string
    priceId: string
    metadata?: Record<string, any>
  }): Promise<{
    subscriptionId: string
    clientSecret?: string
    metadata?: Record<string, any>
  }> {
    const subscription = await stripe.subscriptions.create({
      customer: params.customerId,
      items: [{ price: params.priceId }],
      metadata: params.metadata,
      payment_behavior: "default_incomplete",
      payment_settings: {
        payment_method_types: ["card"],
        save_default_payment_method: "on_subscription",
      },
      expand: ["latest_invoice.payment_intent"],
    })

    const invoice = subscription.latest_invoice as Stripe.Invoice
    const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent

    return {
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret || undefined,
      metadata: {
        subscriptionId: subscription.id,
        customerId: params.customerId,
      },
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await stripe.subscriptions.cancel(subscriptionId)
  }

  async createCharge(params: {
    amount: number
    currency: string
    customerId: string
    paymentMethodId: string
    metadata?: Record<string, any>
  }): Promise<{
    chargeId: string
    status: PaymentStatus
    metadata?: Record<string, any>
  }> {
    const amountInCents = convertToSmallestUnit(params.amount, params.currency)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: params.currency.toLowerCase(),
      customer: params.customerId,
      payment_method: params.paymentMethodId,
      confirm: true,
      metadata: params.metadata,
    })

    let status: PaymentStatus = "pending"
    if (paymentIntent.status === "succeeded") {
      status = "success"
    } else if (paymentIntent.status === "requires_payment_method") {
      status = "failed"
    }

    return {
      chargeId: paymentIntent.id,
      status,
      metadata: {
        paymentIntentId: paymentIntent.id,
      },
    }
  }

  async refundCharge(chargeId: string, amount?: number): Promise<{
    refundId: string
    status: PaymentStatus
  }> {
    const refund = await stripe.refunds.create({
      charge: chargeId,
      amount: amount ? convertToSmallestUnit(amount, "USD") : undefined,
    })

    return {
      refundId: refund.id,
      status: refund.status === "succeeded" ? "success" : "pending",
    }
  }

  async createPayout(params: {
    amount: number
    currency: string
    destination: string
    metadata?: Record<string, any>
  }): Promise<{
    payoutId: string
    status: PaymentStatus
    metadata?: Record<string, any>
  }> {
    const amountInCents = convertToSmallestUnit(params.amount, params.currency)

    const payout = await stripe.payouts.create({
      amount: amountInCents,
      currency: params.currency.toLowerCase(),
      destination: params.destination,
      metadata: params.metadata,
    })

    let status: PaymentStatus = "pending"
    if (payout.status === "paid") {
      status = "success"
    } else if (payout.status === "failed") {
      status = "failed"
    }

    return {
      payoutId: payout.id,
      status,
      metadata: {
        payoutId: payout.id,
      },
    }
  }

  // Legacy interface methods
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
  }> {
    const result = await this.initializePayment({
      amount,
      currency,
      userId,
      creatorId,
      tierName,
      metadata,
    })

    return {
      reference: result.reference,
      redirectUrl: result.redirectUrl,
      metadata: result.metadata,
    }
  }

  async verifyPayment(reference: string): Promise<PaymentVerification> {
    const paymentIntent = await stripe.paymentIntents.retrieve(reference)

    let status: PaymentStatus = "pending"
    if (paymentIntent.status === "succeeded") {
      status = "success"
    } else if (paymentIntent.status === "requires_payment_method") {
      status = "failed"
    }

    return {
      status,
      reference: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency.toUpperCase(),
      metadata: {
        paymentIntentId: paymentIntent.id,
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
    if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
      throw new Error("Stripe webhook signature is required")
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      )
    } catch (err: any) {
      throw new Error(`Webhook signature verification failed: ${err.message}`)
    }

    let status: PaymentStatus = "pending"
    let reference = ""
    let amount = 0
    let currency = "USD"

    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        reference = paymentIntent.id
        amount = paymentIntent.amount
        currency = paymentIntent.currency.toUpperCase()
        status = "success"
        break

      case "payment_intent.payment_failed":
        const failedIntent = event.data.object as Stripe.PaymentIntent
        reference = failedIntent.id
        amount = failedIntent.amount
        currency = failedIntent.currency.toUpperCase()
        status = "failed"
        break

      case "invoice.paid":
        const invoice = event.data.object as Stripe.Invoice
        reference = invoice.id
        amount = invoice.amount_paid
        currency = invoice.currency.toUpperCase()
        status = "success"
        break

      case "invoice.payment_failed":
        const failedInvoice = event.data.object as Stripe.Invoice
        reference = failedInvoice.id
        amount = failedInvoice.amount_due
        currency = failedInvoice.currency.toUpperCase()
        status = "failed"
        break

      default:
        throw new Error(`Unhandled event type: ${event.type}`)
    }

    return {
      event: event.type,
      reference,
      status,
      amount,
      currency,
      metadata: {
        eventId: event.id,
        eventType: event.type,
      },
    }
  }
}

// ============================================================================
// FLUTTERWAVE PROVIDER
// ============================================================================

const FLUTTERWAVE_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY
const FLUTTERWAVE_PUBLIC_KEY = process.env.FLUTTERWAVE_PUBLIC_KEY

if (!FLUTTERWAVE_SECRET_KEY || !FLUTTERWAVE_PUBLIC_KEY) {
  throw new Error(
    "FLUTTERWAVE_SECRET_KEY and FLUTTERWAVE_PUBLIC_KEY are required"
  )
}

const FLUTTERWAVE_BASE_URL =
  process.env.FLUTTERWAVE_BASE_URL || "https://api.flutterwave.com/v3"

export class FlutterwaveProviderSDK implements PaymentProviderInterface {
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

    if (data.status !== "success" && data.status !== "successful") {
      throw new Error(data.message || "Flutterwave API error")
    }

    return data.data
  }

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
    flwRef?: string
    metadata?: Record<string, any>
  }> {
    const amountInSmallestUnit = convertToSmallestUnit(
      params.amount,
      params.currency
    )
    const txRef = `ref_${Date.now()}_${params.userId}`

    const response = await this.makeRequest("/payments", "POST", {
      tx_ref: txRef,
      amount: amountInSmallestUnit,
      currency: params.currency.toUpperCase(),
      redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/success?tx_ref=${txRef}`,
      payment_options: "card,account,ussd,banktransfer,mobilemoney",
      customer: {
        email: params.metadata?.email || `user-${params.userId}@example.com`,
        name: params.metadata?.name || `User ${params.userId}`,
        phone_number: params.metadata?.phoneNumber,
      },
      customizations: {
        title: `${params.tierName} Tier Subscription`,
        description: `Monthly subscription to ${params.tierName} tier`,
      },
      meta: {
        userId: params.userId,
        creatorId: params.creatorId,
        tierName: params.tierName,
        ...params.metadata,
      },
    })

    return {
      reference: txRef,
      redirectUrl: response.link,
      flwRef: response.flw_ref,
      metadata: {
        flwRef: response.flw_ref,
      },
    }
  }

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
    // Format phone number (remove +, ensure 254 format for Kenya)
    let formattedPhone = params.phoneNumber.replace(/[^0-9]/g, "")
    if (formattedPhone.startsWith("0")) {
      formattedPhone = `254${formattedPhone.substring(1)}`
    } else if (!formattedPhone.startsWith("254")) {
      formattedPhone = `254${formattedPhone}`
    }

    const amountInSmallestUnit = convertToSmallestUnit(
      params.amount,
      params.currency
    )
    const txRef = `mpesa_${Date.now()}_${params.userId}`

    const response = await this.makeRequest("/charges?type=mobile_money_mpesa", "POST", {
      tx_ref: txRef,
      amount: amountInSmallestUnit,
      currency: params.currency.toUpperCase(),
      phone_number: formattedPhone,
      email: params.metadata?.email || `user-${params.userId}@example.com`,
      fullname: params.metadata?.name || `User ${params.userId}`,
      meta: {
        userId: params.userId,
        creatorId: params.creatorId,
        tierName: params.tierName,
        ...params.metadata,
      },
    })

    let status: PaymentStatus = "pending"
    if (response.status === "successful") {
      status = "success"
    } else if (response.status === "failed") {
      status = "failed"
    }

    return {
      reference: txRef,
      status,
      metadata: {
        flwRef: response.flw_ref,
        processor_response: response.processor_response,
      },
    }
  }

  async checkMpesaStatus(reference: string): Promise<PaymentVerification> {
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

  async createPayout(params: {
    amount: number
    currency: string
    accountNumber: string
    bankCode: string
    metadata?: Record<string, any>
  }): Promise<{
    payoutId: string
    status: PaymentStatus
    metadata?: Record<string, any>
  }> {
    const amountInSmallestUnit = convertToSmallestUnit(
      params.amount,
      params.currency
    )

    const response = await this.makeRequest("/transfers", "POST", {
      account_bank: params.bankCode,
      account_number: params.accountNumber,
      amount: amountInSmallestUnit,
      narration: params.metadata?.narration || "Creator payout",
      currency: params.currency.toUpperCase(),
      reference: `payout_${Date.now()}`,
      meta: params.metadata,
    })

    let status: PaymentStatus = "pending"
    if (response.status === "successful") {
      status = "success"
    } else if (response.status === "failed") {
      status = "failed"
    }

    return {
      payoutId: response.id.toString(),
      status,
      metadata: {
        transferId: response.id,
        reference: response.reference,
      },
    }
  }

  // Legacy interface methods
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
  }> {
    const result = await this.initializePayment({
      amount,
      currency,
      userId,
      creatorId,
      tierName,
      metadata,
    })

    return {
      reference: result.reference,
      redirectUrl: result.redirectUrl,
      metadata: result.metadata,
    }
  }

  async verifyPayment(reference: string): Promise<PaymentVerification> {
    return this.checkMpesaStatus(reference)
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

// ============================================================================
// PAYSTACK PROVIDER
// ============================================================================

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY

if (!PAYSTACK_SECRET_KEY || !PAYSTACK_PUBLIC_KEY) {
  throw new Error("PAYSTACK_SECRET_KEY and PAYSTACK_PUBLIC_KEY are required")
}

const PAYSTACK_BASE_URL = "https://api.paystack.co"

export class PaystackProviderSDK implements PaymentProviderInterface {
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
    const amountInKobo = convertToSmallestUnit(params.amount, params.currency)

    const response = await this.makeRequest("/transaction/initialize", "POST", {
      email: params.metadata?.email || `user-${params.userId}@example.com`,
      amount: amountInKobo,
      currency: params.currency.toUpperCase(),
      reference: `ref_${Date.now()}_${params.userId}`,
      channels: ["card", "bank", "ussd", "qr", "mobile_money"],
      metadata: {
        userId: params.userId,
        creatorId: params.creatorId,
        tierName: params.tierName,
        ...params.metadata,
      },
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/success?reference={reference}`,
    })

    return {
      reference: response.reference,
      redirectUrl: response.authorization_url,
      accessCode: response.access_code,
      metadata: {
        accessCode: response.access_code,
      },
    }
  }

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
    // Format phone number (remove +, ensure 254 format for Kenya)
    let formattedPhone = params.phoneNumber.replace(/[^0-9]/g, "")
    if (formattedPhone.startsWith("0")) {
      formattedPhone = `254${formattedPhone.substring(1)}`
    } else if (!formattedPhone.startsWith("254")) {
      formattedPhone = `254${formattedPhone}`
    }

    const amountInKobo = convertToSmallestUnit(params.amount, params.currency)
    const reference = `mpesa_${Date.now()}_${params.userId}`

    const response = await this.makeRequest("/charge", "POST", {
      email: params.metadata?.email || `user-${params.userId}@example.com`,
      amount: amountInKobo,
      currency: params.currency.toUpperCase(),
      reference,
      mobile_money: {
        phone: formattedPhone,
        provider: "mpesa",
      },
      metadata: {
        userId: params.userId,
        creatorId: params.creatorId,
        tierName: params.tierName,
        ...params.metadata,
      },
    })

    let status: PaymentStatus = "pending"
    if (response.status === "success") {
      status = "success"
    } else if (response.status === "failed") {
      status = "failed"
    }

    return {
      reference,
      status,
      metadata: {
        authorization: response.authorization,
        customer: response.customer,
      },
    }
  }

  async checkMpesaStatus(reference: string): Promise<PaymentVerification> {
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

  async createPayout(params: {
    amount: number
    currency: string
    recipientCode: string
    metadata?: Record<string, any>
  }): Promise<{
    payoutId: string
    status: PaymentStatus
    metadata?: Record<string, any>
  }> {
    const amountInKobo = convertToSmallestUnit(params.amount, params.currency)

    const response = await this.makeRequest("/transfer", "POST", {
      source: "balance",
      amount: amountInKobo,
      recipient: params.recipientCode,
      currency: params.currency.toUpperCase(),
      reference: `payout_${Date.now()}`,
      reason: params.metadata?.reason || "Creator payout",
    })

    let status: PaymentStatus = "pending"
    if (response.status === "success") {
      status = "success"
    } else if (response.status === "failed") {
      status = "failed"
    }

    return {
      payoutId: response.id.toString(),
      status,
      metadata: {
        transferId: response.id,
        reference: response.reference,
      },
    }
  }

  // Legacy interface methods
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
  }> {
    const result = await this.initializePayment({
      amount,
      currency,
      userId,
      creatorId,
      tierName,
      metadata,
    })

    return {
      reference: result.reference,
      redirectUrl: result.redirectUrl,
      metadata: result.metadata,
    }
  }

  async verifyPayment(reference: string): Promise<PaymentVerification> {
    return this.checkMpesaStatus(reference)
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

// Export provider instances
export const stripeSDK = new StripeProviderSDK()
export const flutterwaveSDK = new FlutterwaveProviderSDK()
export const paystackSDK = new PaystackProviderSDK()

