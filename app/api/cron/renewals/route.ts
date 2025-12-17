import { NextRequest, NextResponse } from "next/server"
import { processDueRenewals } from "@/lib/subscriptions/renewal"

/**
 * Cron job endpoint for processing subscription renewals
 * Call this via Vercel Cron, GitHub Actions, or external cron service
 * 
 * Example Vercel cron config (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/renewals",
 *     "schedule": "0 0 * * *"
 *   }]
 * }
 */
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = req.headers.get("authorization")
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await processDueRenewals()

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Renewal cron error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

