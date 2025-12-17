import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { calculateReferralCredits, awardReferralCredits } from "@/lib/referrals"
import type { UserRole } from "@/lib/types"

export async function POST(req: NextRequest) {
  try {
    const { email, password, role, referralCode } = await req.json()

    // Validate role
    if (!["fan", "creator"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'fan' or 'creator'" },
        { status: 400 }
      )
    }

    // Validate email and password
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Find referrer if referral code provided
    let referrerId: string | null = null
    let referralId: string | null = null

    if (referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode },
        select: { id: true },
      })

      if (referrer) {
        referrerId = referrer.id

        // Find or create referral record
        const existingReferral = await prisma.referral.findFirst({
          where: {
            referrerId: referrer.id,
            referralCode,
            status: "clicked",
          },
          orderBy: { createdAt: "desc" },
        })

        if (existingReferral) {
          referralId = existingReferral.id
        } else {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
          const newReferral = await prisma.referral.create({
            data: {
              referrerId: referrer.id,
              referralCode,
              referralLink: `${baseUrl}/r/${referralCode}`,
              type: "signup",
              status: "signed_up",
            },
          })
          referralId = newReferral.id
        }
      }
    }

    // Generate a temporary referral code (will be set after user creation)
    const baseCode = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "")
    let tempReferralCode = `${baseCode}${Math.random().toString(36).substring(2, 8)}`
    
    // Ensure uniqueness
    let codeExists = true
    while (codeExists) {
      const existing = await prisma.user.findUnique({
        where: { referralCode: tempReferralCode },
      })
      if (!existing) {
        codeExists = false
      } else {
        tempReferralCode = `${baseCode}${Math.random().toString(36).substring(2, 8)}`
      }
    }

    // Create user with referral code
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role as UserRole,
        isOnboarded: false,
        referralCode: tempReferralCode,
        referredBy: referrerId,
      },
    })

    // The user already has a referral code (tempReferralCode)
    // We can optionally regenerate it with a better format, but it's not necessary
    // The temp code is already unique and valid

    // Update referral record if exists
    if (referralId) {
      await prisma.referral.update({
        where: { id: referralId },
        data: {
          referredUserId: user.id,
          status: "signed_up",
          convertedAt: new Date(),
        },
      })

      // Award credits to referrer
      if (referrerId) {
        const credits = calculateReferralCredits("signup")
        await awardReferralCredits(
          referrerId,
          referralId,
          credits,
          "signup",
          `Referral signup: ${email}`
        )

        // Update referral with credits
        await prisma.referral.update({
          where: { id: referralId },
          data: {
            creditsEarned: credits,
            status: "credited",
          },
        })
      }
    }

    return NextResponse.json(
      {
        success: true,
        userId: user.id,
        role: user.role,
        isOnboarded: user.isOnboarded,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

