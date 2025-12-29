import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { parseMembershipTiers } from "@/lib/utils"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Only creators can access this endpoint" },
        { status: 403 }
      )
    }

    let profile
    try {
      profile = await prisma.creatorProfile.findUnique({
        where: { userId: session.user.id },
      })
    } catch (prismaError: any) {
      console.error("Prisma query error:", {
        code: prismaError?.code,
        message: prismaError?.message,
        meta: prismaError?.meta,
        stack: prismaError?.stack,
      })
      throw prismaError
    }

    if (!profile) {
      return NextResponse.json({ profile: null })
    }

    return NextResponse.json({
      profile: {
        ...profile,
        tiers: parseMembershipTiers(profile.tiers),
      },
    })
  } catch (error: any) {
    console.error("Profile fetch error:", error)
    
    // Handle Prisma connection errors
    if (error?.code === "P1001") {
      return NextResponse.json(
        {
          error: "Database connection error. Please try again in a moment.",
          code: "DATABASE_CONNECTION_ERROR",
        },
        { status: 503 }
      )
    }
    
    // Handle Prisma query errors
    if (error?.code?.startsWith("P")) {
      return NextResponse.json(
        {
          error: "Database error occurred",
          code: error.code,
          message: error.message,
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}

