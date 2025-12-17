"use client"

import { useState, useEffect } from "react"
import type { SubscriberInfo } from "@/lib/types"

interface SubscribersStatsProps {
  creatorId: string
}

interface RevenueSummary {
  totalSubscribers: number
  monthlyRevenue: number
  byTier: Record<string, { count: number; revenue: number }>
}

export default function SubscribersStats({ creatorId }: SubscribersStatsProps) {
  const [subscribers, setSubscribers] = useState<SubscriberInfo[]>([])
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(true)
  const [followerCount, setFollowerCount] = useState<number | null>(null)

  useEffect(() => {
    fetchSubscribers()
    fetchFollowers()
  }, [creatorId])

  const fetchSubscribers = async () => {
    try {
      const res = await fetch("/api/creator/subscribers")
      const data = await res.json()

      if (res.ok) {
        setSubscribers(data.subscribers || [])
        setRevenueSummary(data.revenueSummary || null)
      }
    } catch (err) {
      console.error("Subscribers fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFollowers = async () => {
    try {
      const res = await fetch(`/api/creator/${creatorId}/followers`)
      if (!res.ok) return
      const data = await res.json()
      setFollowerCount(typeof data.count === "number" ? data.count : 0)
    } catch (err) {
      console.error("Followers fetch error:", err)
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {revenueSummary?.totalSubscribers || 0}
          </div>
          <div className="text-gray-600">Total Subscribers</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            ${(revenueSummary?.monthlyRevenue || 0).toFixed(2)}
          </div>
          <div className="text-gray-600">Monthly Revenue</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {Object.keys(revenueSummary?.byTier || {}).length}
          </div>
          <div className="text-gray-600">Active Tiers</div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6 md:col-span-3 lg:col-span-1">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {followerCount !== null ? followerCount.toLocaleString() : "—"}
          </div>
          <div className="text-gray-600">Followers</div>
          <p className="text-xs text-gray-500 mt-1">
            Fans who follow you for free and paid updates
          </p>
        </div>
      </div>

      {/* Subscribers List */}
      {subscribers.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Subscribers ({subscribers.length})
          </h3>
          <div className="space-y-3">
            {subscribers.map((subscriber) => (
              <div
                key={subscriber.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {subscriber.fan.email}
                  </p>
                  <p className="text-sm text-gray-600">
                    {subscriber.tierName} Tier - ${subscriber.tierPrice}/month
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Since {new Date(subscriber.startDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue by Tier */}
      {revenueSummary && Object.keys(revenueSummary.byTier).length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Revenue by Tier
          </h3>
          <div className="space-y-3">
            {Object.entries(revenueSummary.byTier).map(([tierName, data]) => (
              <div
                key={tierName}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div>
                  <p className="font-medium text-gray-900">{tierName}</p>
                  <p className="text-sm text-gray-600">
                    {data.count} subscriber{data.count !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">
                    ${data.revenue.toFixed(2)}/month
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

