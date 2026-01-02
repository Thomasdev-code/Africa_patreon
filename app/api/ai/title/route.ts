export const runtime = "nodejs"

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
    const { topic, count = 5 } = body

    // Validate input
    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return NextResponse.json(
        { error: "Topic is required" },
        { status: 400 }
      )
    }

    if (topic.length > 500) {
      return NextResponse.json(
        { error: "Topic must be 500 characters or less" },
        { status: 400 }
      )
    }

    const titleCount = parseInt(String(count), 10)
    if (isNaN(titleCount) || titleCount < 1 || titleCount > 20) {
      return NextResponse.json(
        { error: "Count must be between 1 and 20" },
        { status: 400 }
      )
    }

    const prompt = `Generate ${titleCount} compelling, attention-grabbing titles for content about: "${topic}".
    Each title should be:
    - Engaging and click-worthy
    - Clear and descriptive
    - Optimized for social media
    - Between 40-70 characters when possible
    
    Return only the titles, one per line, without numbering or bullets.`

    // Generate titles
    let titlesText: string
    let success = true
    let errorMessage: string | null = null

    try {
      titlesText = await generateWithOpenAI(prompt, {
        maxTokens: 500,
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
              toolType: "title",
              creditsUsed: success ? 1 : 0,
              input: { topic, count },
              output: success ? { titles: titlesText } : Prisma.JsonNull,
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

    // Parse titles
    const titles = titlesText
      .split("\n")
      .map((t) => t.trim().replace(/^\d+\.\s*/, "").replace(/^[-*]\s*/, ""))
      .filter((t) => t.length > 0)
      .slice(0, titleCount)

    return NextResponse.json({
      success: true,
      titles,
    })
  } catch (error: any) {
    console.error("Title generator error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate titles" },
      { status: 500 }
    )
  }
}

