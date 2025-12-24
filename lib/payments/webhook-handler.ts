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
  getPlatformFeePercent,
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
  provider: "PAYSTACK"
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

    // Idempotency: Check if payment transaction already exists with this status
    const existingTransaction = await prisma.paymentTransaction.findFirst({
      where: {
        paymentId: payment.id,
        reference: event.reference,
        status: event.status,
      },
    })

    if (existingTransaction && event.status === "success") {
      console.log(`Payment ${event.reference} already processed successfully, skipping`)
      return
    }

    // CRITICAL: Wrap all database operations in a transaction for atomicity
    // This ensures data consistency even if something fails mid-process
    await prisma.$transaction(async (tx) => {
      // Update payment status
      await tx.payment.update({
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

    // Server-side fee recomputation (NEVER trust webhook metadata)
    // Use stored payment amount as source of truth
    const storedAmount = payment.amount
    
    // Extract tax info from stored metadata (if available)
    const storedMetadata = payment.metadata as any || {}
    const taxAmount = storedMetadata.taxAmount
      ? Math.round(storedMetadata.taxAmount * 100)
      : null
    const taxRate = storedMetadata.taxRate || null
    const referralCommission = storedMetadata.referralCommission
      ? Math.round(storedMetadata.referralCommission * 100)
      : null

    // Recompute platform fee and creator earnings server-side
    // Special case: AI/Pro upgrades go 100% to platform
    const isAiUpgrade =
      storedMetadata.type === "ai_upgrade" ||
      storedMetadata.subscriptionType === "pro"

    // Get current platform fee percentage from database
    const currentFeePercent = await getPlatformFeePercent()

    // Recompute fees from stored amount (server-side source of truth)
    const platformFee = isAiUpgrade
      ? storedAmount
      : await calculatePlatformFee(storedAmount)
    const creatorNet = isAiUpgrade ? 0 : await calculateCreatorPayout(storedAmount)
    const transactionMetadata = {
      ...event.metadata,
      platformFee,
      platformFeePercentage: currentFeePercent,
      grossAmount: event.amount,
      creatorNet,
    }

      // Create or update payment transaction (idempotent)
      await tx.paymentTransaction.upsert({
      where: {
        reference: event.reference,
      },
      create: {
        paymentId: payment.id,
        provider: event.provider,
        type: storedMetadata.type || "payment",
        reference: event.reference,
        externalId: storedMetadata.externalId || event.reference,
        amount: storedAmount, // Use stored amount
        currency: event.currency,
        status: event.status,
        taxAmount,
        taxRate,
        countryCode: storedMetadata.countryCode || null,
        referralCommission,
        platformFee,
        creatorEarnings: creatorNet,
        metadata: transactionMetadata,
      },
      update: {
        status: event.status,
        platformFee,
        creatorEarnings: creatorNet,
        metadata: transactionMetadata,
      },
    })

      // Handle successful payment - update wallet and earnings for all successful payments
      // Skip wallet updates for Pro/AI upgrades (100% platform fee)
      if (event.status === "success" && !isAiUpgrade) {
        // Update creator wallet with net earnings
        const creatorWallet = await tx.creatorWallet.upsert({
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
    }

      // Update payment with recomputed fee information (server-side source of truth)
      if (event.status === "success") {
        await tx.payment.update({
        where: { id: payment.id },
        data: {
          platformFee,
          creatorEarnings: creatorNet,
          metadata: {
            ...storedMetadata,
            platformFee,
            platformFeePercentage: currentFeePercent,
            grossAmount: storedAmount, // Use stored amount
            creatorNet,
            feesRecomputedAt: new Date().toISOString(),
          },
        },
      })
    }

      // Handle Pro/AI upgrade logic
      if (event.status === "success" && (storedMetadata.type === "ai_upgrade" || storedMetadata.subscriptionType === "pro")) {
        const PRO_MONTHLY_CREDITS = 50
        
        // Activate Pro subscription
        await tx.user.update({
        where: { id: payment.userId },
        data: {
          subscriptionPlan: "pro",
          aiCredits: {
            increment: PRO_MONTHLY_CREDITS, // Grant monthly credits
          },
        },
      })

      console.log(`Pro subscription activated for user: ${payment.userId}, granted ${PRO_MONTHLY_CREDITS} AI credits`)
    }

      // Handle PPV purchase logic
      if (event.status === "success" && event.metadata?.type === "ppv" && event.metadata?.postId) {
        // Confirm PPV purchase (it was created as pending in purchase route)
        const ppvPurchase = await tx.pPVPurchase.findFirst({
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
          await tx.pPVPurchase.create({
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

          await tx.subscription.update({
          where: { id: payment.subscription.id },
          data: {
            status: "active",
            startDate: new Date(),
            endDate: subscriptionEndDate,
            nextBillingDate: subscriptionEndDate,
            lastPaymentId: payment.id,
          },
        })

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

              await tx.referral.update({
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
        }
      } else if (event.status === "failed" && payment.subscription) {
        // Cancel subscription on payment failure
        await tx.subscription.update({
        where: { id: payment.subscription.id },
        data: {
          status: "cancelled",
        },
      })
      }
    }, {
      timeout: 30000, // 30 second timeout for transaction
      isolationLevel: 'ReadCommitted', // Prevent dirty reads
    })

    // Notify creator of new subscription (outside transaction - best effort)
    if (event.status === "success" && payment.subscription && payment.subscription.status !== "active") {
      notifyNewSubscription(
        payment.creatorId,
        payment.user.email || "Unknown",
        payment.tierName
      ).catch((err) => {
        console.error("Failed to notify creator of new subscription:", err)
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

