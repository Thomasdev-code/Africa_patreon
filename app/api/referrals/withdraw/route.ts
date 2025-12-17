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
        { error: "Valid amount is required" },
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

    // Minimum withdrawal amount (e.g., $10)
    const MIN_WITHDRAWAL = 10
    if (amount < MIN_WITHDRAWAL) {
      return NextResponse.json(
        { error: `Minimum withdrawal is $${MIN_WITHDRAWAL}` },
        { status: 400 }
      )
    }

    // Create withdrawal record
    const withdrawalId = `WD${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`

    // Mark credits as withdrawn
    let remaining = amount
    for (const credit of availableCredits) {
      if (remaining <= 0) break

      if (credit.amount <= remaining) {
        await prisma.referralCredit.update({
          where: { id: credit.id },
          data: {
            status: "withdrawn",
            withdrawalId,
          },
        })
        remaining -= credit.amount
      } else {
        // Split credit if needed
        await prisma.referralCredit.update({
          where: { id: credit.id },
          data: {
            amount: credit.amount - remaining,
          },
        })

        await prisma.referralCredit.create({
          data: {
            userId: session.user.id,
            referralId: credit.referralId,
            amount: remaining,
            type: "withdrawal",
            status: "withdrawn",
            description: `Withdrawal: ${paymentMethod}`,
            withdrawalId,
          },
        })
        remaining = 0
      }
    }

    // TODO: Process actual payment via payment provider
    // For now, just mark as withdrawn

    return NextResponse.json({
      success: true,
      withdrawalId,
      message: "Withdrawal request submitted. Processing may take 3-5 business days.",
    })
  } catch (error) {
    console.error("Withdrawal error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

