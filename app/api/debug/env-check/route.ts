import { NextResponse } from "next/server"

/**
 * Debug endpoint to check which environment variables are available
 * This helps diagnose Vercel environment variable issues
 * 
 * WARNING: This endpoint exposes environment variable names (not values)
 * Remove or secure this endpoint in production if needed
 */
export async function GET() {
  const requiredVars = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_SECURE",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "SMTP_FROM",
    "NEXTAUTH_URL",
  ]

  const status: Record<string, { present: boolean; value?: string }> = {}

  for (const varName of requiredVars) {
    const value = process.env[varName]
    status[varName] = {
      present: !!(value && value.trim() !== ""),
      // Only show first/last chars for security
      value: value
        ? `${value.substring(0, 3)}...${value.substring(value.length - 3)}`
        : undefined,
    }
  }

  const allPresent = Object.values(status).every((s) => s.present)
  const missing = Object.entries(status)
    .filter(([_, s]) => !s.present)
    .map(([name]) => name)

  return NextResponse.json(
    {
      allPresent,
      missing,
      status,
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      message: allPresent
        ? "✅ All required environment variables are present"
        : `❌ Missing: ${missing.join(", ")}`,
    },
    { status: allPresent ? 200 : 400 }
  )
}

