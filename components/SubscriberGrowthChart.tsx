"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface SubscriberGrowthChartProps {
  data: Array<{ date: string; count: number }>
  period: "daily" | "weekly" | "monthly"
}

export default function SubscriberGrowthChart({
  data,
  period,
}: SubscriberGrowthChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Subscriber Growth
        </h3>
        <p className="text-gray-600 text-center py-8">No subscriber data yet</p>
      </div>
    )
  }

  // Format date labels based on period
  const formatDate = (dateStr: string) => {
    if (period === "daily") {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    } else if (period === "weekly") {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    } else {
      return dateStr
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Subscriber Growth
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis />
          <Tooltip
            formatter={(value: number) => value}
            labelFormatter={formatDate}
            labelStyle={{ color: "#374151" }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#10b981"
            strokeWidth={2}
            name="Subscribers"
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

