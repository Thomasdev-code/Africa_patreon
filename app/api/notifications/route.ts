import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { NotificationData } from "@/lib/types"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Limit to 50 most recent
    })

    const formattedNotifications: NotificationData[] = notifications.map(
      (notif) => ({
        id: notif.id,
        userId: notif.userId,
        type: notif.type as
          | "comment"
          | "reply"
          | "message"
          | "subscription"
          | "post",
        title: notif.title,
        body: notif.body,
        link: notif.link,
        isRead: notif.isRead,
        createdAt: notif.createdAt,
      })
    )

    const unreadCount = formattedNotifications.filter((n) => !n.isRead).length

    return NextResponse.json({
      notifications: formattedNotifications,
      unreadCount,
      totalCount: formattedNotifications.length,
    })
  } catch (error: any) {
    console.error("Notifications fetch error:", error)
    
    // Handle database connection errors
    if (error?.code === "P1001") {
      return NextResponse.json(
        { 
          error: "Database connection failed",
          message: "Unable to connect to the database. Please check your database connection settings.",
          code: "DATABASE_CONNECTION_ERROR"
        },
        { status: 503 } // Service Unavailable
      )
    }
    
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

