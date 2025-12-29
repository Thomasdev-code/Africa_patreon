import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      )
    }

    // Get post
    const post = await prisma.post.findUnique({
      where: { id: postId },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Get comments with user info
    const comments = await prisma.comment.findMany({
      where: {
        postId,
        replyToId: null, // Only top-level comments
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
        replies: {
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
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    // Format comments
    const formattedComments = comments.map((comment) => ({
      id: comment.id,
      postId: comment.postId,
      userId: comment.userId,
      replyToId: comment.replyToId,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      user: {
        id: comment.user.id,
        email: comment.user.email,
        username: comment.user.creatorProfile?.username || null,
        avatarUrl: comment.user.creatorProfile?.avatarUrl || null,
      },
      replies: comment.replies.map((reply) => ({
        id: reply.id,
        postId: reply.postId,
        userId: reply.userId,
        replyToId: reply.replyToId,
        content: reply.content,
        createdAt: reply.createdAt,
        updatedAt: reply.updatedAt,
        user: {
          id: reply.user.id,
          email: reply.user.email,
          username: reply.user.creatorProfile?.username || null,
          avatarUrl: reply.user.creatorProfile?.avatarUrl || null,
        },
      })),
    }))

    return NextResponse.json({
      comments: formattedComments,
      count: formattedComments.length,
    })
  } catch (error: any) {
    console.error("Get comments error:", error)
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}

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
        { error: "Only fans can comment on posts" },
        { status: 403 }
      )
    }

    const { postId } = await params
    const body = await req.json()
    const { text, replyToId } = body

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      )
    }

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Comment text is required" },
        { status: 400 }
      )
    }

    // Get post
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

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Check if user has active subscription to the creator (subscribers can comment)
    const subscription = await prisma.subscription.findFirst({
      where: {
        fanId: session.user.id,
        creatorId: post.creatorId,
        status: "active",
      },
    })

    if (!subscription) {
      return NextResponse.json(
        {
          error: "You must be subscribed to this creator to comment on their posts",
        },
        { status: 403 }
      )
    }

    // If this is a reply, verify the parent comment exists
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
        userId: session.user.id,
        postId: postId,
        content: text.trim(),
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

    // Notify creator if this is a top-level comment (not a reply)
    if (!replyToId && post.creatorId !== session.user.id) {
      try {
        await createNotification(
          post.creatorId,
          "comment",
          "New Comment on Your Post",
          `Someone commented on your post: "${post.title}"`,
          `/creator/${post.creator.creatorProfile?.username || ""}`
        )
      } catch (notifError) {
        console.error("Notification error:", notifError)
        // Don't fail the comment creation if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        postId: comment.postId,
        userId: comment.userId,
        replyToId: comment.replyToId,
        content: comment.content,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        user: {
          id: comment.user.id,
          email: comment.user.email,
          username: comment.user.creatorProfile?.username || null,
          avatarUrl: comment.user.creatorProfile?.avatarUrl || null,
        },
      },
    })
  } catch (error: any) {
    console.error("Create comment error:", error)
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}

