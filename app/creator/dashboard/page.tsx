"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import Avatar from "@/components/Avatar"
import Banner from "@/components/Banner"
import TierCard from "@/components/TierCard"
import ProfileForm from "@/components/ProfileForm"
import SubscribersStats from "@/components/SubscribersStats"
import PostForm from "@/components/PostForm"
import PostCard from "@/components/PostCard"
import AnalyticsView from "@/components/AnalyticsView"
import ReferralDashboard from "@/components/ReferralDashboard"
import EarningsSummary from "@/components/EarningsSummary"
import AIToolsCard from "@/components/creator/AIToolsCard"
import type {
  CreatorProfile,
  CreateCreatorProfileInput,
  Post,
  CreatePostInput,
  UpdatePostInput,
  SubscriberAnalytics,
  RevenueAnalytics,
  UnlocksAnalytics,
} from "@/lib/types"

export default function CreatorDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreatingPost, setIsCreatingPost] = useState(false)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"overview" | "analytics" | "referrals" | "earnings">("overview")
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>("free")
  const [analyticsPeriod, setAnalyticsPeriod] = useState<"daily" | "weekly" | "monthly">("monthly")
  const [subscriberAnalytics, setSubscriberAnalytics] = useState<SubscriberAnalytics | null>(null)
  const [revenueAnalytics, setRevenueAnalytics] = useState<RevenueAnalytics | null>(null)
  const [unlocksAnalytics, setUnlocksAnalytics] = useState<UnlocksAnalytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  useEffect(() => {
    if (profile) {
      fetchPosts()
    }
  }, [profile])

  useEffect(() => {
    if (activeTab === "analytics" && profile) {
      fetchAnalytics()
    }
  }, [activeTab, analyticsPeriod, profile])

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/creator/me")
      const data = await res.json()

      if (res.ok) {
        setProfile(data.profile)
        // Fetch subscription plan
        const accessRes = await fetch("/api/ai/check-access")
        if (accessRes.ok) {
          const accessData = await accessRes.json()
          setSubscriptionPlan(accessData.subscriptionPlan || "free")
        }
      } else {
        if (res.status === 404 || !data.profile) {
          // No profile yet, redirect to onboarding
          router.push("/creator/onboarding")
          return
        }
        setError("Failed to load profile")
      }
    } catch (err) {
      console.error("Profile fetch error:", err)
      setError("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPosts = async () => {
    if (!profile) return

    try {
      const res = await fetch(`/api/creator/posts?creatorId=${profile.userId}`)
      const data = await res.json()

      if (res.ok) {
        setPosts(data.posts || [])
      }
    } catch (err) {
      console.error("Posts fetch error:", err)
    }
  }

  const handleUpdateProfile = async (data: CreateCreatorProfileInput) => {
    try {
      const res = await fetch("/api/creator/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || "Failed to update profile")
        return
      }

      setProfile(result.profile)
      setIsEditing(false)
      setError("")
    } catch (err) {
      console.error("Profile update error:", err)
      setError("An error occurred. Please try again.")
    }
  }

  const handleCreatePost = async (data: CreatePostInput) => {
    try {
      const res = await fetch("/api/creator/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || "Failed to create post")
        return
      }

      setPosts([result.post, ...posts])
      setIsCreatingPost(false)
      setError("")
    } catch (err) {
      console.error("Post creation error:", err)
      setError("An error occurred. Please try again.")
    }
  }

  const handleUpdatePost = async (data: UpdatePostInput) => {
    if (!editingPostId) return

    try {
      const res = await fetch(`/api/creator/posts/${editingPostId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || "Failed to update post")
        return
      }

      setPosts(posts.map((p) => (p.id === editingPostId ? result.post : p)))
      setEditingPostId(null)
      setError("")
    } catch (err) {
      console.error("Post update error:", err)
      setError("An error occurred. Please try again.")
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) {
      return
    }

    try {
      const res = await fetch(`/api/creator/posts/${postId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Failed to delete post")
        return
      }

      setPosts(posts.filter((p) => p.id !== postId))
      setError("")
    } catch (err) {
      console.error("Post deletion error:", err)
      setError("An error occurred. Please try again.")
    }
  }

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true)
    try {
      const [subscribersRes, revenueRes, unlocksRes] = await Promise.all([
        fetch(`/api/creator/analytics/subscribers?period=${analyticsPeriod}`),
        fetch(`/api/creator/analytics/revenue?period=${analyticsPeriod}`),
        fetch("/api/creator/analytics/unlocks"),
      ])

      if (subscribersRes.ok) {
        const data = await subscribersRes.json()
        setSubscriberAnalytics(data)
      }

      if (revenueRes.ok) {
        const data = await revenueRes.json()
        setRevenueAnalytics(data)
      }

      if (unlocksRes.ok) {
        const data = await unlocksRes.json()
        setUnlocksAnalytics(data)
      }
    } catch (err) {
      console.error("Analytics fetch error:", err)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No profile found</p>
          <button
            onClick={() => router.push("/creator/onboarding")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Create Profile
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Creator Dashboard</h1>
            <div className="flex gap-4 items-center">
              <a
                href="/messages"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Messages
              </a>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
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
              onClick={() => setActiveTab("overview")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "overview"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "analytics"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab("referrals")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "referrals"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Referrals
            </button>
            <button
              onClick={() => setActiveTab("earnings")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "earnings"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Earnings
            </button>
            <button
              onClick={() => router.push("/creator/dashboard/polls")}
              className="py-4 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Polls
            </button>
          </nav>
        </div>

        {activeTab === "analytics" ? (
          <AnalyticsView
            subscriberAnalytics={subscriberAnalytics}
            revenueAnalytics={revenueAnalytics}
            unlocksAnalytics={unlocksAnalytics}
            analyticsPeriod={analyticsPeriod}
            setAnalyticsPeriod={setAnalyticsPeriod}
            isLoading={analyticsLoading}
          />
        ) : activeTab === "referrals" ? (
          <ReferralDashboard />
        ) : activeTab === "earnings" ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Earnings</h2>
              <a
                href="/creator/earnings"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                View Full Earnings
              </a>
            </div>
            <EarningsSummary />
          </div>
        ) : isEditing ? (
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Edit Profile
              </h2>
              <p className="text-gray-600">Update your creator profile</p>
            </div>
            <ProfileForm
              initialData={{
                username: profile.username,
                bio: profile.bio,
                avatarUrl: profile.avatarUrl,
                bannerUrl: profile.bannerUrl,
                tiers: profile.tiers,
              }}
              onSubmit={handleUpdateProfile}
            />
            <button
              onClick={() => setIsEditing(false)}
              className="mt-4 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            {/* Profile Preview */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              <Banner src={profile.bannerUrl} alt={profile.username} />
              <div className="p-6">
                <div className="flex items-start gap-6">
                  <div className="-mt-16">
                    <Avatar
                      src={profile.avatarUrl}
                      alt={profile.username}
                      size="xl"
                    />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                      @{profile.username}
                    </h2>
                    <p className="text-gray-600 mb-4">{profile.bio}</p>
                    <div className="flex gap-4">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Edit Profile
                      </button>
                      <a
                        href={`/creator/${profile.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        View Public Page
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <SubscribersStats creatorId={profile.userId} />

            {/* AI Tools Card */}
            <div className="mb-6">
              <AIToolsCard subscriptionPlan={subscriptionPlan} />
            </div>

            {/* Membership Tiers */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Membership Tiers
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {profile.tiers.map((tier, index) => (
                  <TierCard
                    key={index}
                    tier={tier}
                    isCreator={true}
                  />
                ))}
              </div>
            </div>

            {/* Posts Management */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Posts</h3>
                <button
                  onClick={() => {
                    setIsCreatingPost(true)
                    setEditingPostId(null)
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  + Create Post
                </button>
              </div>

              {/* Create/Edit Post Form */}
              {(isCreatingPost || editingPostId) && (
                <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">
                      {editingPostId ? "Edit Post" : "Create New Post"}
                    </h4>
                    <button
                      onClick={() => {
                        setIsCreatingPost(false)
                        setEditingPostId(null)
                      }}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                  <PostForm
                    initialData={
                      editingPostId
                        ? {
                            title: posts.find((p) => p.id === editingPostId)?.title,
                            content: posts.find((p) => p.id === editingPostId)?.content,
                            mediaType: posts.find((p) => p.id === editingPostId)?.mediaType || null,
                            mediaUrl: posts.find((p) => p.id === editingPostId)?.mediaUrl || null,
                            tierName: posts.find((p) => p.id === editingPostId)?.tierName || null,
                            isPublished: posts.find((p) => p.id === editingPostId)?.isPublished,
                          }
                        : undefined
                    }
                    tiers={profile.tiers}
                    onSubmit={
                      editingPostId ? handleUpdatePost : handleCreatePost
                    }
                    submitLabel={editingPostId ? "Update Post" : "Create Post"}
                  />
                </div>
              )}

              {/* Posts List */}
              {posts.length === 0 ? (
                <div className="text-center py-8 text-gray-600">
                  <p>No posts yet. Create your first post!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">
                            {post.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            {post.tierName ? (
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                                {post.tierName} Tier
                              </span>
                            ) : (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                Free
                              </span>
                            )}
                            {post.isPublished ? (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Published
                              </span>
                            ) : (
                              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                                Draft
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingPostId(post.id)
                              setIsCreatingPost(false)
                            }}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {post.content}
                      </p>
                    </div>
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
