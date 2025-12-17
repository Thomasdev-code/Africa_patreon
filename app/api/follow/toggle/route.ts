import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only fans can follow creators
    if (session.user.role !== "fan") {
      return NextResponse.json(
        { error: "Only fans can follow creators" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { creatorId } = body as { creatorId?: string }

    if (!creatorId) {
      return NextResponse.json(
        { error: "creatorId is required" },
        { status: 400 }
      )
    }

    // Prevent users from following themselves or non-creators
    if (creatorId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot follow yourself" },
        { status: 400 }
      )
    }

    const creatorUser = await prisma.user.findUnique({
      where: { id: creatorId },
      select: { id: true, role: true, isBanned: true, isApproved: true },
    })

    if (!creatorUser || creatorUser.role !== "creator") {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 }
      )
    }

    if (!creatorUser.isApproved || creatorUser.isBanned) {
      return NextResponse.json(
        { error: "This creator is not available to follow" },
        { status: 400 }
      )
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        fanId_creatorId: {
          fanId: session.user.id,
          creatorId,
        },
      },
    })

    if (existingFollow) {
      await prisma.follow.delete({
        where: { id: existingFollow.id },
      })

      return NextResponse.json({ followed: false })
    }

    await prisma.follow.create({
      data: {
        fanId: session.user.id,
        creatorId,
      },
    })

    return NextResponse.json({ followed: true })
  } catch (error) {
    console.error("Follow toggle error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


