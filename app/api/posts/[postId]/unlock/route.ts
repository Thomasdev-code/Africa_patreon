import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "fan") {
      return NextResponse.json(
        { error: "Only fans can unlock posts" },
        { status: 403 }
      )
    }

    const { postId } = await params

    // Get post
    const post = await prisma.post.findUnique({
      where: { id: postId },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Check if fan has active subscription to the required tier
    if (post.tierName) {
      const subscription = await prisma.subscription.findFirst({
        where: {
          fanId: session.user.id,
          creatorId: post.creatorId,
          tierName: post.tierName,
          status: "active",
        },
      })

      if (!subscription) {
        return NextResponse.json(
          { error: "Subscription required to unlock this post" },
          { status: 403 }
        )
      }
    }

    // Check if already unlocked
    const existing = await prisma.postUnlock.findUnique({
      where: {
        fanId_postId: {
          fanId: session.user.id,
          postId: postId,
        },
      },
    })

    if (existing) {
      return NextResponse.json({ success: true, alreadyUnlocked: true })
    }

    // Create unlock record
    await prisma.postUnlock.create({
      data: {
        fanId: session.user.id,
        postId: postId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Post unlock tracking error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

