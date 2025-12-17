"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface ReferralStats {
  referralCode: string
  referralLink: string
  totalClicks: number
  totalSignups: number
  totalConversions: number
  totalCredits: number
  totalCommission: number
  referrals: Array<{
    id: string
    type: string
    status: string
    creditsEarned: number
    commissionAmount: number
    createdAt: string
  }>
}

export default function ReferralsPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchReferrals()
  }, [])

  const fetchReferrals = async () => {
    try {
      const res = await fetch("/api/referrals/me")
      const data = await res.json()

      if (res.ok) {
        setStats(data)
      }
    } catch (err) {
      console.error("Referrals fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const copyReferralLink = () => {
    if (stats?.referralLink) {
      navigator.clipboard.writeText(stats.referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading referrals...</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Failed to load referrals</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Referrals & Rewards</h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-1">Total Clicks</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalClicks}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-1">Total Signups</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalSignups}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-1">Total Conversions</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalConversions}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-sm text-gray-600 mb-1">Total Credits</p>
            <p className="text-2xl font-bold text-green-600">
              ${stats.totalCredits.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Referral Link */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Referral Link</h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={stats.referralLink}
              readOnly
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            />
            <button
              onClick={copyReferralLink}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Share this link to earn credits when people sign up or subscribe!
          </p>
        </div>

        {/* Referral History */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Referral History</h2>
          {stats.referrals.length === 0 ? (
            <p className="text-gray-600">No referrals yet. Start sharing your link!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Type</th>
                    <th className="text-left py-2 px-4">Status</th>
                    <th className="text-right py-2 px-4">Credits</th>
                    <th className="text-right py-2 px-4">Commission</th>
                    <th className="text-left py-2 px-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.referrals.map((referral) => (
                    <tr key={referral.id} className="border-b">
                      <td className="py-2 px-4 capitalize">{referral.type}</td>
                      <td className="py-2 px-4">
                        <span
                          className={`px-2 py-1 rounded text-sm ${
                            referral.status === "credited"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {referral.status}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-right">
                        ${referral.creditsEarned.toFixed(2)}
                      </td>
                      <td className="py-2 px-4 text-right">
                        {referral.commissionAmount
                          ? `$${referral.commissionAmount.toFixed(2)}`
                          : "-"}
                      </td>
                      <td className="py-2 px-4">
                        {new Date(referral.createdAt).toLocaleDateString()}
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

