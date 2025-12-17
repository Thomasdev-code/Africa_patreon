import { NextRequest, NextResponse } from "next/server"
import { trackReferralClick } from "@/lib/referrals"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { code } = body

    if (!code) {
      return NextResponse.json(
        { error: "Referral code is required" },
        { status: 400 }
      )
    }

    // Find user by referral code
    const referrer = await prisma.user.findUnique({
      where: { referralCode: code },
    })

    if (!referrer) {
      return NextResponse.json(
        { error: "Invalid referral code" },
        { status: 404 }
      )
    }

    // Track click
    await trackReferralClick(code, referrer.id)

    // Store referral code in cookie for signup tracking
    const response = NextResponse.json({ success: true })
    response.cookies.set("referral_code", code, {
      maxAge: 30 * 24 * 60 * 60, // 30 days
      httpOnly: true,
      sameSite: "lax",
    })

    return response
  } catch (error) {
    console.error("Referral tracking error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
