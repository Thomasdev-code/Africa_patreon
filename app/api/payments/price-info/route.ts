import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  getBestProviderForCountry,
  getCurrencyForProvider,
  getCurrencyForCountry,
  convertPrice,
  normalizeCountry,
  isMobileMoney,
  type PaymentProvider,
} from "@/lib/payments"
import type { SupportedCurrency } from "@/lib/payments/currency"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tierId = searchParams.get("tierId")
    const country = searchParams.get("country") || "US"
    const providerParam = searchParams.get("provider")

    // Normalize country
    const normalizedCountry = normalizeCountry(country)
    
    // Get provider - use provided one or auto-select
    let provider: PaymentProvider
    if (providerParam) {
      provider = providerParam.toUpperCase() as PaymentProvider
    } else {
      provider = getBestProviderForCountry(normalizedCountry)
    }
    
    // Determine currency
    let finalCurrency: SupportedCurrency
    const providerCurrency = getCurrencyForProvider(provider)
    const countryCurrency = getCurrencyForCountry(normalizedCountry)
    
    // For M-Pesa, always use KES
    if (isMobileMoney(provider)) {
      finalCurrency = "KES"
    } else if (provider === "PAYSTACK") {
      // Paystack only supports NGN
      finalCurrency = "NGN"
    } else if (provider === "FLUTTERWAVE") {
      // Flutterwave supports multiple currencies
      const flutterwaveCurrencies: SupportedCurrency[] = ["KES", "NGN", "GHS", "ZAR", "USD"]
      finalCurrency = flutterwaveCurrencies.includes(countryCurrency) ? countryCurrency : providerCurrency
    } else {
      // Stripe supports multiple currencies
      const stripeCurrencies: SupportedCurrency[] = ["USD", "EUR", "GBP", "CAD"]
      finalCurrency = stripeCurrencies.includes(countryCurrency) ? countryCurrency : providerCurrency
    }

    // Find tier in database (we need to search through creator profiles)
    // For now, we'll accept a priceUSD parameter or fetch from a known tier
    // This is a simplified version - in production, you'd want to cache tier prices
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

    // Convert price
    const convertedPrice = await convertPrice(priceUSD, finalCurrency)

    return NextResponse.json({
      provider: provider,
      currency: finalCurrency,
      price: convertedPrice,
      priceUSD: priceUSD,
    })
  } catch (error: any) {
    console.error("Price info error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get price info" },
      { status: 500 }
    )
  }
}

