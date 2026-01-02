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

    const requests = await prisma.payoutRequest.findMany({
      where: status ? { status: status.toLowerCase() } : undefined,
      include: {
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
    })

    return NextResponse.json({
      requests: requests.map((r) => ({
        id: r.id,
        amount: r.amount,
        method: r.method,
        status: r.status,
        accountDetails: r.accountDetails,
        adminNotes: r.adminNotes,
        createdAt: r.createdAt,
        processedAt: r.processedAt,
        creator: r.creator,
      })),
      count: requests.length,
    })
  } catch (error) {
    console.error("Payout requests fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

