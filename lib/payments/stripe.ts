/**
 * Stripe Payment Provider - Full SDK Implementation
 * Supports: Cards, Subscriptions, Refunds, Payouts, Mobile Payments
 */

import Stripe from "stripe"
import type {
  PaymentProviderInterface,
  PaymentVerification,
  PaymentStatus,
} from "./types"
import { convertToSmallestUnit } from "./router"

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is required")
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
})

export class StripeProvider implements PaymentProviderInterface {
  /**
   * Initialize a payment (one-time or subscription)
   */
  async initializePayment(params: {
    amount: number
    currency: string
    userId: string
    creatorId: string
    tierName: string
    metadata?: Record<string, any>
    isSubscription?: boolean
  }): Promise<{
    reference: string
    redirectUrl: string
    clientSecret?: string
    metadata?: Record<string, any>
    platformFee?: number
    creatorEarnings?: number
    providerChargeAmount?: number
  }> {
    const amountInCents = convertToSmallestUnit(params.amount, params.currency)

    if (params.isSubscription) {
      // Create subscription with Payment Intent
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
        platformFee: params.metadata?.platformFee,
        creatorEarnings: params.metadata?.creatorEarnings,
        providerChargeAmount: amountInCents,
      }
    }

    // One-time payment
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
      platformFee: params.metadata?.platformFee,
      creatorEarnings: params.metadata?.creatorEarnings,
      providerChargeAmount: amountInCents,
    }
  }

  /**
   * Verify payment status
   */
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
        status: paymentIntent.status,
      },
    }
  }

  /**
   * Create recurring subscription
   */
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

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    await stripe.subscriptions.cancel(subscriptionId)
  }

  /**
   * Refund payment
   */
  async refundPayment(params: {
    chargeId: string
    amount?: number
    reason?: string
  }): Promise<{
    refundId: string
    status: PaymentStatus
    amount: number
  }> {
    const refund = await stripe.refunds.create({
      charge: params.chargeId,
      amount: params.amount ? convertToSmallestUnit(params.amount, "USD") : undefined,
      reason: params.reason as any,
    })

    return {
      refundId: refund.id,
      status: refund.status === "succeeded" ? "success" : "pending",
      amount: refund.amount,
    }
  }

  /**
   * Create payout (Stripe Connect)
   */
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

export const stripeProvider = new StripeProvider()
