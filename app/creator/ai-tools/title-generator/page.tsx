"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { UpgradeBanner } from "@/components/ai/UpgradeBanner"

interface UserStatus {
  hasAccess: boolean
  aiCredits: number
}

export default function TitleGeneratorPage() {
  const router = useRouter()
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [topic, setTopic] = useState("")
  const [count, setCount] = useState(5)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([])
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
    setGeneratedTitles([])

    try {
      const res = await fetch("/api/ai/title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, count }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate titles")
      }

      setGeneratedTitles(data.titles)
      await checkAccess()
    } catch (err: any) {
      setError(err.message || "Failed to generate titles")
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
    return <UpgradeBanner title="Upgrade to Pro to Generate Titles" />
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
          <h1 className="text-3xl font-bold text-gray-900">Title Generator</h1>
          <p className="mt-2 text-gray-600">
            Generate compelling titles that grab attention
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
                Topic or Content Description
              </label>
              <textarea
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., A guide to building a successful online business"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div>
              <label
                htmlFor="count"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Number of Titles
              </label>
              <select
                id="count"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={3}>3 titles</option>
                <option value={5}>5 titles</option>
                <option value={10}>10 titles</option>
              </select>
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
              {isGenerating ? "Generating..." : "Generate Titles (1 credit)"}
            </button>

            {generatedTitles.length > 0 && (
              <div className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Generated Titles
                  </h2>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedTitles.join("\n"))
                      alert("Copied to clipboard!")
                    }}
                    className="rounded-lg bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
                  >
                    Copy All
                  </button>
                </div>
                <div className="space-y-2">
                  {generatedTitles.map((title, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <p className="text-gray-800">{title}</p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(title)
                          alert("Copied!")
                        }}
                        className="ml-4 rounded bg-blue-100 px-3 py-1 text-sm text-blue-700 hover:bg-blue-200"
                      >
                        Copy
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setGeneratedTitles([])}
                  className="mt-4 rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
                >
                  Generate More
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

