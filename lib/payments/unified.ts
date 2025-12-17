/**
 * Unified Payment Processing Layer
 */

import { getPaymentProvider } from "./index"
import type { PaymentProvider, PaymentStatus } from "./types"
import { prisma } from "@/lib/prisma"

export interface ProcessPaymentInput {
  provider: PaymentProvider
  amount: number
  currency: string
  userId: string
  creatorId: string
  tierName: string
  metadata?: Record<string, any>
}

export interface ProcessPaymentOutput {
  success: boolean
  paymentId?: string
  reference: string
  redirectUrl?: string
  metadata?: Record<string, any>
  error?: string
}

export interface VerifyPaymentInput {
  provider: PaymentProvider
  reference: string
}

export interface RefundPaymentInput {
  provider: PaymentProvider
  reference: string
  amount?: number
  reason?: string
}

/**
 * Process a payment through any provider
 */
export async function processPayment(
  input: ProcessPaymentInput
): Promise<ProcessPaymentOutput> {
  try {
    const provider = getPaymentProvider(input.provider)

    // Create payment record first
    const payment = await prisma.payment.create({
      data: {
        userId: input.userId,
        creatorId: input.creatorId,
        tierName: input.tierName,
        tierPrice: input.amount,
        provider: input.provider,
        reference: `TEMP_${Date.now()}`, // Will be updated
        amount: Math.round(input.amount * 100),
        currency: input.currency,
        status: "pending",
        metadata: input.metadata || {},
      },
    })

    // Initialize payment with provider
    const result = await provider.createPayment(
      input.amount,
      input.currency,
      input.userId,
      input.creatorId,
      input.tierName,
      input.metadata
    )

    // Update payment with actual reference
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        reference: result.reference,
        metadata: {
          ...(payment.metadata as any),
          ...result.metadata,
        },
      },
    })

    return {
      success: true,
      paymentId: payment.id,
      reference: result.reference,
      redirectUrl: result.redirectUrl,
      metadata: result.metadata,
    }
  } catch (error: any) {
    console.error("Payment processing error:", error)
    return {
      success: false,
      reference: "",
      error: error.message || "Payment processing failed",
    }
  }
}

/**
 * Verify a payment by reference
 */
export async function verifyPayment(
  input: VerifyPaymentInput
): Promise<{
  success: boolean
  status: PaymentStatus
  amount: number
  currency: string
  metadata?: Record<string, any>
  error?: string
}> {
  try {
    const provider = getPaymentProvider(input.provider)
    const verification = await provider.verifyPayment(input.reference)

    // Update payment record
    const payment = await prisma.payment.findUnique({
      where: { reference: input.reference },
    })

    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: verification.status,
          metadata: {
            ...(payment.metadata as any),
            verification: verification.metadata,
          },
        },
      })
    }

    return {
      success: true,
      status: verification.status,
      amount: verification.amount,
      currency: verification.currency,
      metadata: verification.metadata,
    }
  } catch (error: any) {
    console.error("Payment verification error:", error)
    return {
      success: false,
      status: "failed",
      amount: 0,
      currency: "USD",
      error: error.message || "Payment verification failed",
    }
  }
}

/**
 * Refund a payment
 */
export async function refundPayment(
  input: RefundPaymentInput
): Promise<{
  success: boolean
  refundId?: string
  error?: string
}> {
  try {
    // Find payment
    const payment = await prisma.payment.findUnique({
      where: { reference: input.reference },
    })

    if (!payment) {
      return {
        success: false,
        error: "Payment not found",
      }
    }

    if (payment.status !== "success") {
      return {
        success: false,
        error: "Can only refund successful payments",
      }
    }

    // Provider-specific refund logic
    const provider = getPaymentProvider(input.provider)

    // For now, mark as refunded in database
    // In production, call provider's refund API
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "cancelled",
        metadata: {
          ...(payment.metadata as any),
          refunded: true,
          refundAmount: input.amount || payment.amount / 100,
          refundReason: input.reason,
        },
      },
    })

    return {
      success: true,
      refundId: payment.id,
    }
  } catch (error: any) {
    console.error("Refund error:", error)
    return {
      success: false,
      error: error.message || "Refund failed",
    }
  }
}

