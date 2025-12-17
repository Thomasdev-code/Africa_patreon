import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "creator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const provider = searchParams.get("provider")

    const payments = await prisma.payment.findMany({
      where: {
        creatorId: session.user.id,
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
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    })

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        amount: p.amount / 100, // Convert from cents
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        reference: p.reference,
        tierName: p.tierName,
        createdAt: p.createdAt,
        user: p.user,
      })),
      count: payments.length,
    })
  } catch (error) {
    console.error("Payments fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

