import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { cancelSubscription } from "@/lib/payments/payment-router"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const cancelSchema = z.object({
  subscriptionId: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validated = cancelSchema.parse(body)

    // Find subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: validated.subscriptionId },
      include: { payment: true },
    })

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      )
    }

    // Verify ownership
    if (subscription.fanId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    // Cancel subscription with provider if applicable
    if (subscription.paymentProvider && subscription.paymentReference) {
      try {
        await cancelSubscription(
          subscription.paymentProvider as any,
          subscription.paymentReference
        )
      } catch (error) {
        console.error("Provider cancellation failed:", error)
        // Continue with local cancellation even if provider fails
      }
    }

    // Update subscription status
    await prisma.subscription.update({
      where: { id: validated.subscriptionId },
      data: {
        status: "cancelled",
        autoRenew: false,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Subscription cancelled successfully",
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }

    console.error("Subscription cancellation error:", error)
    return NextResponse.json(
      { error: error.message || "Cancellation failed" },
      { status: 500 }
    )
  }
}

