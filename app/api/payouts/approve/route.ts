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
    const { payoutId, action, adminNotes } = body

    if (!payoutId || !action) {
      return NextResponse.json(
        { error: "Payout ID and action are required" },
        { status: 400 }
      )
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'approve' or 'reject'" },
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

    if (payout.status !== "pending") {
      return NextResponse.json(
        { error: `Payout is already ${payout.status}` },
        { status: 400 }
      )
    }

    const updatedPayout = await prisma.payoutRequest.update({
      where: { id: payoutId },
      data: {
        status: action === "approve" ? "approved" : "rejected",
        adminNotes: adminNotes || undefined,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      payout: {
        id: updatedPayout.id,
        status: updatedPayout.status,
        adminNotes: updatedPayout.adminNotes,
      },
    })
  } catch (error) {
    console.error("Payout approval error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

