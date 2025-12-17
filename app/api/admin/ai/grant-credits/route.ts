import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma, executeWithReconnect } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { userId, credits } = body

    if (!userId || !credits || credits <= 0) {
      return NextResponse.json(
        { error: "Valid user ID and positive credits amount required" },
        { status: 400 }
      )
    }

    // Verify user exists and grant credits atomically
    const updated = await executeWithReconnect(() =>
      prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, aiCredits: true },
        })

        if (!user) {
          throw new Error("User not found")
        }

        // Grant credits
        return await tx.user.update({
          where: { id: userId },
          data: {
            aiCredits: {
              increment: credits,
            },
          },
          select: {
            id: true,
            email: true,
            aiCredits: true,
          },
        })
      })
    )

    return NextResponse.json({
      success: true,
      message: `Granted ${credits} credits to ${updated.email}`,
      user: {
        id: updated.id,
        email: updated.email,
        aiCredits: updated.aiCredits,
      },
    })
  } catch (error: any) {
    console.error("Grant credits error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to grant credits" },
      { status: 500 }
    )
  }
}

