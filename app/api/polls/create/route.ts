import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { CreatePollInput } from "@/lib/types"
import { parseMembershipTiers } from "@/lib/utils"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Only creators can create polls" },
        { status: 403 }
      )
    }

    const body: CreatePollInput = await req.json()

    // Validation
    if (!body.question || body.question.trim().length === 0) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      )
    }

    if (!body.options || body.options.length < 2) {
      return NextResponse.json(
        { error: "At least 2 options are required" },
        { status: 400 }
      )
    }

    if (body.options.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 options allowed" },
        { status: 400 }
      )
    }

    // Validate option texts
    const validOptions = body.options.filter(
      (opt) => opt && opt.trim().length > 0
    )
    if (validOptions.length < 2) {
      return NextResponse.json(
        { error: "All options must have text" },
        { status: 400 }
      )
    }

    // Validate end date if provided
    let endsAt: Date | null = null
    if (body.endsAt) {
      endsAt = new Date(body.endsAt)
      if (isNaN(endsAt.getTime()) || endsAt <= new Date()) {
        return NextResponse.json(
          { error: "End date must be in the future" },
          { status: 400 }
        )
      }
    }

    // Get creator profile to validate tier exists if provided
    if (body.tierName) {
      const profile = await prisma.creatorProfile.findUnique({
        where: { userId: session.user.id },
      })

      if (!profile) {
        return NextResponse.json(
          { error: "Creator profile not found" },
          { status: 404 }
        )
      }

      const tiers = parseMembershipTiers(profile.tiers)
      const tierExists = tiers.some((t) => t.name === body.tierName)
      if (!tierExists) {
        return NextResponse.json(
          { error: "Tier not found in your profile" },
          { status: 400 }
        )
      }
    }

    // Create poll with options
    const poll = await prisma.poll.create({
      data: {
        creatorId: session.user.id,
        question: body.question.trim(),
        tierName: body.tierName || null,
        hideResultsUntilEnd: body.hideResultsUntilEnd || false,
        endsAt,
        options: {
          create: validOptions.map((text) => ({
            label: text.trim(),
          })),
        },
      },
      include: {
        options: true,
      },
    })

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
        options: poll.options,
      },
    })
  } catch (error: any) {
    console.error("Poll creation error:", error)
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}

