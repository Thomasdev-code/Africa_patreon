"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"

interface TrendingCreator {
  id: string
  username: string
  bio: string
  avatarUrl: string | null
  bannerUrl: string | null
  trendingScore: number
  stats: {
    likes: number
    comments: number
    newFollowers: number
    newSubscribers: number
    recentPosts: number
  }
}

export default function TrendingCreators() {
  const [creators, setCreators] = useState<TrendingCreator[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await fetch("/api/discover/trending?limit=6")
        const data = await res.json()
        if (res.ok) {
          setCreators(data.creators || [])
        }
      } catch (error) {
        console.error("Failed to fetch trending creators", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTrending()
  }, [])

  if (isLoading) {
    return (
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-pulse text-gray-400">Loading trending creators...</div>
          </div>
        </div>
      </section>
    )
  }

  if (creators.length === 0) {
    return null
  }

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            🔥 Trending Creators
          </h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Discover the most active and engaging creators on the platform right now
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {creators.map((creator, index) => (
            <motion.div
              key={creator.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Link
                href={`/creator/${creator.username}`}
                className="block bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-[#0d3b2e] to-[#f4c430] flex items-center justify-center">
                      {creator.avatarUrl ? (
                        <Image
                          src={creator.avatarUrl}
                          alt={creator.username}
                          width={56}
                          height={56}
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold text-white">
                          {creator.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        @{creator.username}
                      </h3>
                      <p className="text-xs text-gray-500 line-clamp-1">
                        {creator.bio || "Creator"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-full">
                    <span className="text-orange-600 text-xs font-semibold">
                      🔥 {Math.round(creator.trendingScore)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">❤️</span>
                    <span>{creator.stats.likes} likes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">💬</span>
                    <span>{creator.stats.comments} comments</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">👥</span>
                    <span>{creator.stats.newFollowers} new followers</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">📝</span>
                    <span>{creator.stats.recentPosts} posts</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            href="/discover"
            className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
          >
            View All Creators
          </Link>
        </div>
      </div>
    </section>
  )
}

