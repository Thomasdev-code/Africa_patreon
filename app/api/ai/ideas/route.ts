import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { checkProAccess, hasEnoughCredits, deductAiCredits } from "@/lib/ai/check-pro-access"
import { generateWithOpenAI } from "@/lib/ai/openai-client"
import { checkRateLimit } from "@/lib/ai/rate-limiter"
import { prisma, executeWithReconnect } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Only creators can use AI tools" },
        { status: 403 }
      )
    }

    // Check Pro access
    const access = await checkProAccess(session.user.id)
    if (!access.hasAccess) {
      return NextResponse.json(
        { error: "Pro subscription required" },
        { status: 403 }
      )
    }

    // Check credits
    if (!(await hasEnoughCredits(session.user.id, 1))) {
      return NextResponse.json(
        { error: "Insufficient AI credits" },
        { status: 400 }
      )
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(session.user.id)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please try again later.",
          resetAt: rateLimit.resetAt.toISOString(),
        },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { niche, count = 10 } = body

    // Validate input
    if (!niche || typeof niche !== "string" || niche.trim().length === 0) {
      return NextResponse.json(
        { error: "Niche is required" },
        { status: 400 }
      )
    }

    if (niche.length > 500) {
      return NextResponse.json(
        { error: "Niche must be 500 characters or less" },
        { status: 400 }
      )
    }

    const ideaCount = parseInt(String(count), 10)
    if (isNaN(ideaCount) || ideaCount < 1 || ideaCount > 30) {
      return NextResponse.json(
        { error: "Count must be between 1 and 30" },
        { status: 400 }
      )
    }

    const prompt = `Generate ${ideaCount} creative and engaging content ideas for a creator in the "${niche}" niche.
    Each idea should be:
    - Specific and actionable
    - Relevant to the niche
    - Engaging for the target audience
    - Suitable for social media or blog posts
    
    Return only the ideas, one per line, without numbering or bullets.`

    // Generate ideas
    let ideasText: string
    let success = true
    let errorMessage: string | null = null

    try {
      ideasText = await generateWithOpenAI(prompt, {
        maxTokens: 1000,
        temperature: 0.9,
      })
    } catch (error: any) {
      success = false
      errorMessage = error.message
      throw error
    } finally {
      // Log usage
      try {
        await executeWithReconnect(() =>
          prisma.aiUsageHistory.create({
            data: {
              userId: session.user.id,
              toolType: "ideas",
              creditsUsed: success ? 1 : 0,
              input: { niche, count },
              output: success ? { ideas: ideasText } : Prisma.JsonNull,
              success,
              errorMessage,
            },
          })
        )

        if (success) {
          const deductResult = await deductAiCredits(session.user.id, 1)
          if (!deductResult.success) {
            console.error("Failed to deduct credits for user:", session.user.id)
          }
        }
      } catch (logError) {
        console.error("Error logging AI usage:", logError)
      }
    }

    // Parse ideas
    const ideas = ideasText
      .split("\n")
      .map((i) => i.trim().replace(/^\d+\.\s*/, "").replace(/^[-*]\s*/, ""))
      .filter((i) => i.length > 0)
      .slice(0, ideaCount)

    return NextResponse.json({
      success: true,
      ideas,
    })
  } catch (error: any) {
    console.error("Ideas generator error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate ideas" },
      { status: 500 }
    )
  }
}

