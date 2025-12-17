"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface Chargeback {
  id: string
  userId: string
  creatorId: string
  amount: number
  currency: string
  status: "open" | "won" | "lost"
  reason?: string
  createdAt: string
}

export default function AdminChargebacksPage() {
  const [chargebacks, setChargebacks] = useState<Chargeback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "open" | "won" | "lost">("all")

  useEffect(() => {
    fetchChargebacks()
  }, [filter])

  const fetchChargebacks = async () => {
    try {
      const url = filter === "all" ? "/api/admin/chargebacks" : `/api/admin/chargebacks?status=${filter}`
      const res = await fetch(url)
      const data = await res.json()

      if (res.ok) {
        setChargebacks(data.chargebacks)
      }
    } catch (err) {
      console.error("Chargebacks fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResolve = async (chargebackId: string, status: "won" | "lost") => {
    try {
      const res = await fetch("/api/admin/chargebacks/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chargebackId,
          status,
        }),
      })

      if (res.ok) {
        fetchChargebacks()
      }
    } catch (err) {
      console.error("Chargeback resolve error:", err)
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Chargeback Management</h1>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            {(["all", "open", "won", "lost"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  filter === f
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)} ({chargebacks.filter((c) => f === "all" || c.status === f).length})
              </button>
            ))}
          </nav>
        </div>

        {/* Chargebacks List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Reason
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {chargebacks.map((cb) => (
                <tr key={cb.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {cb.amount / 100} {cb.currency}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        cb.status === "open"
                          ? "bg-yellow-100 text-yellow-800"
                          : cb.status === "won"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {cb.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {cb.reason || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(cb.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {cb.status === "open" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResolve(cb.id, "won")}
                          className="text-green-600 hover:text-green-800"
                        >
                          Mark Won
                        </button>
                        <button
                          onClick={() => handleResolve(cb.id, "lost")}
                          className="text-red-600 hover:text-red-800"
                        >
                          Mark Lost
                        </button>
                      </div>
                    )}
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

