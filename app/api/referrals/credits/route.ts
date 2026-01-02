export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { ReferralCredit } from "@/lib/types"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") // optional filter

    const where: any = { userId: session.user.id }
    if (status) {
      where.status = status
    }

    const credits = await prisma.referralCredit.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: 100, // Limit to 100 most recent
    })

    const formattedCredits: ReferralCredit[] = credits.map((c) => ({
      id: c.id,
      userId: c.userId,
      referralId: c.referralId,
      amount: c.amount,
      type: c.type as
        | "signup"
        | "subscription"
        | "bonus"
        | "withdrawal"
        | "conversion",
      status: c.status as
        | "pending"
        | "available"
        | "withdrawn"
        | "converted",
      description: c.description,
      withdrawalId: c.withdrawalId,
      convertedTo: c.convertedTo,
      createdAt: c.createdAt,
    }))

    // Calculate totals
    const totals = {
      total: formattedCredits.reduce((sum, c) => sum + c.amount, 0),
      available: formattedCredits
        .filter((c) => c.status === "available")
        .reduce((sum, c) => sum + c.amount, 0),
      pending: formattedCredits
        .filter((c) => c.status === "pending")
        .reduce((sum, c) => sum + c.amount, 0),
      withdrawn: formattedCredits
        .filter((c) => c.status === "withdrawn")
        .reduce((sum, c) => sum + c.amount, 0),
    }

    return NextResponse.json({
      credits: formattedCredits,
      totals,
    })
  } catch (error) {
    console.error("Credits fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

