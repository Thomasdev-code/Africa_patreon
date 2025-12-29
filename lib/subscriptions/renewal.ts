/**
 * Subscription Renewal System
 */

import { prisma } from "@/lib/prisma"
import { getPaymentProvider } from "@/lib/payments"
import { notifyNewSubscription } from "@/lib/notifications"
import { calculateCreatorPayout, fromSmallestUnit } from "@/lib/payments/payment-utils"
import type { PaymentProvider } from "@/lib/payments/types"

/**
 * Process subscription renewal for a single subscription
 */
export async function renewSubscription(
  subscriptionId: string
): Promise<{
  success: boolean
  paymentId?: string
  error?: string
}> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        fan: true,
        creator: true,
        payment: true,
      },
    })

    if (!subscription) {
      return { success: false, error: "Subscription not found" }
    }

    if (subscription.status !== "active" || !subscription.autoRenew) {
      return { success: false, error: "Subscription not eligible for renewal" }
    }

    if (!subscription.nextBillingDate) {
      return { success: false, error: "Next billing date not set" }
    }

    // Check if it's time to renew
    const now = new Date()
    if (subscription.nextBillingDate > now) {
      return { success: false, error: "Not yet time for renewal" }
    }

    const provider = subscription.paymentProvider as PaymentProvider

    if (!provider) {
      return { success: false, error: "Payment provider not set" }
    }

    // Get payment provider (always PAYSTACK)
    const paymentProvider = getPaymentProvider()

    // Create renewal payment based on provider
    let paymentResult: {
      reference: string
      redirectUrl?: string
      metadata?: Record<string, any>
    }

    // Only PAYSTACK is supported
    if (provider !== "PAYSTACK") {
      return { success: false, error: "Unsupported payment provider. Only PAYSTACK is supported." }
    }

    // Paystack: Charge authorization
    // This requires a saved authorization code from initial payment
    const paystackAuth = subscription.payment?.metadata as any
    if (!paystackAuth?.authorization?.authorization_code) {
      return {
        success: false,
        error: "Paystack authorization code not found",
      }
    }

    // In production, call Paystack charge authorization API
    // For now, create a pending payment that will be verified via webhook
    paymentResult = {
      reference: `RENEW_${Date.now()}_${subscriptionId}`,
      metadata: {
        type: "renewal",
        authorizationCode: paystackAuth.authorization.authorization_code,
      },
    }

    // Create renewal payment record
    const renewalPayment = await prisma.payment.create({
      data: {
        userId: subscription.fanId,
        creatorId: subscription.creatorId,
        tierName: subscription.tierName,
        tierPrice: subscription.tierPrice,
        provider: provider,
        reference: paymentResult.reference,
        amount: Math.round(subscription.tierPrice * 100),
        currency: "USD", // Should be stored per subscription
        status: "pending",
        metadata: {
          ...paymentResult.metadata,
          subscriptionId: subscription.id,
          renewal: true,
        },
      },
    })

    // Create payment transaction
    await prisma.paymentTransaction.create({
      data: {
        paymentId: renewalPayment.id,
        provider: provider,
        type: "renewal",
        reference: paymentResult.reference,
        amount: renewalPayment.amount,
        currency: renewalPayment.currency,
        status: "pending",
        metadata: paymentResult.metadata,
      },
    })

    // Update subscription with renewal payment
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        paymentId: renewalPayment.id,
        paymentReference: paymentResult.reference,
        status: "pending", // Will be updated when payment succeeds
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
      error: error.message || "Renewal failed",
    }
  }
}

/**
 * Process all due subscriptions
 */
export async function processDueRenewals(): Promise<{
  processed: number
  succeeded: number
  failed: number
}> {
  try {
    const now = new Date()

    // Find all subscriptions due for renewal
    const dueSubscriptions = await prisma.subscription.findMany({
      where: {
        status: "active",
        autoRenew: true,
        nextBillingDate: {
          lte: now,
        },
      },
      take: 100, // Process in batches
    })

    let succeeded = 0
    let failed = 0

    for (const subscription of dueSubscriptions) {
      const result = await renewSubscription(subscription.id)
      if (result.success) {
        succeeded++
      } else {
        failed++

        // If renewal fails, mark subscription as expired after grace period
        const gracePeriod = 7 * 24 * 60 * 60 * 1000 // 7 days
        const expiredDate = new Date(
          subscription.nextBillingDate!.getTime() + gracePeriod
        )

        if (now > expiredDate) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
              status: "expired",
            },
          })
        }
      }
    }

    return {
      processed: dueSubscriptions.length,
      succeeded,
      failed,
    }
  } catch (error) {
    console.error("Process due renewals error:", error)
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
    }
  }
}

/**
 * Activate subscription after successful renewal payment
 */
export async function activateRenewalPayment(
  paymentId: string
): Promise<void> {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        subscription: true,
        user: true,
        creator: true,
      },
    })

    if (!payment || !payment.subscription) {
      return
    }

    // Check if this is a renewal
    const metadata = payment.metadata as any
    if (!metadata?.renewal) {
      return
    }

    // Only process if payment is successful
    if (payment.status === "success") {
      // Calculate platform fee and creator net earnings
      const grossAmount = fromSmallestUnit(payment.amount, payment.currency)
      const payout = await calculateCreatorPayout(grossAmount)

      // Update creator wallet with net earnings
      const creatorWallet = await prisma.creatorWallet.upsert({
        where: { userId: payment.creatorId },
        create: {
          userId: payment.creatorId,
          balance: payout.creatorNet,
        },
        update: {
          balance: {
            increment: payout.creatorNet,
          },
        },
      })

      // Create earnings record with net amount
      await prisma.earnings.create({
        data: {
          creatorId: payment.creatorId,
          paymentId: payment.id,
          type: "renewal",
          amount: payout.creatorNet, // Store net amount
          balanceAfter: creatorWallet.balance,
        },
      })

      // Update payment metadata with fee information for audit
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          metadata: {
            ...(payment.metadata as any),
            platformFee: payout.platformFee,
            platformFeePercentage: (payout.platformFee / payout.grossAmount) * 100,
            grossAmount: payout.grossAmount,
            creatorNet: payout.creatorNet,
          },
        },
      })
    }

    // Update subscription
    const nextBillingDate = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    )

    await prisma.subscription.update({
      where: { id: payment.subscription.id },
      data: {
        status: "active",
        startDate: new Date(),
        endDate: nextBillingDate,
        nextBillingDate: nextBillingDate,
        lastPaymentId: payment.id,
        paymentId: payment.id,
      },
    })

    // Notify creator
    await notifyNewSubscription(
      payment.creatorId,
      payment.user.email,
      payment.tierName
    )
  } catch (error) {
    console.error("Activate renewal payment error:", error)
  }
}

