export const runtime = "nodejs"

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
        { error: "Only fans can unlike posts" },
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

    // Check if like exists
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId: session.user.id,
          postId: postId,
        },
      },
    })

    if (!existingLike) {
      return NextResponse.json(
        { error: "Post not liked" },
        { status: 400 }
      )
    }

    // Delete like
    await prisma.like.delete({
      where: {
        userId_postId: {
          userId: session.user.id,
          postId: postId,
        },
      },
    })

    // Get updated like count
    const likeCount = await prisma.like.count({
      where: { postId },
    })

    return NextResponse.json({
      success: true,
      liked: false,
      likeCount,
    })
  } catch (error: any) {
    console.error("Unlike error:", error)
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}

