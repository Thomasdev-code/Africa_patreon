import { NextRequest, NextResponse } from "next/server"
import { prisma, executeWithReconnect } from "@/lib/prisma"
import { parseMembershipTiers } from "@/lib/utils"

export async function GET(req: NextRequest) {
  try {
    // Get all creators with public profiles
    const creators = await executeWithReconnect(() =>
      prisma.user.findMany({
      where: {
        role: "creator",
        isBanned: false,
        isApproved: true,
        isOnboarded: true,
        creatorProfile: {
          isNot: null,
        },
      },
      include: {
        creatorProfile: {
          select: {
            id: true,
            username: true,
            bio: true,
            avatarUrl: true,
            bannerUrl: true,
            tiers: true,
          },
        },
        _count: {
          select: {
            creatorFollows: true,
            posts: {
              where: {
                isPublished: true,
              },
            },
          },
        },
      },
      orderBy: {
        creatorFollows: {
          _count: "desc",
        },
      },
      })
    )

    // Format creators for public display
    const formattedCreators = creators
      .filter((user) => user.creatorProfile !== null)
      .map((user) => ({
        id: user.creatorProfile!.id,
        username: user.creatorProfile!.username,
        bio: user.creatorProfile!.bio,
        avatarUrl: user.creatorProfile!.avatarUrl,
        bannerUrl: user.creatorProfile!.bannerUrl,
        tiers: parseMembershipTiers(user.creatorProfile!.tiers),
        followerCount: user._count.creatorFollows,
        postCount: user._count.posts,
      }))

    return NextResponse.json({
      creators: formattedCreators,
      count: formattedCreators.length,
    })
  } catch (error) {
    console.error("Public creators fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

