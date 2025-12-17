import { NextRequest, NextResponse } from "next/server"
import { processWebhook } from "@/lib/payments/payment-router"
import { processPaymentEvent } from "@/lib/payments/webhook-handler"

/**
 * M-Pesa callback handler
 * Handles callbacks from Flutterwave and Paystack M-Pesa payments
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const provider = req.headers.get("x-provider") || "FLUTTERWAVE" // Default to Flutterwave

    if (provider !== "FLUTTERWAVE" && provider !== "PAYSTACK") {
      return NextResponse.json(
        { error: "Invalid provider" },
        { status: 400 }
      )
    }

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
      provider: provider,
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

