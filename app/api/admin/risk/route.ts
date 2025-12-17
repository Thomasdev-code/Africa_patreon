import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const profiles = await (prisma as any).amlRiskProfile.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        riskScore: "desc",
      },
      take: 100,
    })

    return NextResponse.json({
      profiles: profiles.map((p) => ({
        userId: p.userId,
        userEmail: p.user.email,
        riskScore: p.riskScore,
        monthlyLimit: p.monthlyLimit,
        dailyLimit: p.dailyLimit,
        flags: p.flags,
        lastRiskUpdate: p.lastRiskUpdate,
      })),
    })
  } catch (error: any) {
    console.error("Risk profiles fetch error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

