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
    const { amount, convertTo } = body // convertTo: 'discount', 'boost', etc.

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Valid amount is required" },
        { status: 400 }
      )
    }

    if (!convertTo) {
      return NextResponse.json(
        { error: "Conversion type is required" },
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

    // Mark credits as converted
    let remaining = amount
    for (const credit of availableCredits) {
      if (remaining <= 0) break

      if (credit.amount <= remaining) {
        await prisma.referralCredit.update({
          where: { id: credit.id },
          data: {
            status: "converted",
            convertedTo: convertTo,
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
            type: "conversion",
            status: "converted",
            description: `Converted to ${convertTo}`,
            convertedTo: convertTo,
          },
        })
        remaining = 0
      }
    }

    // TODO: Apply conversion benefit (discount code, boost, etc.)

    return NextResponse.json({
      success: true,
      message: `Successfully converted $${amount} credits to ${convertTo}`,
    })
  } catch (error) {
    console.error("Conversion error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

