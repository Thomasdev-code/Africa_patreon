export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { paystackSDK } from "@/lib/payments/payment-providers"
import { processPaymentEvent } from "@/lib/payments/webhook-handler"
import { prisma } from "@/lib/prisma"
import { webhookRateLimit } from "@/lib/rate-limit"
import crypto from "crypto"

export async function POST(req: NextRequest) {
  try {
    // Rate limiting for webhooks: 100 requests per minute per IP
    const rateLimitResult = await webhookRateLimit(req)
    if (!rateLimitResult.allowed) {
      console.warn(`Webhook rate limit exceeded for IP: ${req.headers.get("x-forwarded-for")}`)
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.retryAfter || 60),
          },
        }
      )
    }

    const signature = req.headers.get("x-paystack-signature")
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }

    const body = await req.json()
    
    // Verify webhook signature
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
      .update(JSON.stringify(body))
      .digest("hex")

    if (hash !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    // Process webhook
    const webhookResult = await paystackSDK.handleWebhook(body, signature)

    // Idempotency check
    const existingEvent = await prisma.paymentEvent.findUnique({
      where: {
        eventId: `${webhookResult.event}_${webhookResult.reference}`,
      },
    })

    if (existingEvent) {
      return NextResponse.json({ received: true, message: "Event already processed" })
    }

    // Find payment to get stored amount (for server-side fee recomputation)
    const payment = await prisma.payment.findUnique({
      where: { reference: webhookResult.reference },
    })

    if (!payment) {
      console.warn(`Payment not found for reference: ${webhookResult.reference}`)
      return NextResponse.json({ received: true, message: "Payment not found" })
    }

    // Log payment event
    await prisma.paymentEvent.create({
      data: {
        eventId: `${webhookResult.event}_${webhookResult.reference}`,
        provider: "PAYSTACK",
        type: webhookResult.event.includes("subscription") ? "subscription" : "payment",
        userId: payment.userId,
        subscriptionId: payment.subscriptionId || null,
        amount: payment.amount / 100,
        currency: webhookResult.currency,
        status: webhookResult.status,
        metadata: {
          ...webhookResult.metadata,
          ...(payment.metadata as any || {}),
        },
      },
    })

    // Process payment event with stored amount (fees recomputed server-side)
    await processPaymentEvent({
      event: webhookResult.event,
      reference: webhookResult.reference,
      status: webhookResult.status,
      amount: payment.amount, // Use stored amount, not webhook amount
      currency: webhookResult.currency,
      metadata: {
        ...webhookResult.metadata,
        ...(payment.metadata as any || {}),
      },
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

