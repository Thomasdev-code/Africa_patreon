import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma, executeWithReconnect } from "@/lib/prisma"
import type { PostPreview } from "@/lib/types"
import { parseMediaType } from "@/lib/utils"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> }
) {
  try {
    const { creatorId } = await params
    const session = await auth()

    if (!creatorId || typeof creatorId !== "string") {
      return NextResponse.json(
        { error: "Creator ID is required" },
        { status: 400 }
      )
    }

    // Get all published posts for this creator
    const posts = await executeWithReconnect(() =>
      prisma.post.findMany({
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
    )

    // Get user's PPV purchases if logged in
    let ppvPurchases: Set<string> = new Set()
    if (session?.user && session.user.role === "fan") {
      const purchases = await executeWithReconnect(() =>
        prisma.pPVPurchase.findMany({
          where: {
            fanId: session.user.id,
            postId: {
              in: posts.filter(p => p.isPPV).map(p => p.id),
            },
          },
          select: {
            postId: true,
          },
        })
      )
      ppvPurchases = new Set(purchases.map(p => p.postId))
    }

    // Format posts
    const formattedPosts: PostPreview[] = posts.map((post) => {
      // Determine if post is locked
      let isLocked = false
      if (post.isPPV) {
        // PPV posts are locked unless purchased
        isLocked = !ppvPurchases.has(post.id)
      } else {
        // Regular posts are locked if tierName exists
        isLocked = post.tierName !== null
      }

      return {
        id: post.id,
        title: post.title,
        content: post.content,
        mediaType: parseMediaType(post.mediaType),
        mediaUrl: post.mediaUrl,
        tierName: post.tierName,
        isLocked: isLocked,
        isPublished: post.isPublished,
        isPPV: post.isPPV,
        ppvPrice: post.ppvPrice ? post.ppvPrice / 100 : null, // Convert from cents
        ppvCurrency: post.ppvCurrency,
        hasPurchasedPPV: post.isPPV ? ppvPurchases.has(post.id) : undefined,
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
    console.error("Public posts fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

