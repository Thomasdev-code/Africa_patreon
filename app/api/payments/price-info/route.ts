import { NextRequest, NextResponse } from "next/server"
import {
  getBestProviderForCountry,
  normalizeCountry,
  type PaymentProvider,
} from "@/lib/payments"
import { resolvePaystackCurrency, type PaystackCurrency } from "@/lib/payments/currency"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const country = searchParams.get("country") || "NG"
    const providerParam = searchParams.get("provider")

    const normalizedCountry = normalizeCountry(country)
    const provider: PaymentProvider = "PAYSTACK"

    // CRITICAL: Always use KES for Kenya-based Paystack accounts
    // Set PAYSTACK_ENABLED_CURRENCIES env var if you have other currencies enabled
    const finalCurrency: PaystackCurrency = "KES"

    const priceUSDParam = searchParams.get("priceUSD")
    if (!priceUSDParam) {
      return NextResponse.json(
        { error: "Price USD is required" },
        { status: 400 }
      )
    }

    const priceUSD = parseFloat(priceUSDParam)
    if (isNaN(priceUSD)) {
      return NextResponse.json(
        { error: "Invalid price USD" },
        { status: 400 }
      )
    }

    // Convert USD to KES (simplified - in production use real rates)
    // Approximate rate: 1 USD ≈ 130 KES
    const convertedPrice = priceUSD * 130

    return NextResponse.json({
      provider,
      currency: finalCurrency,
      price: convertedPrice,
      priceUSD,
    })
  } catch (error: any) {
    console.error("Price info error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get price info" },
      { status: 500 }
    )
  }
}


