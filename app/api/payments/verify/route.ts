import { NextRequest, NextResponse } from "next/server"
import { verifyPayment } from "@/lib/payments/unified"
import type { PaymentProvider } from "@/lib/payments/types"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const provider = searchParams.get("provider")
    const reference = searchParams.get("reference")

    if (!provider || !reference) {
      return NextResponse.json(
        { error: "Provider and reference are required" },
        { status: 400 }
      )
    }

    const result = await verifyPayment({
      provider: provider.toUpperCase() as PaymentProvider,
      reference: reference,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Payment verification error:", error)
    return NextResponse.json(
      { error: error.message || "Verification failed" },
      { status: 500 }
    )
  }
}

