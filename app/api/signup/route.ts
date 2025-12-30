import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password, role } = body

    if (!email || !password || !role) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    // Validate role
    if (!["fan", "creator"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'fan' or 'creator'" },
        { status: 400 }
      )
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hash(password, 12)

    // Generate referral code
    const baseCode = normalizedEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "")
    const referralCode = `${baseCode}${Math.random().toString(36).substring(2, 8)}`

    // Create user
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        role: role,
        referralCode: referralCode,
        isOnboarded: false,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    })

    return NextResponse.json(
      { success: true, userId: user.id },
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    )
  } catch (err: any) {
    console.error("Signup error:", err)
    
    // Provide more helpful error messages for common issues
    if (err?.message?.includes("DATABASE_URL") || err?.message?.includes("datasource")) {
      return NextResponse.json(
        { 
          error: "Database configuration error",
          message: "Please check your DATABASE_URL environment variable in Vercel settings"
        },
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    }
    
    return NextResponse.json(
      { error: "Signup failed" },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
  }
}
