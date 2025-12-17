import { NextRequest, NextResponse } from "next/server"
import { processDunningAttempts } from "@/lib/dunning/dunning-engine"

// Protect with secret token
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = req.headers.get("authorization")
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await processDunningAttempts()

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Dunning cron error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

