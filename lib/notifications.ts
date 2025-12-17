import { prisma } from "@/lib/prisma"
import type { NotificationType } from "@/lib/types"

/**
 * Helper function to create notifications
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  link?: string | null
) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        link: link || null,
      },
    })
  } catch (error) {
    console.error("Notification creation error:", error)
  }
}

/**
 * Notify creator of new subscription
 */
export async function notifyNewSubscription(
  creatorId: string,
  fanEmail: string,
  tierName: string
) {
  await createNotification(
    creatorId,
    "subscription",
    "New Subscriber!",
    `${fanEmail} subscribed to your ${tierName} tier`,
    `/creator/dashboard`
  )
}

/**
 * Notify creator of subscription cancellation
 */
export async function notifySubscriptionCancellation(
  creatorId: string,
  fanEmail: string,
  tierName: string
) {
  await createNotification(
    creatorId,
    "subscription",
    "Subscription Cancelled",
    `${fanEmail} cancelled their ${tierName} tier subscription`,
    `/creator/dashboard`
  )
}

/**
 * Notify user of new comment (already handled in comment API, but kept for consistency)
 */
export async function notifyNewComment(
  userId: string,
  commenterEmail: string,
  postTitle: string,
  link: string
) {
  await createNotification(
    userId,
    "comment",
    "New comment on your post",
    `${commenterEmail} commented on "${postTitle}"`,
    link
  )
}

/**
 * Notify user of new reply
 */
export async function notifyNewReply(
  userId: string,
  replierEmail: string,
  link: string
) {
  await createNotification(
    userId,
    "reply",
    "New reply to your comment",
    `${replierEmail} replied to your comment`,
    link
  )
}

/**
 * Notify user of new message (already handled in message API, but kept for consistency)
 */
export async function notifyNewMessage(
  userId: string,
  senderEmail: string,
  preview: string,
  link: string
) {
  await createNotification(
    userId,
    "message",
    `New message from ${senderEmail}`,
    preview,
    link
  )
}

