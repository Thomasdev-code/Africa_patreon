"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface AIToolsCardProps {
  subscriptionPlan?: string
}

export default function AIToolsCard({ subscriptionPlan = "free" }: AIToolsCardProps) {
  const router = useRouter()
  const [isPro, setIsPro] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkProStatus()
  }, [subscriptionPlan])

  // Refresh status periodically to catch webhook updates
  useEffect(() => {
    const interval = setInterval(() => {
      checkProStatus()
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const checkProStatus = async () => {
    try {
      const res = await fetch("/api/ai/check-access")
      if (res.ok) {
        const data = await res.json()
        setIsPro(data.hasAccess || data.subscriptionPlan === "pro")
      }
    } catch (err) {
      console.error("Error checking Pro status:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpgrade = () => {
    router.push("/creator/upgrade")
  }

  const handleOpenTools = () => {
    router.push("/creator/ai-tools")
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
        <div className="h-10 bg-gray-200 rounded w-1/2"></div>
      </div>
    )
  }

  const hasProAccess = isPro || subscriptionPlan === "pro"

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-md p-6 border border-purple-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 text-white text-2xl">
            ✨
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">AI Tools</h3>
            <p className="text-sm text-gray-600">
              {hasProAccess
                ? "Powerful AI tools to enhance your content"
                : "Unlock AI-powered content creation tools"}
            </p>
          </div>
        </div>
        {hasProAccess && (
          <span className="px-3 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
            Pro
          </span>
        )}
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-700 mb-3">
          {hasProAccess
            ? "Access thumbnail generation, post writing, title generation, and content ideas."
            : "Upgrade to Pro to unlock AI tools including thumbnail generation, post writing, title generation, and content ideas."}
        </p>
        {hasProAccess && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg
              className="h-4 w-4 text-green-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>50 AI credits included monthly</span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {hasProAccess ? (
          <button
            onClick={handleOpenTools}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
          >
            Open AI Tools
          </button>
        ) : (
          <button
            onClick={handleUpgrade}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
          >
            Upgrade to Unlock AI Tools
          </button>
        )}
        <Link
          href="/creator/ai-tools"
          className="px-4 py-2 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Learn More
        </Link>
      </div>
    </div>
  )
}

