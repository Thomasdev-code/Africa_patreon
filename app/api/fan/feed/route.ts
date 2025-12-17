import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { PostPreview } from "@/lib/types"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "fan") {
      return NextResponse.json(
        { error: "Only fans can access this endpoint" },
        { status: 403 }
      )
    }

    // Get fan's active subscriptions
    const subscriptions = await prisma.subscription.findMany({
      where: {
        fanId: session.user.id,
        status: "active",
      },
      select: {
        creatorId: true,
        tierName: true,
      },
    })

    if (subscriptions.length === 0) {
      return NextResponse.json({
        posts: [],
        count: 0,
      })
    }

    const creatorIds = [...new Set(subscriptions.map((sub) => sub.creatorId))]
    const subscriptionMap = new Map<string, string[]>()
    subscriptions.forEach((sub) => {
      if (!subscriptionMap.has(sub.creatorId)) {
        subscriptionMap.set(sub.creatorId, [])
      }
      subscriptionMap.get(sub.creatorId)!.push(sub.tierName)
    })

    // Get all published posts from subscribed creators
    const posts = await prisma.post.findMany({
      where: {
        creatorId: { in: creatorIds },
        isPublished: true,
      },
      include: {
        creator: {
          include: {
            creatorProfile: {
              select: {
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Format posts with lock status - only show unlocked posts
    const formattedPosts: PostPreview[] = posts
      .map((post) => {
        const activeTiers = subscriptionMap.get(post.creatorId) || []
        const isLocked =
          post.tierName !== null && !activeTiers.includes(post.tierName)

        return {
          id: post.id,
          title: post.title,
          content: post.content,
          mediaType: post.mediaType,
          mediaUrl: post.mediaUrl,
          tierName: post.tierName,
          isLocked: isLocked,
          isPublished: post.isPublished,
          createdAt: post.createdAt,
          creator: post.creator.creatorProfile
            ? {
                id: post.creator.id,
                username: post.creator.creatorProfile.username,
                avatarUrl: post.creator.creatorProfile.avatarUrl,
              }
            : undefined,
        }
      })
      .filter((post) => !post.isLocked) // Only return unlocked posts in feed

    return NextResponse.json({
      posts: formattedPosts,
      count: formattedPosts.length,
    })
  } catch (error) {
    console.error("Fan feed error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

