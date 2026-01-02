export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { generateReferralCode } from "@/lib/referrals"
import type { ReferralCode } from "@/lib/types"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get or generate referral code
    let user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        referralCode: true,
        creatorProfile: {
          select: {
            username: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Generate code if doesn't exist
    if (!user.referralCode) {
      const username = user.creatorProfile?.username
      const code = await generateReferralCode(session.user.id, username)
      user.referralCode = code
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const link = `${baseUrl}/r/${user.referralCode}`

    const referralCode: ReferralCode = {
      code: user.referralCode,
      link,
      username: user.creatorProfile?.username,
    }

    return NextResponse.json(referralCode)
  } catch (error) {
    console.error("Referral code fetch error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

