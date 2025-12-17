import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const username = searchParams.get("username")

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      )
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        {
          available: false,
          error:
            "Username must be 3-30 characters and contain only letters, numbers, underscores, or hyphens",
        },
        { status: 200 }
      )
    }

    // Check if username exists
    const existing = await prisma.creatorProfile.findUnique({
      where: { username },
    })

    // If user is logged in and it's their own username, it's available
    const session = await auth()
    if (existing && session?.user) {
      const profile = await prisma.creatorProfile.findUnique({
        where: { userId: session.user.id },
      })
      if (profile?.username === username) {
        return NextResponse.json({ available: true })
      }
    }

    return NextResponse.json({
      available: !existing,
    })
  } catch (error) {
    console.error("Username check error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

