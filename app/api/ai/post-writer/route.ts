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
    const { topic, tone = "professional", length = "medium" } = body

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

    const validTones = ["professional", "casual", "friendly", "formal", "humorous"]
    if (!validTones.includes(tone)) {
      return NextResponse.json(
        { error: `Tone must be one of: ${validTones.join(", ")}` },
        { status: 400 }
      )
    }

    const validLengths = ["short", "medium", "long"]
    if (!validLengths.includes(length)) {
      return NextResponse.json(
        { error: `Length must be one of: ${validLengths.join(", ")}` },
        { status: 400 }
      )
    }

    // Build prompt based on parameters
    const lengthMap: Record<string, string> = {
      short: "100-200 words",
      medium: "200-400 words",
      long: "400+ words",
    }

    const prompt = `Write a ${tone} social media post about "${topic}". 
    The post should be ${lengthMap[length] || "200-400 words"} long.
    Make it engaging, valuable, and suitable for a creator's audience.
    Use appropriate formatting with paragraphs and line breaks.
    Do not include hashtags unless specifically requested.`

    // Generate content
    let content: string
    let success = true
    let errorMessage: string | null = null

    try {
      content = await generateWithOpenAI(prompt, {
        maxTokens: length === "long" ? 1500 : length === "medium" ? 800 : 400,
        temperature: 0.8,
      })
    } catch (error: any) {
      success = false
      errorMessage = error.message
      throw error
    } finally {
      // Log usage (use executeWithReconnect for database operations)
      try {
        await executeWithReconnect(() =>
          prisma.aiUsageHistory.create({
            data: {
              userId: session.user.id,
              toolType: "post-writer",
              creditsUsed: success ? 1 : 0,
              input: { topic, tone, length },
              output: success ? { content } : Prisma.JsonNull,
              success,
              errorMessage,
            },
          })
        )

        // Deduct credits only if successful
        if (success) {
          const deductResult = await deductAiCredits(session.user.id, 1)
          if (!deductResult.success) {
            console.error("Failed to deduct credits for user:", session.user.id)
            // Don't fail the request, but log the error
          }
        }
      } catch (logError) {
        console.error("Error logging AI usage:", logError)
        // Don't fail the request if logging fails
      }
    }

    return NextResponse.json({
      success: true,
      content,
    })
  } catch (error: any) {
    console.error("Post writer error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate post" },
      { status: 500 }
    )
  }
}

