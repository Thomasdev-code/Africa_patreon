"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface EarningsSummary {
  totalEarnings: number
  platformFees?: number
  totalWithdrawn: number
  totalPending: number
  availableBalance: number
  ppvStats?: {
    totalPPVRevenue: number
    subscriptionRevenue: number
  }
}

export default function EarningsSummary() {
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchEarnings()
  }, [])

  const fetchEarnings = async () => {
    try {
      // Use the comprehensive earnings API instead
      const res = await fetch("/api/creator/earnings")
      const data = await res.json()

      if (res.ok) {
        setEarnings({
          totalEarnings: data.totalEarnings,
          platformFees: data.platformFees,
          totalWithdrawn: data.totalWithdrawn,
          totalPending: data.totalPending,
          availableBalance: data.availableBalance,
          ppvStats: data.ppvStats,
        })
      } else {
        // Fallback to payout API
        const payoutRes = await fetch("/api/payouts/my-payouts")
        const payoutData = await payoutRes.json()
        if (payoutRes.ok) {
          setEarnings(payoutData.summary)
        }
      }
    } catch (err) {
      console.error("Earnings fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="text-gray-600">Loading earnings...</div>
  }

  if (!earnings) {
    return <div className="text-gray-600">Failed to load earnings</div>
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Total Earnings</p>
          <p className="text-2xl font-bold text-gray-900">
            ${earnings.totalEarnings.toFixed(2)}
          </p>
          {earnings.platformFees !== undefined && (
            <p className="text-xs text-gray-500 mt-1">
              Platform fees paid: ${earnings.platformFees.toFixed(2)}
            </p>
          )}
          {earnings.ppvStats && earnings.ppvStats.totalPPVRevenue > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              PPV: ${earnings.ppvStats.totalPPVRevenue.toFixed(2)}
            </p>
          )}
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Available Balance</p>
          <p className="text-2xl font-bold text-green-600">
            ${earnings.availableBalance.toFixed(2)}
          </p>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Total Withdrawn</p>
          <p className="text-2xl font-bold text-blue-600">
            ${earnings.totalWithdrawn.toFixed(2)}
          </p>
        </div>
        <div className="p-4 bg-yellow-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">Pending Payouts</p>
          <p className="text-2xl font-bold text-yellow-600">
            ${earnings.totalPending.toFixed(2)}
          </p>
        </div>
      </div>

      {/* PPV Revenue Summary */}
      {earnings.ppvStats && earnings.ppvStats.totalPPVRevenue > 0 && (
        <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-900 mb-1">Pay-Per-View Revenue</p>
              <p className="text-xs text-gray-600">
                {earnings.ppvStats.subscriptionRevenue > 0 && (
                  <>Subscriptions: ${earnings.ppvStats.subscriptionRevenue.toFixed(2)} • </>
                )}
                PPV: ${earnings.ppvStats.totalPPVRevenue.toFixed(2)}
              </p>
            </div>
            <p className="text-xl font-bold text-orange-600">
              ${earnings.ppvStats.totalPPVRevenue.toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Link
          href="/creator/withdraw"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Request Withdrawal
        </Link>
        <Link
          href="/creator/earnings"
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          View Full Earnings
        </Link>
      </div>
    </div>
  )
}

