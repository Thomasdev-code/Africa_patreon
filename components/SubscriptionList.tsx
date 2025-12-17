"use client"

import { useState, useEffect } from "react"
import Avatar from "@/components/Avatar"
import type { SubscriptionWithCreator } from "@/lib/types"

interface SubscriptionListProps {
  subscriptions: SubscriptionWithCreator[]
  onCancel?: (subscriptionId: string) => void
  showCancelButton?: boolean
}

export default function SubscriptionList({
  subscriptions,
  onCancel,
  showCancelButton = true,
}: SubscriptionListProps) {
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const handleCancel = async (subscriptionId: string) => {
    if (!confirm("Are you sure you want to cancel this subscription?")) {
      return
    }

    setCancellingId(subscriptionId)

    try {
      const res = await fetch("/api/subscribe/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || "Failed to cancel subscription")
        setCancellingId(null)
        return
      }

      if (onCancel) {
        onCancel(subscriptionId)
      } else {
        // Reload page to refresh subscriptions
        window.location.reload()
      }
    } catch (err) {
      console.error("Cancel subscription error:", err)
      alert("An error occurred. Please try again.")
      setCancellingId(null)
    }
  }

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600">
        <p>No active subscriptions</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {subscriptions.map((subscription) => (
        <div
          key={subscription.id}
          className="bg-white rounded-lg shadow-md p-6 border border-gray-200"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <Avatar
                src={subscription.creator.avatarUrl}
                alt={subscription.creator.username}
                size="md"
              />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  @{subscription.creator.username}
                </h3>
                <p className="text-gray-600 mt-1">
                  {subscription.tierName} Tier - ${subscription.tierPrice}/month
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Subscribed since{" "}
                  {new Date(subscription.startDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            {showCancelButton && (
              <button
                onClick={() => handleCancel(subscription.id)}
                disabled={cancellingId === subscription.id}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {cancellingId === subscription.id ? "Cancelling..." : "Cancel"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

