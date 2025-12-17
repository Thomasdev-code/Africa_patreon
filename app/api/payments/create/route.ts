import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma, executeWithReconnect } from "@/lib/prisma"
import {
  getPaymentProvider,
  getProviderForCountry,
  getBestProviderForCountry,
  getCurrencyForCountry,
  getCurrencyForProvider,
  convertPrice,
  normalizeCountry,
  isMobileMoney,
  createStripePayment,
  createPaystackPayment,
  createFlutterwavePayment,
  createMpesaPayment,
  type PaymentProvider,
} from "@/lib/payments"
import { notifyNewSubscription } from "@/lib/notifications"
import { calculateReferralCredits, awardReferralCredits } from "@/lib/referrals"
import { fraudCheckMiddleware } from "@/lib/security/fraud-middleware"
import { calculateTax } from "@/lib/tax/tax-engine"
import type { SupportedCurrency } from "@/lib/payments/currency"
import { toUnifiedPayment } from "@/lib/payments/unified-api"
import {
  calculatePlatformFee,
  calculateCreatorPayout,
} from "@/app/config/platform"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { creatorId, tierName, tierId, provider, country, currency, phone } = body

    if (!creatorId || (!tierName && !tierId)) {
      return NextResponse.json(
        { error: "Creator ID and tier name/ID are required" },
        { status: 400 }
      )
    }

    // Detect country from multiple sources
    let detectedCountry = country
    
    // Try to get country from query param
    if (!detectedCountry) {
      const url = new URL(req.url)
      detectedCountry = url.searchParams.get("country") || undefined
    }
    
    // Try to get country from IP header (if available)
    if (!detectedCountry) {
      const forwardedFor = req.headers.get("x-forwarded-for")
      const realIp = req.headers.get("x-real-ip")
      // In production, you'd use a geolocation service here
      // For now, we'll use the user's profile if available
    }
    
    // Try to get country from user profile (if stored)
    if (!detectedCountry && session?.user) {
      // You can add country to user profile in the future
      // For now, default to US
      detectedCountry = "US"
    }
    
    // Final fallback
    if (!detectedCountry) {
      detectedCountry = "US"
    }

    // Normalize country
    const normalizedCountry = normalizeCountry(detectedCountry)
    
    // If provider not provided, auto-select based on country
    let selectedProvider: PaymentProvider
    if (!provider) {
      selectedProvider = getBestProviderForCountry(normalizedCountry)
    } else {
      // Validate provider format
      const validProviders = [
        "STRIPE",
        "PAYSTACK",
        "FLUTTERWAVE",
        "MPESA_FLW",
        "MPESA_PAYSTACK",
      ]
      const normalizedProvider = provider.toUpperCase().trim()

      if (!validProviders.includes(normalizedProvider)) {
        return NextResponse.json(
          {
            error: `Invalid payment provider. Must be one of: ${validProviders.join(", ")}`,
          },
          { status: 400 }
        )
      }
      selectedProvider = normalizedProvider as PaymentProvider
    }

    // Prevent Paystack outside NG where merchant currency support will fail
    if (selectedProvider === "PAYSTACK" && normalizedCountry !== "NG") {
      return NextResponse.json(
        {
          error: "Paystack is only supported for NG customers. Please use Stripe or Flutterwave for this country.",
        },
        { status: 400 }
      )
    }

    // Fraud check (will be updated after tier lookup with actual amount)
    const fraudCheck = await fraudCheckMiddleware(req, {
      userId: session.user.id,
      creatorId,
      tierId,
      amount: undefined, // Will be set after tier lookup
      currency: "USD", // Will be updated after currency detection
    })

    if (fraudCheck) {
      return fraudCheck
    }

    // Get creator profile to find tier details
    const creator = await executeWithReconnect(() =>
      prisma.user.findUnique({
        where: { id: creatorId },
        include: {
          creatorProfile: true,
        },
      })
    )

    if (!creator || !creator.creatorProfile) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 }
      )
    }

    // Find tier in creator's tiers
    const tiers = creator.creatorProfile.tiers as any[]
    const tier = tiers.find(
      (t: any) => t.name === tierName || t.id === tierId
    )

    if (!tier) {
      return NextResponse.json(
        { error: "Tier not found" },
        { status: 404 }
      )
    }

    const finalTierName = tierName || tier.name
    const finalTierId = tierId || tier.id

    // Check if user already has an active subscription to this creator
    const existingSubscription = await executeWithReconnect(() =>
      prisma.subscription.findFirst({
        where: {
          fanId: session.user.id,
          creatorId: creatorId,
          status: "active",
        },
      })
    )

    if (existingSubscription) {
      return NextResponse.json(
        { error: "You already have an active subscription to this creator" },
        { status: 400 }
      )
    }

    // Determine currency based on provider and country
    let finalCurrency: SupportedCurrency
    // Hard requirements per provider first (overrides client-provided currency)
    if (isMobileMoney(selectedProvider)) {
      finalCurrency = "KES" // M-Pesa only supports KES
    } else if (selectedProvider === "PAYSTACK") {
      finalCurrency = "NGN" // Paystack merchant currency requirement
    } else if (currency) {
      finalCurrency = currency as SupportedCurrency
    } else {
      // Get currency for provider first, but adjust based on country if needed
      const providerCurrency = getCurrencyForProvider(selectedProvider)
      const countryCurrency = getCurrencyForCountry(normalizedCountry)
      
      if (selectedProvider === "FLUTTERWAVE") {
        // Flutterwave supports multiple currencies - use country currency if supported
        const flutterwaveCurrencies: SupportedCurrency[] = ["KES", "NGN", "GHS", "ZAR", "USD"]
        finalCurrency = flutterwaveCurrencies.includes(countryCurrency) ? countryCurrency : providerCurrency
      } else {
        // Stripe supports multiple currencies - use country currency if supported
        const stripeCurrencies: SupportedCurrency[] = ["USD", "EUR", "GBP", "CAD"]
        finalCurrency = stripeCurrencies.includes(countryCurrency) ? countryCurrency : providerCurrency
      }
    }

    // Convert tier price from USD to local currency
    // Assume tier.price is in USD
    const tierPriceUSD = tier.price
    const convertedPrice = await convertPrice(tierPriceUSD, finalCurrency)

    // Calculate tax on converted price
    const taxCalculation = calculateTax(convertedPrice, normalizedCountry)
    const totalAmount = taxCalculation.totalAmount
    const amountMinor = Math.round(totalAmount * 100) // smallest unit
    const platformFee = calculatePlatformFee(amountMinor)
    const creatorEarnings = calculateCreatorPayout(amountMinor)

    console.log("Selected provider:", selectedProvider)
    console.log("Currency:", finalCurrency)
    console.log("Original price (USD):", tierPriceUSD)
    console.log("Converted price:", convertedPrice)
    console.log("Total amount (with tax):", totalAmount)

    // Create payment based on provider
    let paymentResult: { reference: string; payment_url: string }
    const metadata = {
      userId: session.user.id,
      creatorId: creatorId,
      tierId: finalTierId,
      tierName: finalTierName,
      countryCode: normalizedCountry,
      taxAmount: taxCalculation.taxAmount,
      taxRate: taxCalculation.taxRate,
      email: session.user.email || undefined,
      platformFee,
      creatorEarnings,
    }

    try {
      if (isMobileMoney(selectedProvider)) {
        // M-Pesa payment
        if (!phone) {
          return NextResponse.json(
            { error: "Phone number is required for M-Pesa payments" },
            { status: 400 }
          )
        }

        if (selectedProvider === "MPESA_PAYSTACK") {
          paymentResult = await createMpesaPayment(
            totalAmount,
            phone,
            "MPESA_PAYSTACK",
            metadata
          )
        } else {
          paymentResult = await createMpesaPayment(
            totalAmount,
            phone,
            "MPESA_FLW",
            metadata
          )
        }
      } else if (selectedProvider === "STRIPE") {
        paymentResult = await createStripePayment(
          totalAmount,
          session.user.email || "",
          finalCurrency,
          metadata
        )
      } else if (selectedProvider === "PAYSTACK") {
        paymentResult = await createPaystackPayment(
          totalAmount,
          session.user.email || "",
          finalCurrency,
          metadata
        )
      } else if (selectedProvider === "FLUTTERWAVE") {
        paymentResult = await createFlutterwavePayment(
          totalAmount,
          session.user.email || "",
          finalCurrency,
          metadata
        )
      } else {
        throw new Error(`Unsupported payment provider: ${selectedProvider}`)
      }

      // Ensure payment_url exists
      if (!paymentResult.payment_url) {
        throw new Error(`${selectedProvider} did not return a payment URL`)
      }
    } catch (error: any) {
      console.error(`Payment creation failed for ${selectedProvider}:`, error)
      return NextResponse.json(
        {
          error: `Payment creation failed: ${error.message}`,
          provider: selectedProvider,
        },
        { status: 500 }
      )
    }

    // Convert to unified payment format
    const unifiedPayment = toUnifiedPayment({
      provider: selectedProvider,
      externalId: paymentResult.reference,
      amount: amountMinor,
      currency: finalCurrency,
      status: "pending",
      userId: session.user.id,
      creatorId: creatorId,
      tierId: finalTierId,
      countryCode: normalizedCountry,
      metadata: {
        tierName: finalTierName,
        taxAmount: taxCalculation.taxAmount,
        taxRate: taxCalculation.taxRate,
        phone: phone || undefined,
        platformFee,
        creatorEarnings,
      },
    })

    // Create payment record in database
    const payment = await executeWithReconnect(() =>
      prisma.payment.create({
        data: {
          userId: session.user.id,
          creatorId: creatorId,
          tierName: finalTierName,
          tierPrice: tier.price,
          provider: selectedProvider,
          reference: paymentResult.reference,
          amount: unifiedPayment.amount,
          currency: unifiedPayment.currency,
          status: "pending",
        type: "subscription",
          metadata: {
            ...unifiedPayment.metadata,
            tierId: finalTierId,
            amountUSD: unifiedPayment.amountUSD,
          },
        platformFee,
        creatorEarnings,
        },
      })
    )

    // Create payment transaction with tax info
    await executeWithReconnect(() =>
      prisma.paymentTransaction.create({
        data: {
          paymentId: payment.id,
          provider: selectedProvider,
          type: "payment",
          reference: paymentResult.reference,
          externalId: paymentResult.reference,
          amount: unifiedPayment.amount,
          currency: unifiedPayment.currency,
          status: "pending",
          platformFee,
          creatorEarnings,
          taxAmount: unifiedPayment.taxAmount,
          taxRate: unifiedPayment.taxRate,
          countryCode: unifiedPayment.countryCode,
          metadata: unifiedPayment.metadata,
        },
      })
    )

    // Create pending subscription
    const subscription = await executeWithReconnect(() =>
      prisma.subscription.create({
        data: {
          fanId: session.user.id,
          creatorId: creatorId,
          tierName: finalTierName,
          tierPrice: tier.price,
          status: "pending",
          paymentProvider: selectedProvider,
          paymentReference: paymentResult.reference,
          paymentId: payment.id,
        },
      })
    )

    // Update payment with subscription ID
    await executeWithReconnect(() =>
      prisma.payment.update({
        where: { id: payment.id },
        data: { subscriptionId: subscription.id },
      })
    )

    return NextResponse.json({
      success: true,
      provider: selectedProvider,
      currency: finalCurrency,
      price: convertedPrice,
      priceUSD: tierPriceUSD,
      totalAmount: totalAmount,
      payment_url: paymentResult.payment_url,
      reference: paymentResult.reference,
    })
  } catch (error: any) {
    console.error("Payment creation error:", error)
    
    // Handle Stripe authentication errors
    if (error?.type === "StripeAuthenticationError") {
      return NextResponse.json(
        {
          error: "Stripe API key is invalid. Please check your STRIPE_SECRET_KEY in .env file",
          details: "The Stripe secret key is either missing, incorrect, or has been revoked",
        },
        { status: 500 }
      )
    }
    
    // Handle other Stripe errors
    if (error?.type?.startsWith("Stripe")) {
      return NextResponse.json(
        {
          error: error.message || "Stripe payment error",
          type: error.type,
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

