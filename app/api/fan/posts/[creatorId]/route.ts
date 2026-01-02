export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { PostPreview } from "@/lib/types"
import { parseMediaType } from "@/lib/utils"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const session = await auth()
    const { creatorId } = await params

    // Get all published posts for this creator
    const posts = await prisma.post.findMany({
      where: {
        creatorId: creatorId,
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

    // Get fan's active subscriptions to this creator (if logged in as fan)
    let activeTiers: string[] = []
    if (session?.user && session.user.role === "fan") {
      const subscriptions = await prisma.subscription.findMany({
        where: {
          fanId: session.user.id,
          creatorId: creatorId,
          status: "active",
        },
        select: {
          tierName: true,
        },
      })
      activeTiers = subscriptions.map((sub) => sub.tierName)
    }

    // Format posts with lock status
    const formattedPosts: PostPreview[] = posts.map((post) => {
      const isLocked =
        post.tierName !== null && !activeTiers.includes(post.tierName)

      return {
        id: post.id,
        title: post.title,
        content: post.content,
        mediaType: parseMediaType(post.mediaType),
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

    return NextResponse.json({
      posts: formattedPosts,
      count: formattedPosts.length,
    })
  } catch (error) {
    console.error("Fan posts fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

