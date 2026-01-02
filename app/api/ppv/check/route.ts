export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma, executeWithReconnect } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const postId = searchParams.get("postId")

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      )
    }

    // Get post details
    const post = await executeWithReconnect(() =>
      prisma.post.findUnique({
        where: { id: postId },
        include: {
          creator: {
            include: {
              creatorProfile: true,
            },
          },
        },
      })
    )

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // If post is not PPV, return unlocked
    if (!post.isPPV) {
      return NextResponse.json({
        hasPurchased: true,
        isUnlocked: true,
        reason: "not_ppv",
      })
    }

    // Check if user has active subscription to creator (auto-unlock)
    if (session.user.role === "fan") {
      const subscription = await executeWithReconnect(() =>
        prisma.subscription.findFirst({
          where: {
            fanId: session.user.id,
            creatorId: post.creatorId,
            status: "active",
          },
        })
      )

      if (subscription) {
        return NextResponse.json({
          hasPurchased: true,
          isUnlocked: true,
          reason: "subscription",
        })
      }
    }

    // Check if user has purchased this PPV post
    const purchase = await executeWithReconnect(() =>
      prisma.pPVPurchase.findUnique({
        where: {
          fanId_postId: {
            fanId: session.user.id,
            postId: postId,
          },
        },
      })
    )

    return NextResponse.json({
      hasPurchased: !!purchase,
      isUnlocked: !!purchase,
      reason: purchase ? "purchased" : "not_purchased",
      post: {
        id: post.id,
        title: post.title,
        isPPV: post.isPPV,
        ppvPrice: post.ppvPrice,
        ppvCurrency: post.ppvCurrency,
      },
    })
  } catch (error: any) {
    console.error("PPV check error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

