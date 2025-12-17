import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyPayment } from "@/lib/payments"
import { notifyNewSubscription } from "@/lib/notifications"
import { calculateReferralCredits, awardReferralCredits } from "@/lib/referrals"
import type { PaymentProvider } from "@/lib/types"

/**
 * Webhook endpoint for payment providers (Paystack, Flutterwave, Stripe)
 * This endpoint should be configured in your payment provider dashboard
 */
export async function POST(req: NextRequest) {
  try {
    // Get provider from header or body
    const provider = (req.headers.get("x-payment-provider") ||
      req.headers.get("x-paystack-signature") ? "paystack" :
      req.headers.get("x-flutterwave-signature") ? "flutterwave" :
      "stripe") as PaymentProvider

    const body = await req.json()

    // Extract payment reference based on provider
    let paymentReference: string | null = null
    let transactionStatus: string | null = null

    if (provider === "paystack") {
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
    } else if (provider === "flutterwave") {
      // Flutterwave webhook format
      const event = body.event
      const data = body.data

      if (event === "charge.completed" && data.status === "successful") {
        paymentReference = data.tx_ref || data.flw_ref
        transactionStatus = "successful"
      } else if (event === "charge.completed" && data.status === "failed") {
        paymentReference = data.tx_ref || data.flw_ref
        transactionStatus = "failed"
      }
    } else if (provider === "stripe") {
      // Stripe webhook format
      const event = body.type
      const data = body.data.object

      if (event === "payment_intent.succeeded") {
        paymentReference = data.id
        transactionStatus = "successful"
      } else if (event === "payment_intent.payment_failed") {
        paymentReference = data.id
        transactionStatus = "failed"
      }
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
        paymentProvider: provider,
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

    // Verify payment with provider
    const verification = await verifyPayment(provider, paymentReference)

    if (verification.status === "successful" && subscription.status !== "active") {
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

