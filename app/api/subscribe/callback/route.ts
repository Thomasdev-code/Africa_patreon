import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyPayment } from "@/lib/payments"
import type { PaymentProvider } from "@/lib/payments/types"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const providerParam = searchParams.get("provider")
    const transactionId = searchParams.get("transaction_id")
    const reference = searchParams.get("reference") || searchParams.get("tx_ref")
    const sessionId = searchParams.get("session_id")

    // Only PAYSTACK is supported
    if (!providerParam || providerParam.toUpperCase() !== "PAYSTACK") {
      return NextResponse.redirect(
        new URL("/?error=invalid_payment_provider", req.url)
      )
    }

    const provider: PaymentProvider = "PAYSTACK"

    let paymentReference = reference || transactionId || sessionId

    if (!paymentReference) {
      return NextResponse.redirect(
        new URL("/?error=missing_payment_reference", req.url)
      )
    }

    // Find subscription by payment reference
    const subscription = await prisma.subscription.findFirst({
      where: {
        paymentReference: paymentReference,
        paymentProvider: provider,
      },
    })

    if (!subscription) {
      return NextResponse.redirect(
        new URL("/?error=subscription_not_found", req.url)
      )
    }

    // Verify payment (only PAYSTACK supported)
    const verification = await verifyPayment("PAYSTACK", paymentReference)

    if (verification.status === "success") {
      // Update subscription to active
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "active",
          startDate: new Date(),
        },
      })

      // Get creator username for redirect
      const creator = await prisma.user.findUnique({
        where: { id: subscription.creatorId },
        include: { creatorProfile: true },
      })

      const username = creator?.creatorProfile?.username || "unknown"

      return NextResponse.redirect(
        new URL(
          `/creator/${username}?subscription=success&id=${subscription.id}`,
          req.url
        )
      )
    } else {
      // Update subscription to cancelled
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: "cancelled",
        },
      })

      // Get creator username for redirect
      const creator = await prisma.user.findUnique({
        where: { id: subscription.creatorId },
        include: { creatorProfile: true },
      })

      const username = creator?.creatorProfile?.username || "unknown"

      return NextResponse.redirect(
        new URL(
          `/creator/${username}?subscription=failed`,
          req.url
        )
      )
    }
  } catch (error) {
    console.error("Payment callback error:", error)
    return NextResponse.redirect(new URL("/?error=payment_callback_failed", req.url))
  }
}

