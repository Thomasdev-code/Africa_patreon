import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { verifyMpesaTransaction } from "@/lib/payments/mpesa"
import { prisma } from "@/lib/prisma"
import { processPaymentEvent } from "@/lib/payments/webhook-handler"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { reference, provider } = body

    if (!reference || !provider) {
      return NextResponse.json(
        { error: "Reference and provider are required" },
        { status: 400 }
      )
    }

    if (provider !== "FLUTTERWAVE" && provider !== "PAYSTACK") {
      return NextResponse.json(
        { error: "Invalid provider. Must be FLUTTERWAVE or PAYSTACK" },
        { status: 400 }
      )
    }

    // Verify payment status
    const verification = await verifyMpesaTransaction(
      provider as "PAYSTACK",
      reference
    )

    // Find payment by reference
    const payment = await prisma.payment.findUnique({
      where: { reference },
    })

    if (payment && verification.status === "success") {
      // Process payment event to activate subscription
      await processPaymentEvent({
        event: "mpesa.verified",
        reference: reference,
        status: verification.status,
        amount: verification.amount,
        currency: verification.currency,
        metadata: verification.metadata,
        provider: provider as "PAYSTACK",
      })
    }

    return NextResponse.json({
      success: true,
      status: verification.status,
      amount: verification.amount,
      currency: verification.currency,
      metadata: verification.metadata,
    })
  } catch (error: any) {
    console.error("M-Pesa verification error:", error)
    return NextResponse.json(
      { error: error.message || "Verification failed" },
      { status: 500 }
    )
  }
}

