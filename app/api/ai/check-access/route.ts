export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { checkProAccess } from "@/lib/ai/check-pro-access"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Only creators can access AI tools" },
        { status: 403 }
      )
    }

    const access = await checkProAccess(session.user.id)

    return NextResponse.json({
      hasAccess: access.hasAccess,
      subscriptionPlan: access.subscriptionPlan,
      aiCredits: access.aiCredits,
    })
  } catch (error: any) {
    console.error("Check access error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

