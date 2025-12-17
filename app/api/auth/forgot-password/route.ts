import { NextRequest, NextResponse } from "next/server"
import { prisma, executeWithReconnect } from "@/lib/prisma"
import { generateResetToken, hashToken, generateExpirationDate } from "@/lib/auth-utils"
import { sendPasswordResetEmail } from "@/lib/mail"
import { z } from "zod"

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    // Validate email
    const validation = emailSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email } = validation.data

    // Check if user exists (don't reveal if email exists for security)
    const user = await executeWithReconnect(() =>
      prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
        select: { id: true, email: true },
      })
    )

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (user) {
      // Delete any existing reset tokens for this email
      await executeWithReconnect(() =>
        prisma.passwordResetToken.deleteMany({
          where: { email: user.email },
        })
      )

      // Generate new token
      const token = generateResetToken()
      const hashedToken = hashToken(token)
      const expiresAt = generateExpirationDate(30) // 30 minutes

      // Store token in database
      await executeWithReconnect(() =>
        prisma.passwordResetToken.create({
          data: {
            email: user.email,
            token: hashedToken,
            expiresAt,
          },
        })
      )

      // Send reset email (don't await to prevent timing attacks)
      sendPasswordResetEmail(user.email, token).catch((error) => {
        console.error("Failed to send password reset email:", error)
        // Don't throw - we've already stored the token
      })
    }

    // Always return success message (security best practice)
    return NextResponse.json({
      success: true,
      message: "If an account with that email exists, we've sent a password reset link.",
    })
  } catch (error: any) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { error: "An error occurred. Please try again later." },
      { status: 500 }
    )
  }
}

