import { NextRequest, NextResponse } from "next/server"
import { prisma, executeWithReconnect } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "20")

    // Get trending creators sorted by trendingScore
    const trendingCreators = await executeWithReconnect(() =>
      prisma.creatorStats.findMany({
        where: {
          trendingScore: { gt: 0 },
        },
        include: {
          creator: {
            include: {
              creatorProfile: {
                select: {
                  id: true,
                  username: true,
                  bio: true,
                  avatarUrl: true,
                  bannerUrl: true,
                },
              },
            },
          },
        },
        orderBy: {
          trendingScore: "desc",
        },
        take: limit,
      })
    )

    // Format response
    const formatted = trendingCreators
      .filter((stat) => stat.creator.creatorProfile)
      .map((stat) => ({
        id: stat.creator.id,
        username: stat.creator.creatorProfile!.username,
        bio: stat.creator.creatorProfile!.bio,
        avatarUrl: stat.creator.creatorProfile!.avatarUrl,
        bannerUrl: stat.creator.creatorProfile!.bannerUrl,
        trendingScore: stat.trendingScore,
        stats: {
          likes: stat.likes,
          comments: stat.comments,
          newFollowers: stat.newFollowers,
          newSubscribers: stat.newSubscribers,
          recentPosts: stat.recentPosts,
        },
      }))

    const response = NextResponse.json({
      creators: formatted,
      count: formatted.length,
    })

    // Add cache headers to reduce repeated requests
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=60, stale-while-revalidate=300"
    )
    response.headers.set("CDN-Cache-Control", "public, s-maxage=60")
    response.headers.set("Vercel-CDN-Cache-Control", "public, s-maxage=60")

    return response
  } catch (error) {
    console.error("Trending creators fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

