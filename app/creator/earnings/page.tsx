"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface EarningsData {
  totalEarnings: number
  totalWithdrawn: number
  totalPending: number
  availableBalance: number
  earningsByTier: Record<string, number>
  monthlyRevenue: Array<{ month: string; revenue: number }>
  subscriberCount: number
  subscriberGrowth: number
  payoutHistory: Array<{
    id: string
    amount: number
    method: string
    status: string
    createdAt: string
    processedAt: string | null
  }>
  ppvStats: {
    totalPPVPosts: number
    totalPPVPurchases: number
    totalPPVRevenue: number
    subscriptionRevenue: number
    purchases: Array<{
      id: string
      postId: string
      postTitle: string
      fanEmail: string
      pricePaid: number
      currency: string
      provider: string
      createdAt: string
    }>
  }
}

export default function CreatorEarningsPage() {
  const router = useRouter()
  const [earnings, setEarnings] = useState<EarningsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchEarnings()
  }, [])

  const fetchEarnings = async () => {
    try {
      const res = await fetch("/api/creator/earnings")
      const data = await res.json()

      if (res.ok) {
        setEarnings(data)
      } else {
        setError(data.error || "Failed to load earnings")
      }
    } catch (err) {
      console.error("Earnings fetch error:", err)
      setError("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading earnings...</div>
      </div>
    )
  }

  if (error || !earnings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || "Failed to load earnings"}
          </h1>
          <button
            onClick={fetchEarnings}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const tierData = Object.entries(earnings.earningsByTier).map(([tier, amount]) => ({
    tier,
    amount,
  }))

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Earnings</h1>
            <Link
              href="/creator/dashboard"
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-1">Total Earnings</p>
            <p className="text-3xl font-bold text-gray-900">
              ${earnings.totalEarnings.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Subscriptions: ${earnings.ppvStats.subscriptionRevenue.toFixed(2)} | PPV: ${earnings.ppvStats.totalPPVRevenue.toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-1">Available Balance</p>
            <p className="text-3xl font-bold text-green-600">
              ${earnings.availableBalance.toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-1">Total Withdrawn</p>
            <p className="text-3xl font-bold text-blue-600">
              ${earnings.totalWithdrawn.toFixed(2)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-1">Pending Payouts</p>
            <p className="text-3xl font-bold text-yellow-600">
              ${earnings.totalPending.toFixed(2)}
            </p>
          </div>
        </div>

        {/* PPV Revenue Card */}
        {earnings.ppvStats.totalPPVRevenue > 0 && (
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg shadow-md p-6 mb-8 border border-orange-200">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Pay-Per-View Revenue</h2>
                <p className="text-sm text-gray-600">Earnings from individual post purchases</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-orange-600">
                  ${earnings.ppvStats.totalPPVRevenue.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">PPV Posts</p>
                <p className="text-2xl font-bold text-gray-900">
                  {earnings.ppvStats.totalPPVPosts}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Total Purchases</p>
                <p className="text-2xl font-bold text-orange-600">
                  {earnings.ppvStats.totalPPVPurchases}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Avg per Purchase</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${earnings.ppvStats.totalPPVPurchases > 0
                    ? (earnings.ppvStats.totalPPVRevenue / earnings.ppvStats.totalPPVPurchases).toFixed(2)
                    : "0.00"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Monthly Revenue Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Monthly Revenue
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={earnings.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Earnings by Tier Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Earnings by Tier
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={tierData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="tier" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="amount" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subscriber Stats */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Subscriber Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Subscribers</p>
              <p className="text-2xl font-bold text-gray-900">
                {earnings.subscriberCount}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Growth Rate</p>
              <p
                className={`text-2xl font-bold ${
                  earnings.subscriberGrowth >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {earnings.subscriberGrowth >= 0 ? "+" : ""}
                {earnings.subscriberGrowth.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* PPV Purchases History */}
        {earnings.ppvStats.purchases.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">PPV Purchase History</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Post
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Provider
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {earnings.ppvStats.purchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(purchase.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {purchase.postTitle}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {purchase.fanEmail}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                        {purchase.currency} {purchase.pricePaid.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {purchase.provider}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payout History */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Payout History</h2>
            <Link
              href="/creator/withdraw"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Request Withdrawal
            </Link>
          </div>
          {earnings.payoutHistory.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              No payout history yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {earnings.payoutHistory.map((payout) => (
                    <tr key={payout.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(payout.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${payout.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payout.method.toUpperCase()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            payout.status === "paid"
                              ? "bg-green-100 text-green-800"
                              : payout.status === "approved"
                              ? "bg-blue-100 text-blue-800"
                              : payout.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {payout.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

