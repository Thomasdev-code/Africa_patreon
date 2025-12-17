import { NextRequest, NextResponse } from "next/server"
import { processWebhook } from "@/lib/payments/payment-router"
import { processPaymentEvent } from "@/lib/payments/webhook-handler"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("verif-hash")
    const body = await req.json()
    const webhookResult = await processWebhook("FLUTTERWAVE", body, signature || undefined)

    // Log payment event
    await prisma.paymentEvent.create({
      data: {
        eventId: `${webhookResult.event}_${webhookResult.reference}`,
        provider: "FLUTTERWAVE",
        type: webhookResult.event.includes("subscription") ? "subscription" : "payment",
        userId: webhookResult.metadata?.userId || null,
        subscriptionId: webhookResult.metadata?.subscriptionId || null,
        amount: webhookResult.amount / 100, // Convert from smallest unit
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
      provider: "FLUTTERWAVE",
    })

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Flutterwave webhook error:", error)
    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 400 }
    )
  }
}

