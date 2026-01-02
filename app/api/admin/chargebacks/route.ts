export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")

    const where: any = {}
    if (status) {
      where.status = status
    }

    const chargebacks = await (prisma as any).chargeback.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        creator: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    })

    return NextResponse.json({
      chargebacks: chargebacks.map((cb: any) => ({
        id: cb.id,
        userId: cb.userId,
        creatorId: cb.creatorId,
        amount: cb.amount,
        currency: cb.currency,
        status: cb.status,
        reason: cb.reason,
        createdAt: cb.createdAt,
      })),
    })
  } catch (error: any) {
    console.error("Chargebacks fetch error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

