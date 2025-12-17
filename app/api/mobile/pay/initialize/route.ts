import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { startOneTimePayment, startMpesaPayment } from "@/lib/payments/payment-router"
import { performFraudChecks } from "@/lib/payments/fraud"
import { calculateTax } from "@/lib/tax/tax-engine"
import { z } from "zod"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

const initializeSchema = z.object({
  provider: z.enum(["STRIPE", "PAYSTACK", "FLUTTERWAVE", "MPESA"]).optional(),
  amount: z.number().positive(),
  currency: z.string().default("USD"),
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

    // Fraud checks
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || ""
    const fraudCheck = await performFraudChecks({
      userId: session.user.id,
      creatorId: validated.creatorId,
      amount,
      currency: validated.currency,
      provider: validated.provider || "STRIPE",
      phoneNumber: validated.phoneNumber,
      ipAddress,
    })

    if (!fraudCheck.allowed) {
      return NextResponse.json(
        { error: fraudCheck.reason || "Payment blocked by fraud check" },
        { status: 403, headers: corsHeaders }
      )
    }

    // Calculate tax
    const taxCalculation = validated.country
      ? calculateTax(amount, validated.country)
      : { taxRate: 0, taxAmount: 0, totalAmount: amount, countryCode: "", taxType: "NONE" }

    // Handle M-Pesa separately
    if (validated.provider === "MPESA") {
      if (!validated.phoneNumber) {
        return NextResponse.json(
          { error: "Phone number required for M-Pesa" },
          { status: 400, headers: corsHeaders }
        )
      }

      const mpesaResult = await startMpesaPayment({
        amount: taxCalculation.totalAmount,
        currency: validated.currency,
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
          currency: validated.currency,
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

    // Regular payment flow
    const paymentResult = await startOneTimePayment({
      amount: taxCalculation.totalAmount,
      currency: validated.currency,
      userId: session.user.id,
      creatorId: validated.creatorId,
      tierId: tier.id,
      tierName: tier.name,
      country: validated.country,
      providerPreference: validated.provider ? [validated.provider] : undefined,
      metadata: {
        email: session.user.email,
        platform: validated.platform,
        taxAmount: taxCalculation.taxAmount,
        taxRate: taxCalculation.taxRate,
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
        currency: validated.currency,
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

    // Provider-specific fields
    if (paymentResult.provider === "STRIPE" && paymentResult.clientSecret) {
      response.client_secret = paymentResult.clientSecret
      response.payment_intent_id = paymentResult.reference
    } else if (paymentResult.provider === "PAYSTACK") {
      response.authorization_url = paymentResult.redirectUrl
      response.access_code = paymentResult.accessCode
    } else if (paymentResult.provider === "FLUTTERWAVE") {
      response.link = paymentResult.redirectUrl
      response.flw_ref = paymentResult.flwRef
    } else {
      response.redirect_url = paymentResult.redirectUrl
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

