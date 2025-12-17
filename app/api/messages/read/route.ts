import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { messageIds, userId } = body

    if (messageIds && Array.isArray(messageIds)) {
      // Mark specific messages as read
      await prisma.message.updateMany({
        where: {
          id: { in: messageIds },
          receiverId: session.user.id,
        },
        data: {
          read: true,
        },
      })
    } else if (userId) {
      // Mark all messages from a user as read
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
    } else {
      return NextResponse.json(
        { error: "messageIds or userId is required" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Messages marked as read",
    })
  } catch (error) {
    console.error("Mark read error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

