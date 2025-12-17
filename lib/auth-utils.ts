/**
 * Authentication Utilities
 * Secure token generation and validation for password reset
 */

import crypto from "crypto"

/**
 * Generate a secure random token (hex string)
 * @returns 32-byte hex token (64 characters)
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

/**
 * Hash a token using SHA-256
 * Used for storing tokens securely in database
 * @param token - The plain token to hash
 * @returns Hashed token (hex string)
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex")
}

/**
 * Verify a token against a hashed token
 * @param token - Plain token from user
 * @param hashedToken - Hashed token from database
 * @returns true if tokens match
 */
export function verifyToken(token: string, hashedToken: string): boolean {
  const tokenHash = hashToken(token)
  return crypto.timingSafeEqual(
    Buffer.from(tokenHash),
    Buffer.from(hashedToken)
  )
}

/**
 * Check if a token is expired
 * @param expiresAt - Expiration date
 * @returns true if token is expired
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt
}

/**
 * Generate expiration date (default: 30 minutes from now)
 * @param minutes - Minutes until expiration (default: 30)
 * @returns Expiration date
 */
export function generateExpirationDate(minutes: number = 30): Date {
  const expiration = new Date()
  expiration.setMinutes(expiration.getMinutes() + minutes)
  return expiration
}
