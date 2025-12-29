"use client"

import { useState, useEffect, Suspense } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Avatar from "@/components/Avatar"
import Banner from "@/components/Banner"
import TierCard from "@/components/TierCard"
import FollowButton from "@/components/FollowButton"
import SubscribeButton from "@/components/SubscribeButton"
import PostCard from "@/components/PostCard"
import PollCard from "@/components/PollCard"
import SearchBar from "@/components/SearchBar"
import type { CreatorProfile, PostPreview, PublicPoll } from "@/lib/types"

function CreatorPublicContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const username = params.username as string
  const { data: session } = useSession()
  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [posts, setPosts] = useState<PostPreview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeSubscription, setActiveSubscription] = useState<string | null>(null)
  const [activeTiers, setActiveTiers] = useState<string[]>([])
  const [followerCount, setFollowerCount] = useState<number | null>(null)
  const [polls, setPolls] = useState<PublicPoll[]>([])
  const [userCountry, setUserCountry] = useState<string>("US")

  // Fetch profile on mount
  useEffect(() => {
    if (username) {
      fetchProfile()
    }
  }, [username])

  // Detect user country
  useEffect(() => {
    const detectCountry = async () => {
      try {
        // Try to get country from localStorage first
        const savedCountry = localStorage.getItem("userCountry")
        if (savedCountry) {
          setUserCountry(savedCountry)
          return
        }

        // Try to detect from browser timezone or use a free geolocation API
        // Using ipapi.co (free tier available)
        const response = await fetch("https://ipapi.co/json/")
        if (response.ok) {
          const data = await response.json()
          if (data.country_code) {
            const countryCode = data.country_code
            setUserCountry(countryCode)
            localStorage.setItem("userCountry", countryCode)
          }
        }
      } catch (err) {
        console.error("Failed to detect country:", err)
        // Fallback to US
        setUserCountry("US")
      }
    }

    detectCountry()
  }, [])

  useEffect(() => {
    if (profile) {
      fetchPosts()
      fetchFollowers()
      fetchPolls()
    }
  }, [profile, activeTiers])

  const fetchFollowers = async () => {
    if (!profile || !(profile as any).user?.id) return
    try {
      const res = await fetch(`/api/creator/${(profile as any).user.id}/followers`)
      if (!res.ok) return
      const data = await res.json()
      setFollowerCount(typeof data.count === "number" ? data.count : 0)
    } catch (err) {
      console.error("Followers fetch error:", err)
    }
  }

  const fetchPolls = async () => {
    if (!profile) return
    try {
      const res = await fetch(`/api/polls/${profile.username}`)
      const data = await res.json()
      if (res.ok && Array.isArray(data.polls)) {
        setPolls(data.polls)
      }
    } catch (err) {
      console.error("Polls fetch error:", err)
    }
  }

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/creator/profile/${username}`)
      const data = await res.json()

      if (res.ok) {
        setProfile(data.profile)
      } else {
        // If it's a retryable error, try once more after a delay
        if (res.status === 503 && data.retry) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          const retryRes = await fetch(`/api/creator/profile/${username}`)
          const retryData = await retryRes.json()
          if (retryRes.ok) {
            setProfile(retryData.profile)
          } else {
            setError(retryData.error || "Profile not found")
          }
        } else {
          setError(data.error || "Profile not found")
        }
      }
    } catch (err) {
      console.error("Profile fetch error:", err)
      setError("An error occurred. Please refresh the page.")
    } finally {
      setIsLoading(false)
    }
  }

  const checkSubscription = async () => {
    try {
      const res = await fetch("/api/fan/subscriptions")
      const data = await res.json()

      if (res.ok && profile) {
        const subscription = data.subscriptions.find(
          (sub: any) => sub.creator.id === (profile as any).user?.id
        )
        if (subscription) {
          setActiveSubscription(subscription.id)
          setActiveTiers([subscription.tierName])
        } else {
          setActiveTiers([])
        }
      }
    } catch (err) {
      console.error("Subscription check error:", err)
    }
  }

  const fetchPosts = async () => {
    if (!profile || !(profile as any).user?.id) return

    try {
      // Use public API route that doesn't require authentication
      const res = await fetch(`/api/public/posts/${(profile as any).user.id}`)
      const data = await res.json()

      if (res.ok) {
        // If user is logged in as fan, check subscriptions to unlock posts
        if (session?.user && session.user.role === "fan") {
          const subscriptionRes = await fetch("/api/fan/subscriptions")
          const subscriptionData = await subscriptionRes.json()
          
          if (subscriptionData.subscriptions) {
            const subscription = subscriptionData.subscriptions.find(
              (sub: any) => sub.creator.id === (profile as any).user?.id
            )
            if (subscription) {
              // Unlock posts for subscribed tier
              const unlockedPosts = data.posts.map((post: PostPreview) => ({
                ...post,
                isLocked: post.tierName !== null && post.tierName !== subscription.tierName,
              }))
              setPosts(unlockedPosts)
              return
            }
          }
        }
        
        // For non-logged-in users or non-subscribers, show posts as locked
        setPosts(data.posts || [])
      }
    } catch (err) {
      console.error("Posts fetch error:", err)
    }
  }

  const handleUnlock = () => {
    // Scroll to tiers section
    const tiersSection = document.getElementById("tiers-section")
    if (tiersSection) {
      tiersSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  useEffect(() => {
    if (profile && session?.user && session.user.role === "fan") {
      checkSubscription()
    }
  }, [profile])

  // Show success message if redirected from payment
  useEffect(() => {
    if (searchParams.get("subscription") === "success") {
      setTimeout(() => {
        alert("Subscription successful! Welcome to the community!")
        // Remove query param
        window.history.replaceState({}, "", window.location.pathname)
      }, 100)
    }
  }, [searchParams])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || "Profile not found"}
          </h1>
          <a
            href="/"
            className="text-blue-600 hover:text-blue-700 underline"
          >
            Go back home
          </a>
        </div>
      </div>
    )
  }

  const isCreator = session?.user?.role === "creator"
  const isOwner = session?.user?.id && (profile as any).user?.id === session.user.id
  const creatorId = (profile as any).user?.id

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Bar Section */}
      <div className="bg-white border-b border-gray-200 py-4">
        <div className="max-w-6xl mx-auto px-4">
          <div className="max-w-2xl">
            <SearchBar />
          </div>
        </div>
      </div>

      {/* Banner */}
      <Banner src={profile.bannerUrl} alt={profile.username} />

      {/* Profile Header */}
      <div className="max-w-6xl mx-auto px-4 -mt-20 relative z-10">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Avatar src={profile.avatarUrl} alt={profile.username} size="xl" />
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                @{profile.username}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                {followerCount !== null && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                    {followerCount.toLocaleString()} follower
                    {followerCount === 1 ? "" : "s"}
                  </span>
                )}
                {!isOwner && creatorId && (
                  <FollowButton
                    creatorId={creatorId}
                    onChange={() => {
                      // Soft refresh follower count when follow state changes
                      fetchFollowers()
                    }}
                    size="sm"
                  />
                )}
              </div>
              <p className="text-gray-600 text-lg mb-4">{profile.bio}</p>
              {isOwner && (
                <button
                  onClick={() => router.push("/creator/dashboard")}
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Manage Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Membership Tiers */}
        <div id="tiers-section" className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Membership Tiers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profile.tiers.map((tier, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-green-600">
                      ${tier.price}
                    </span>
                    <span className="text-gray-600 text-sm">/month</span>
                  </div>
                </div>
                {!isCreator && !isOwner && creatorId && (
                  <SubscribeButton
                    creatorId={creatorId}
                    creatorUsername={profile.username}
                    tier={tier}
                    isSubscribed={activeSubscription !== null}
                    subscriptionId={activeSubscription || undefined}
                    country={userCountry}
                  />
                )}
                {isOwner && (
                  <p className="text-sm text-gray-500 text-center mt-4">
                    Your tier
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Polls Section */}
        {polls.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Polls</h2>
            <div className="space-y-6">
              {polls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  creatorUsername={profile.username}
                  onVote={() => {
                    // Refresh polls after vote
                    fetchPolls()
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Posts Section */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Posts</h2>
          {posts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600">
                No posts yet. Check back later for content from this creator.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  showCreator={false}
                  onUnlock={handleUnlock}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CreatorPublicPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <CreatorPublicContent />
    </Suspense>
  )
}
