import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { postId } = body

    if (!postId) {
      return NextResponse.json(
        { error: "Post ID is required" },
        { status: 400 }
      )
    }

    // Get post with creator info
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

    if (!post || !post.isPublished || !post.tierName) {
      return NextResponse.json({
        success: true,
        message: "No notifications needed (post not published or not tier-locked)",
      })
    }

    // Find all active subscriptions to this creator with the required tier
    const subscriptions = await prisma.subscription.findMany({
      where: {
        creatorId: post.creatorId,
        tierName: post.tierName,
        status: "active",
      },
      select: {
        fanId: true,
      },
    })

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No subscribers found for this tier",
      })
    }

    // Create notifications for each subscriber
    const creatorUsername = post.creator.creatorProfile?.username || "Creator"
    const creatorProfile = await prisma.creatorProfile.findUnique({
      where: { userId: post.creatorId },
    })

    const notifications = await Promise.all(
      subscriptions.map((sub) =>
        prisma.notification.create({
          data: {
            userId: sub.fanId,
            type: "post",
            title: `New ${post.tierName} tier content from @${creatorUsername}`,
            body: `"${post.title}" is now available!`,
            link: `/creator/${creatorProfile?.username || "unknown"}`,
          },
        })
      )
    )

    return NextResponse.json({
      success: true,
      notificationsSent: notifications.length,
    })
  } catch (error) {
    console.error("Notification send error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

