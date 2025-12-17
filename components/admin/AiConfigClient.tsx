"use client"

import { useState } from "react"

interface ToolStats {
  [key: string]: number
}

interface RecentUsage {
  id: string
  userId: string
  userEmail: string
  toolType: string
  creditsUsed: number
  success: boolean
  createdAt: string
}

interface AiConfigClientProps {
  totalUsage: number
  proUsers: number
  toolStats: ToolStats
  recentUsage: RecentUsage[]
}

export default function AiConfigClient({
  totalUsage,
  proUsers,
  toolStats,
  recentUsage,
}: AiConfigClientProps) {
  const [userId, setUserId] = useState("")
  const [credits, setCredits] = useState(0)
  const [isGranting, setIsGranting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  )

  const handleGrantCredits = async () => {
    if (!userId || credits <= 0) {
      setMessage({ type: "error", text: "Please enter valid user ID and credits" })
      return
    }

    setIsGranting(true)
    setMessage(null)

    try {
      const res = await fetch("/api/admin/ai/grant-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, credits }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to grant credits")
      }

      setMessage({ type: "success", text: `Successfully granted ${credits} credits` })
      setUserId("")
      setCredits(0)
    } catch (error: any) {
      setMessage({ type: "error", text: error.message })
    } finally {
      setIsGranting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Total AI Usage</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalUsage}</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Pro Users</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">{proUsers}</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="text-sm font-medium text-gray-500">Monthly Credits</h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">50</p>
          <p className="mt-1 text-sm text-gray-500">Per Pro user</p>
        </div>
      </div>

      {/* Grant Credits */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Grant AI Credits</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User ID
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Credits to Grant
            </label>
            <input
              type="number"
              value={credits}
              onChange={(e) => setCredits(Number(e.target.value))}
              min="1"
              placeholder="Enter number of credits"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {message && (
            <div
              className={`rounded-lg p-4 ${
                message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              }`}
            >
              {message.text}
            </div>
          )}
          <button
            onClick={handleGrantCredits}
            disabled={isGranting}
            className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isGranting ? "Granting..." : "Grant Credits"}
          </button>
        </div>
      </div>

      {/* Usage by Tool */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Usage by Tool</h2>
        <div className="space-y-2">
          {Object.entries(toolStats).map(([tool, count]) => (
            <div key={tool} className="flex items-center justify-between border-b border-gray-200 pb-2">
              <span className="capitalize text-gray-700">{tool.replace("-", " ")}</span>
              <span className="font-semibold text-gray-900">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Usage */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Recent Usage</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-2 text-left text-gray-700">User</th>
                <th className="px-4 py-2 text-left text-gray-700">Tool</th>
                <th className="px-4 py-2 text-left text-gray-700">Credits</th>
                <th className="px-4 py-2 text-left text-gray-700">Status</th>
                <th className="px-4 py-2 text-left text-gray-700">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentUsage.map((usage) => (
                <tr key={usage.id} className="border-b border-gray-100">
                  <td className="px-4 py-2 text-gray-700">{usage.userEmail}</td>
                  <td className="px-4 py-2 text-gray-700 capitalize">
                    {usage.toolType.replace("-", " ")}
                  </td>
                  <td className="px-4 py-2 text-gray-700">{usage.creditsUsed}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded-full px-2 py-1 text-xs ${
                        usage.success
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {usage.success ? "Success" : "Failed"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {new Date(usage.createdAt).toLocaleDateString()}
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

