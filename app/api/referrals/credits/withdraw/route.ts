export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { amount, paymentMethod, accountDetails } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid withdrawal amount" },
        { status: 400 }
      )
    }

    // Get available credits
    const availableCredits = await prisma.referralCredit.findMany({
      where: {
        userId: session.user.id,
        status: "available",
      },
    })

    const totalAvailable = availableCredits.reduce(
      (sum, c) => sum + c.amount,
      0
    )

    if (amount > totalAvailable) {
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 400 }
      )
    }

    // Mark credits as withdrawn
    let remaining = amount
    const withdrawalId = `withdrawal_${Date.now()}`

    for (const credit of availableCredits) {
      if (remaining <= 0) break

      if (credit.amount <= remaining) {
        await prisma.referralCredit.update({
          where: { id: credit.id },
          data: {
            status: "withdrawn",
            withdrawalId,
            description: `${credit.description} - Withdrawn`,
          },
        })
        remaining -= credit.amount
      } else {
        // Partial withdrawal - create new credit for remaining
        await prisma.referralCredit.update({
          where: { id: credit.id },
          data: {
            amount: credit.amount - remaining,
            description: `${credit.description} - Partial withdrawal`,
          },
        })

        await prisma.referralCredit.create({
          data: {
            userId: session.user.id,
            referralId: credit.referralId,
            amount: remaining,
            type: "withdrawal",
            status: "withdrawn",
            withdrawalId,
            description: `Withdrawal from referral credits`,
          },
        })
        remaining = 0
      }
    }

    // In production, you would:
    // 1. Create withdrawal request record
    // 2. Process payment via payment gateway
    // 3. Update status based on payment result

    return NextResponse.json({
      success: true,
      message: "Withdrawal request submitted",
      withdrawalId,
      amount,
    })
  } catch (error) {
    console.error("Credit withdrawal error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

