export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyPayment } from "@/lib/payments"
import { notifyNewSubscription } from "@/lib/notifications"
import { calculateReferralCredits, awardReferralCredits } from "@/lib/referrals"
import type { PaymentProvider } from "@/lib/payments/types"

/**
 * Webhook endpoint for Paystack payments
 * This endpoint should be configured in your Paystack dashboard
 */
export async function POST(req: NextRequest) {
  try {
    // Only PAYSTACK is supported
    const providerHeader = req.headers.get("x-payment-provider") || 
      (req.headers.get("x-paystack-signature") ? "PAYSTACK" : null)

    if (!providerHeader || providerHeader.toUpperCase() !== "PAYSTACK") {
      return NextResponse.json(
        { error: "Only PAYSTACK provider is supported" },
        { status: 400 }
      )
    }

    const provider: PaymentProvider = "PAYSTACK"
    const body = await req.json()

    // Extract payment reference from Paystack webhook format
    let paymentReference: string | null = null
    let transactionStatus: string | null = null

    // Paystack webhook format
    const event = body.event
    const data = body.data

    if (event === "charge.success") {
      paymentReference = data.reference
      transactionStatus = "successful"
    } else if (event === "charge.failed") {
      paymentReference = data.reference
      transactionStatus = "failed"
    }

    if (!paymentReference) {
      return NextResponse.json(
        { error: "Payment reference not found" },
        { status: 400 }
      )
    }

    // Find subscription by payment reference
    const subscription = await prisma.subscription.findFirst({
      where: {
        paymentReference: paymentReference,
        paymentProvider: "PAYSTACK",
      },
      include: {
        fan: true,
        creator: true,
      },
    })

    if (!subscription) {
      console.warn(`Subscription not found for payment reference: ${paymentReference}`)
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      )
    }

    // Verify payment with provider (only PAYSTACK supported)
    const verification = await verifyPayment("PAYSTACK", paymentReference)

    if (verification.status === "success" && subscription.status !== "active") {
      // Activate subscription
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "active",
          startDate: new Date(),
        },
      })

      // Notify creator
      await notifyNewSubscription(
        subscription.creatorId,
        subscription.fan.email,
        subscription.tierName
      )

      // Award referral credits if applicable
      if (subscription.referralId) {
        const referral = await prisma.referral.findUnique({
          where: { id: subscription.referralId },
        })

        if (referral && referral.referrerId) {
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
            `Referral subscription: ${subscription.tierName} tier ($${subscription.tierPrice}/month)`
          )

          await prisma.referral.update({
            where: { id: subscription.referralId },
            data: {
              creditsEarned: referral.creditsEarned + credits,
              status: "credited",
              subscriptionValue: subscription.tierPrice,
            },
          })
        }
      }

      return NextResponse.json({
        success: true,
        message: "Subscription activated",
      })
    } else if (verification.status === "failed" && subscription.status === "active") {
      // Cancel subscription on payment failure
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "cancelled",
        },
      })

      return NextResponse.json({
        success: true,
        message: "Subscription cancelled due to payment failure",
      })
    }

    return NextResponse.json({
      success: true,
      message: "Webhook processed",
    })
  } catch (error) {
    console.error("Payment webhook error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

