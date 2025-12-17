import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const creators = await prisma.user.findMany({
      where: {
        role: "creator",
      },
      include: {
        creatorProfile: true,
        _count: {
          select: {
            creatorSubscriptions: {
              where: {
                status: "active",
              },
            },
            posts: {
              where: {
                isPublished: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ creators })
  } catch (error) {
    console.error("Admin creators fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

