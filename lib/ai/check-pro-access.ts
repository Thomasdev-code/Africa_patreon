import { prisma, executeWithReconnect } from "@/lib/prisma"

/**
 * Check if user has Pro subscription
 */
export async function checkProAccess(userId: string): Promise<{
  hasAccess: boolean
  subscriptionPlan: string
  aiCredits: number
}> {
  const user = await executeWithReconnect(() =>
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionPlan: true,
        aiCredits: true,
      },
    })
  )

  if (!user) {
    return {
      hasAccess: false,
      subscriptionPlan: "free",
      aiCredits: 0,
    }
  }

  return {
    hasAccess: user.subscriptionPlan === "pro",
    subscriptionPlan: user.subscriptionPlan || "free",
    aiCredits: Math.max(0, user.aiCredits || 0), // Ensure non-negative
  }
}

/**
 * Check if user has enough AI credits
 */
export async function hasEnoughCredits(
  userId: string,
  requiredCredits: number = 1
): Promise<boolean> {
  const { aiCredits } = await checkProAccess(userId)
  return aiCredits >= requiredCredits
}

/**
 * Deduct AI credits from user atomically
 * Uses a transaction to prevent race conditions
 */
export async function deductAiCredits(
  userId: string,
  credits: number = 1
): Promise<{ success: boolean; remainingCredits: number }> {
  try {
    // Use transaction to ensure atomicity and prevent negative credits
    const result = await executeWithReconnect(() =>
      prisma.$transaction(async (tx) => {
        // Check current credits first
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { aiCredits: true },
        })

        if (!user) {
          throw new Error("User not found")
        }

        const currentCredits = Math.max(0, user.aiCredits || 0)

        // Prevent negative credits
        if (currentCredits < credits) {
          throw new Error("Insufficient credits")
        }

        // Deduct credits
        const updated = await tx.user.update({
          where: { id: userId },
          data: {
            aiCredits: {
              decrement: credits,
            },
          },
          select: {
            aiCredits: true,
          },
        })

        return {
          success: true,
          remainingCredits: Math.max(0, updated.aiCredits),
        }
      })
    )

    return result
  } catch (error: any) {
    console.error("Error deducting AI credits:", error)
    return {
      success: false,
      remainingCredits: 0,
    }
  }
}

