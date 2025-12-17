"use client"

import type { ReferralStats as ReferralStatsType } from "@/lib/types"

interface ReferralStatsProps {
  stats: ReferralStatsType
}

export default function ReferralStats({ stats }: ReferralStatsProps) {
  // Safety check - provide default values if stats is undefined
  if (!stats) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Referral Statistics</h2>
        <p className="text-gray-600">Loading statistics...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Referral Statistics</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <p className="text-sm text-blue-600 font-medium mb-1">Total Clicks</p>
          <p className="text-3xl font-bold text-blue-900">{stats.totalClicks || 0}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <p className="text-sm text-green-600 font-medium mb-1">Total Signups</p>
          <p className="text-3xl font-bold text-green-900">{stats.totalSignups || 0}</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <p className="text-sm text-purple-600 font-medium mb-1">Conversions</p>
          <p className="text-3xl font-bold text-purple-900">{stats.totalConversions || 0}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <p className="text-sm text-yellow-600 font-medium mb-1">Credits Earned</p>
          <p className="text-3xl font-bold text-yellow-900">
            ${(stats.totalCreditsEarned || 0).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Tier Breakdown */}
      {stats.tierBreakdown && Object.keys(stats.tierBreakdown).length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Earnings by Tier
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.tierBreakdown).map(([tier, data]) => (
              <div
                key={tier}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-semibold text-gray-900">{tier} Tier</p>
                  <p className="text-sm text-gray-600">
                    {data.count} conversion{data.count !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">
                    ${data.credits.toFixed(2)} credits
                  </p>
                  <p className="text-sm text-gray-600">
                    ${data.revenue.toFixed(2)} revenue
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Referrals */}
      {stats.recentReferrals && stats.recentReferrals.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Referrals
          </h3>
          <div className="space-y-2">
            {stats.recentReferrals.slice(0, 5).map((referral) => (
              <div
                key={referral.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {referral.type === "click"
                      ? "Link clicked"
                      : referral.type === "signup"
                      ? "User signed up"
                      : "Subscription converted"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(referral.clickedAt).toLocaleDateString()}
                  </p>
                </div>
                {referral.creditsEarned > 0 && (
                  <p className="text-sm font-semibold text-green-600">
                    +${referral.creditsEarned.toFixed(2)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

