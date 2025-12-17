"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { UpgradeBanner } from "@/components/ai/UpgradeBanner"

interface UserStatus {
  hasAccess: boolean
  aiCredits: number
}

export default function IdeasGeneratorPage() {
  const router = useRouter()
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [niche, setNiche] = useState("")
  const [count, setCount] = useState(10)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedIdeas, setGeneratedIdeas] = useState<string[]>([])
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
    if (!niche.trim()) {
      setError("Please enter your niche")
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedIdeas([])

    try {
      const res = await fetch("/api/ai/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ niche, count }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate ideas")
      }

      setGeneratedIdeas(data.ideas)
      await checkAccess()
    } catch (err: any) {
      setError(err.message || "Failed to generate ideas")
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
    return <UpgradeBanner title="Upgrade to Pro to Generate Content Ideas" />
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
          <h1 className="text-3xl font-bold text-gray-900">Content Ideas Generator</h1>
          <p className="mt-2 text-gray-600">
            Get AI-generated content ideas and topics for your niche
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Credits remaining: <span className="font-semibold">{userStatus.aiCredits}</span>
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="space-y-6">
            <div>
              <label
                htmlFor="niche"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Your Niche or Content Category
              </label>
              <input
                id="niche"
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g., Tech tutorials, Fitness, Cooking, Business advice"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="count"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Number of Ideas
              </label>
              <select
                id="count"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5 ideas</option>
                <option value={10}>10 ideas</option>
                <option value={20}>20 ideas</option>
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
              {isGenerating ? "Generating..." : "Generate Ideas (1 credit)"}
            </button>

            {generatedIdeas.length > 0 && (
              <div className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Generated Ideas
                  </h2>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(generatedIdeas.join("\n"))
                      alert("Copied to clipboard!")
                    }}
                    className="rounded-lg bg-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-300"
                  >
                    Copy All
                  </button>
                </div>
                <div className="space-y-2">
                  {generatedIdeas.map((idea, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <p className="text-gray-800">{idea}</p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(idea)
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
                  onClick={() => setGeneratedIdeas([])}
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

