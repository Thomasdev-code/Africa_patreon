"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import SubscriptionList from "@/components/SubscriptionList"
import Avatar from "@/components/Avatar"
import PostCard from "@/components/PostCard"
import NotificationList from "@/components/NotificationList"
import NotificationBadge from "@/components/NotificationBadge"
import ReferralDashboard from "@/components/ReferralDashboard"
import type { SubscriptionWithCreator, PostPreview } from "@/lib/types"

export default function FanDashboard() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithCreator[]>([])
  const [posts, setPosts] = useState<PostPreview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [showNotifications, setShowNotifications] = useState(false)
  const [activeTab, setActiveTab] = useState<"feed" | "referrals">("feed")
  const router = useRouter()

  useEffect(() => {
    fetchSubscriptions()
    fetchFeed()
  }, [])

  useEffect(() => {
    // Refresh feed when subscriptions change
    if (subscriptions.length > 0) {
      fetchFeed()
    }
  }, [subscriptions])

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch("/api/fan/subscriptions")
      const data = await res.json()

      if (res.ok) {
        setSubscriptions(data.subscriptions || [])
      } else {
        setError(data.error || "Failed to load subscriptions")
      }
    } catch (err) {
      console.error("Subscriptions fetch error:", err)
      setError("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFeed = async () => {
    try {
      const res = await fetch("/api/fan/feed")
      const data = await res.json()

      if (res.ok) {
        setPosts(data.posts || [])
      }
    } catch (err) {
      console.error("Feed fetch error:", err)
    }
  }

  const handleCancelSubscription = (subscriptionId: string) => {
    setSubscriptions(
      subscriptions.filter((sub) => sub.id !== subscriptionId)
    )
    // Refresh feed after cancellation
    setTimeout(() => fetchFeed(), 500)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Fan Dashboard</h1>
          <div className="flex gap-4 items-center">
            <a
              href="/messages"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Messages
            </a>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors relative"
            >
              Notifications
              <span className="absolute -top-2 -right-2">
                <NotificationBadge />
              </span>
            </button>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("feed")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "feed"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Feed
            </button>
            <button
              onClick={() => setActiveTab("referrals")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "referrals"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Referrals & Rewards
            </button>
          </nav>
        </div>

        {activeTab === "referrals" ? (
          <ReferralDashboard />
        ) : (
          <>
            {/* Notifications Panel */}
        {showNotifications && (
          <div className="mb-8 bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Notifications
              </h2>
              <button
                onClick={() => setShowNotifications(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
            </div>
            <NotificationList
              onNotificationClick={(notificationId, postId) => {
                // Find the post and navigate to creator page
                const post = posts.find((p) => p.id === postId)
                if (post?.creator) {
                  router.push(`/creator/${post.creator.username}`)
                }
                setShowNotifications(false)
              }}
            />
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {subscriptions.length}
            </div>
            <div className="text-gray-600">Active Subscriptions</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-3xl font-bold text-gray-900 mb-2">
              ${subscriptions.reduce((sum, sub) => sum + sub.tierPrice, 0).toFixed(2)}
            </div>
            <div className="text-gray-600">Monthly Spending</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {new Set(subscriptions.map((sub) => sub.creator.id)).size}
            </div>
            <div className="text-gray-600">Creators Supported</div>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Active Subscriptions
            </h2>
            <a
              href="/discover"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Discover Creators →
            </a>
          </div>
          <SubscriptionList
            subscriptions={subscriptions}
            onCancel={handleCancelSubscription}
            showCancelButton={true}
          />
        </div>

        {/* Unlocked Content Feed */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Unlocked Content Feed
            </h2>
            <button
              onClick={fetchFeed}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Refresh
            </button>
          </div>
          {subscriptions.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p className="mb-4">You don't have any active subscriptions yet.</p>
              <a
                href="/discover"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Discover Creators
              </a>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p>No new posts from your subscribed creators.</p>
              <p className="text-sm mt-2">Check back later for new content!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  showCreator={true}
                />
              ))}
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  )
}
