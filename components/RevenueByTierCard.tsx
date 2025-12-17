"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface RevenueByTierCardProps {
  data: Record<string, { count: number; monthlyRevenue: number }>
}

export default function RevenueByTierCard({ data }: RevenueByTierCardProps) {
  const chartData = Object.entries(data).map(([tierName, stats]) => ({
    tier: tierName,
    revenue: stats.monthlyRevenue,
    subscribers: stats.count,
  }))

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Revenue by Tier
        </h3>
        <p className="text-gray-600 text-center py-8">No revenue data yet</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Revenue by Tier
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="tier" />
          <YAxis />
          <Tooltip
            formatter={(value: number) => `$${value.toFixed(2)}`}
            labelStyle={{ color: "#374151" }}
          />
          <Legend />
          <Bar dataKey="revenue" fill="#3b82f6" name="Monthly Revenue ($)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

