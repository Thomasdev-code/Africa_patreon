import { NextRequest, NextResponse } from "next/server"
import { processWebhook } from "@/lib/payments/payment-router"
import { processPaymentEvent } from "@/lib/payments/webhook-handler"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-paystack-signature")
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }

    const body = await req.json()
    const webhookResult = await processWebhook("PAYSTACK", body, signature)

    // Log payment event
    await prisma.paymentEvent.create({
      data: {
        eventId: `${webhookResult.event}_${webhookResult.reference}`,
        provider: "PAYSTACK",
        type: webhookResult.event.includes("subscription") ? "subscription" : "payment",
        userId: webhookResult.metadata?.userId || null,
        subscriptionId: webhookResult.metadata?.subscriptionId || null,
        amount: webhookResult.amount / 100, // Convert from kobo
        currency: webhookResult.currency,
        status: webhookResult.status,
        metadata: webhookResult.metadata,
      },
    })

    // Process payment event
    await processPaymentEvent({
      event: webhookResult.event,
      reference: webhookResult.reference,
      status: webhookResult.status,
      amount: webhookResult.amount,
      currency: webhookResult.currency,
      metadata: webhookResult.metadata,
      provider: "PAYSTACK",
    })

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Paystack webhook error:", error)
    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 400 }
    )
  }
}

