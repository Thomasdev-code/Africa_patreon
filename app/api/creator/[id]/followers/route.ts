import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma, executeWithReconnect } from "@/lib/prisma"

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: "Creator id is required" }, { status: 400 })
    }

    // Anyone can see follower count; admins/creators may later get more detail.
    const count = await executeWithReconnect(() =>
      prisma.follow.count({
        where: { creatorId: id },
      })
    )

    return NextResponse.json({ count })
  } catch (error) {
    console.error("Followers count error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


