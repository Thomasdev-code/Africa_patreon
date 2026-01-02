export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { Conversation } from "@/lib/types"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all conversations for this user
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: session.user.id },
          { receiverId: session.user.id },
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
        createdAt: "desc",
      },
    })

    // Group by conversation partner
    const conversationsMap = new Map<string, Conversation>()

    messages.forEach((msg) => {
      const partnerId =
        msg.senderId === session.user.id ? msg.receiverId : msg.senderId
      const partner =
        msg.senderId === session.user.id ? msg.receiver : msg.sender

      if (!conversationsMap.has(partnerId)) {
        const profile = partner.creatorProfile || {
          username: partner.email.split("@")[0],
          avatarUrl: null,
        }

        conversationsMap.set(partnerId, {
          userId: partnerId,
          username: profile.username,
          avatarUrl: profile.avatarUrl,
          lastMessage: null,
          unreadCount: 0,
        })
      }

      const conversation = conversationsMap.get(partnerId)!

      // Set last message if this is more recent
      if (!conversation.lastMessage || msg.createdAt > conversation.lastMessage.createdAt) {
        conversation.lastMessage = {
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
            creatorProfile: msg.sender.creatorProfile ?? undefined,
          },
          receiver: {
            id: msg.receiver.id,
            email: msg.receiver.email,
            role: msg.receiver.role as "fan" | "creator" | "admin",
            creatorProfile: msg.receiver.creatorProfile ?? undefined,
          },
        }
      }

      // Count unread messages
      if (
        msg.receiverId === session.user.id &&
        !msg.read
      ) {
        conversation.unreadCount++
      }
    })

    const conversations = Array.from(conversationsMap.values()).sort(
      (a, b) => {
        if (!a.lastMessage) return 1
        if (!b.lastMessage) return -1
        return (
          new Date(b.lastMessage.createdAt).getTime() -
          new Date(a.lastMessage.createdAt).getTime()
        )
      }
    )

    return NextResponse.json({
      conversations,
      count: conversations.length,
    })
  } catch (error) {
    console.error("Conversations fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

