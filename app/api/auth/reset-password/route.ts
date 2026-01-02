export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { prisma, executeWithReconnect } from "@/lib/prisma"
import { hashToken, isTokenExpired } from "@/lib/auth-utils"
import bcrypt from "bcryptjs"
import { z } from "zod"

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate input
    const validation = resetPasswordSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      )
    }

    const { token, password } = validation.data

    // Hash the provided token to compare with stored hashed tokens
    const hashedToken = hashToken(token)

    // Find token in database (tokens are stored hashed)
    const resetToken = await executeWithReconnect(() =>
      prisma.passwordResetToken.findUnique({
        where: { token: hashedToken },
      })
    )

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      )
    }

    // Check if token is expired
    if (isTokenExpired(resetToken.expiresAt)) {
      // Delete expired token
      await executeWithReconnect(() =>
        prisma.passwordResetToken.delete({
          where: { id: resetToken.id },
        })
      )
      return NextResponse.json(
        { error: "Reset token has expired. Please request a new one." },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await executeWithReconnect(() =>
      prisma.user.findUnique({
        where: { email: resetToken.email },
        select: { id: true, email: true },
      })
    )

    if (!user) {
      // Delete token if user doesn't exist
      await executeWithReconnect(() =>
        prisma.passwordResetToken.delete({
          where: { id: resetToken.id },
        })
      )
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Update user password and delete token atomically
    await executeWithReconnect(() =>
      prisma.$transaction(async (tx) => {
        // Update password
        await tx.user.update({
          where: { id: user.id },
          data: { password: hashedPassword },
        })

        // Delete the used token
        await tx.passwordResetToken.delete({
          where: { id: resetToken.id },
        })

        // Delete any other tokens for this email (single-use)
        await tx.passwordResetToken.deleteMany({
          where: { email: user.email },
        })
      })
    )

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully. You can now login with your new password.",
    })
  } catch (error: any) {
    console.error("Reset password error:", error)
    return NextResponse.json(
      { error: "An error occurred. Please try again later." },
      { status: 500 }
    )
  }
}

