export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { CreatePostInput } from "@/lib/types"
import { parseMembershipTiers } from "@/lib/utils"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const creatorId = searchParams.get("creatorId")

    // If creatorId is provided, return public posts for that creator
    if (creatorId) {
      const posts = await prisma.post.findMany({
        where: {
          creatorId: creatorId,
          isPublished: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })

      return NextResponse.json({
        posts,
        count: posts.length,
      })
    }

    // Otherwise, return posts for logged-in creator
    const session = await auth()
    if (!session?.user || session.user.role !== "creator") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const posts = await prisma.post.findMany({
      where: {
        creatorId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({
      posts,
      count: posts.length,
    })
  } catch (error) {
    console.error("Posts fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Only creators can create posts" },
        { status: 403 }
      )
    }

    const body: CreatePostInput = await req.json()
    const { 
      title, 
      content, 
      mediaType, 
      mediaUrl, 
      tierName, 
      isPublished = false,
      isPPV = false,
      ppvPrice,
      ppvCurrency
    } = body

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      )
    }

    // Validate PPV fields
    if (isPPV) {
      if (!ppvPrice || ppvPrice <= 0) {
        return NextResponse.json(
          { error: "PPV price must be greater than 0" },
          { status: 400 }
        )
      }
      // PPV posts cannot have tier restrictions (they're separate)
      if (tierName) {
        return NextResponse.json(
          { error: "PPV posts cannot have tier restrictions. Use either PPV or tier, not both." },
          { status: 400 }
        )
      }
    }

    // If tierName is provided, validate it exists in creator's tiers
    if (tierName) {
      const creatorProfile = await prisma.creatorProfile.findUnique({
        where: { userId: session.user.id },
      })

      if (!creatorProfile) {
        return NextResponse.json(
          { error: "Creator profile not found" },
          { status: 404 }
        )
      }

      const tiers = parseMembershipTiers(creatorProfile.tiers)
      const tierExists = tiers.some((tier) => tier.name === tierName)

      if (!tierExists) {
        return NextResponse.json(
          { error: `Tier "${tierName}" does not exist in your profile` },
          { status: 400 }
        )
      }
    }

    // Auto-detect media type from URL if not provided
    let detectedMediaType = mediaType
    if (!detectedMediaType && mediaUrl) {
      const urlLower = mediaUrl.toLowerCase()
      if (urlLower.match(/\.(mp3|wav|aac|m4a|ogg|flac)$/i)) {
        detectedMediaType = "audio"
      } else if (urlLower.match(/\.(mp4|webm|mov|avi)$/i)) {
        detectedMediaType = "video"
      } else if (urlLower.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        detectedMediaType = "image"
      }
    }

    // Create post
    const post = await prisma.post.create({
      data: {
        creatorId: session.user.id,
        title: title.trim(),
        content: content.trim(),
        mediaType: detectedMediaType || null,
        mediaUrl: mediaUrl?.trim() || null,
        tierName: isPPV ? null : (tierName || null), // PPV posts don't have tier restrictions
        isPublished: isPublished,
        isPPV: isPPV || false,
        ppvPrice: isPPV && ppvPrice ? Math.round(ppvPrice * 100) : null, // Convert to cents
        ppvCurrency: isPPV && ppvCurrency ? ppvCurrency : null,
      },
    })

    // If post is published and has a tier, send notifications to subscribed fans
    if (isPublished && tierName) {
      // Trigger notification sending (async, don't wait)
      fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/notifications/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id }),
      }).catch((err) => console.error("Notification send error:", err))
    }

    return NextResponse.json(
      {
        success: true,
        post,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Post creation error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

