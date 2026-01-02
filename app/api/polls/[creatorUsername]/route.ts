export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma, executeWithReconnect } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ creatorUsername: string }> }
) {
  try {
    const session = await auth()
    const { creatorUsername } = await params

    // Get creator profile
    const profile = await executeWithReconnect(() =>
      prisma.creatorProfile.findUnique({
        where: { username: creatorUsername },
        include: {
          user: true,
        },
      })
    )

    if (!profile) {
      return NextResponse.json(
        { error: "Creator not found" },
        { status: 404 }
      )
    }

    // Get all published polls for this creator (public endpoint)
    const polls = await executeWithReconnect(() =>
      prisma.poll.findMany({
      where: {
        creatorId: profile.userId,
        isPublished: true,
      },
      include: {
        options: {
          include: {
            _count: {
              select: { votes: true },
            },
          },
        },
        _count: {
          select: { options: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      })
    )

    // Get user's votes if logged in as fan
    let userVotes: Record<string, string> = {}
    if (session?.user && session.user.role === "fan") {
      const votes = await executeWithReconnect(() =>
        prisma.vote.findMany({
        where: {
          userId: session.user.id,
          pollId: {
            in: polls.map((p) => p.id),
          },
        },
        select: {
          pollId: true,
          optionId: true,
        },
        })
      )

      votes.forEach((vote) => {
        userVotes[vote.pollId] = vote.optionId
      })
    }

    // Format polls for public display
    const formattedPolls = polls.map((poll) => {
      const totalVotes = poll.options.reduce(
        (sum, opt) => sum + opt._count.votes,
        0
      )

      return {
        id: poll.id,
        creatorId: poll.creatorId,
        question: poll.question,
        tierName: poll.tierName,
        hideResultsUntilEnd: poll.hideResultsUntilEnd,
        endsAt: poll.endsAt,
        createdAt: poll.createdAt,
        updatedAt: poll.updatedAt,
        options: poll.options.map((opt) => ({
          id: opt.id,
          pollId: opt.pollId,
          text: opt.label, // Schema uses 'label' but we expose as 'text' for consistency
          createdAt: opt.createdAt,
        })),
        totalVotes,
        userVote: userVotes[poll.id] || null,
        hasVoted: !!userVotes[poll.id],
        resultsLocked: !!poll.tierName, // Will be checked properly on results endpoint
        isEnded: poll.endsAt ? new Date(poll.endsAt) < new Date() : false,
      }
    })

    return NextResponse.json({
      polls: formattedPolls,
      count: formattedPolls.length,
    })
  } catch (error: any) {
    console.error("Polls list error:", error)
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}

