import { NextRequest, NextResponse } from "next/server"
import { processWebhook } from "@/lib/payments/payment-router"
import { processPaymentEvent } from "@/lib/payments/webhook-handler"

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("verif-hash")

    const body = await req.json()

    // Handle webhook using unified router
    const webhookResult = await processWebhook(
      "FLUTTERWAVE",
      body,
      signature || undefined
    )

    // Process payment event using unified handler
    await processPaymentEvent({
      event: webhookResult.event,
      reference: webhookResult.reference,
      status: webhookResult.status,
      amount: webhookResult.amount * 100, // Convert to cents
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

