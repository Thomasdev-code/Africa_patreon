import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { calculateReferralCredits, awardReferralCredits } from "@/lib/referrals"
import type { UserRole } from "@/lib/types"

// Explicitly handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}

// Only allow POST method - reject all others
export async function POST(req: NextRequest) {
  // Ensure this is a POST request (Next.js should handle this, but being explicit)
  if (req.method !== "POST") {
    return NextResponse.json(
      { error: "Method not allowed" },
      { status: 405 }
    )
  }
  try {
    const body = await req.json()
    const { email, password, role, referralCode } = body

    // Input validation and sanitization
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      )
    }

    // Normalize email (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim()

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Validate password
    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      )
    }

    // Password strength validation (minimum 6 characters)
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      )
    }

    // Validate role
    if (!role || !["fan", "creator"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'fan' or 'creator'" },
        { status: 400 }
      )
    }

    // Validate referral code format if provided
    if (referralCode && (typeof referralCode !== "string" || referralCode.trim().length === 0)) {
      return NextResponse.json(
        { error: "Invalid referral code format" },
        { status: 400 }
      )
    }

    // Check if user already exists (using normalized email)
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true }, // Only select id for performance
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

    // Handle referral code if provided (sanitize and validate)
    if (referralCode) {
      const sanitizedReferralCode = referralCode.trim()
      
      const referrer = await prisma.user.findUnique({
        where: { referralCode: sanitizedReferralCode },
        select: { id: true }, // Only select id for performance
      })

      if (referrer) {
        referrerId = referrer.id

        // Find or create referral record
        // Note: For scalability, consider adding database indexes on (referrerId, status, createdAt)
        const existingReferral = await prisma.referral.findFirst({
          where: {
            referrerId: referrer.id,
            referralCode: sanitizedReferralCode,
            status: "clicked",
          },
          orderBy: { createdAt: "desc" },
          select: { id: true }, // Only select id for performance
        })

        if (existingReferral) {
          referralId = existingReferral.id
        } else {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
          const newReferral = await prisma.referral.create({
            data: {
              referrerId: referrer.id,
              referralCode: sanitizedReferralCode,
              referralLink: `${baseUrl}/r/${sanitizedReferralCode}`,
              type: "signup",
              status: "signed_up",
            },
            select: { id: true }, // Only select id for performance
          })
          referralId = newReferral.id
        }
      }
    }

    // Generate a unique referral code
    // For scalability: Consider using a more efficient approach (e.g., UUID + short code)
    const baseCode = normalizedEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "")
    let tempReferralCode = `${baseCode}${Math.random().toString(36).substring(2, 8)}`
    
    // Ensure uniqueness (with retry limit to prevent infinite loops)
    // Note: For high-scale systems, consider using a distributed ID generator
    let codeExists = true
    let retries = 0
    const maxRetries = 10
    
    while (codeExists && retries < maxRetries) {
      const existing = await prisma.user.findUnique({
        where: { referralCode: tempReferralCode },
        select: { id: true }, // Only select id for performance
      })
      if (!existing) {
        codeExists = false
      } else {
        tempReferralCode = `${baseCode}${Math.random().toString(36).substring(2, 8)}`
        retries++
      }
    }
    
    if (codeExists) {
      // Fallback: use timestamp-based code if max retries reached
      tempReferralCode = `${baseCode}${Date.now().toString(36)}`
    }

    // Create user with referral code (using normalized email)
    // Note: For scalability, consider using database transactions for atomic operations
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        role: role as UserRole,
        isOnboarded: false,
        referralCode: tempReferralCode,
        referredBy: referrerId,
      },
      select: {
        id: true,
        email: true,
        role: true,
        isOnboarded: true,
      }, // Only select needed fields for performance
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
    // Log error for monitoring (in production, use proper logging service)
    console.error("Signup error:", error)
    
    // Don't expose internal error details to client
    // In production, consider using error tracking (e.g., Sentry)
    return NextResponse.json(
      { error: "An error occurred during signup. Please try again." },
      { status: 500 }
    )
  }
}

// Note: For production scalability, consider:
// 1. Adding rate limiting middleware (e.g., using Upstash Redis)
// 2. Implementing CAPTCHA for signup endpoints
// 3. Using database connection pooling
// 4. Adding database indexes on frequently queried fields (email, referralCode)
// 5. Implementing request validation middleware
// 6. Using transaction for user creation + referral updates (atomicity)


