/**
 * Production Mailer Utility
 * Handles email sending with Gmail SMTP (PORT 465, secure: true)
 * Validates all required environment variables and fails loudly if missing
 */

import nodemailer from "nodemailer"
import { getAppUrl } from "@/lib/app-url"

interface MailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Required environment variables for email sending
 */
const REQUIRED_ENV_VARS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
  "NEXTAUTH_URL",
] as const

/**
 * Validate all required environment variables
 * Throws error with clear message if any are missing
 */
function validateEnvVars(): void {
  const missing: string[] = []
  const present: string[] = []

  // Check each required variable
  for (const varName of REQUIRED_ENV_VARS) {
    const value = process.env[varName]
    if (!value || value.trim() === "") {
      missing.push(varName)
    } else {
      present.push(varName)
    }
  }

  // Log what we found (for debugging)
  console.log("🔍 Environment variable check:", {
    present: present.length,
    missing: missing.length,
    presentVars: present,
    missingVars: missing,
    nodeEnv: process.env.NODE_ENV,
  })

  if (missing.length > 0) {
    const error = new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        `Found ${present.length}/${REQUIRED_ENV_VARS.length} variables. ` +
        "Please set all SMTP configuration variables in Vercel Settings → Environment Variables → Production."
    )
    console.error("❌ Email configuration error:", error.message)
    console.error("📋 Required variables:", REQUIRED_ENV_VARS.join(", "))
    throw error
  }

  // Validate SMTP_FROM equals SMTP_USER (Gmail requirement)
  const smtpUser = process.env.SMTP_USER!.trim()
  const smtpFrom = process.env.SMTP_FROM!.trim()

  if (smtpFrom !== smtpUser) {
    const error = new Error(
      `SMTP_FROM (${smtpFrom}) must equal SMTP_USER (${smtpUser}). ` +
        "Gmail requires sending from the authenticated address."
    )
    console.error("❌ Email configuration error:", error.message)
    throw error
  }

  // Validate SMTP_PORT is 465 for secure connection
  const port = parseInt(process.env.SMTP_PORT!)
  if (port !== 465) {
    console.warn(
      `⚠️  SMTP_PORT is ${port}, but Gmail secure connection requires 465. ` +
        "This may cause connection issues."
    )
  }

  // Validate SMTP_SECURE is true
  if (process.env.SMTP_SECURE !== "true") {
    console.warn(
      `⚠️  SMTP_SECURE is not "true". For Gmail PORT 465, secure must be true.`
    )
  }
}

/**
 * Create nodemailer transporter with Gmail SMTP
 * Validates environment variables before creating transporter
 */
function createTransporter() {
  // Log initialization (helps debug Vercel deployment issues)
  console.log("📧 Initializing SMTP transporter...")
  
  // Validate all required env vars first
  validateEnvVars()
  
  console.log("✅ All environment variables validated successfully")

  const config = {
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT!),
    secure: process.env.SMTP_SECURE === "true", // Must be true for PORT 465
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASSWORD!,
    },
  }

  console.log("📧 Creating SMTP transporter:", {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth.user,
    // Don't log password
  })

  return nodemailer.createTransport(config)
}

/**
 * Send email using Gmail SMTP
 * @param options - Email options
 * @returns Promise resolving to message info
 * @throws Error with detailed SMTP error information
 */
export async function sendMail(options: MailOptions): Promise<nodemailer.SentMessageInfo> {
  try {
    const transporter = createTransporter()
    const fromEmail = process.env.SMTP_FROM!

    const result = await transporter.sendMail({
      from: fromEmail, // Must equal SMTP_USER (validated above)
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""), // Strip HTML for text version
    })

    console.log("✅ Email sent successfully:", {
      messageId: result.messageId,
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      accepted: result.accepted,
      rejected: result.rejected,
    })

    return result
  } catch (error: any) {
    // Log detailed SMTP error information server-side
    const errorDetails = {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      responseCode: error.responseCode,
      to: options.to,
      subject: options.subject,
    }

    console.error("❌ SMTP error (server-side):", errorDetails)

    // Provide specific error messages based on error code
    let errorMessage = "Failed to send email"

    if (error.code === "EAUTH") {
      errorMessage =
        "SMTP authentication failed. Check SMTP_USER and SMTP_PASSWORD. " +
        "For Gmail, use an App Password (not your regular password)."
    } else if (error.code === "ECONNECTION") {
      errorMessage =
        `Could not connect to SMTP server ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}. ` +
        "Check SMTP_HOST and SMTP_PORT. For Gmail, use smtp.gmail.com:465."
    } else if (error.code === "ETIMEDOUT") {
      errorMessage =
        "SMTP connection timed out. Check network connectivity and firewall settings."
    } else if (error.code === "EENVELOPE") {
      errorMessage = `Invalid email address: ${options.to}`
    } else if (error.response) {
      errorMessage = `SMTP server error: ${error.response}`
    } else {
      errorMessage = `SMTP error: ${error.message || "Unknown error"}`
    }

    // Throw error with detailed message for server-side logging
    const smtpError = new Error(errorMessage)
    ;(smtpError as any).code = error.code
    ;(smtpError as any).originalError = error
    throw smtpError
  }
}

/**
 * Send password reset email
 * @param email - User's email address
 * @param token - Reset token (plain, will be in URL)
 * @returns Promise
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<void> {
  const baseUrl = getAppUrl()
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Password Reset Request</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0;">
          <p style="font-size: 16px; margin-bottom: 20px;">
            Hello,
          </p>
          <p style="font-size: 16px; margin-bottom: 20px;">
            We received a request to reset your password for your Africa Patreon account. 
            Click the button below to reset your password:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            Or copy and paste this link into your browser:
          </p>
          <p style="font-size: 12px; color: #999; word-break: break-all; background: #fff; padding: 10px; border-radius: 5px; border: 1px solid #e0e0e0;">
            ${resetUrl}
          </p>
          <p style="font-size: 14px; color: #666; margin-top: 30px;">
            This link will expire in <strong>30 minutes</strong> for security reasons.
          </p>
          <p style="font-size: 14px; color: #666; margin-top: 20px;">
            If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
          </p>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
          <p style="font-size: 12px; color: #999; text-align: center;">
            This is an automated message. Please do not reply to this email.
          </p>
        </div>
      </body>
    </html>
  `

  const text = `
Password Reset Request

Hello,

We received a request to reset your password for your Africa Patreon account.

Click this link to reset your password:
${resetUrl}

This link will expire in 30 minutes for security reasons.

If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

This is an automated message. Please do not reply to this email.
  `

  await sendMail({
    to: email,
    subject: "Reset Your Password - Africa Patreon",
    html,
    text,
  })
}

