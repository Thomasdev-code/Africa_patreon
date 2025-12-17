"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import Avatar from "@/components/Avatar"
import type { CreatorProfile, MembershipTier } from "@/lib/types"

export default function SubscribePage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const username = params.username as string
  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [selectedTier, setSelectedTier] = useState<MembershipTier | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!session) {
      router.push(`/login?callbackUrl=/creator/${username}/subscribe`)
      return
    }

    if (session.user.role === "creator") {
      router.push(`/creator/${username}`)
      return
    }

    fetchProfile()
  }, [username, session])

  const fetchProfile = async () => {
    try {
      const res = await fetch(`/api/creator/profile/${username}`)
      const data = await res.json()

      if (res.ok) {
        setProfile(data.profile)
        if (data.profile.tiers && data.profile.tiers.length > 0) {
          setSelectedTier(data.profile.tiers[0])
        }
      } else {
        setError(data.error || "Profile not found")
      }
    } catch (err) {
      console.error("Profile fetch error:", err)
      setError("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubscribe = async () => {
    if (!selectedTier || !profile) return

    setIsProcessing(true)
    setError("")

    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId: (profile as any).user?.id,
          tierName: selectedTier.name,
          provider: selectedProvider || undefined, // Auto-select if not provided
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Payment initialization failed")
        setIsProcessing(false)
        return
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
      } else {
        setError("Payment URL not received")
        setIsProcessing(false)
      }
    } catch (err) {
      console.error("Subscribe error:", err)
      setError("An error occurred. Please try again.")
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{error}</h1>
          <Link
            href="/discover"
            className="text-blue-600 hover:text-blue-700 underline"
          >
            Go back to discover
          </Link>
        </div>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center gap-4 mb-8">
            <Avatar src={profile.avatarUrl} alt={profile.username} size="lg" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Subscribe to @{profile.username}
              </h1>
              <p className="text-gray-600">{profile.bio}</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Select a Tier
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.tiers.map((tier, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedTier(tier)}
                  className={`p-6 border-2 rounded-lg cursor-pointer transition-colors ${
                    selectedTier?.name === tier.name
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {tier.name}
                    </h3>
                    <span className="text-2xl font-bold text-green-600">
                      ${tier.price}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">per month</p>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleSubscribe}
              disabled={!selectedTier || isProcessing}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing
                ? "Processing..."
                : `Subscribe for $${selectedTier?.price || 0}/month`}
            </button>
            <Link
              href={`/creator/${username}`}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

