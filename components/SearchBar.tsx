"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"

interface SearchResult {
  id: string
  type: "creator" | "post" | "poll" | "audio"
  username?: string
  bio?: string
  avatarUrl?: string | null
  userId?: string
  title?: string
  content?: string
  mediaUrl?: string | null
  mediaType?: string | null
  creatorUsername?: string
  creatorAvatarUrl?: string | null
  question?: string
  createdAt?: string
}

interface SearchResponse {
  creators: SearchResult[]
  posts: SearchResult[]
  polls: SearchResult[]
  audio: SearchResult[]
  query: string
}

export default function SearchBar() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Debounce search
  useEffect(() => {
    if (query.length < 2) {
      setResults(null)
      setIsOpen(false)
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data)
        setIsOpen(true)
      } catch (error) {
        console.error("Search error:", error)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleResultClick = (result: SearchResult) => {
    setIsOpen(false)
    setQuery("")
    if (result.type === "creator" && result.username) {
      router.push(`/creator/${result.username}`)
    } else if (result.type === "post" || result.type === "audio") {
      if (result.creatorUsername) {
        router.push(`/creator/${result.creatorUsername}`)
      }
    } else if (result.type === "poll" && result.creatorUsername) {
      router.push(`/creator/${result.creatorUsername}`)
    }
  }

  const totalResults =
    (results?.creators.length || 0) +
    (results?.posts.length || 0) +
    (results?.polls.length || 0) +
    (results?.audio.length || 0)

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (e.target.value.length >= 2) {
              setIsOpen(true)
            }
          }}
          onFocus={() => {
            if (query.length >= 2 && results) {
              setIsOpen(true)
            }
          }}
          placeholder="Search creators, posts, polls..."
          className="w-full px-4 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">Searching...</div>
          ) : totalResults === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No results found for "{query}"
            </div>
          ) : (
            <div className="py-2">
              {/* Creators */}
              {results?.creators && results.creators.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                    Creators
                  </div>
                  {results.creators.map((creator) => (
                    <button
                      key={creator.id}
                      onClick={() => handleResultClick(creator)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
                    >
                      {creator.avatarUrl ? (
                        <Image
                          src={creator.avatarUrl}
                          alt={creator.username || ""}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 text-sm">
                            {creator.username?.[0]?.toUpperCase() || "?"}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">
                          @{creator.username}
                        </div>
                        {creator.bio && (
                          <div className="text-sm text-gray-500 truncate">
                            {creator.bio}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Posts */}
              {results?.posts && results.posts.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                    Posts
                  </div>
                  {results.posts.map((post) => (
                    <button
                      key={post.id}
                      onClick={() => handleResultClick(post)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50"
                    >
                      <div className="font-semibold text-gray-900 mb-1">
                        {post.title}
                      </div>
                      {post.content && (
                        <div className="text-sm text-gray-500 line-clamp-2">
                          {post.content}
                        </div>
                      )}
                      {post.creatorUsername && (
                        <div className="text-xs text-gray-400 mt-1">
                          by @{post.creatorUsername}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Polls */}
              {results?.polls && results.polls.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                    Polls
                  </div>
                  {results.polls.map((poll) => (
                    <button
                      key={poll.id}
                      onClick={() => handleResultClick(poll)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50"
                    >
                      <div className="font-semibold text-gray-900 mb-1">
                        {poll.question}
                      </div>
                      {poll.creatorUsername && (
                        <div className="text-xs text-gray-400">
                          by @{poll.creatorUsername}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Audio */}
              {results?.audio && results.audio.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                    Audio
                  </div>
                  {results.audio.map((audio) => (
                    <button
                      key={audio.id}
                      onClick={() => handleResultClick(audio)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-purple-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">
                          {audio.title}
                        </div>
                        {audio.creatorUsername && (
                          <div className="text-xs text-gray-400">
                            by @{audio.creatorUsername}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

