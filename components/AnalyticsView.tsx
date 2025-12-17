"use client"

import AnalyticsCard from "@/components/AnalyticsCard"
import RevenueByTierCard from "@/components/RevenueByTierCard"
import SubscriberGrowthChart from "@/components/SubscriberGrowthChart"
import RevenueGrowthChart from "@/components/RevenueGrowthChart"
import SubscribersByTierChart from "@/components/SubscribersByTierChart"
import TopPostsList from "@/components/TopPostsList"
import type {
  SubscriberAnalytics,
  RevenueAnalytics,
  UnlocksAnalytics,
} from "@/lib/types"

interface AnalyticsViewProps {
  subscriberAnalytics: SubscriberAnalytics | null
  revenueAnalytics: RevenueAnalytics | null
  unlocksAnalytics: UnlocksAnalytics | null
  analyticsPeriod: "daily" | "weekly" | "monthly"
  setAnalyticsPeriod: (period: "daily" | "weekly" | "monthly") => void
  isLoading: boolean
}

export default function AnalyticsView({
  subscriberAnalytics,
  revenueAnalytics,
  unlocksAnalytics,
  analyticsPeriod,
  setAnalyticsPeriod,
  isLoading,
}: AnalyticsViewProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex justify-end">
        <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
          {(["daily", "weekly", "monthly"] as const).map((period) => (
            <button
              key={period}
              onClick={() => setAnalyticsPeriod(period)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                analyticsPeriod === period
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnalyticsCard
          title="Total Subscribers"
          value={subscriberAnalytics?.total || 0}
          icon={
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          }
        />
        <AnalyticsCard
          title="Monthly Revenue"
          value={`$${(revenueAnalytics?.totalMonthly || 0).toFixed(2)}`}
          change={revenueAnalytics?.changeFromLastPeriod}
          icon={
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <AnalyticsCard
          title="Total Unlocks"
          value={unlocksAnalytics?.totalUnlocks || 0}
          subtitle="Content engagement"
          icon={
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          }
        />
        <AnalyticsCard
          title="Active Tiers"
          value={Object.keys(revenueAnalytics?.byTier || {}).length}
          subtitle="Revenue-generating tiers"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SubscriberGrowthChart
          data={subscriberAnalytics?.growth || []}
          period={analyticsPeriod}
        />
        <RevenueGrowthChart
          data={revenueAnalytics?.growth || []}
          period={analyticsPeriod}
        />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SubscribersByTierChart data={subscriberAnalytics?.byTier || {}} />
        <RevenueByTierCard data={revenueAnalytics?.byTier || {}} />
      </div>

      {/* Top Posts */}
      <TopPostsList posts={unlocksAnalytics?.topPosts || []} />
    </div>
  )
}

