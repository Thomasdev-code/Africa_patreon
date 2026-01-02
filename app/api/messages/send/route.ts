export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { CreateMessageInput } from "@/lib/types"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body: CreateMessageInput = await req.json()
    const { receiverId, content, mediaUrl, mediaType } = body

    if (!receiverId) {
      return NextResponse.json(
        { error: "Receiver ID is required" },
        { status: 400 }
      )
    }

    if (!content && !mediaUrl) {
      return NextResponse.json(
        { error: "Content or media is required" },
        { status: 400 }
      )
    }

    // Get receiver
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
    })

    if (!receiver) {
      return NextResponse.json(
        { error: "Receiver not found" },
        { status: 404 }
      )
    }

    // Access rules: Fans can only message creators they subscribe to
    if (session.user.role === "fan" && receiver.role !== "creator") {
      return NextResponse.json(
        { error: "Fans can only message creators" },
        { status: 403 }
      )
    }

    if (session.user.role === "fan") {
      // Check if fan has active subscription to this creator
      const subscription = await prisma.subscription.findFirst({
        where: {
          fanId: session.user.id,
          creatorId: receiverId,
          status: "active",
        },
      })

      if (!subscription) {
        return NextResponse.json(
          { error: "You must be subscribed to message this creator" },
          { status: 403 }
        )
      }
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId: receiverId,
        content: content?.trim() || null,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
      },
      include: {
        sender: {
          include: {
            creatorProfile: {
              select: {
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
        receiver: {
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

    // Create notification for receiver
    const senderProfile = await prisma.creatorProfile.findUnique({
      where: { userId: session.user.id },
    })

    const receiverProfile = await prisma.creatorProfile.findUnique({
      where: { userId: receiverId },
    })

    await prisma.notification.create({
      data: {
        userId: receiverId,
        type: "message",
        title: `New message from ${senderProfile?.username || session.user.email}`,
        body: content
          ? content.substring(0, 100)
          : mediaType === "image"
          ? "📷 Image"
          : mediaType === "audio"
          ? "🎵 Audio"
          : "Media",
        link: `/messages?userId=${session.user.id}`,
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: {
          ...message,
          sender: {
            id: message.sender.id,
            email: message.sender.email,
            role: message.sender.role,
            creatorProfile: message.sender.creatorProfile,
          },
          receiver: {
            id: message.receiver.id,
            email: message.receiver.email,
            role: message.receiver.role,
            creatorProfile: message.receiver.creatorProfile,
          },
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Message send error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

