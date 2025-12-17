import { NextRequest, NextResponse } from "next/server"
import { processWebhook } from "@/lib/payments/payment-router"
import { processPaymentEvent, processRenewalEvent } from "@/lib/payments/webhook-handler"
import { calculateRiskScore } from "@/lib/risk-engine"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get("stripe-signature")

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      )
    }

    const body = await req.text()

    // Handle webhook using unified router
    const webhookResult = await processWebhook(
      "STRIPE",
      body,
      signature
    )

    // Handle chargeback events
    if (webhookResult.event === "chargeback.dispute.created" || webhookResult.event === "charge.dispute.created") {
      // Forward to chargeback webhook handler
      const chargebackRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/chargebacks/webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "STRIPE",
          event: webhookResult.event,
          data: webhookResult.metadata,
        }),
      })
      return NextResponse.json({ received: true })
    }

    // Handle subscription renewal events
    if (webhookResult.event === "invoice.paid") {
      // Process renewal event using unified handler
      await processRenewalEvent({
        event: webhookResult.event,
        reference: webhookResult.reference,
        status: webhookResult.status,
        amount: webhookResult.amount,
        currency: webhookResult.currency,
        metadata: webhookResult.metadata,
        provider: "STRIPE",
      })

      return NextResponse.json({ received: true })
    }

    // Handle initial payment using unified handler
    await processPaymentEvent({
      event: webhookResult.event,
      reference: webhookResult.reference,
      status: webhookResult.status,
      amount: webhookResult.amount,
      currency: webhookResult.currency,
      metadata: webhookResult.metadata,
      provider: "STRIPE",
    })

    // Update risk score on successful payment
    if (webhookResult.status === "success") {
      const payment = await prisma.payment.findUnique({
        where: { reference: webhookResult.reference },
      })
      if (payment) {
        await calculateRiskScore(payment.creatorId)
      }
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
