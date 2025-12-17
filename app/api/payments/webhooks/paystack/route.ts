import { NextRequest, NextResponse } from "next/server"
import { processWebhook } from "@/lib/payments/payment-router"
import { processPaymentEvent } from "@/lib/payments/webhook-handler"

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("x-paystack-signature")

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      )
    }

    const body = await req.json()

    // Handle webhook using unified router
    const webhookResult = await processWebhook(
      "PAYSTACK",
      body,
      signature
    )

    // Process payment event using unified handler
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

