export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { calculateRiskScore } from "@/lib/risk-engine"
import { createNotification } from "@/lib/notifications"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { provider, event, data } = body

    // Handle chargeback events from different providers
    let chargebackData: {
      userId: string
      creatorId: string
      paymentId: string
      transactionId: string
      amount: number
      currency: string
      reason?: string
    }

    switch (provider) {
      case "STRIPE":
        // Stripe chargeback.dispute.created event
        if (event === "chargeback.dispute.created" || event === "charge.dispute.created") {
          const dispute = data.object
          chargebackData = {
            userId: dispute.metadata?.userId || "",
            creatorId: dispute.metadata?.creatorId || "",
            paymentId: dispute.payment_intent || "",
            transactionId: dispute.id,
            amount: dispute.amount || 0,
            currency: dispute.currency?.toUpperCase() || "USD",
            reason: dispute.reason,
          }
        } else {
          return NextResponse.json({ received: true })
        }
        break

      case "PAYSTACK":
        // Paystack chargeback webhook
        if (data.event === "chargeback") {
          chargebackData = {
            userId: data.customer?.metadata?.userId || "",
            creatorId: data.metadata?.creatorId || "",
            paymentId: data.reference || "",
            transactionId: data.id || data.reference,
            amount: data.amount || 0,
            currency: data.currency?.toUpperCase() || "NGN",
            reason: data.reason,
          }
        } else {
          return NextResponse.json({ received: true })
        }
        break

      case "FLUTTERWAVE":
        // Flutterwave chargeback webhook
        if (data.event === "chargeback") {
          chargebackData = {
            userId: data.customer?.id || "",
            creatorId: data.meta?.creatorId || "",
            paymentId: data.tx_ref || "",
            transactionId: data.id?.toString() || "",
            amount: data.amount || 0,
            currency: data.currency?.toUpperCase() || "NGN",
            reason: data.reason,
          }
        } else {
          return NextResponse.json({ received: true })
        }
        break

      default:
        return NextResponse.json({ received: true })
    }

    // Find payment to get creator ID if not in metadata
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { reference: chargebackData.transactionId },
          { id: chargebackData.paymentId },
        ],
      },
    })

    if (!payment) {
      console.warn(`Payment not found for chargeback: ${chargebackData.transactionId}`)
      return NextResponse.json({ received: true })
    }

    const finalCreatorId = chargebackData.creatorId || payment.creatorId
    const finalUserId = chargebackData.userId || payment.userId

    // Create chargeback record
    const chargeback = await (prisma as any).chargeback.create({
      data: {
        userId: finalUserId,
        creatorId: finalCreatorId,
        paymentId: payment.id,
        provider: provider.toUpperCase(),
        transactionId: chargebackData.transactionId,
        amount: chargebackData.amount,
        currency: chargebackData.currency,
        status: "open",
        reason: chargebackData.reason,
      },
    })

    // Freeze creator wallet
    const wallet = await (prisma as any).creatorWallet.findUnique({
      where: { userId: finalCreatorId },
    })

    if (wallet) {
      await (prisma as any).creatorWallet.update({
        where: { userId: finalCreatorId },
        data: {
          frozen: true,
          frozenReason: `Chargeback: ${chargeback.id}`,
        },
      })
    }

    // Update risk score
    await calculateRiskScore(finalCreatorId)

    // Notify admin and creator
    await createNotification(
      finalCreatorId,
      "chargeback",
      "Chargeback Received",
      `A chargeback of ${chargebackData.amount / 100} ${chargebackData.currency} has been filed. Your wallet has been frozen pending resolution.`,
      `/admin/chargebacks/${chargeback.id}`
    )

    // Notify admin
    const admin = await prisma.user.findFirst({
      where: { role: "admin" },
    })

    if (admin) {
      await createNotification(
        admin.id,
        "chargeback",
        "New Chargeback",
        `Chargeback filed for payment ${payment.id} by creator ${finalCreatorId}`,
        `/admin/chargebacks/${chargeback.id}`
      )
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Chargeback webhook error:", error)
    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 400 }
    )
  }
}

