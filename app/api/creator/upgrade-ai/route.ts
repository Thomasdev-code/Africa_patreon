export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * API route to upgrade creator to Pro (AI Tools)
 * This is called after successful payment via webhook
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Only creators can upgrade to Pro" },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { paymentId, reference } = body

    // Verify payment exists and is successful
    if (paymentId) {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      })

      if (!payment || payment.status !== "success") {
        return NextResponse.json(
          { error: "Payment not found or not successful" },
          { status: 400 }
        )
      }
    } else if (reference) {
      const payment = await prisma.payment.findFirst({
        where: { reference, status: "success" },
      })

      if (!payment) {
        return NextResponse.json(
          { error: "Payment not found or not successful" },
          { status: 400 }
        )
      }
    } else {
      return NextResponse.json(
        { error: "Payment ID or reference required" },
        { status: 400 }
      )
    }

    // Update user to Pro
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        subscriptionPlan: "pro",
        aiCredits: {
          increment: 50, // Grant initial 50 credits
        },
      },
      select: {
        id: true,
        email: true,
        subscriptionPlan: true,
        aiCredits: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Successfully upgraded to Pro",
      user: updated,
    })
  } catch (error: any) {
    console.error("Upgrade AI error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to upgrade to Pro" },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to check current Pro status
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Only creators can check Pro status" },
        { status: 403 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        subscriptionPlan: true,
        aiCredits: true,
      },
    })

    return NextResponse.json({
      hasPro: user?.subscriptionPlan === "pro",
      subscriptionPlan: user?.subscriptionPlan || "free",
      aiCredits: user?.aiCredits || 0,
    })
  } catch (error: any) {
    console.error("Check Pro status error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to check Pro status" },
      { status: 500 }
    )
  }
}

