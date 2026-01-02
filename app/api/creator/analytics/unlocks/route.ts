export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { UnlocksAnalytics, PostUnlockStats } from "@/lib/types"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Only creators can access analytics" },
        { status: 403 }
      )
    }

    // Get all posts by this creator
    const posts = await prisma.post.findMany({
      where: {
        creatorId: session.user.id,
        isPublished: true,
        tierName: { not: null }, // Only locked posts can be unlocked
      },
      select: {
        id: true,
        title: true,
        tierName: true,
        createdAt: true,
      },
    })

    // Get unlock counts for each post
    const postIds = posts.map((p) => p.id)
    const unlocks = await prisma.postUnlock.findMany({
      where: {
        postId: { in: postIds },
      },
      select: {
        postId: true,
      },
    })

    // Count unlocks per post
    const unlockCounts: Record<string, number> = {}
    unlocks.forEach((unlock) => {
      unlockCounts[unlock.postId] = (unlockCounts[unlock.postId] || 0) + 1
    })

    // Build top posts list
    const topPosts: PostUnlockStats[] = posts
      .map((post) => ({
        postId: post.id,
        postTitle: post.title,
        unlockCount: unlockCounts[post.id] || 0,
        tierName: post.tierName,
        createdAt: post.createdAt,
      }))
      .sort((a, b) => b.unlockCount - a.unlockCount)
      .slice(0, 10) // Top 10

    // Calculate unlocks by tier
    const unlocksByTier: Record<string, number> = {}
    posts.forEach((post) => {
      if (post.tierName) {
        unlocksByTier[post.tierName] =
          (unlocksByTier[post.tierName] || 0) + (unlockCounts[post.id] || 0)
      }
    })

    const totalUnlocks = unlocks.length

    const analytics: UnlocksAnalytics = {
      totalUnlocks,
      topPosts,
      unlocksByTier,
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error("Unlocks analytics error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

