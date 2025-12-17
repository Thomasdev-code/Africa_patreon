import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateFeeSchema = z.object({
  percentage: z.number().min(0).max(100),
})

/**
 * GET /api/admin/platform-fee
 * Get current platform fee (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the current platform fee (there should only be one record)
    let platformFee = await prisma.platformFee.findFirst({
      orderBy: { updatedAt: "desc" },
    })

    // If no fee exists, create a default one
    if (!platformFee) {
      platformFee = await prisma.platformFee.create({
        data: {
          percentage: 5.0, // Default 5%
        },
      })
    }

    return NextResponse.json({
      percentage: platformFee.percentage,
      updatedAt: platformFee.updatedAt,
    })
  } catch (error) {
    console.error("Get platform fee error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/platform-fee
 * Update platform fee (admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = updateFeeSchema.parse(body)

    // Get existing fee or create new one
    let platformFee = await prisma.platformFee.findFirst({
      orderBy: { updatedAt: "desc" },
    })

    if (platformFee) {
      // Update existing fee
      platformFee = await prisma.platformFee.update({
        where: { id: platformFee.id },
        data: {
          percentage: validated.percentage,
        },
      })
    } else {
      // Create new fee record
      platformFee = await prisma.platformFee.create({
        data: {
          percentage: validated.percentage,
        },
      })
    }

    return NextResponse.json({
      success: true,
      percentage: platformFee.percentage,
      updatedAt: platformFee.updatedAt,
      message: "Platform fee updated successfully. Changes will apply to future transactions only.",
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Update platform fee error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

