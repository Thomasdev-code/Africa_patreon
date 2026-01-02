export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { prisma, executeWithReconnect } from "@/lib/prisma"
import { parseMembershipTiers } from "@/lib/utils"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params

    if (!username || typeof username !== "string") {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      )
    }

    const profile = await executeWithReconnect(() =>
      prisma.creatorProfile.findUnique({
        where: { username },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              createdAt: true,
              isBanned: true,
              isApproved: true,
              isOnboarded: true,
            },
          },
        },
      })
    )

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Check if creator is banned or not approved
    if (profile.user.isBanned || !profile.user.isApproved || !profile.user.isOnboarded) {
      return NextResponse.json(
        { error: "Profile not available" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        username: profile.username,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        bannerUrl: profile.bannerUrl,
        tiers: parseMembershipTiers(profile.tiers),
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        user: {
          id: profile.user.id,
          createdAt: profile.user.createdAt,
        },
      },
    })
  } catch (error: any) {
    console.error("Profile fetch error:", error)
    
    // Check if it's a connection error that couldn't be recovered
    const isConnectionError =
      error?.code === "P1001" ||
      error?.message?.includes("Closed") ||
      error?.kind === "Closed" ||
      error?.cause === null
    
    if (isConnectionError) {
      return NextResponse.json(
        { 
          error: "Database connection error. Please try again in a moment.",
          retry: true 
        },
        { status: 503 } // Service Unavailable
      )
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

