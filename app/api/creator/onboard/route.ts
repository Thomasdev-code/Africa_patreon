export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "creator") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (session.user.isOnboarded) {
      return NextResponse.json(
        { error: "Already onboarded" },
        { status: 400 }
      )
    }

    // Update user to mark as onboarded
    await prisma.user.update({
      where: { id: session.user.id },
      data: { isOnboarded: true },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Onboarding error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

