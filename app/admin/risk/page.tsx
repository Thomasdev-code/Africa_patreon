"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface RiskProfile {
  userId: string
  userEmail: string
  riskScore: number
  monthlyLimit: number
  dailyLimit: number
  flags: any
  lastRiskUpdate: string
}

export default function AdminRiskPage() {
  const [profiles, setProfiles] = useState<RiskProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchRiskProfiles()
  }, [])

  const fetchRiskProfiles = async () => {
    try {
      const res = await fetch("/api/admin/risk")
      const data = await res.json()

      if (res.ok) {
        setProfiles(data.profiles)
      }
    } catch (err) {
      console.error("Risk profiles fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const getRiskColor = (score: number) => {
    if (score >= 80) return "text-red-600 bg-red-100"
    if (score >= 60) return "text-orange-600 bg-orange-100"
    if (score >= 40) return "text-yellow-600 bg-yellow-100"
    return "text-green-600 bg-green-100"
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/admin"
            className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to Admin Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Risk & Security Overview</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Risk Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Monthly Limit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Daily Limit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Flags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {profiles.map((profile) => (
                <tr key={profile.userId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {profile.userEmail}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded text-sm font-semibold ${getRiskColor(
                        profile.riskScore
                      )}`}
                    >
                      {profile.riskScore}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${profile.monthlyLimit.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${profile.dailyLimit.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="space-y-1">
                      {profile.flags?.chargebackCount > 0 && (
                        <div>Chargebacks: {profile.flags.chargebackCount}</div>
                      )}
                      {profile.flags?.tooManyFailedPayments && (
                        <div className="text-red-600">Too many failed payments</div>
                      )}
                      {profile.flags?.suddenSubscriberSpike && (
                        <div className="text-orange-600">Sudden subscriber spike</div>
                      )}
                      {profile.flags?.largePayoutBeforeKyc && (
                        <div className="text-yellow-600">Large payout before KYC</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(profile.lastRiskUpdate).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

