"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface KycItem {
  id: string
  userId: string
  userEmail: string
  userRole: string
  status: "pending" | "approved" | "rejected"
  adminNotes?: string
  reviewedAt?: string
  createdAt: string
}

export default function AdminKycPage() {
  const [kycs, setKycs] = useState<KycItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [selectedKyc, setSelectedKyc] = useState<string | null>(null)
  const [reviewStatus, setReviewStatus] = useState<"approved" | "rejected">("approved")
  const [adminNotes, setAdminNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchKycs()
  }, [filter])

  const fetchKycs = async () => {
    try {
      const url = filter === "all" ? "/api/kyc/admin/verify" : `/api/kyc/admin/verify?status=${filter}`
      const res = await fetch(url)
      const data = await res.json()

      if (res.ok) {
        setKycs(data.kycs)
      }
    } catch (err) {
      console.error("KYC fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async (kycId: string) => {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/kyc/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kycId,
          status: reviewStatus,
          adminNotes,
        }),
      })

      if (res.ok) {
        setSelectedKyc(null)
        setAdminNotes("")
        fetchKycs()
      }
    } catch (err) {
      console.error("KYC verification error:", err)
    } finally {
      setIsSubmitting(false)
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
          <h1 className="text-3xl font-bold text-gray-900">KYC Verification</h1>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            {(["all", "pending", "approved", "rejected"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  filter === f
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)} ({kycs.filter((k) => f === "all" || k.status === f).length})
              </button>
            ))}
          </nav>
        </div>

        {/* KYC List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {kycs.map((kyc) => (
                <tr key={kyc.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {kyc.userEmail}
                      </div>
                      <div className="text-sm text-gray-500">{kyc.userRole}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 rounded text-sm ${
                        kyc.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : kyc.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {kyc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(kyc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => {
                        setSelectedKyc(kyc.id)
                        setReviewStatus("approved")
                        setAdminNotes("")
                      }}
                      className="text-blue-600 hover:text-blue-800 mr-4"
                    >
                      Review
                    </button>
                    <a
                      href={`/api/kyc/admin/${kyc.id}`}
                      target="_blank"
                      className="text-gray-600 hover:text-gray-800"
                    >
                      View Documents
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Review Modal */}
        {selectedKyc && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Review KYC Verification
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={reviewStatus}
                    onChange={(e) =>
                      setReviewStatus(e.target.value as "approved" | "rejected")
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="approved">Approve</option>
                    <option value="rejected">Reject</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Optional notes for the user..."
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => handleVerify(selectedKyc)}
                    disabled={isSubmitting}
                    className={`flex-1 px-4 py-2 rounded-lg text-white ${
                      reviewStatus === "approved"
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-red-600 hover:bg-red-700"
                    } disabled:opacity-50`}
                  >
                    {isSubmitting ? "Processing..." : reviewStatus === "approved" ? "Approve" : "Reject"}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedKyc(null)
                      setAdminNotes("")
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

