/**
 * Subscription Manager (Paystack-only)
 */

import { prisma } from "@/lib/prisma"
import { paystackSDK } from "./payment-providers"
import type { PaymentProvider } from "./types"

export interface SubscriptionRenewalResult {
  success: boolean
  paymentId?: string
  error?: string
  retryAfter?: Date
}

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

  try {
    // Initialize a new Paystack payment for renewal
    const result = await paystackSDK.initializePayment({
      amount: subscription.tierPrice,
      currency: subscription.currency || "NGN",
      userId: subscription.fanId,
      creatorId: subscription.creatorId,
      tierName: subscription.tierName,
      metadata: {
        subscriptionId: subscription.id,
        type: "renewal",
      },
    })

    // Store pending payment
    const payment = await prisma.payment.create({
      data: {
        userId: subscription.fanId,
        creatorId: subscription.creatorId,
        subscriptionId: subscription.id,
        tierName: subscription.tierName,
        tierPrice: subscription.tierPrice,
        provider: "PAYSTACK",
        reference: result.reference,
        amount: Math.round(subscription.tierPrice * 100),
        currency: subscription.currency || "NGN",
        status: "pending",
        metadata: {
          subscriptionId: subscription.id,
          type: "renewal",
        },
      },
    })

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        paymentReference: result.reference,
        lastPaymentId: payment.id,
      },
    })

    return {
      success: true,
      paymentId: payment.id,
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to renew subscription",
    }
  }
}

export async function cancelSubscription(
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { status: "cancelled", renewalStatus: "cancelled" },
    })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

