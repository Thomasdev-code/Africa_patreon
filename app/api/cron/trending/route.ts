export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { prisma, executeWithReconnect } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret (if using Vercel Cron or similar)
    const authHeader = req.headers.get("authorization")
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all creators with profiles
    const creators = await executeWithReconnect(() =>
      prisma.user.findMany({
        where: {
          role: "creator",
          creatorProfile: {
            isNot: null,
          },
        },
        include: {
          creatorProfile: true,
        },
      })
    )

    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Calculate trending score for each creator
    for (const creator of creators) {
      if (!creator.creatorProfile) continue

      // Get likes count (from last 7 days)
      const likes = await executeWithReconnect(() =>
        prisma.like.count({
          where: {
            post: {
              creatorId: creator.id,
              createdAt: { gte: oneWeekAgo },
            },
          },
        })
      )

      // Get comments count (from last 7 days)
      const comments = await executeWithReconnect(() =>
        prisma.comment.count({
          where: {
            post: {
              creatorId: creator.id,
              createdAt: { gte: oneWeekAgo },
            },
          },
        })
      )

      // Get new followers (from last 24 hours)
      const newFollowers = await executeWithReconnect(() =>
        prisma.follow.count({
          where: {
            creatorId: creator.id,
            createdAt: { gte: oneDayAgo },
          },
        })
      )

      // Get new subscribers (from last 24 hours)
      const newSubscribers = await executeWithReconnect(() =>
        prisma.subscription.count({
          where: {
            creatorId: creator.id,
            status: "active",
            startDate: { gte: oneDayAgo },
          },
        })
      )

      // Get views (approximate from post interactions - using likes as proxy)
      // In a real system, you'd track actual views
      const views = likes * 10 // Estimate views as 10x likes

      // Get recent posts count (from last 7 days)
      const recentPosts = await executeWithReconnect(() =>
        prisma.post.count({
          where: {
            creatorId: creator.id,
            isPublished: true,
            createdAt: { gte: oneWeekAgo },
          },
        })
      )

      // Get days since last post
      const lastPost = await executeWithReconnect(() =>
        prisma.post.findFirst({
          where: {
            creatorId: creator.id,
            isPublished: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            createdAt: true,
          },
        })
      )

      const daysSinceLastPost = lastPost
        ? (now.getTime() - lastPost.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        : 999

      // Calculate trending score
      // score = (likes*2) + (comments*4) + (newFollowers*6) +
      //         (newSubscribers*10) + (views*0.5) +
      //         (recentPosts*3) – (daysSinceLastPost*1.5)
      const trendingScore =
        likes * 2 +
        comments * 4 +
        newFollowers * 6 +
        newSubscribers * 10 +
        views * 0.5 +
        recentPosts * 3 -
        daysSinceLastPost * 1.5

      // Upsert CreatorStats
      await executeWithReconnect(() =>
        prisma.creatorStats.upsert({
          where: {
            creatorId: creator.id,
          },
          create: {
            creatorId: creator.id,
            trendingScore: Math.max(0, trendingScore), // Ensure non-negative
            likes,
            comments,
            newFollowers,
            newSubscribers,
            views,
            recentPosts,
            daysSinceLastPost,
            lastCalculated: now,
          },
          update: {
            trendingScore: Math.max(0, trendingScore),
            likes,
            comments,
            newFollowers,
            newSubscribers,
            views,
            recentPosts,
            daysSinceLastPost,
            lastCalculated: now,
          },
        })
      )
    }

    return NextResponse.json({
      success: true,
      message: `Updated trending scores for ${creators.length} creators`,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error("Trending score calculation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

