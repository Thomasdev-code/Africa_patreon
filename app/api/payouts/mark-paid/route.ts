import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { payoutId, transactionReference } = body

    if (!payoutId) {
      return NextResponse.json(
        { error: "Payout ID is required" },
        { status: 400 }
      )
    }

    const payout = await prisma.payoutRequest.findUnique({
      where: { id: payoutId },
    })

    if (!payout) {
      return NextResponse.json(
        { error: "Payout request not found" },
        { status: 404 }
      )
    }

    if (payout.status !== "approved") {
      return NextResponse.json(
        { error: "Payout must be approved before marking as paid" },
        { status: 400 }
      )
    }

    const updatedPayout = await prisma.payoutRequest.update({
      where: { id: payoutId },
      data: {
        status: "paid",
        processedAt: new Date(),
        adminNotes: transactionReference
          ? `${payout.adminNotes || ""}\nTransaction: ${transactionReference}`.trim()
          : payout.adminNotes,
      },
    })

    return NextResponse.json({
      success: true,
      payout: {
        id: updatedPayout.id,
        status: updatedPayout.status,
        processedAt: updatedPayout.processedAt,
      },
    })
  } catch (error) {
    console.error("Mark paid error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

