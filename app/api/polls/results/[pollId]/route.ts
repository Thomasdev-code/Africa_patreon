import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  try {
    const session = await auth()
    const { pollId } = await params

    if (!pollId) {
      return NextResponse.json({ error: "Poll ID required" }, { status: 400 })
    }

    // Get poll with options and creator
    const poll = await prisma.poll.findUnique({
      where: { id: pollId },
      include: {
        options: {
          include: {
            _count: {
              select: { votes: true },
            },
          },
        },
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

    // Check if poll is locked by tier
    let resultsLocked = false
    if (poll.tierName) {
      if (!session?.user || session.user.role !== "fan") {
        resultsLocked = true
      } else {
        // Check if user has active subscription with required tier
        const subscription = await prisma.subscription.findFirst({
          where: {
            fanId: session.user.id,
            creatorId: poll.creatorId,
            status: "active",
            tierName: poll.tierName,
          },
        })

        if (!subscription) {
          resultsLocked = true
        }
      }
    }

    // Check if results should be hidden
    const now = new Date()
    const resultsHidden =
      poll.hideResultsUntilEnd &&
      poll.endsAt &&
      new Date(poll.endsAt) > now

    // Get user's vote if logged in
    let userVote: { optionId: string | null; hasVoted: boolean } = {
      optionId: null,
      hasVoted: false,
    }

    if (session?.user && session.user.role === "fan") {
      const vote = await prisma.vote.findUnique({
        where: {
          userId_pollId: {
            userId: session.user.id,
            pollId: pollId,
          },
        },
      })

      if (vote) {
        userVote = {
          optionId: vote.optionId,
          hasVoted: true,
        }
      }
    }

    // Calculate vote counts and percentages
    const totalVotes = poll.options.reduce(
      (sum, opt) => sum + opt._count.votes,
      0
    )

    const optionsWithStats = poll.options.map((option) => ({
      id: option.id,
      pollId: option.pollId,
      text: option.label, // Schema uses 'label' but we expose as 'text' for consistency
      createdAt: option.createdAt,
      voteCount: option._count.votes,
      percentage:
        totalVotes > 0 ? (option._count.votes / totalVotes) * 100 : 0,
    }))

    // If results are locked or hidden, don't return vote counts
    if (resultsLocked || resultsHidden) {
      return NextResponse.json({
        poll: {
          id: poll.id,
          creatorId: poll.creatorId,
          question: poll.question,
          tierName: poll.tierName,
          hideResultsUntilEnd: poll.hideResultsUntilEnd,
          endsAt: poll.endsAt,
          createdAt: poll.createdAt,
          updatedAt: poll.updatedAt,
        },
        options: optionsWithStats.map((opt) => ({
          ...opt,
          voteCount: resultsLocked || resultsHidden ? undefined : opt.voteCount,
          percentage:
            resultsLocked || resultsHidden ? undefined : opt.percentage,
        })),
        totalVotes: resultsLocked || resultsHidden ? undefined : totalVotes,
        userVote,
        resultsLocked,
        resultsHidden,
      })
    }

    return NextResponse.json({
      poll: {
        id: poll.id,
        creatorId: poll.creatorId,
        question: poll.question,
        tierName: poll.tierName,
        hideResultsUntilEnd: poll.hideResultsUntilEnd,
        endsAt: poll.endsAt,
        createdAt: poll.createdAt,
        updatedAt: poll.updatedAt,
      },
      options: optionsWithStats,
      totalVotes,
      userVote,
      resultsLocked,
      resultsHidden,
    })
  } catch (error: any) {
    console.error("Poll results error:", error)
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}

