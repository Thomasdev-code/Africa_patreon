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
    const provider = searchParams.get("provider")
    const limit = parseInt(searchParams.get("limit") || "100")

    const payments = await prisma.payment.findMany({
      where: {
        ...(status && { status: status.toLowerCase() }),
        ...(provider && { provider: provider.toUpperCase() }),
      },
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
            creatorProfile: {
              select: {
                username: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    })

    // Calculate totals
    const totals = await prisma.payment.groupBy({
      by: ["provider", "status"],
      where: {
        ...(status && { status: status.toLowerCase() }),
        ...(provider && { provider: provider.toUpperCase() }),
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    })

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount / 100,
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        reference: p.reference,
        tierName: p.tierName,
        createdAt: p.createdAt,
        user: p.user,
        creator: p.creator,
      })),
      totals: totals.map((t) => ({
        provider: t.provider,
        status: t.status,
        totalAmount: (t._sum.amount || 0) / 100,
        count: t._count.id,
      })),
      count: payments.length,
    })
  } catch (error) {
    console.error("Admin payments fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

