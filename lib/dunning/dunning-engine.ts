/**
 * Dunning Engine
 * Handles failed payment recovery with intelligent retry schedule
 */

import { prisma } from "@/lib/prisma"
import { verifyPayment, type PaymentProvider } from "@/lib/payments"
import { notifyNewSubscription } from "@/lib/notifications"

export interface DunningSchedule {
  attemptNumber: number
  delayHours: number
}

const DUNNING_SCHEDULE: DunningSchedule[] = [
  { attemptNumber: 1, delayHours: 12 },
  { attemptNumber: 2, delayHours: 24 },
  { attemptNumber: 3, delayHours: 72 }, // 3 days
  { attemptNumber: 4, delayHours: 120 }, // 5 days
]

/**
 * Process dunning attempts
 */
export async function processDunningAttempts(): Promise<void> {
  const now = new Date()

  // Find subscriptions with failed payments that need retry
  const subscriptions = await prisma.subscription.findMany({
    where: {
      status: "active",
      autoRenew: true,
      nextBillingDate: {
        lte: now,
      },
    },
    include: {
      payment: true,
      dunningAttempts: {
        orderBy: {
          attemptNumber: "desc",
        },
        take: 1,
      },
    },
  })

  for (const subscription of subscriptions) {
    // Check if we need to create a new dunning attempt
    const lastAttempt = subscription.dunningAttempts[0]
    const lastPayment = subscription.payment

    if (!lastPayment || lastPayment.status !== "failed") {
      continue
    }

    let attemptNumber = 1
    let scheduledAt = new Date(lastPayment.createdAt)

    if (lastAttempt) {
      if (lastAttempt.status === "success") {
        continue // Payment succeeded, no need to retry
      }

      if (lastAttempt.status === "pending" && lastAttempt.scheduledAt > now) {
        continue // Already scheduled for future
      }

      attemptNumber = lastAttempt.attemptNumber + 1

      if (attemptNumber > DUNNING_SCHEDULE.length) {
        // All retries exhausted, mark as past_due
        await markSubscriptionPastDue(subscription.id)
        continue
      }

      const schedule = DUNNING_SCHEDULE[attemptNumber - 1]
      scheduledAt = new Date(
        lastAttempt.attemptedAt || lastAttempt.scheduledAt
      )
      scheduledAt.setHours(scheduledAt.getHours() + schedule.delayHours)
    } else {
      // First attempt
      const schedule = DUNNING_SCHEDULE[0]
      scheduledAt.setHours(scheduledAt.getHours() + schedule.delayHours)
    }

    // Create dunning attempt
    const dunningAttempt = await (prisma as any).dunningAttempt.create({
      data: {
        subscriptionId: subscription.id,
        paymentId: lastPayment.id,
        attemptNumber,
        scheduledAt,
        status: "pending",
      },
    })

    // If scheduled time has passed, attempt payment
    if (scheduledAt <= now) {
      await attemptPaymentRetry(dunningAttempt.id, subscription, lastPayment)
    }
  }
}

/**
 * Attempt payment retry
 */
async function attemptPaymentRetry(
  dunningAttemptId: string,
  subscription: any,
  lastPayment: any
): Promise<void> {
    try {
      await (prisma as any).dunningAttempt.update({
        where: { id: dunningAttemptId },
        data: {
          attemptedAt: new Date(),
          status: "pending",
        },
      })

    // Verify payment (this will check if payment succeeded)
    // Always use PAYSTACK since we only support PAYSTACK
    const verification = await verifyPayment("PAYSTACK", lastPayment.reference)

    if (verification.status === "success") {
      // Payment succeeded
      await (prisma as any).dunningAttempt.update({
        where: { id: dunningAttemptId },
        data: {
          status: "success",
        },
      })

      // Update payment status
      await prisma.payment.update({
        where: { id: lastPayment.id },
        data: {
          status: "success",
        },
      })

      // Extend subscription
      const nextBillingDate = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      )

      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "active",
          nextBillingDate,
          endDate: nextBillingDate,
        },
      })
    } else {
      // Payment still failed
      await (prisma as any).dunningAttempt.update({
        where: { id: dunningAttemptId },
        data: {
          status: "failed",
          errorMessage: "Payment verification failed",
        },
      })
    }
  } catch (error: any) {
    await (prisma as any).dunningAttempt.update({
      where: { id: dunningAttemptId },
      data: {
        status: "failed",
        errorMessage: error.message || "Retry attempt failed",
      },
    })
  }
}

/**
 * Mark subscription as past due
 */
async function markSubscriptionPastDue(subscriptionId: string): Promise<void> {
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "past_due",
    },
  })

  // Send notification to user
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      fan: true,
      creator: true,
    },
  })

  if (subscription) {
    // Create payment method update request
    await (prisma as any).paymentMethodUpdateRequest.create({
      data: {
        userId: subscription.fanId,
        subscriptionId: subscription.id,
        provider: subscription.paymentProvider || "STRIPE",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    // Send notification (implement notification system)
    // await notifyPaymentMethodUpdate(subscription.fanId, subscription.creatorId)
  }

  // After 7 days, disable subscription
  setTimeout(async () => {
    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    })

    if (sub && sub.status === "past_due") {
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: "cancelled",
        },
      })
    }
  }, 7 * 24 * 60 * 60 * 1000)
}

