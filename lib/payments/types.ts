/**
 * Payment Provider Types
 */

export type PaymentProvider = "STRIPE" | "PAYSTACK" | "FLUTTERWAVE"

export type PaymentStatus = "pending" | "success" | "failed" | "cancelled"

export interface PaymentInitRequest {
  userId: string
  creatorId: string
  tierName: string
  tierPrice: number
  currency?: string
  provider?: PaymentProvider // Optional: if not provided, auto-select
  country?: string // For auto-selection
  metadata?: Record<string, any>
}

export interface PaymentInitResponse {
  success: boolean
  paymentId: string
  provider: PaymentProvider
  reference: string
  redirectUrl: string
  metadata?: Record<string, any>
}

export interface PaymentVerification {
  status: PaymentStatus
  reference: string
  amount: number
  currency: string
  metadata?: Record<string, any>
}

export interface WebhookPayload {
  provider: PaymentProvider
  event: string
  data: any
  signature?: string
}

export interface PaymentProviderInterface {
  /**
   * Initialize a payment and return redirect URL
   */
  createPayment(
    amount: number,
    currency: string,
    userId: string,
    creatorId: string,
    tierName: string,
    metadata?: Record<string, any>
  ): Promise<{
    reference: string
    redirectUrl: string
    metadata?: Record<string, any>
  }>

  /**
   * Verify a payment by reference
   */
  verifyPayment(reference: string): Promise<PaymentVerification>

  /**
   * Handle webhook event
   */
  handleWebhook(
    payload: any,
    signature?: string
  ): Promise<{
    event: string
    reference: string
    status: PaymentStatus
    amount: number
    currency: string
    metadata?: Record<string, any>
  }>
}

