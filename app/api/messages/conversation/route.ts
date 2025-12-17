import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { Message } from "@/lib/types"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Get all messages between current user and target user
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          {
            senderId: session.user.id,
            receiverId: userId,
          },
          {
            senderId: userId,
            receiverId: session.user.id,
          },
        ],
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
      orderBy: {
        createdAt: "asc",
      },
    })

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        senderId: userId,
        receiverId: session.user.id,
        read: false,
      },
      data: {
        read: true,
      },
    })

    const formattedMessages: Message[] = messages.map((msg) => ({
      id: msg.id,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      content: msg.content,
      mediaUrl: msg.mediaUrl,
      mediaType: msg.mediaType,
      read: msg.read,
      createdAt: msg.createdAt,
      sender: {
        id: msg.sender.id,
        email: msg.sender.email,
        role: msg.sender.role as "fan" | "creator" | "admin",
        creatorProfile: msg.sender.creatorProfile
          ? {
              username: msg.sender.creatorProfile.username,
              avatarUrl: msg.sender.creatorProfile.avatarUrl,
            }
          : undefined,
      },
      receiver: {
        id: msg.receiver.id,
        email: msg.receiver.email,
        role: msg.receiver.role as "fan" | "creator" | "admin",
        creatorProfile: msg.receiver.creatorProfile
          ? {
              username: msg.receiver.creatorProfile.username,
              avatarUrl: msg.receiver.creatorProfile.avatarUrl,
            }
          : undefined,
      },
    }))

    return NextResponse.json({
      messages: formattedMessages,
      count: formattedMessages.length,
    })
  } catch (error) {
    console.error("Conversation fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

