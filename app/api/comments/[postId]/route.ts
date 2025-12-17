import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { Comment } from "@/lib/types"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await auth()
    const { postId } = await params

    // Get post
    const post = await prisma.post.findUnique({
      where: { id: postId },
    })

    if (!post || !post.isPublished) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    // Check access if post is locked
    if (post.tierName && session?.user) {
      if (session.user.role !== "creator") {
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
            { error: "Access denied" },
            { status: 403 }
          )
        }
      }
    }

    // Get all comments for this post
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

    const formattedComments: Comment[] = comments.map((comment) => ({
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
        role: comment.user.role as "fan" | "creator" | "admin",
        creatorProfile: comment.user.creatorProfile
          ? {
              username: comment.user.creatorProfile.username,
              avatarUrl: comment.user.creatorProfile.avatarUrl,
            }
          : undefined,
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
          role: reply.user.role as "fan" | "creator" | "admin",
          creatorProfile: reply.user.creatorProfile
            ? {
                username: reply.user.creatorProfile.username,
                avatarUrl: reply.user.creatorProfile.avatarUrl,
              }
            : undefined,
        },
      })),
    }))

    return NextResponse.json({
      comments: formattedComments,
      count: formattedComments.length,
    })
  } catch (error) {
    console.error("Comments fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

