import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { UpdatePostInput } from "@/lib/types"
import { parseMembershipTiers } from "@/lib/utils"

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Only creators can update posts" },
        { status: 403 }
      )
    }

    const { id } = await params
    const body: UpdatePostInput = await req.json()

    // Get post and verify ownership
    const post = await prisma.post.findUnique({
      where: { id },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    if (post.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only update your own posts" },
        { status: 403 }
      )
    }

    // If tierName is being updated, validate it exists in creator's tiers
    if (body.tierName !== undefined && body.tierName !== null) {
      const creatorProfile = await prisma.creatorProfile.findUnique({
        where: { userId: session.user.id },
      })

      if (creatorProfile) {
        const tiers = parseMembershipTiers(creatorProfile.tiers)
        const tierExists = tiers.some((tier) => tier.name === body.tierName)

        if (!tierExists) {
          return NextResponse.json(
            { error: `Tier "${body.tierName}" does not exist in your profile` },
            { status: 400 }
          )
        }
      }
    }

    // Validate PPV fields if being updated
    if (body.isPPV !== undefined) {
      if (body.isPPV) {
        if (body.ppvPrice === undefined || body.ppvPrice === null || body.ppvPrice <= 0) {
          return NextResponse.json(
            { error: "PPV price must be greater than 0" },
            { status: 400 }
          )
        }
        // PPV posts cannot have tier restrictions
        if (body.tierName !== undefined && body.tierName !== null) {
          return NextResponse.json(
            { error: "PPV posts cannot have tier restrictions. Use either PPV or tier, not both." },
            { status: 400 }
          )
        }
      }
    }

    // Auto-detect media type from URL if not provided
    let detectedMediaType = body.mediaType
    if (!detectedMediaType && body.mediaUrl) {
      const urlLower = body.mediaUrl.toLowerCase()
      if (urlLower.match(/\.(mp3|wav|aac|m4a|ogg|flac)$/i)) {
        detectedMediaType = "audio"
      } else if (urlLower.match(/\.(mp4|webm|mov|avi)$/i)) {
        detectedMediaType = "video"
      } else if (urlLower.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        detectedMediaType = "image"
      }
    }

    // Update post
    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title.trim() }),
        ...(body.content && { content: body.content.trim() }),
        ...(detectedMediaType !== undefined && { mediaType: detectedMediaType }),
        ...(body.mediaUrl !== undefined && {
          mediaUrl: body.mediaUrl?.trim() || null,
        }),
        ...(body.isPPV !== undefined && { isPPV: body.isPPV }),
        ...(body.isPPV !== undefined && body.isPPV && body.ppvPrice !== undefined && body.ppvPrice !== null && body.ppvPrice > 0 && {
          ppvPrice: Math.round(body.ppvPrice * 100), // Convert to cents
        }),
        ...(body.isPPV !== undefined && body.isPPV && body.ppvCurrency !== undefined && {
          ppvCurrency: body.ppvCurrency,
        }),
        ...(body.isPPV !== undefined && !body.isPPV && {
          ppvPrice: null,
          ppvCurrency: null,
        }),
        ...(body.tierName !== undefined && { 
          tierName: body.isPPV ? null : (body.tierName || null) // PPV posts don't have tier restrictions
        }),
        ...(body.isPublished !== undefined && { isPublished: body.isPublished }),
      },
    })

    // If post is being published and has a tier, send notifications
    if (body.isPublished && !post.isPublished && updatedPost.tierName) {
      fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/notifications/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: updatedPost.id }),
      }).catch((err) => console.error("Notification send error:", err))
    }

    return NextResponse.json({
      success: true,
      post: updatedPost,
    })
  } catch (error) {
    console.error("Post update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Only creators can delete posts" },
        { status: 403 }
      )
    }

    const { id } = await params

    // Get post and verify ownership
    const post = await prisma.post.findUnique({
      where: { id },
    })

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    if (post.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only delete your own posts" },
        { status: 403 }
      )
    }

    // Delete post
    await prisma.post.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: "Post deleted successfully",
    })
  } catch (error) {
    console.error("Post deletion error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

