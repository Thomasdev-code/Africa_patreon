import { NextRequest, NextResponse } from "next/server"
import { processWebhook } from "@/lib/payments/payment-router"
import { processPaymentEvent, processRenewalEvent } from "@/lib/payments/webhook-handler"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("stripe-signature")
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }

    const body = await req.text()
    const webhookResult = await processWebhook("STRIPE", body, signature)

    // Log payment event
    await prisma.paymentEvent.create({
      data: {
        eventId: webhookResult.metadata?.eventId || webhookResult.reference,
        provider: "STRIPE",
        type: webhookResult.event.includes("subscription") || webhookResult.event.includes("invoice")
          ? "subscription"
          : "payment",
        userId: webhookResult.metadata?.userId || null,
        subscriptionId: webhookResult.metadata?.subscriptionId || null,
        amount: webhookResult.amount / 100, // Convert from cents
        currency: webhookResult.currency,
        status: webhookResult.status,
        metadata: webhookResult.metadata,
      },
    })

    // Process renewal events
    if (webhookResult.event === "invoice.paid") {
      await processRenewalEvent({
        event: webhookResult.event,
        reference: webhookResult.reference,
        status: webhookResult.status,
        amount: webhookResult.amount,
        currency: webhookResult.currency,
        metadata: webhookResult.metadata,
        provider: "STRIPE",
      })
    } else {
      // Process regular payment events
      await processPaymentEvent({
        event: webhookResult.event,
        reference: webhookResult.reference,
        status: webhookResult.status,
        amount: webhookResult.amount,
        currency: webhookResult.currency,
        metadata: webhookResult.metadata,
        provider: "STRIPE",
      })
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Stripe webhook error:", error)
    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 400 }
    )
  }
}

