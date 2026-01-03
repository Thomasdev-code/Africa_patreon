export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getAppUrl } from "@/lib/app-url"
import { z } from "zod"

const createCodeSchema = z.object({
  code: z.string().min(3).max(20).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only creators can create referral codes
    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Only creators can create referral codes" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const validated = createCodeSchema.parse(body)

    // Check if user already has a referral code
    const existing = await prisma.referralCode.findUnique({
      where: { userId: session.user.id },
    })

    if (existing) {
      return NextResponse.json(
        { error: "You already have a referral code" },
        { status: 400 }
      )
    }

    // Generate code if not provided
    let code = validated.code
    if (!code) {
      // Use user's existing referralCode or generate new one
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
      })
      code = user?.referralCode || `REF${Date.now().toString(36).toUpperCase()}`
    }

    // Ensure code is unique
    const codeExists = await prisma.referralCode.findUnique({
      where: { code },
    })

    if (codeExists) {
      return NextResponse.json(
        { error: "Referral code already exists" },
        { status: 400 }
      )
    }

    // Create referral code
    const referralCode = await prisma.referralCode.create({
      data: {
        code,
        userId: session.user.id,
        isActive: true,
      },
    })

    return NextResponse.json({
      success: true,
      code: referralCode.code,
      referralLink: `${getAppUrl()}/signup?ref=${referralCode.code}`,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Create referral code error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create referral code" },
      { status: 500 }
    )
  }
}

