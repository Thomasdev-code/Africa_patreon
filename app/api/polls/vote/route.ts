import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "fan") {
      return NextResponse.json(
        { error: "Only fans can vote on polls" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { pollId, optionId } = body

    if (!pollId || !optionId) {
      return NextResponse.json(
        { error: "pollId and optionId are required" },
        { status: 400 }
      )
    }

    // Get poll with options
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: true,
        creator: {
          include: {
            creatorProfile: true,
          },
        },
      },
    })

    if (!poll) {
      return NextResponse.json({ error: "Poll not found" }, { status: 404 })
    }

    // Check if poll has ended
    if (poll.endsAt && new Date(poll.endsAt) < new Date()) {
      return NextResponse.json(
        { error: "This poll has ended" },
        { status: 400 }
      )
    }

    // Validate option belongs to poll
    const option = poll.options.find((opt) => opt.id === optionId)
    if (!option) {
      return NextResponse.json(
        { error: "Invalid option for this poll" },
        { status: 400 }
      )
    }

    // Check if poll is locked by tier
    if (poll.tierName) {
      // Check if user has active subscription to this creator with the required tier
      const subscription = await prisma.subscription.findFirst({
        where: {
          fanId: session.user.id,
          creatorId: poll.creatorId,
          status: "active",
          tierName: poll.tierName,
        },
      })

      if (!subscription) {
        return NextResponse.json(
          {
            error: "This poll requires a subscription to the required tier",
            requiredTier: poll.tierName,
          },
          { status: 403 }
        )
      }
    }

    // Check if user already voted (prevent double voting)
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_pollId: {
          userId: session.user.id,
          pollId: pollId,
        },
      },
    })

    if (existingVote) {
      // Allow changing vote
      const updatedVote = await prisma.vote.update({
        where: { id: existingVote.id },
        data: { optionId },
      })

      return NextResponse.json({
        success: true,
        vote: {
          id: updatedVote.id,
          optionId: updatedVote.optionId,
        },
        message: "Vote updated",
      })
    }

    // Create new vote
    const vote = await prisma.vote.create({
      data: {
        userId: session.user.id,
        pollId,
        optionId,
      },
    })

    return NextResponse.json({
      success: true,
      vote: {
        id: vote.id,
        optionId: vote.optionId,
      },
      message: "Vote recorded",
    })
  } catch (error: any) {
    console.error("Vote error:", error)

    // Handle unique constraint violation (double vote attempt)
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "You have already voted on this poll" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}

