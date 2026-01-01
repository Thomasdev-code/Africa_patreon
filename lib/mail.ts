/**
 * Email Service
 * Handles sending emails for password reset and other notifications
 * Uses Nodemailer for development and production
 */

import nodemailer from "nodemailer"

interface MailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

/**
 * Create email transporter
 * Supports multiple environments:
 * - Development: Uses SMTP or console logging
 * - Production: Uses configured SMTP settings
 */
function createTransporter() {
  // In development, use console logging if no SMTP configured
  if (process.env.NODE_ENV === "development" && !process.env.SMTP_HOST) {
    console.warn("⚠️  SMTP not configured - emails will be logged to console only")
    return {
      sendMail: async (options: MailOptions) => {
        console.log("📧 Email (Development Mode - NOT SENT):")
        console.log("To:", options.to)
        console.log("Subject:", options.subject)
        console.log("Body:", options.text || options.html)
        return { messageId: "dev-" + Date.now() }
      },
    }
  }

  // Validate SMTP credentials
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    const error = new Error("SMTP credentials not configured. Please set SMTP_USER and SMTP_PASSWORD environment variables.")
    console.error("❌ Email configuration error:", error.message)
    throw error
  }

  // Production/Development with SMTP
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    // For Gmail, you may need to enable "Less secure app access"
    // or use an App Password
  })

  // Verify connection on creation (optional, but helpful for debugging)
  transporter.verify().catch((error) => {
    console.error("⚠️  SMTP connection verification failed:", error.message)
    console.error("   This might not prevent emails from being sent, but check your SMTP settings.")
  })

  return transporter
}

/**
 * Send an email
 * @param options - Email options
 * @returns Promise resolving to message info
 */
export async function sendEmail(options: MailOptions): Promise<void> {
  try {
    const transporter = createTransporter()
    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@africapatreon.com",
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""), // Strip HTML for text version
    })
    
    console.log("✅ Email sent successfully:", {
      messageId: result.messageId,
      to: options.to,
      subject: options.subject,
    })
  } catch (error: any) {
    console.error("❌ Email sending error:", {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      to: options.to,
    })
    
    // Provide more specific error messages
    if (error.code === "EAUTH") {
      throw new Error("SMTP authentication failed. Please check your SMTP_USER and SMTP_PASSWORD.")
    } else if (error.code === "ECONNECTION") {
      throw new Error("Could not connect to SMTP server. Please check your SMTP_HOST and SMTP_PORT.")
    } else if (error.code === "ETIMEDOUT") {
      throw new Error("SMTP connection timed out. Please check your network connection and SMTP settings.")
    } else {
      throw new Error(`Failed to send email: ${error.message || "Unknown error"}`)
    }
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
  const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${token}`

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

  await sendEmail({
    to: email,
    subject: "Reset Your Password - Africa Patreon",
    html,
    text,
  })
}

