import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "creator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { amount, method, accountDetails } = body

    if (!amount || !method || !accountDetails) {
      return NextResponse.json(
        { error: "Amount, method, and account details are required" },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      )
    }

    // Calculate available balance
    const payments = await prisma.payment.findMany({
      where: {
        creatorId: session.user.id,
        status: "success",
      },
    })

    const totalEarnings = payments.reduce(
      (sum, p) => sum + p.amount / 100,
      0
    )

    const pendingPayouts = await prisma.payoutRequest.findMany({
      where: {
        creatorId: session.user.id,
        status: { in: ["pending", "approved"] },
      },
    })

    const totalPending = pendingPayouts.reduce((sum, p) => sum + p.amount, 0)

    const availableBalance = totalEarnings - totalPending

    if (amount > availableBalance) {
      return NextResponse.json(
        {
          error: `Insufficient balance. Available: $${availableBalance.toFixed(2)}`,
        },
        { status: 400 }
      )
    }

    // Validate account details based on method
    if (method === "mpesa" && !accountDetails.phoneNumber) {
      return NextResponse.json(
        { error: "Phone number is required for M-Pesa" },
        { status: 400 }
      )
    }

    if (method === "bank") {
      if (!accountDetails.accountNumber || !accountDetails.bankName) {
        return NextResponse.json(
          { error: "Account number and bank name are required" },
          { status: 400 }
        )
      }
    }

    // Create payout request
    const payoutRequest = await prisma.payoutRequest.create({
      data: {
        creatorId: session.user.id,
        amount: amount,
        method: method,
        accountDetails: accountDetails,
        status: "pending",
      },
    })

    return NextResponse.json({
      success: true,
      payoutRequest: {
        id: payoutRequest.id,
        amount: payoutRequest.amount,
        method: payoutRequest.method,
        status: payoutRequest.status,
        createdAt: payoutRequest.createdAt,
      },
    })
  } catch (error) {
    console.error("Payout request error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

