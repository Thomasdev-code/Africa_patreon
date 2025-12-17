import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ postId: string; commentId: string }>
  }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { postId, commentId } = await params

    if (!postId || !commentId) {
      return NextResponse.json(
        { error: "Post ID and Comment ID are required" },
        { status: 400 }
      )
    }

    // Get comment
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        post: true,
      },
    })

    if (!comment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      )
    }

    if (comment.postId !== postId) {
      return NextResponse.json(
        { error: "Comment does not belong to this post" },
        { status: 400 }
      )
    }

    // Check permissions: user can delete their own comment, creator can delete any comment on their post
    const isOwner = comment.userId === session.user.id
    const isCreator =
      session.user.role === "creator" &&
      comment.post.creatorId === session.user.id

    if (!isOwner && !isCreator) {
      return NextResponse.json(
        { error: "You don't have permission to delete this comment" },
        { status: 403 }
      )
    }

    // Delete comment (replies will be cascade deleted)
    await prisma.comment.delete({
      where: { id: commentId },
    })

    return NextResponse.json({
      success: true,
      message: "Comment deleted successfully",
    })
  } catch (error: any) {
    console.error("Delete comment error:", error)
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}

