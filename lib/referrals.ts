import { prisma } from "@/lib/prisma"

/**
 * Generate a unique referral code for a user
 */
export async function generateReferralCode(
  userId: string,
  username?: string
): Promise<string> {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, referralCode: true },
  })

  if (!user) {
    throw new Error(`User with id ${userId} not found. Please ensure the user is created before generating a referral code.`)
  }

  // If user already has a referral code, return it (unless we want to regenerate)
  if (user.referralCode) {
    return user.referralCode
  }

  // Try to use username if available
  if (username) {
    const baseCode = username.toLowerCase().replace(/[^a-z0-9]/g, "")
    const code = `${baseCode}${Math.random().toString(36).substring(2, 6)}`
    
    // Check if code exists
    const existing = await prisma.user.findUnique({
      where: { referralCode: code },
    })
    
    if (!existing) {
      await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
      })
      return code
    }
  }
  
  // Generate random code
  let code: string
  let exists = true
  
  while (exists) {
    code = `ref${Math.random().toString(36).substring(2, 10)}`
    const existing = await prisma.user.findUnique({
      where: { referralCode: code },
    })
    exists = !!existing
  }
  
  await prisma.user.update({
    where: { id: userId },
    data: { referralCode: code! },
  })
  
  return code!
}

/**
 * Track referral click
 */
export async function trackReferralClick(
  referralCode: string,
  referrerId: string
): Promise<void> {
  const referralLink = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/r/${referralCode}`
  
  await prisma.referral.create({
    data: {
      referrerId,
      referralCode,
      referralLink,
      type: "click",
      status: "clicked",
    },
  })
}

/**
 * Calculate referral credits based on type and subscription value
 */
export function calculateReferralCredits(
  type: "signup" | "subscription",
  subscriptionValue?: number,
  tierName?: string
): number {
  if (type === "signup") {
    return 5.0 // $5 credit for signup
  }
  
  if (type === "subscription" && subscriptionValue) {
    // Base commission: 10% of subscription value
    let commissionRate = 10.0
    
    // Tier multipliers for commission rate
    const tierMultipliers: Record<string, number> = {
      "Basic": 1.0,
      "Premium": 1.5,
      "Pro": 2.0,
      "Elite": 2.5,
    }
    
    if (tierName) {
      const multiplier = tierMultipliers[tierName] || 1.0
      commissionRate = commissionRate * multiplier
    }
    
    return (subscriptionValue * commissionRate) / 100
  }
  
  return 0
}

/**
 * Calculate referral commission rate
 */
export function getReferralCommissionRate(tierName?: string): number {
  const baseRate = 10.0 // 10% base commission
  
  if (!tierName) {
    return baseRate
  }
  
  const tierMultipliers: Record<string, number> = {
    "Basic": 1.0,
    "Premium": 1.5,
    "Pro": 2.0,
    "Elite": 2.5,
  }
  
  const multiplier = tierMultipliers[tierName] || 1.0
  return baseRate * multiplier
}

/**
 * Award referral credits
 */
export async function awardReferralCredits(
  userId: string,
  referralId: string,
  amount: number,
  type: "signup" | "subscription" | "bonus",
  description: string
): Promise<void> {
  await prisma.referralCredit.create({
    data: {
      userId,
      referralId,
      amount,
      type,
      status: "available",
      description,
    },
  })
}

/**
 * Award credits for referral signup
 */
export async function awardSignupCredits(
  referrerId: string,
  referredUserId: string,
  referralId: string
): Promise<void> {
  const SIGNUP_CREDIT = 5.0 // $5 credit for signup
  
  await awardReferralCredits(
    referrerId,
    referralId,
    SIGNUP_CREDIT,
    "signup",
    "Referral signup bonus"
  )
  
  // Update referral status
  await prisma.referral.update({
    where: { id: referralId },
    data: {
      status: "signed_up",
      convertedAt: new Date(),
      creditsEarned: SIGNUP_CREDIT,
    },
  })
}

/**
 * Award credits for referral subscription
 */
export async function awardSubscriptionCredits(
  referrerId: string,
  subscriptionId: string,
  subscriptionValue: number,
  tierName: string
): Promise<void> {
  // Base credit: 10% of subscription value
  const baseCredit = subscriptionValue * 0.1
  
  // Tier multipliers
  const tierMultipliers: Record<string, number> = {
    "Basic": 1.0,
    "Premium": 1.5,
    "Pro": 2.0,
    "Elite": 2.5,
  }
  
  const multiplier = tierMultipliers[tierName] || 1.0
  const creditAmount = baseCredit * multiplier
  
  // Find the referral that led to this subscription
  const referral = await prisma.referral.findFirst({
    where: {
      referrerId,
      subscriptionId,
    },
  })
  
  if (referral) {
    // Create credit
    await prisma.referralCredit.create({
      data: {
        userId: referrerId,
        referralId: referral.id,
        amount: creditAmount,
        type: "subscription",
        status: "available",
        description: `Referral subscription bonus (${tierName} tier)`,
      },
    })
    
    // Update referral
    await prisma.referral.update({
      where: { id: referral.id },
      data: {
        status: "credited",
        creditsEarned: creditAmount,
      },
    })
  }
}

/**
 * Get referral stats for a user
 */
export async function getReferralStats(userId: string) {
  const [referrals, credits] = await Promise.all([
    prisma.referral.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.referralCredit.findMany({
      where: { userId },
    }),
  ])
  
  const totalClicks = await prisma.referral.count({
    where: {
      referrerId: userId,
      type: "click",
    },
  })
  
  const totalSignups = await prisma.referral.count({
    where: {
      referrerId: userId,
      status: { in: ["signed_up", "converted", "credited"] },
    },
  })
  
  const totalConversions = await prisma.referral.count({
    where: {
      referrerId: userId,
      status: { in: ["converted", "credited"] },
    },
  })
  
  const availableCredits = credits
    .filter((c) => c.status === "available")
    .reduce((sum, c) => sum + c.amount, 0)
  
  const withdrawnCredits = credits
    .filter((c) => c.status === "withdrawn")
    .reduce((sum, c) => sum + c.amount, 0)
  
  const totalCreditsEarned = credits.reduce((sum, c) => sum + c.amount, 0)
  
  // Tier breakdown
  const tierBreakdown: Record<string, { count: number; credits: number; revenue: number }> = {}
  
  referrals.forEach((ref) => {
    if (ref.subscriptionValue && ref.type === "subscription") {
      // Get tier name from subscription
      // This is simplified - you might need to join with Subscription table
      const tier = "Unknown" // Would need to fetch from subscription
      if (!tierBreakdown[tier]) {
        tierBreakdown[tier] = { count: 0, credits: 0, revenue: 0 }
      }
      tierBreakdown[tier].count++
      tierBreakdown[tier].credits += ref.creditsEarned
      tierBreakdown[tier].revenue += ref.subscriptionValue
    }
  })
  
  return {
    totalClicks,
    totalSignups,
    totalConversions,
    totalCreditsEarned,
    availableCredits,
    withdrawnCredits,
    tierBreakdown,
    recentReferrals: referrals,
  }
}
