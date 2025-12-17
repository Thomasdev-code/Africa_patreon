"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { UpgradeBanner } from "@/components/ai/UpgradeBanner"

interface UserStatus {
  hasAccess: boolean
  aiCredits: number
}

export default function PostWriterPage() {
  const router = useRouter()
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [topic, setTopic] = useState("")
  const [tone, setTone] = useState("professional")
  const [length, setLength] = useState("medium")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPost, setGeneratedPost] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAccess()
  }, [])

  const checkAccess = async () => {
    try {
      const res = await fetch("/api/ai/check-access")
      const data = await res.json()
      if (res.ok) {
        setUserStatus(data)
      } else {
        setUserStatus({ hasAccess: false, aiCredits: 0 })
      }
    } catch (err) {
      console.error("Error checking access:", err)
      setUserStatus({ hasAccess: false, aiCredits: 0 })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic")
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedPost(null)

    try {
      const res = await fetch("/api/ai/post-writer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, tone, length }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate post")
      }

      setGeneratedPost(data.content)
      await checkAccess()
    } catch (err: any) {
      setError(err.message || "Failed to generate post")
    } finally {
      setIsGenerating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!userStatus?.hasAccess) {
    return <UpgradeBanner title="Upgrade to Pro to Use AI Post Writer" />
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-blue-600 hover:text-blue-700"
          >
            ← Back to AI Tools
          </button>
          <h1 className="text-3xl font-bold text-gray-900">AI Post Writer</h1>
          <p className="mt-2 text-gray-600">
            Generate engaging posts for your audience
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Credits remaining: <span className="font-semibold">{userStatus.aiCredits}</span>
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="space-y-6">
            <div>
              <label
                htmlFor="topic"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Topic
              </label>
              <input
                id="topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Tips for growing your online presence"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="tone"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Tone
                </label>
                <select
                  id="tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="friendly">Friendly</option>
                  <option value="inspiring">Inspiring</option>
                  <option value="humorous">Humorous</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="length"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Length
                </label>
                <select
                  id="length"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="short">Short (100-200 words)</option>
                  <option value="medium">Medium (200-400 words)</option>
                  <option value="long">Long (400+ words)</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating || userStatus.aiCredits < 1}
              className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isGenerating ? "Generating..." : "Generate Post (1 credit)"}
            </button>

            {generatedPost && (
              <div className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Generated Post
                  </h2>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedPost)
                      alert("Copied to clipboard!")
                    }}
                    className="rounded-lg bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
                  >
                    Copy
                  </button>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
                  <p className="whitespace-pre-wrap text-gray-800">{generatedPost}</p>
                </div>
                <button
                  onClick={() => setGeneratedPost(null)}
                  className="mt-4 rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
                >
                  Generate Another
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

