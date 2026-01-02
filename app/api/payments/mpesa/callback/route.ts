export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { processWebhook } from "@/lib/payments/payment-router"
import { processPaymentEvent } from "@/lib/payments/webhook-handler"

/**
 * M-Pesa callback handler
 * Handles callbacks from Paystack M-Pesa payments
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const providerHeader = req.headers.get("x-provider") || "PAYSTACK" // Default to Paystack

    // Only PAYSTACK is supported
    if (providerHeader !== "PAYSTACK") {
      return NextResponse.json(
        { error: "Invalid provider. Only PAYSTACK is supported." },
        { status: 400 }
      )
    }

    // Narrow provider type to PAYSTACK
    const provider: "PAYSTACK" = "PAYSTACK"

    // Process webhook using unified handler
    const webhookResult = await processWebhook(
      provider,
      body,
      req.headers.get("x-signature") || undefined
    )

    // Process payment event using unified handler
    await processPaymentEvent({
      event: webhookResult.event,
      reference: webhookResult.reference,
      status: webhookResult.status,
      amount: webhookResult.amount,
      currency: webhookResult.currency,
      metadata: webhookResult.metadata,
      provider: "PAYSTACK", // Always PAYSTACK
    })

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Callback processed",
    })
  } catch (error: any) {
    console.error("M-Pesa callback error:", error)
    return NextResponse.json(
      {
        error: error.message || "Callback processing failed",
      },
      { status: 400 }
    )
  }
}

