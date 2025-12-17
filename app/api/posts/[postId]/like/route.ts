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
        { error: "Only fans can like posts" },
        { status: 403 }
      )
    }

    const { postId } = await params

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      )
    }

    // Get post and verify it exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        creator: true,
      },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Check if user is following the creator (followers can like)
    const follow = await prisma.follow.findUnique({
      where: {
        fanId_creatorId: {
          fanId: session.user.id,
          creatorId: post.creatorId,
        },
      },
    })

    if (!follow) {
      return NextResponse.json(
        {
          error: "You must follow this creator to like their posts",
        },
        { status: 403 }
      )
    }

    // Check if already liked
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId: session.user.id,
          postId: postId,
        },
      },
    })

    if (existingLike) {
      return NextResponse.json(
        { error: "Post already liked" },
        { status: 400 }
      )
    }

    // Create like
    await prisma.like.create({
      data: {
        userId: session.user.id,
        postId: postId,
      },
    })

    // Get updated like count
    const likeCount = await prisma.like.count({
      where: { postId },
    })

    return NextResponse.json({
      success: true,
      liked: true,
      likeCount,
    })
  } catch (error: any) {
    console.error("Like error:", error)

    // Handle unique constraint violation
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Post already liked" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
