"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Avatar from "@/components/Avatar"
import SearchBar from "@/components/SearchBar"
import type { CreatorProfile } from "@/lib/types"

interface CreatorListItem {
  id: string
  username: string
  bio: string
  avatarUrl: string | null
  bannerUrl: string | null
  tiers: any[]
  subscriberCount: number
  postCount: number
}

export default function DiscoverPage() {
  const router = useRouter()
  const [creators, setCreators] = useState<CreatorListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchCreators()
  }, [])

  const fetchCreators = async () => {
    try {
      const res = await fetch("/api/public/creators")
      const data = await res.json()

      if (res.ok) {
        setCreators(data.creators || [])
      } else {
        setError(data.error || "Failed to load creators")
      }
    } catch (err) {
      console.error("Creators fetch error:", err)
      setError("An error occurred while loading creators")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading creators...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">{error}</h1>
          <button
            onClick={fetchCreators}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Discover Creators</h1>
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
          <div className="max-w-2xl">
            <SearchBar />
          </div>
        </div>
      </div>

      {/* Creators Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {creators.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg mb-4">
              No creators found yet.
            </p>
            <p className="text-gray-500">
              Be the first to create a profile and start building your community!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {creators.map((creator) => (
              <Link
                key={creator.id}
                href={`/creator/${creator.username}`}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Banner */}
                {creator.bannerUrl && (
                  <div className="h-32 bg-gray-200">
                    <img
                      src={creator.bannerUrl}
                      alt={`${creator.username} banner`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {!creator.bannerUrl && (
                  <div className="h-32 bg-gradient-to-r from-blue-400 to-purple-500" />
                )}

                {/* Profile Info */}
                <div className="p-6 -mt-12 relative">
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar
                      src={creator.avatarUrl}
                      alt={creator.username}
                      size="lg"
                    />
                    <div className="flex-1">
                      <h2 className="text-xl font-bold text-gray-900">
                        @{creator.username}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        {creator.subscriberCount} subscribers • {creator.postCount} posts
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                    {creator.bio}
                  </p>
                  {creator.tiers && creator.tiers.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {creator.tiers.slice(0, 3).map((tier: any, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                        >
                          ${tier.price}/mo
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

