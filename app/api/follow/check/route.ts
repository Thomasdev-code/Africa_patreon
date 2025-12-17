import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ isFollowing: false })
    }

    const { searchParams } = new URL(req.url)
    const creatorId = searchParams.get("creatorId")

    if (!creatorId) {
      return NextResponse.json(
        { error: "creatorId is required" },
        { status: 400 }
      )
    }

    if (session.user.role !== "fan") {
      return NextResponse.json({ isFollowing: false })
    }

    const follow = await prisma.follow.findUnique({
      where: {
        fanId_creatorId: {
          fanId: session.user.id,
          creatorId,
        },
      },
    })

    return NextResponse.json({ isFollowing: !!follow })
  } catch (error) {
    console.error("Follow check error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


