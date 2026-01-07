/**
 * Environment variable validation utility
 * Validates required env vars at boot and fails fast with clear errors
 */

const REQUIRED_ENV_VARS = {
  // Cloudinary (required for media uploads)
  CLOUDINARY_CLOUD_NAME: "Cloudinary cloud name",
  CLOUDINARY_API_KEY: "Cloudinary API key",
  CLOUDINARY_API_SECRET: "Cloudinary API secret",
  
  // Database
  DATABASE_URL: "Database connection URL",
  
  // NextAuth
  NEXTAUTH_SECRET: "NextAuth secret for session encryption",
  NEXTAUTH_URL: "NextAuth URL (base URL of the application)",
} as const

const OPTIONAL_ENV_VARS = {
  APP_URL: "Application URL (falls back to NEXTAUTH_URL)",
} as const

/**
 * Validate required environment variables
 * Throws error with clear message if any are missing
 */
export function validateRequiredEnvVars(): void {
  const missing: string[] = []

  for (const [key, description] of Object.entries(REQUIRED_ENV_VARS)) {
    if (!process.env[key]) {
      missing.push(`${key} (${description})`)
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.map((v) => `  - ${v}`).join("\n")}\n\n` +
      `Please set these in your Vercel project settings or .env.local file.`
    )
  }
}

/**
 * Get application URL with fallback chain
 * Production-safe: prefers APP_URL → NEXTAUTH_URL → localhost fallback
 * Note: Use getAppUrl() from lib/app-url.ts for consistency
 */
export function getAppUrlFromEnv(): string {
  return (
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  )
}

/**
 * Validate Cloudinary configuration
 * Returns true if all Cloudinary env vars are set
 */
export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  )
}

