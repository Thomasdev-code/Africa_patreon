export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { processWebhook } from "@/lib/payments/payment-router"

const PRO_MONTHLY_CREDITS = 50

/**
 * Handle Pro subscription webhooks from all payment providers
 */
export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-paystack-signature")
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }

    const body = await req.json()
    const { paystackSDK } = await import("@/lib/payments/payment-providers")
    const webhookResult = await paystackSDK.handleWebhook(body, signature)

    // Find payment by reference
    const payment = await prisma.payment.findUnique({
      where: { reference: webhookResult.reference },
      include: { user: true },
    })

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    // Check if this is a Pro subscription payment
    const metadata = payment.metadata as any
    if (metadata?.subscriptionType !== "pro") {
      return NextResponse.json({ received: true })
    }

    // Handle successful Pro subscription activation
    if (webhookResult.status === "success") {
      await prisma.user.update({
        where: { id: payment.userId },
        data: {
          subscriptionPlan: "pro",
          aiCredits: {
            increment: PRO_MONTHLY_CREDITS, // Grant monthly credits
          },
        },
      })

      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "success",
          webhookReceived: true,
        },
      })
    }

    // Handle cancellation/refund
    if (webhookResult.status === "failed" || webhookResult.event?.includes("cancel")) {
      await prisma.user.update({
        where: { id: payment.userId },
        data: {
          subscriptionPlan: "free",
        },
      })
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Pro subscription webhook error:", error)
    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 400 }
    )
  }
}

