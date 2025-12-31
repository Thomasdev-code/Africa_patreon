import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { CreateCreatorProfileInput } from "@/lib/types"
import { parseMembershipTiers, serializeMembershipTiers } from "@/lib/utils"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Only creators can create/update profiles" },
        { status: 403 }
      )
    }

    const body: CreateCreatorProfileInput = await req.json()
    const { username, bio, avatarUrl, bannerUrl, tiers } = body

    // Validate required fields
    if (!username || !bio || !tiers || !Array.isArray(tiers)) {
      return NextResponse.json(
        { error: "Username, bio, and tiers are required" },
        { status: 400 }
      )
    }

    // Validate username format (alphanumeric, underscore, hyphen, 3-30 chars)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        {
          error:
            "Username must be 3-30 characters and contain only letters, numbers, underscores, or hyphens",
        },
        { status: 400 }
      )
    }

    // Validate tiers
    if (tiers.length === 0) {
      return NextResponse.json(
        { error: "At least one membership tier is required" },
        { status: 400 }
      )
    }

    for (const tier of tiers) {
      if (!tier.name || typeof tier.price !== "number" || tier.price < 0) {
        return NextResponse.json(
          { error: "Each tier must have a name and a non-negative price" },
          { status: 400 }
        )
      }
    }

    // Check if username is already taken (by another user)
    const existingProfile = await prisma.creatorProfile.findUnique({
      where: { username },
    })

    if (existingProfile && existingProfile.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 400 }
      )
    }

    // Create or update profile
    const profile = await prisma.creatorProfile.upsert({
      where: { userId: session.user.id },
      update: {
        username,
        bio,
        avatarUrl: avatarUrl || null,
        bannerUrl: bannerUrl || null,
        tiers: serializeMembershipTiers(tiers),
      },
      create: {
        userId: session.user.id,
        username,
        bio,
        avatarUrl: avatarUrl || null,
        bannerUrl: bannerUrl || null,
        tiers: serializeMembershipTiers(tiers),
      },
    })

    // Mark user as onboarded if not already
    if (!session.user.isOnboarded) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { isOnboarded: true },
      })
    }

    const response = NextResponse.json(
      {
        success: true,
        profile: {
          ...profile,
          tiers: parseMembershipTiers(profile.tiers),
        },
      },
      { status: 200 }
    )

    // Add cache headers to prevent unnecessary revalidation
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
    
    return response
  } catch (error) {
    console.error("Profile creation/update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

