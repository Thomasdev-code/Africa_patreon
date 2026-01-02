export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { routePayout } from "@/lib/payments/payment-router"
import { z } from "zod"

const approveSchema = z.object({
  payoutId: z.string(),
  method: z.enum(["mpesa", "bank"]).optional(),
  accountDetails: z.object({
    phoneNumber: z.string().optional(),
    accountNumber: z.string().optional(),
    bankCode: z.string().optional(),
    recipientCode: z.string().optional(),
    destination: z.string().optional(),
  }).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = approveSchema.parse(body)

    // Get payout
    const payout = await prisma.referralPayout.findUnique({
      where: { id: validated.payoutId },
      include: {
        creator: true,
        referral: true,
      },
    })

    if (!payout) {
      return NextResponse.json(
        { error: "Payout not found" },
        { status: 404 }
      )
    }

    if (payout.status !== "pending") {
      return NextResponse.json(
        { error: "Payout is not pending" },
        { status: 400 }
      )
    }

    // If method provided, process payout
    if (validated.method && validated.accountDetails) {
      const payoutResult = await routePayout({
        amount: payout.amount,
        currency: payout.currency,
        creatorId: payout.creatorId,
        method: validated.method === "mpesa" ? "mobile_money" : validated.method,
        accountDetails: validated.accountDetails,
        metadata: {
          payoutId: payout.id,
          referralId: payout.referralId,
        },
      })

      if (payoutResult.success) {
        await prisma.referralPayout.update({
          where: { id: validated.payoutId },
          data: {
            status: "paid",
            paidAt: new Date(),
          },
        })

        return NextResponse.json({
          success: true,
          payoutId: payout.id,
          provider: payoutResult.provider,
          status: payoutResult.status,
        })
      } else {
        return NextResponse.json(
          { error: payoutResult.error || "Payout processing failed" },
          { status: 500 }
        )
      }
    } else {
      // Just mark as paid (manual processing)
      await prisma.referralPayout.update({
        where: { id: validated.payoutId },
        data: {
          status: "paid",
          paidAt: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        payoutId: payout.id,
        message: "Payout marked as paid",
      })
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Approve payout error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to approve payout" },
      { status: 500 }
    )
  }
}

