"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { UpgradeBanner } from "@/components/ai/UpgradeBanner"

interface UserStatus {
  hasAccess: boolean
  aiCredits: number
}

export default function ThumbnailGeneratorPage() {
  const router = useRouter()
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
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
    if (!prompt.trim()) {
      setError("Please enter a prompt")
      return
    }

    setIsGenerating(true)
    setError(null)
    setGeneratedImage(null)

    try {
      const res = await fetch("/api/ai/thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate thumbnail")
      }

      setGeneratedImage(data.imageUrl)
      // Refresh credits
      await checkAccess()
    } catch (err: any) {
      setError(err.message || "Failed to generate thumbnail")
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
    return <UpgradeBanner title="Upgrade to Pro to Generate Thumbnails" />
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
          <h1 className="text-3xl font-bold text-gray-900">Thumbnail Generator</h1>
          <p className="mt-2 text-gray-600">
            Generate eye-catching thumbnails with watermark for your posts
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Credits remaining: <span className="font-semibold">{userStatus.aiCredits}</span>
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-6">
            <label
              htmlFor="prompt"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Describe your thumbnail
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A vibrant tech workspace with laptop, coffee, and plants, modern and professional"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
            />
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || userStatus.aiCredits < 1}
            className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isGenerating ? "Generating..." : "Generate Thumbnail (1 credit)"}
          </button>

          {generatedImage && (
            <div className="mt-8">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                Generated Thumbnail
              </h2>
              <div className="relative rounded-lg border border-gray-200 bg-gray-50 p-4">
                <img
                  src={generatedImage}
                  alt="Generated thumbnail"
                  className="w-full rounded-lg"
                />
                <div className="mt-4 flex gap-4">
                  <a
                    href={generatedImage}
                    download
                    className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                  >
                    Download
                  </a>
                  <button
                    onClick={() => setGeneratedImage(null)}
                    className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
                  >
                    Generate Another
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

