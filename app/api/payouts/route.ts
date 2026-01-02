export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { routePayout } from "@/lib/payments/payment-router"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const payoutSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default("USD"),
  method: z.enum(["mpesa", "bank"]),
  accountDetails: z.object({
    phoneNumber: z.string().optional(),
    accountNumber: z.string().optional(),
    bankCode: z.string().optional(),
    recipientCode: z.string().optional(),
    destination: z.string().optional(),
  }),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user is a creator
    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Only creators can request payouts" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const validated = payoutSchema.parse(body)

    // Validate method-specific requirements
    if (validated.method === "mpesa" && !validated.accountDetails.phoneNumber) {
      return NextResponse.json(
        { error: "Phone number required for M-Pesa payout" },
        { status: 400 }
      )
    }

    if (validated.method === "bank" && (!validated.accountDetails.accountNumber || !validated.accountDetails.bankCode)) {
      return NextResponse.json(
        { error: "Account number and bank code required for bank transfer" },
        { status: 400 }
      )
    }


    // Get creator wallet
    const wallet = await prisma.creatorWallet.findUnique({
      where: { userId: session.user.id },
    })

    if (!wallet) {
      return NextResponse.json(
        { error: "Creator wallet not found" },
        { status: 404 }
      )
    }

    // Check available balance
    const availableBalance = wallet.availableAfterKycApproval || wallet.balance
    if (validated.amount > availableBalance) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      )
    }

    // Check KYC status
    const kyc = await prisma.kycVerification.findUnique({
      where: { userId: session.user.id },
    })

    if (!kyc || kyc.status !== "approved") {
      return NextResponse.json(
        { error: "KYC verification required before withdrawal" },
        { status: 403 }
      )
    }

    // Route payout to appropriate provider
    // Map "mpesa" to "mobile_money" for routePayout
    const payoutMethod = validated.method === "mpesa" ? "mobile_money" : validated.method
    
    const result = await routePayout({
      amount: validated.amount,
      currency: validated.currency,
      creatorId: session.user.id,
      method: payoutMethod,
      accountDetails: validated.accountDetails,
      metadata: {
        userId: session.user.id,
        email: session.user.email,
      },
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Payout failed" },
        { status: 500 }
      )
    }

    // Create payout history record
    const payoutHistory = await prisma.payoutHistory.create({
      data: {
        walletId: wallet.id,
        amount: validated.amount,
        currency: validated.currency,
        method: validated.method,
        status: result.status === "success" ? "completed" : "processing",
        providerReference: result.payoutId,
        accountDetails: validated.accountDetails,
      },
    })

    // Update wallet balance
    await prisma.creatorWallet.update({
      where: { id: wallet.id },
      data: {
        balance: wallet.balance - validated.amount,
        pendingPayouts: wallet.pendingPayouts + validated.amount,
      },
    })

    return NextResponse.json({
      success: true,
      payoutId: payoutHistory.id,
      provider: result.provider,
      status: result.status,
      metadata: result.metadata,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Payout error:", error)
    return NextResponse.json(
      { error: error.message || "Payout failed" },
      { status: 500 }
    )
  }
}

