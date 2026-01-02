export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { verifyPayment } from "@/lib/payments"
import { verifyMpesaTransaction } from "@/lib/payments/mpesa"
import { processPaymentEvent } from "@/lib/payments/webhook-handler"
import { z } from "zod"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

const verifySchema = z.object({
  reference: z.string(),
  provider: z.enum(["PAYSTACK", "MPESA"]).optional().default("PAYSTACK"),
})

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      )
    }

    const body = await req.json()
    const validated = verifySchema.parse(body)

    // Find payment
    const payment = await prisma.payment.findUnique({
      where: { reference: validated.reference },
    })

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404, headers: corsHeaders }
      )
    }

    // Verify ownership
    if (payment.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403, headers: corsHeaders }
      )
    }

    // Verify payment based on provider
    let verification

    if (validated.provider === "MPESA" || payment.provider === "MPESA_PAYSTACK") {
      // M-Pesa verification via Paystack
      const mpesaResult = await verifyMpesaTransaction(
        "PAYSTACK",
        validated.reference
      )
      verification = {
        ...mpesaResult,
        reference: validated.reference,
      }
    } else {
      // PAYSTACK verification
      const result = await verifyPayment("PAYSTACK", validated.reference)
      verification = {
        status: result.status,
        reference: validated.reference,
        amount: result.amount,
        currency: result.currency,
        metadata: result.metadata,
      }
    }

    // Update payment status
    if (verification.status === "success" && payment.status !== "success") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "success" },
      })

      // Process payment event
      // Note: processPaymentEvent only accepts "PAYSTACK" as provider
      // MPESA payments use Paystack backend, so we always use "PAYSTACK" here
      await processPaymentEvent({
        event: "payment.verified",
        reference: verification.reference,
        status: verification.status,
        amount: verification.amount,
        currency: verification.currency,
        metadata: verification.metadata,
        provider: "PAYSTACK",
      })
    }

    return NextResponse.json(
      {
        success: true,
        status: verification.status,
        amount: verification.amount,
        currency: verification.currency,
        metadata: verification.metadata,
      },
      { headers: corsHeaders }
    )
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400, headers: corsHeaders }
      )
    }

    console.error("Payment verification error:", error)
    return NextResponse.json(
      { error: error.message || "Verification failed" },
      { status: 500, headers: corsHeaders }
    )
  }
}

