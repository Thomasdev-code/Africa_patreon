/**
 * Subscription Manager
 * Handles subscription lifecycle: creation, renewals, dunning, expiration
 */

import { prisma } from "@/lib/prisma"
import { stripeProvider } from "./stripe"
import { flutterwaveSDK, paystackSDK } from "./payment-providers"
import { retryWithBackoff } from "./payment-utils"
import type { PaymentProvider } from "./types"

export interface SubscriptionRenewalResult {
  success: boolean
  paymentId?: string
  error?: string
  retryAfter?: Date
}

/**
 * Create new subscription
 */
export async function createSubscription(params: {
  fanId: string
  creatorId: string
  tierName: string
  tierPrice: number
  provider: PaymentProvider
  paymentId: string
  autoRenew?: boolean
  interval?: "month" | "year"
}): Promise<{
  subscriptionId: string
  nextBillingDate: Date
}> {
  const intervalDays = params.interval === "year" ? 365 : 30
  const nextBillingDate = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000)

  const subscription = await prisma.subscription.create({
    data: {
      fanId: params.fanId,
      creatorId: params.creatorId,
      tierName: params.tierName,
      tierPrice: params.tierPrice,
      status: "active",
      paymentProvider: params.provider,
      paymentId: params.paymentId,
      autoRenew: params.autoRenew ?? true,
      nextBillingDate,
      startDate: new Date(),
      endDate: nextBillingDate,
      lastPaymentId: params.paymentId,
    },
  })

  return {
    subscriptionId: subscription.id,
    nextBillingDate,
  }
}

/**
 * Renew subscription
 */
export async function renewSubscription(
  subscriptionId: string
): Promise<SubscriptionRenewalResult> {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      payment: true,
      fan: true,
    },
  })

  if (!subscription) {
    return { success: false, error: "Subscription not found" }
  }

  if (!subscription.autoRenew) {
    return { success: false, error: "Auto-renewal is disabled" }
  }

  if (subscription.status !== "active") {
    return { success: false, error: `Subscription is ${subscription.status}` }
  }

  const provider = subscription.paymentProvider as PaymentProvider

  try {
    let paymentResult

    switch (provider) {
      case "STRIPE": {
        // Stripe handles renewals automatically via webhooks
        // This is for manual renewal if needed
        const payment = await prisma.payment.findUnique({
          where: { id: subscription.lastPaymentId || "" },
        })

        if (payment?.metadata) {
          const metadata = payment.metadata as any
          if (metadata.subscriptionId) {
            // Stripe subscription already exists, renewal handled by webhook
            return {
              success: true,
              paymentId: payment.id,
            }
          }
        }

        // Create new payment intent for renewal
        const result = await stripeProvider.initializePayment({
          amount: subscription.tierPrice,
          currency: "USD",
          userId: subscription.fanId,
          creatorId: subscription.creatorId,
          tierName: subscription.tierName,
          metadata: {
            subscriptionId: subscription.id,
            type: "renewal",
          },
        })

        paymentResult = {
          reference: result.reference,
          status: "pending" as const,
        }
        break
      }

      case "FLUTTERWAVE": {
        // Flutterwave tokenized charge
        const payment = await prisma.payment.findUnique({
          where: { id: subscription.lastPaymentId || "" },
        })

        if (payment?.metadata) {
          const metadata = payment.metadata as any
          if (metadata.cardToken) {
            // Use tokenized charge
            // This would require Flutterwave token charge API
            // For now, create new payment
          }
        }

        const result = await flutterwaveSDK.initializePayment({
          amount: subscription.tierPrice,
          currency: "USD",
          userId: subscription.fanId,
          creatorId: subscription.creatorId,
          tierName: subscription.tierName,
          metadata: {
            subscriptionId: subscription.id,
            type: "renewal",
          },
        })

        paymentResult = {
          reference: result.reference,
          status: "pending" as const,
        }
        break
      }

      case "PAYSTACK": {
        // Paystack subscription API
        const payment = await prisma.payment.findUnique({
          where: { id: subscription.lastPaymentId || "" },
        })

        if (payment?.metadata) {
          const metadata = payment.metadata as any
          if (metadata.authorizationCode) {
            // Use Paystack subscription API
            // This would require Paystack subscription creation
            // For now, create new payment
          }
        }

        const result = await paystackSDK.initializePayment({
          amount: subscription.tierPrice,
          currency: "USD",
          userId: subscription.fanId,
          creatorId: subscription.creatorId,
          tierName: subscription.tierName,
          metadata: {
            subscriptionId: subscription.id,
            type: "renewal",
          },
        })

        paymentResult = {
          reference: result.reference,
          status: "pending" as const,
        }
        break
      }

      default:
        return { success: false, error: "Unsupported provider" }
    }

    // Create renewal payment record
    const renewalPayment = await prisma.payment.create({
      data: {
        userId: subscription.fanId,
        creatorId: subscription.creatorId,
        tierName: subscription.tierName,
        tierPrice: subscription.tierPrice,
        provider,
        reference: paymentResult.reference,
        amount: Math.round(subscription.tierPrice * 100),
        currency: "USD",
        status: paymentResult.status,
        metadata: {
          subscriptionId: subscription.id,
          type: "renewal",
        },
      },
    })

    // Update subscription
    const intervalDays = 30 // Default monthly
    const nextBillingDate = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000)

    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        lastPaymentId: renewalPayment.id,
        nextBillingDate,
        endDate: nextBillingDate,
      },
    })

    return {
      success: true,
      paymentId: renewalPayment.id,
    }
  } catch (error: any) {
    console.error("Subscription renewal error:", error)
    return {
      success: false,
      error: error.message,
      retryAfter: new Date(Date.now() + 24 * 60 * 60 * 1000), // Retry in 24 hours
    }
  }
}

/**
 * Process failed payment retry (dunning)
 */
export async function retryFailedPayment(
  subscriptionId: string,
  attemptNumber: number
): Promise<SubscriptionRenewalResult> {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  })

  if (!subscription) {
    return { success: false, error: "Subscription not found" }
  }

  // Max retry attempts
  if (attemptNumber > 3) {
    // Mark subscription as past_due
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: "past_due",
        autoRenew: false,
      },
    })

    return {
      success: false,
      error: "Max retry attempts reached",
    }
  }

  // Retry with exponential backoff
  try {
    const result = await retryWithBackoff(
      () => renewSubscription(subscriptionId),
      3,
      1000 * Math.pow(2, attemptNumber - 1)
    )

    if (result.success) {
      // Record successful retry
      await prisma.dunningAttempt.create({
        data: {
          subscriptionId,
          paymentId: result.paymentId || "",
          attemptNumber,
          scheduledAt: new Date(),
          attemptedAt: new Date(),
          status: "success",
        },
      })
    }

    return result
  } catch (error: any) {
    // Record failed retry
    await prisma.dunningAttempt.create({
      data: {
        subscriptionId,
        paymentId: "",
        attemptNumber,
        scheduledAt: new Date(),
        attemptedAt: new Date(),
        status: "failed",
        errorMessage: error.message,
      },
    })

    // Schedule next retry
    const retryAfter = new Date(
      Date.now() + Math.pow(2, attemptNumber) * 24 * 60 * 60 * 1000
    )

    return {
      success: false,
      error: error.message,
      retryAfter,
    }
  }
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  reason?: string
): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  })

  if (!subscription) {
    throw new Error("Subscription not found")
  }

  // Cancel with provider if applicable
  if (subscription.paymentProvider === "STRIPE" && subscription.paymentReference) {
    try {
      await stripeProvider.cancelSubscription(subscription.paymentReference)
    } catch (error) {
      console.error("Provider cancellation failed:", error)
      // Continue with local cancellation
    }
  }

  // Update subscription
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "cancelled",
      autoRenew: false,
    },
  })
}

/**
 * Process expired subscriptions
 */
export async function processExpiredSubscriptions(): Promise<{
  processed: number
  errors: number
}> {
  const expired = await prisma.subscription.findMany({
    where: {
      status: "active",
      endDate: {
        lte: new Date(),
      },
    },
  })

  let processed = 0
  let errors = 0

  for (const subscription of expired) {
    try {
      if (subscription.autoRenew) {
        // Try to renew
        const result = await renewSubscription(subscription.id)
        if (result.success) {
          processed++
        } else {
          // Mark as expired if renewal failed
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: "expired" },
          })
          errors++
        }
      } else {
        // Mark as expired
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: "expired" },
        })
        processed++
      }
    } catch (error) {
      console.error(`Error processing subscription ${subscription.id}:`, error)
      errors++
    }
  }

  return { processed, errors }
}

/**
 * Handle chargeback
 */
export async function handleChargeback(params: {
  subscriptionId: string
  paymentId: string
  chargebackId: string
  amount: number
  currency: string
  reason?: string
}): Promise<void> {
  // Update subscription
  await prisma.subscription.update({
    where: { id: params.subscriptionId },
    data: {
      status: "cancelled",
      autoRenew: false,
    },
  })

  // Create chargeback record
  await prisma.chargeback.create({
    data: {
      userId: "", // Will be filled from payment
      creatorId: "", // Will be filled from payment
      paymentId: params.paymentId,
      provider: "STRIPE", // Will be determined from payment
      transactionId: params.chargebackId,
      amount: Math.round(params.amount * 100),
      currency: params.currency,
      status: "open",
      reason: params.reason,
    },
  })
}

