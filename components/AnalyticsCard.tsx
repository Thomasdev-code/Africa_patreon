"use client"

interface AnalyticsCardProps {
  title: string
  value: string | number
  subtitle?: string
  change?: number
  icon?: React.ReactNode
  className?: string
}

export default function AnalyticsCard({
  title,
  value,
  subtitle,
  change,
  icon,
  className = "",
}: AnalyticsCardProps) {
  const isPositive = change !== undefined && change >= 0

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-6 border border-gray-200 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {change !== undefined && (
            <div className="mt-2 flex items-center">
              <span
                className={`text-sm font-medium ${
                  isPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {isPositive ? "↑" : "↓"} {Math.abs(change).toFixed(1)}%
              </span>
              <span className="text-sm text-gray-500 ml-1">vs last period</span>
            </div>
          )}
        </div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
    </div>
  )
}

