import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { checkProAccess, hasEnoughCredits, deductAiCredits } from "@/lib/ai/check-pro-access"
import { generateThumbnail } from "@/lib/ai/thumbnail-generator"
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
    const { prompt, watermarkText } = body

    // Validate input
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      )
    }

    if (prompt.length > 1000) {
      return NextResponse.json(
        { error: "Prompt must be 1000 characters or less" },
        { status: 400 }
      )
    }

    if (watermarkText && (typeof watermarkText !== "string" || watermarkText.length > 100)) {
      return NextResponse.json(
        { error: "Watermark text must be 100 characters or less" },
        { status: 400 }
      )
    }

    // Generate thumbnail
    let imageUrl: string = ""
    let success = true
    let errorMessage: string | null = null

    try {
      imageUrl = await generateThumbnail(prompt, watermarkText)
    } catch (error: any) {
      success = false
      errorMessage = error.message
      // Don't throw here, we'll return error response below
    }

    // Log usage (even if generation failed, we still log the attempt)
    try {
      await executeWithReconnect(() =>
        prisma.aiUsageHistory.create({
          data: {
            userId: session.user.id,
            toolType: "thumbnail",
            creditsUsed: success ? 1 : 0, // Only deduct if successful
            input: { prompt, watermarkText },
            output: success ? { imageUrl } : Prisma.JsonNull,
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
          // Still return success since generation worked
        }
        return NextResponse.json({
          success: true,
          imageUrl,
        })
      } else {
        return NextResponse.json(
          { error: errorMessage || "Failed to generate thumbnail" },
          { status: 500 }
        )
      }
    } catch (logError) {
      console.error("Error logging AI usage:", logError)
      // Still return response even if logging fails
      if (success) {
        return NextResponse.json({
          success: true,
          imageUrl,
        })
      } else {
        return NextResponse.json(
          { error: errorMessage || "Failed to generate thumbnail" },
          { status: 500 }
        )
      }
    }
  } catch (error: any) {
    console.error("Thumbnail generation error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to generate thumbnail" },
      { status: 500 }
    )
  }
}

