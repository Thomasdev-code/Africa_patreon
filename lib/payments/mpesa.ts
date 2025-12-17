/**
 * Unified M-Pesa Payment Wrapper
 * Uses Flutterwave and Paystack Mobile Money APIs (NO Daraja)
 */

import { flutterwaveSDK, paystackSDK } from "./payment-providers"
import type { PaymentStatus } from "./types"

export interface MpesaPaymentRequest {
  amount: number
  currency: string
  phoneNumber: string
  userId: string
  creatorId: string
  tierId?: string
  tierName: string
  metadata?: Record<string, any>
}

export interface MpesaPaymentResult {
  success: boolean
  provider: "FLUTTERWAVE" | "PAYSTACK"
  reference: string
  status: PaymentStatus
  metadata?: Record<string, any>
  error?: string
}

/**
 * Format phone number to Kenya format (254XXXXXXXXX)
 */
function formatPhoneNumber(phone: string): string {
  let formatted = phone.replace(/[^0-9]/g, "")
  
  if (formatted.startsWith("0")) {
    formatted = `254${formatted.substring(1)}`
  } else if (!formatted.startsWith("254")) {
    formatted = `254${formatted}`
  }
  
  return formatted
}

/**
 * Send M-Pesa STK Push via Flutterwave (primary) or Paystack (fallback)
 */
export async function sendMpesaStkPush(
  request: MpesaPaymentRequest
): Promise<MpesaPaymentResult> {
  const formattedPhone = formatPhoneNumber(request.phoneNumber)

  // Try Flutterwave first
  try {
    const result = await flutterwaveSDK.createMpesaPayment({
      amount: request.amount,
      currency: request.currency,
      phoneNumber: formattedPhone,
      userId: request.userId,
      creatorId: request.creatorId,
      tierName: request.tierName,
      metadata: request.metadata,
    })

    return {
      success: true,
      provider: "FLUTTERWAVE",
      reference: result.reference,
      status: result.status,
      metadata: result.metadata,
    }
  } catch (error: any) {
    console.error("Flutterwave M-Pesa failed, trying Paystack:", error.message)
    
    // Fallback to Paystack
    try {
      const result = await paystackSDK.createMpesaPayment({
        amount: request.amount,
        currency: request.currency,
        phoneNumber: formattedPhone,
        userId: request.userId,
        creatorId: request.creatorId,
        tierName: request.tierName,
        metadata: request.metadata,
      })

      return {
        success: true,
        provider: "PAYSTACK",
        reference: result.reference,
        status: result.status,
        metadata: result.metadata,
      }
    } catch (paystackError: any) {
      return {
        success: false,
        provider: "FLUTTERWAVE",
        reference: "",
        status: "failed",
        error: `Flutterwave: ${error.message}, Paystack: ${paystackError.message}`,
      }
    }
  }
}

/**
 * Verify M-Pesa transaction status
 */
export async function verifyMpesaTransaction(
  provider: "FLUTTERWAVE" | "PAYSTACK",
  reference: string
): Promise<{
  status: PaymentStatus
  amount: number
  currency: string
  metadata?: Record<string, any>
}> {
  if (provider === "FLUTTERWAVE") {
    return await flutterwaveSDK.checkMpesaStatus(reference)
  } else {
    return await paystackSDK.checkMpesaStatus(reference)
  }
}

/**
 * Check if phone number is valid Kenya M-Pesa number
 */
export function isValidMpesaNumber(phone: string): boolean {
  const formatted = formatPhoneNumber(phone)
  // Kenya M-Pesa numbers: 2547XXXXXXXX (10 digits after 254)
  return /^2547\d{8}$/.test(formatted)
}

export default {
  sendMpesaStkPush,
  verifyMpesaTransaction,
  isValidMpesaNumber,
  formatPhoneNumber,
}

