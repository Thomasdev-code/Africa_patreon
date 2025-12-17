import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import {
  getPaymentProvider,
  getProviderNameForCountry,
  type PaymentProvider,
} from "@/lib/payments"
import { fraudCheckMiddleware } from "@/lib/security/fraud-middleware"
import { calculateTax } from "@/lib/tax/tax-engine"
import { getCurrencyForCountryCode, type SupportedCurrency } from "@/lib/payments/currency"
import { toUnifiedPayment } from "@/lib/payments/unified-api"
import Stripe from "stripe"
import { calculatePlatformFee, calculateCreatorPayout } from "@/app/config/platform"

// Allowed mobile app bundle IDs and package names
const ALLOWED_BUNDLE_IDS = (process.env.ALLOWED_BUNDLE_IDS || "").split(",").filter(Boolean)
const ALLOWED_PACKAGE_NAMES = (process.env.ALLOWED_PACKAGE_NAMES || "").split(",").filter(Boolean)

// CORS headers for mobile apps
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // In production, restrict to specific domains
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Bundle-ID, X-Package-Name",
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

/**
 * Validate mobile app bundle ID or package name
 */
function validateMobileApp(bundleId?: string, packageName?: string): boolean {
  // If no restrictions configured, allow all (for development)
  if (ALLOWED_BUNDLE_IDS.length === 0 && ALLOWED_PACKAGE_NAMES.length === 0) {
    return true
  }

  if (bundleId && ALLOWED_BUNDLE_IDS.includes(bundleId)) {
    return true
  }

  if (packageName && ALLOWED_PACKAGE_NAMES.includes(packageName)) {
    return true
  }

  return false
}

export async function POST(req: NextRequest) {
  try {
    // Get bundle ID / package name from headers
    const bundleId = req.headers.get("X-Bundle-ID")
    const packageName = req.headers.get("X-Package-Name")

    // Validate mobile app (only if restrictions are configured)
    if (bundleId || packageName) {
      if (!validateMobileApp(bundleId || undefined, packageName || undefined)) {
        return NextResponse.json(
          { error: "Unauthorized mobile app" },
          { status: 403, headers: corsHeaders }
        )
      }
    }

    // Optional: Allow unauthenticated requests for mobile (if using token-based auth)
    // For now, we'll require auth
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      )
    }

    const body = await req.json()
    const {
      provider,
      amount,
      currency,
      creatorId,
      tierId,
      tierName,
      platform = "web",
      country,
      metadata = {},
    } = body

    if (!creatorId || (!tierId && !tierName)) {
      return NextResponse.json(
        { error: "Creator ID and tier name/ID are required" },
        { status: 400, headers: corsHeaders }
      )
    }

    // Get creator profile to find tier details
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      include: {
        creatorProfile: true,
      },
    })

    if (!creator || !creator.creatorProfile) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404, headers: corsHeaders }
      )
    }

    // Find tier in creator's tiers
    const tiers = creator.creatorProfile.tiers as any[]
    const tier = tiers.find(
      (t: any) => t.id === tierId || t.name === tierName
    )

    if (!tier) {
      return NextResponse.json(
        { error: "Tier not found" },
        { status: 404, headers: corsHeaders }
      )
    }

    // Use provided amount or tier price
    const paymentAmount = amount || tier.price
    const amountMinor = Math.round(paymentAmount * 100)
    const platformFee = calculatePlatformFee(amountMinor)
    const creatorEarnings = calculateCreatorPayout(amountMinor)
    const finalTierName = tierName || tier.name

    // Check if user already has an active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        fanId: session.user.id,
        creatorId: creatorId,
        status: "active",
      },
    })

    if (existingSubscription) {
      return NextResponse.json(
        { error: "You already have an active subscription to this creator" },
        { status: 400, headers: corsHeaders }
      )
    }

    // Select payment provider
    const selectedProvider: PaymentProvider = provider
      ? (provider.toUpperCase() as PaymentProvider)
      : getProviderNameForCountry(country || "US")

    const finalCurrency = currency || getCurrencyForCountryCode(country || "US") || "USD"

    // Get payment provider instance
    const paymentProvider = getPaymentProvider(selectedProvider)

    // Create payment with mobile-specific metadata
    const paymentResult = await paymentProvider.createPayment(
      paymentAmount,
      finalCurrency,
      session.user.id,
      creatorId,
      finalTierName,
      {
        email: session.user.email || undefined,
        name: session.user.name || undefined,
        platform,
        bundleId,
        packageName,
        platformFee,
        creatorEarnings,
        ...metadata,
      }
    )

    // Create payment record in database
    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        creatorId: creatorId,
        tierName: finalTierName,
        tierPrice: paymentAmount,
        provider: selectedProvider,
        reference: paymentResult.reference,
        amount: amountMinor, // Convert to cents
        currency: finalCurrency,
        status: "pending",
        type: "subscription",
        platformFee,
        creatorEarnings,
        metadata: {
          ...paymentResult.metadata,
          platform,
          bundleId,
          packageName,
        },
      },
    })

    // Create pending subscription
    const subscription = await prisma.subscription.create({
      data: {
        fanId: session.user.id,
        creatorId: creatorId,
        tierName: finalTierName,
        tierPrice: paymentAmount,
        status: "pending",
        paymentProvider: selectedProvider,
        paymentReference: paymentResult.reference,
        paymentId: payment.id,
      },
    })

    // Update payment with subscription ID
    await prisma.payment.update({
      where: { id: payment.id },
      data: { subscriptionId: subscription.id },
    })

    // Log transaction (pending) for reconciliation
    await prisma.paymentTransaction.create({
      data: {
        paymentId: payment.id,
        provider: selectedProvider,
        type: "subscription",
        reference: paymentResult.reference,
        externalId: paymentResult.reference,
        amount: amountMinor,
        currency: finalCurrency,
        status: "pending",
        platformFee,
        creatorEarnings,
        metadata: {
          ...paymentResult.metadata,
          platform,
          bundleId,
          packageName,
        },
      },
    })

    // Prepare mobile-specific response based on provider
    let mobileResponse: any = {
      success: true,
      paymentId: payment.id,
      subscriptionId: subscription.id,
      provider: selectedProvider,
      reference: paymentResult.reference,
      platformFee,
      creatorEarnings,
    }

    // Provider-specific mobile responses
    if (selectedProvider === "STRIPE" && platform !== "web") {
      // For Stripe mobile, create PaymentIntent instead of Checkout Session
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error("STRIPE_SECRET_KEY is required")
      }

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: "2024-11-20.acacia",
      })

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(paymentAmount * 100),
        currency: finalCurrency.toLowerCase(),
        metadata: {
          userId: session.user.id,
          creatorId: creatorId,
          tierName: finalTierName,
          paymentId: payment.id,
          subscriptionId: subscription.id,
          platform,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      })

      mobileResponse.client_secret = paymentIntent.client_secret
      mobileResponse.paymentIntentId = paymentIntent.id
    } else if (selectedProvider === "PAYSTACK") {
      mobileResponse.authorization_url = paymentResult.redirectUrl
      mobileResponse.access_code = paymentResult.metadata?.accessCode
    } else if (selectedProvider === "FLUTTERWAVE") {
      mobileResponse.link = paymentResult.redirectUrl
      mobileResponse.flw_ref = paymentResult.metadata?.flwRef
    } else {
      // Fallback for web
      mobileResponse.redirectUrl = paymentResult.redirectUrl
    }

    return NextResponse.json(mobileResponse, { headers: corsHeaders })
  } catch (error: any) {
    console.error("Mobile payment initiation error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500, headers: corsHeaders }
    )
  }
}

