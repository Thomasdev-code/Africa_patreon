import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { CreateCommentInput } from "@/lib/types"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: CreateCommentInput = await req.json()
    const { postId, content, replyToId } = body

    if (!postId || !content || !content.trim()) {
      return NextResponse.json(
        { error: "Post ID and content are required" },
        { status: 400 }
      )
    }

    // Get post and verify access
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        creator: {
          include: {
            creatorProfile: {
              select: {
                username: true,
              },
            },
          },
        },
      },
    })

    if (!post || !post.isPublished) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Check if user has access to this post
    if (post.tierName) {
      // Post is locked - check subscription
      const subscription = await prisma.subscription.findFirst({
        where: {
          fanId: session.user.id,
          creatorId: post.creatorId,
          tierName: post.tierName,
          status: "active",
        },
      })

      if (!subscription && session.user.role !== "creator") {
        return NextResponse.json(
          { error: "You need to subscribe to comment on this post" },
          { status: 403 }
        )
      }
    }

    // If replying, verify parent comment exists
    if (replyToId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: replyToId },
      })

      if (!parentComment || parentComment.postId !== postId) {
        return NextResponse.json(
          { error: "Invalid parent comment" },
          { status: 400 }
        )
      }
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        postId,
        userId: session.user.id,
        content: content.trim(),
        replyToId: replyToId || null,
      },
      include: {
        user: {
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
    })

    // Send notification to post creator (if not the commenter)
    if (post.creatorId !== session.user.id) {
      const creatorProfile = await prisma.creatorProfile.findUnique({
        where: { userId: post.creatorId },
      })

      await prisma.notification.create({
        data: {
          userId: post.creatorId,
          type: replyToId ? "reply" : "comment",
          title: replyToId ? "New reply to your comment" : "New comment on your post",
          body: `${session.user.email} commented: ${content.substring(0, 100)}`,
          link: `/creator/${creatorProfile?.username || "unknown"}`,
        },
      })
    }

    // If replying, notify the parent comment author
    if (replyToId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: replyToId },
        include: { user: true },
      })

      if (
        parentComment &&
        parentComment.userId !== session.user.id &&
        parentComment.userId !== post.creatorId
      ) {
        await prisma.notification.create({
          data: {
            userId: parentComment.userId,
            type: "reply",
            title: "New reply to your comment",
            body: `${session.user.email} replied: ${content.substring(0, 100)}`,
            link: `/creator/${post.creator.creatorProfile?.username || "unknown"}`,
          },
        })
      }
    }

    return NextResponse.json(
      {
        success: true,
        comment: {
          ...comment,
          user: {
            id: comment.user.id,
            email: comment.user.email,
            role: comment.user.role,
            creatorProfile: comment.user.creatorProfile,
          },
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Comment creation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

