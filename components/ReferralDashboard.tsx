"use client"

import { useState, useEffect } from "react"
import ShareButtons from "@/components/ShareButtons"
import ReferralStats from "@/components/ReferralStats"
import ReferralCredits from "@/components/ReferralCredits"
import type { ReferralDashboard as ReferralDashboardType } from "@/lib/types"

export default function ReferralDashboard() {
  const [dashboard, setDashboard] = useState<ReferralDashboardType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/referrals/me")
      const data = await res.json()

      if (res.ok) {
        setDashboard(data)
      } else {
        setError(data.error || "Failed to load referral dashboard")
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err)
      setError("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading referral dashboard...</p>
      </div>
    )
  }

  if (error || !dashboard) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error || "Failed to load dashboard"}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Referral Link Section */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Your Referral Link
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Referral Code
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={dashboard.referralCode}
                readOnly
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 font-mono"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(dashboard.referralCode)
                  alert("Referral code copied!")
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Referral Link
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={dashboard.referralLink}
                readOnly
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 bg-gray-50"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(dashboard.referralLink)
                  alert("Referral link copied!")
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Copy Link
              </button>
            </div>
          </div>
          <ShareButtons
            referralLink={dashboard.referralLink}
            referralCode={dashboard.referralCode}
          />
        </div>
      </div>

      {/* Stats */}
      <ReferralStats stats={dashboard.stats} />

      {/* Credits */}
      <ReferralCredits credits={dashboard.credits} onWithdraw={fetchDashboard} />
    </div>
  )
}
