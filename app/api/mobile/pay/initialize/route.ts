export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { startOneTimePayment, startMpesaPayment } from "@/lib/payments/payment-router"
import { performFraudChecks } from "@/lib/payments/fraud"
import { calculateTax } from "@/lib/tax/tax-engine"
import { resolvePaystackCurrency, type PaystackCurrency } from "@/lib/payments/currency"
import { normalizeCountry } from "@/lib/payments"
import { z } from "zod"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

const initializeSchema = z.object({
  provider: z.enum(["PAYSTACK", "MPESA"]).optional().default("PAYSTACK"),
  amount: z.number().positive(),
  currency: z.string().optional(), // Optional - will be resolved server-side
  creatorId: z.string(),
  tierId: z.string().optional(),
  tierName: z.string(),
  country: z.string().optional(),
  phoneNumber: z.string().optional(), // Required for M-Pesa
  platform: z.enum(["web", "flutter", "react-native"]).default("web"),
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
    const validated = initializeSchema.parse(body)

    // Get creator and tier
    const creator = await prisma.user.findUnique({
      where: { id: validated.creatorId },
      include: { creatorProfile: true },
    })

    if (!creator || !creator.creatorProfile) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404, headers: corsHeaders }
      )
    }

    const tiers = creator.creatorProfile.tiers as any[]
    const tier = validated.tierId
      ? tiers.find((t: any) => t.id === validated.tierId)
      : tiers.find((t: any) => t.name === validated.tierName)

    if (!tier) {
      return NextResponse.json(
        { error: "Tier not found" },
        { status: 404, headers: corsHeaders }
      )
    }

    const amount = validated.amount || tier.price
    
    // CRITICAL: Always use KES for Kenya-based Paystack accounts
    const normalizedCountry = normalizeCountry(validated.country || "KE")
    const finalCurrency: PaystackCurrency = "KES"
    
    // Convert amount to KES if needed
    // Approximate rate: 1 USD ≈ 130 KES
    const convertedAmount = validated.currency === "KES"
      ? amount
      : amount * (validated.currency === "USD" ? 130 : validated.currency === "NGN" ? 130/1500 : validated.currency === "GHS" ? 130/12 : validated.currency === "ZAR" ? 130/18.5 : 130)

    // Calculate tax (needed for both MPESA and PAYSTACK paths)
    const taxCalculation = normalizedCountry
      ? calculateTax(convertedAmount, normalizedCountry)
      : { taxRate: 0, taxAmount: 0, totalAmount: convertedAmount, countryCode: "", taxType: "NONE" }

    // Narrow provider type and handle MPESA early
    const provider = validated.provider ?? "PAYSTACK"
    
    // Handle M-Pesa separately (before fraud checks)
    if (provider === "MPESA") {
      if (!validated.phoneNumber) {
        return NextResponse.json(
          { error: "Phone number required for M-Pesa" },
          { status: 400, headers: corsHeaders }
        )
      }

      const mpesaResult = await startMpesaPayment({
        amount: taxCalculation.totalAmount,
        currency: finalCurrency, // Use resolved currency
        phoneNumber: validated.phoneNumber,
        userId: session.user.id,
        creatorId: validated.creatorId,
        tierId: tier.id,
        tierName: tier.name,
        metadata: {
          email: session.user.email,
          platform: validated.platform,
          taxAmount: taxCalculation.taxAmount,
          taxRate: taxCalculation.taxRate,
          paystackCurrency: finalCurrency, // Store resolved currency
        },
      })

      if (!mpesaResult.success) {
        return NextResponse.json(
          { error: mpesaResult.error || "M-Pesa payment failed" },
          { status: 500, headers: corsHeaders }
        )
      }

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          userId: session.user.id,
          creatorId: validated.creatorId,
          tierName: tier.name,
          tierPrice: amount,
          provider: mpesaResult.provider,
          reference: mpesaResult.reference,
          amount: Math.round(taxCalculation.totalAmount * 100),
          currency: finalCurrency, // Use resolved currency
          status: mpesaResult.status === "success" ? "success" : "pending",
          metadata: {
            ...mpesaResult.metadata,
            platform: validated.platform,
            taxAmount: taxCalculation.taxAmount,
            taxRate: taxCalculation.taxRate,
            countryCode: validated.country,
          },
        },
      })

      return NextResponse.json(
        {
          success: true,
          paymentId: payment.id,
          provider: mpesaResult.provider,
          reference: mpesaResult.reference,
          status: mpesaResult.status,
          message:
            mpesaResult.status === "success"
              ? "Payment successful"
              : "Please check your phone to complete payment",
        },
        { headers: corsHeaders }
      )
    }

    // Fraud checks for PAYSTACK (after narrowing provider type)
    if (provider !== "PAYSTACK") {
      return NextResponse.json(
        { error: "Invalid provider. Only PAYSTACK is supported after MPESA handling." },
        { status: 400, headers: corsHeaders }
      )
    }

    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || ""
    const fraudCheck = await performFraudChecks({
      userId: session.user.id,
      creatorId: validated.creatorId,
      amount: convertedAmount,
      currency: finalCurrency,
      provider: provider,
      phoneNumber: validated.phoneNumber,
      ipAddress,
    })

    if (!fraudCheck.allowed) {
      return NextResponse.json(
        { error: fraudCheck.reason || "Payment blocked by fraud check" },
        { status: 403, headers: corsHeaders }
      )
    }

    // Defensive logging
    console.info("[MOBILE_PAY_INITIALIZE]", {
      userId: session.user.id,
      creatorId: validated.creatorId,
      currency: finalCurrency,
      provider: provider,
      amountInMinor: Math.round(taxCalculation.totalAmount * 100),
      country: normalizedCountry,
    })

    // Regular payment flow
    const paymentResult = await startOneTimePayment({
      amount: taxCalculation.totalAmount,
      currency: finalCurrency, // Use resolved currency
      userId: session.user.id,
      creatorId: validated.creatorId,
      tierId: tier.id,
      tierName: tier.name,
      country: normalizedCountry,
      providerPreference: provider === "PAYSTACK" ? ["PAYSTACK"] : undefined,
      metadata: {
        email: session.user.email,
        platform: validated.platform,
        taxAmount: taxCalculation.taxAmount,
        taxRate: taxCalculation.taxRate,
        paystackCurrency: finalCurrency, // Store resolved currency
      },
    })

    if (!paymentResult.success) {
      return NextResponse.json(
        { error: paymentResult.error || "Payment initialization failed" },
        { status: 500, headers: corsHeaders }
      )
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        creatorId: validated.creatorId,
        tierName: tier.name,
        tierPrice: amount,
        provider: paymentResult.provider,
        reference: paymentResult.reference,
        amount: Math.round(taxCalculation.totalAmount * 100),
        currency: finalCurrency, // Use resolved currency
        status: "pending",
        metadata: {
          ...paymentResult.metadata,
          platform: validated.platform,
          taxAmount: taxCalculation.taxAmount,
          taxRate: taxCalculation.taxRate,
          countryCode: validated.country,
        },
      },
    })

    // Mobile-friendly response
    const response: any = {
      success: true,
      paymentId: payment.id,
      provider: paymentResult.provider,
      reference: paymentResult.reference,
    }

    // Provider-specific fields (PAYSTACK only)
    if (paymentResult.provider === "PAYSTACK") {
      response.authorization_url = paymentResult.redirectUrl
      response.access_code = paymentResult.accessCode
    }

    return NextResponse.json(response, { headers: corsHeaders })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400, headers: corsHeaders }
      )
    }

    console.error("Mobile payment initialization error:", error)
    return NextResponse.json(
      { error: error.message || "Payment initialization failed" },
      { status: 500, headers: corsHeaders }
    )
  }
}

