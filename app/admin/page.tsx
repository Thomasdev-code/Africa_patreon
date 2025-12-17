"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import type { User, CreatorProfile, Subscription } from "@/lib/types"

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCreators: 0,
    totalFans: 0,
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    platformFeePercent: 0,
    platformRevenueByCurrency: {} as Record<string, number>,
    creatorEarningsByCurrency: {} as Record<string, number>,
    ppvStats: {
      totalPPVPosts: 0,
      totalPPVPurchases: 0,
      totalPPVRevenue: 0,
      topCreators: [] as any[],
    },
  })
  const [users, setUsers] = useState<User[]>([])
  const [creators, setCreators] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [payouts, setPayouts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "creators" | "subscriptions" | "payouts" | "payments">("overview")
  const [payments, setPayments] = useState<any[]>([])
  const [paymentTotals, setPaymentTotals] = useState<any[]>([])
  const [payoutRequests, setPayoutRequests] = useState<any[]>([])

  useEffect(() => {
    fetchStats()
    if (activeTab === "users") {
      fetchUsers()
    } else if (activeTab === "creators") {
      fetchCreators()
    } else if (activeTab === "subscriptions") {
      fetchSubscriptions()
    } else if (activeTab === "payouts") {
      fetchPayouts()
    } else if (activeTab === "payments") {
      fetchPayments()
    } else if (activeTab === "payouts") {
      fetchPayoutRequests()
    }
  }, [activeTab])

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats")
      const data = await res.json()
      if (res.ok) {
        setStats(data)
      }
    } catch (err) {
      console.error("Stats fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users")
      const data = await res.json()
      if (res.ok) {
        setUsers(data.users || [])
      }
    } catch (err) {
      console.error("Users fetch error:", err)
    }
  }

  const fetchCreators = async () => {
    try {
      const res = await fetch("/api/admin/creators")
      const data = await res.json()
      if (res.ok) {
        setCreators(data.creators || [])
      }
    } catch (err) {
      console.error("Creators fetch error:", err)
    }
  }

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch("/api/admin/subscriptions")
      const data = await res.json()
      if (res.ok) {
        setSubscriptions(data.subscriptions || [])
      }
    } catch (err) {
      console.error("Subscriptions fetch error:", err)
    }
  }

  const fetchPayouts = async () => {
    try {
      const res = await fetch("/api/admin/payouts")
      const data = await res.json()
      if (res.ok) {
        setPayouts(data.payouts || [])
      }
    } catch (err) {
      console.error("Payouts fetch error:", err)
    }
  }

  const fetchPayoutRequests = async () => {
    try {
      const res = await fetch("/api/admin/payout-requests")
      const data = await res.json()
      if (res.ok) {
        setPayoutRequests(data.requests || [])
      }
    } catch (err) {
      console.error("Payout requests fetch error:", err)
    }
  }

  const handlePayoutAction = async (payoutId: string, action: string, notes?: string) => {
    try {
      const res = await fetch("/api/payouts/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutId, action, adminNotes: notes }),
      })
      const data = await res.json()
      if (res.ok) {
        fetchPayoutRequests()
        alert(`Payout ${action}d successfully`)
      } else {
        alert(data.error || "Failed to update payout")
      }
    } catch (err) {
      console.error("Payout action error:", err)
      alert("Failed to update payout")
    }
  }

  const handleMarkPaid = async (payoutId: string, transactionRef?: string) => {
    try {
      const res = await fetch("/api/payouts/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payoutId, transactionReference: transactionRef }),
      })
      const data = await res.json()
      if (res.ok) {
        fetchPayoutRequests()
        alert("Payout marked as paid")
      } else {
        alert(data.error || "Failed to mark payout as paid")
      }
    } catch (err) {
      console.error("Mark paid error:", err)
      alert("Failed to mark payout as paid")
    }
  }

  const fetchPayments = async () => {
    try {
      const res = await fetch("/api/admin/payments")
      const data = await res.json()
      if (res.ok) {
        setPayments(data.payments || [])
        setPaymentTotals(data.totals || [])
      }
    } catch (err) {
      console.error("Payments fetch error:", err)
    }
  }

  const handleUserAction = async (userId: string, action: string, value: boolean) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, value }),
      })
      const data = await res.json()
      if (res.ok) {
        fetchUsers()
        alert(`User ${action} ${value ? "enabled" : "disabled"} successfully`)
      } else {
        alert(data.error || "Failed to update user")
      }
    } catch (err) {
      console.error("User action error:", err)
      alert("Failed to update user")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading admin dashboard...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            {(["overview", "users", "creators", "subscriptions", "payouts", "payments"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                  activeTab === tab
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-sm text-gray-600 mb-1">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-sm text-gray-600 mb-1">Total Creators</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalCreators}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-sm text-gray-600 mb-1">Total Fans</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalFans}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-sm text-gray-600 mb-1">Total Subscriptions</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalSubscriptions}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-sm text-gray-600 mb-1">Active Subscriptions</p>
                <p className="text-3xl font-bold text-green-600">{stats.activeSubscriptions}</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-green-600">${stats.totalRevenue.toFixed(2)}</p>
              </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm text-gray-600 mb-1">Platform Fee % (current)</p>
              <p className="text-3xl font-bold text-indigo-600">{stats.platformFeePercent}%</p>
              <p className="text-xs text-gray-500 mt-3">Platform revenue by currency</p>
              <ul className="mt-1 space-y-1 text-xs text-gray-600">
                {Object.keys(stats.platformRevenueByCurrency || {}).length === 0 && (
                  <li className="text-gray-400">No fee revenue yet</li>
                )}
                {Object.entries(stats.platformRevenueByCurrency || {}).map(([cur, amt]) => (
                  <li key={cur}>
                    {cur}: {(amt / 100).toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
            </div>

            {/* PPV Stats Section */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Pay-Per-View (PPV) Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total PPV Posts</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.ppvStats.totalPPVPosts}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total PPV Purchases</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.ppvStats.totalPPVPurchases}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total PPV Revenue</p>
                  <p className="text-2xl font-bold text-orange-600">${stats.ppvStats.totalPPVRevenue.toFixed(2)}</p>
                </div>
              </div>

              {/* Top PPV Creators */}
              {stats.ppvStats.topCreators.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Top PPV Creators</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creator</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Post</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchases</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {stats.ppvStats.topCreators.map((creator, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              @{creator.username}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-xs">
                              {creator.postTitle}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                              {creator.purchases}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-orange-600">
                              ${creator.revenue.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">All Users</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Onboarded</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user: any) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded ${
                          user.role === "admin" ? "bg-red-100 text-red-800" :
                          user.role === "creator" ? "bg-blue-100 text-blue-800" :
                          "bg-green-100 text-green-800"
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.isOnboarded ? "Yes" : "No"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {user.isBanned && (
                            <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">Banned</span>
                          )}
                          {user.role === "creator" && !user.isApproved && (
                            <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">Pending Approval</span>
                          )}
                          {!user.isBanned && (user.role !== "creator" || user.isApproved) && (
                            <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Active</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          {user.role === "creator" && (
                            <button
                              onClick={() => handleUserAction(user.id, "approve", !user.isApproved)}
                              className={`px-3 py-1 text-xs rounded ${
                                user.isApproved
                                  ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                  : "bg-green-100 text-green-800 hover:bg-green-200"
                              }`}
                            >
                              {user.isApproved ? "Unapprove" : "Approve"}
                            </button>
                          )}
                          <button
                            onClick={() => handleUserAction(user.id, "ban", !user.isBanned)}
                            className={`px-3 py-1 text-xs rounded ${
                              user.isBanned
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-red-100 text-red-800 hover:bg-red-200"
                            }`}
                          >
                            {user.isBanned ? "Unban" : "Ban"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "creators" && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">All Creators</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subscribers</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posts</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {creators.map((creator: any) => (
                    <tr key={creator.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        @{creator.creatorProfile?.username || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{creator.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {creator._count.creatorSubscriptions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {creator._count.posts}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {creator.isBanned && (
                            <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">Banned</span>
                          )}
                          {!creator.isApproved && (
                            <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">Pending</span>
                          )}
                          {!creator.isBanned && creator.isApproved && (
                            <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Active</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(creator.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "subscriptions" && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">All Subscriptions</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creator</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subscriptions.map((sub: any) => (
                    <tr key={sub.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sub.fan.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        @{sub.creator.creatorProfile?.username || sub.creator.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sub.tierName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${sub.tierPrice}/mo</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded ${
                          sub.status === "active" ? "bg-green-100 text-green-800" :
                          sub.status === "cancelled" ? "bg-red-100 text-red-800" :
                          "bg-yellow-100 text-yellow-800"
                        }`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(sub.startDate).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "payouts" && (
          <div className="space-y-6">
            {/* Payout Requests */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Payout Requests
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Creator
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payoutRequests.map((request: any) => (
                      <tr key={request.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {request.creator.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${request.amount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {request.method.toUpperCase()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              request.status === "paid"
                                ? "bg-green-100 text-green-800"
                                : request.status === "approved"
                                ? "bg-blue-100 text-blue-800"
                                : request.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            {request.status === "pending" && (
                              <>
                                <button
                                  onClick={() => handlePayoutAction(request.id, "approve")}
                                  className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded hover:bg-green-200"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handlePayoutAction(request.id, "reject")}
                                  className="px-3 py-1 bg-red-100 text-red-800 text-xs rounded hover:bg-red-200"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {request.status === "approved" && (
                              <button
                                onClick={() => handleMarkPaid(request.id)}
                                className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded hover:bg-blue-200"
                              >
                                Mark Paid
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payouts Overview */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Payouts Overview</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creator</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subscriptions</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly Revenue</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform Fee (10%)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creator Earnings</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payouts.map((payout: any) => (
                      <tr key={payout.creatorId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          @{payout.creator.creatorProfile?.username || payout.creator.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payout.subscriptionCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${payout.monthlyRevenue.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          ${payout.platformFee.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                          ${payout.creatorEarnings.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <div className="space-y-6">
            {/* Payment Totals by Provider */}
            {paymentTotals.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {paymentTotals.map((total: any) => (
                    <div key={`${total.provider}-${total.status}`} className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">{total.provider} - {total.status}</p>
                      <p className="text-2xl font-bold text-gray-900">${total.totalAmount.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">{total.count} payments</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Logs */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Payment Logs</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creator</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((payment: any) => (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          @{payment.creator.creatorProfile?.username || payment.creator.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.tierName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${payment.amount.toFixed(2)} {payment.currency}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{payment.provider}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded ${
                            payment.status === "success" ? "bg-green-100 text-green-800" :
                            payment.status === "failed" ? "bg-red-100 text-red-800" :
                            payment.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {payment.reference.substring(0, 20)}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
