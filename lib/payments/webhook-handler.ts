/**
 * Unified Payment Event Handler
 * Standardizes webhook processing across all payment providers
 */

import { prisma } from "@/lib/prisma"
import { notifyNewSubscription } from "@/lib/notifications"
import {
  calculateReferralCredits,
  awardReferralCredits,
  getReferralCommissionRate,
} from "@/lib/referrals"
import {
  calculatePlatformFee,
  calculateCreatorPayout,
  PLATFORM_FEE_PERCENT,
} from "@/app/config/platform"
import type { PaymentStatus } from "./types"

export interface PaymentEvent {
  event: string
  reference: string
  status: PaymentStatus
  amount: number
  currency: string
  metadata?: Record<string, any>
  provider: "STRIPE" | "PAYSTACK" | "FLUTTERWAVE"
}

/**
 * Process a payment event from webhook
 * Handles payment confirmation, subscription activation, notifications, referrals, and earnings
 */
export async function processPaymentEvent(event: PaymentEvent): Promise<void> {
  try {
    // Find payment by reference
    const payment = await prisma.payment.findUnique({
      where: { reference: event.reference },
      include: {
        subscription: {
          include: {
            referral: true,
          },
        },
        user: true,
        creator: true,
      },
    })

    if (!payment) {
      console.warn(`Payment not found for reference: ${event.reference}`)
      return
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: event.status,
        webhookReceived: true,
        metadata: {
          ...(payment.metadata as any),
          webhookEvent: event.event,
          ...event.metadata,
        },
      },
    })

    // Create payment transaction log with tax and referral info
    const taxAmount = event.metadata?.taxAmount
      ? Math.round(event.metadata.taxAmount * 100)
      : null
    const taxRate = event.metadata?.taxRate || null
    const referralCommission = event.metadata?.referralCommission
      ? Math.round(event.metadata.referralCommission * 100)
      : null

    // Calculate platform fee using smallest unit to avoid rounding
    // Special case: AI/Pro upgrades go 100% to platform
    const isAiUpgrade =
      event.metadata?.type === "ai_upgrade" ||
      event.metadata?.subscriptionType === "pro"

    const platformFee = isAiUpgrade
      ? event.amount
      : calculatePlatformFee(event.amount)
    const creatorNet = isAiUpgrade ? 0 : calculateCreatorPayout(event.amount)
    const transactionMetadata = {
      ...event.metadata,
      platformFee,
      platformFeePercentage: PLATFORM_FEE_PERCENT,
      grossAmount: event.amount,
      creatorNet,
    }

    await prisma.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        provider: event.provider,
        type: event.metadata?.type || "payment",
        reference: event.reference,
        externalId: event.metadata?.externalId || event.reference,
        amount: event.amount,
        currency: event.currency,
        status: event.status,
        taxAmount,
        taxRate,
        countryCode: event.metadata?.countryCode || null,
        referralCommission,
        platformFee,
        creatorEarnings: creatorNet,
        metadata: transactionMetadata,
      },
    })

    // Handle successful payment - update wallet and earnings for all successful payments
    if (event.status === "success") {
      // Update creator wallet with net earnings
      const creatorWallet = await prisma.creatorWallet.upsert({
        where: { userId: payment.creatorId },
        create: {
          userId: payment.creatorId,
          balance: creatorNet,
        },
        update: {
          balance: {
            increment: creatorNet,
          },
        },
      })

      // Create earnings record with net amount
      await prisma.earnings.create({
        data: {
          creatorId: payment.creatorId,
          paymentId: payment.id,
          type: payment.subscription ? "payment" : "payment",
          amount: creatorNet, // Store net amount (smallest unit)
          balanceAfter: creatorWallet.balance,
        },
      })

      // Update payment metadata with fee information for audit
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          platformFee,
          creatorEarnings: creatorNet,
          metadata: {
            ...(payment.metadata as any),
            platformFee,
            platformFeePercentage: PLATFORM_FEE_PERCENT,
            grossAmount: event.amount,
            creatorNet,
          },
        },
      })
    }

    // Handle PPV purchase logic
    if (event.status === "success" && event.metadata?.type === "ppv" && event.metadata?.postId) {
      // Confirm PPV purchase (it was created as pending in purchase route)
      const ppvPurchase = await prisma.pPVPurchase.findFirst({
        where: {
          postId: event.metadata.postId,
          fanId: payment.userId,
          paymentId: payment.id,
        },
      })

      if (ppvPurchase) {
        // Purchase already exists, just log success
        console.log(`PPV purchase confirmed: ${ppvPurchase.id}`)
      } else {
        // Create PPV purchase if it doesn't exist (shouldn't happen, but safety check)
        await prisma.pPVPurchase.create({
          data: {
            postId: event.metadata.postId,
            fanId: payment.userId,
            pricePaid: event.amount,
            provider: event.provider,
            currency: event.currency,
            paymentId: payment.id,
          },
        })
        console.log(`PPV purchase created: postId=${event.metadata.postId}, fanId=${payment.userId}`)
      }
    }

    // Handle subscription-specific logic
    if (event.status === "success" && payment.subscription) {
      // Activate subscription if not already active
      if (payment.subscription.status !== "active") {
        const subscriptionEndDate = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ) // 30 days

        await prisma.subscription.update({
          where: { id: payment.subscription.id },
          data: {
            status: "active",
            startDate: new Date(),
            endDate: subscriptionEndDate,
            nextBillingDate: subscriptionEndDate,
            lastPaymentId: payment.id,
          },
        })

        // Notify creator of new subscription
        await notifyNewSubscription(
          payment.creatorId,
          payment.user.email || "Unknown",
          payment.tierName
        )

        // Handle referral credits if applicable
        if (payment.subscription.referralId && payment.subscription.referral) {
          const referral = payment.subscription.referral

          if (referral.referrerId) {
            const commissionRate = getReferralCommissionRate(payment.tierName)
            const credits = calculateReferralCredits(
              "subscription",
              payment.tierPrice,
              payment.tierName
            )

            await awardReferralCredits(
              referral.referrerId,
              payment.subscription.referralId,
              credits,
              "subscription",
              `Referral subscription: ${payment.tierName} tier ($${payment.tierPrice}/month)`
            )

            await prisma.referral.update({
              where: { id: payment.subscription.referralId },
              data: {
                creditsEarned: referral.creditsEarned + credits,
                commissionRate,
                commissionAmount: credits,
                status: "credited",
                subscriptionValue: payment.tierPrice,
              },
            })
          }
        }
      }
    } else if (event.status === "failed" && payment.subscription) {
      // Cancel subscription on payment failure
      await prisma.subscription.update({
        where: { id: payment.subscription.id },
        data: {
          status: "cancelled",
        },
      })
    }

    // Log event for analytics
    console.log(`Payment event processed: ${event.event}`, {
      paymentId: payment.id,
      reference: event.reference,
      status: event.status,
      provider: event.provider,
    })
  } catch (error) {
    console.error("Error processing payment event:", error)
    throw error
  }
}

/**
 * Process renewal payment event
 * Handles subscription renewal payments
 */
export async function processRenewalEvent(event: PaymentEvent): Promise<void> {
  try {
    // Find subscription by metadata or payment reference
    const subscription = await prisma.subscription.findFirst({
      where: {
        OR: [
          { paymentReference: event.reference },
          {
            payment: {
              metadata: {
                path: ["subscriptionId"],
                equals: event.metadata?.subscriptionId,
              },
            },
          },
        ],
      },
      include: {
        payment: true,
        fan: true,
        creator: true,
        referral: true,
      },
    })

    if (!subscription) {
      console.warn(
        `Subscription not found for renewal reference: ${event.reference}`
      )
      return
    }

    // Create renewal payment record
    const renewalPayment = await prisma.payment.create({
      data: {
        userId: subscription.fanId,
        creatorId: subscription.creatorId,
        tierName: subscription.tierName,
        tierPrice: subscription.tierPrice,
        provider: event.provider,
        reference: event.reference,
        amount: event.amount,
        currency: event.currency,
        status: event.status,
        metadata: event.metadata,
      },
    })

    // Create renewal transaction
    await prisma.paymentTransaction.create({
      data: {
        paymentId: renewalPayment.id,
        provider: event.provider,
        type: "renewal",
        reference: event.reference,
        amount: event.amount,
        currency: event.currency,
        status: event.status,
        metadata: event.metadata,
      },
    })

    if (event.status === "success") {
      // Calculate platform fee and creator net earnings
      const grossAmount = fromSmallestUnit(renewalPayment.amount, renewalPayment.currency)
      const payout = await calculateCreatorPayout(grossAmount)

      // Update creator wallet with net earnings
      const creatorWallet = await prisma.creatorWallet.upsert({
        where: { userId: subscription.creatorId },
        create: {
          userId: subscription.creatorId,
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
          creatorId: subscription.creatorId,
          paymentId: renewalPayment.id,
          type: "renewal",
          amount: payout.creatorNet, // Store net amount
          balanceAfter: creatorWallet.balance,
        },
      })

      // Update payment metadata with fee information for audit
      await prisma.payment.update({
        where: { id: renewalPayment.id },
        data: {
          metadata: {
            ...(renewalPayment.metadata as any),
            platformFee: payout.platformFee,
            platformFeePercentage: (payout.platformFee / payout.grossAmount) * 100,
            grossAmount: payout.grossAmount,
            creatorNet: payout.creatorNet,
          },
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
          nextBillingDate: nextBillingDate,
          endDate: nextBillingDate,
          lastPaymentId: renewalPayment.id,
        },
      })

      // Handle referral credits for renewal
      if (subscription.referralId && subscription.referral) {
        const referral = subscription.referral

        if (referral.referrerId) {
          const credits = calculateReferralCredits(
            "subscription",
            subscription.tierPrice,
            subscription.tierName
          )

          await awardReferralCredits(
            referral.referrerId,
            subscription.referralId,
            credits,
            "subscription",
            `Referral renewal: ${subscription.tierName} tier ($${subscription.tierPrice}/month)`
          )

          await prisma.referral.update({
            where: { id: subscription.referralId },
            data: {
              creditsEarned: referral.creditsEarned + credits,
            },
          })
        }
      }
    }

    console.log(`Renewal event processed: ${event.event}`, {
      subscriptionId: subscription.id,
      reference: event.reference,
      status: event.status,
    })
  } catch (error) {
    console.error("Error processing renewal event:", error)
    throw error
  }
}

