import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { verifyPayment } from "@/lib/payments"
import { notifyNewSubscription } from "@/lib/notifications"
import { calculateReferralCredits, awardReferralCredits } from "@/lib/referrals"
import type { PaymentProvider } from "@/lib/types"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { subscriptionId, paymentStatus, provider, reference } = body

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      )
    }

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    })

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      )
    }

    // Verify ownership (fan can only confirm their own subscription)
    if (subscription.fanId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // If payment status is provided directly, use it
    let verifiedStatus: "successful" | "failed" | "pending" = "pending"

    if (paymentStatus === "successful" || paymentStatus === "success") {
      verifiedStatus = "successful"
    } else if (paymentStatus === "failed" || paymentStatus === "cancelled") {
      verifiedStatus = "failed"
    } else if (provider && reference) {
      // Verify payment with provider
      const verification = await verifyPayment(
        provider as PaymentProvider,
        reference
      )
      verifiedStatus = verification.status
    }

    // Update subscription based on verification
    if (verifiedStatus === "successful") {
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: "active",
          startDate: new Date(),
          paymentReference: reference || subscription.paymentReference,
        },
      })

      // Notify creator of new subscription
      const fan = await prisma.user.findUnique({
        where: { id: subscription.fanId },
      })

      if (fan) {
        await notifyNewSubscription(
          subscription.creatorId,
          fan.email,
          subscription.tierName
        )
      }

      // Award referral credits if subscription came from referral
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

          // Update referral
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
        message: "Subscription activated successfully",
      })
    } else if (verifiedStatus === "failed") {
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: "cancelled",
        },
      })

      return NextResponse.json(
        {
          success: false,
          error: "Payment verification failed",
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: false,
      message: "Payment verification pending",
    })
  } catch (error) {
    console.error("Subscription confirmation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

