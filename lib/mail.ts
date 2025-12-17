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
    return {
      sendMail: async (options: MailOptions) => {
        console.log("📧 Email (Development Mode):")
        console.log("To:", options.to)
        console.log("Subject:", options.subject)
        console.log("Body:", options.text || options.html)
        return { messageId: "dev-" + Date.now() }
      },
    }
  }

  // Production/Development with SMTP
  return nodemailer.createTransport({
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
}

/**
 * Send an email
 * @param options - Email options
 * @returns Promise resolving to message info
 */
export async function sendEmail(options: MailOptions): Promise<void> {
  try {
    const transporter = createTransporter()
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@africapatreon.com",
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""), // Strip HTML for text version
    })
  } catch (error) {
    console.error("Email sending error:", error)
    throw new Error("Failed to send email. Please try again later.")
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

