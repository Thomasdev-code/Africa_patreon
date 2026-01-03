/**
 * Server-safe utility to get the application base URL
 * 
 * Priority:
 * 1. APP_URL (explicit app URL for production)
 * 2. NEXTAUTH_URL (fallback, commonly set in production)
 * 3. http://localhost:3000 (development fallback only)
 * 
 * This ensures production never uses localhost, while development
 * still works without configuration.
 */
export function getAppUrl(): string {
  return (
    process.env.APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  )
}

