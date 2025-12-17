"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Heart } from "lucide-react"
import { useRouter } from "next/navigation"

interface LikeButtonProps {
  postId: string
  initialLikeCount?: number
  initialIsLiked?: boolean
  onLikeChange?: (liked: boolean, count: number) => void
}

export default function LikeButton({
  postId,
  initialLikeCount = 0,
  initialIsLiked = false,
  onLikeChange,
}: LikeButtonProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Sync with props if they change
  useEffect(() => {
    setIsLiked(initialIsLiked)
    setLikeCount(initialLikeCount)
  }, [initialIsLiked, initialLikeCount])

  const handleLike = async () => {
    if (!session?.user) {
      router.push("/login")
      return
    }

    if (session.user.role !== "fan") {
      setError("Only fans can like posts")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const endpoint = isLiked ? "unlike" : "like"
      const res = await fetch(`/api/posts/${postId}/${endpoint}`, {
        method: "POST",
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to update like")
        return
      }

      // Optimistic update
      const newLiked = !isLiked
      const newCount = data.likeCount ?? likeCount + (newLiked ? 1 : -1)

      setIsLiked(newLiked)
      setLikeCount(newCount)

      if (onLikeChange) {
        onLikeChange(newLiked, newCount)
      }
    } catch (err) {
      console.error("Like error:", err)
      setError("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const canLike = session?.user?.role === "fan"

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleLike}
        disabled={isLoading || !canLike}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
          isLiked
            ? "bg-red-50 text-red-600 hover:bg-red-100"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        } ${isLoading ? "opacity-50 cursor-not-allowed" : ""} ${
          !canLike ? "opacity-50 cursor-not-allowed" : ""
        }`}
        title={!canLike ? "You must be a fan to like posts" : ""}
      >
        <Heart
          className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`}
          strokeWidth={2}
        />
        <span className="text-sm font-medium">{likeCount}</span>
      </button>
      {error && (
        <span className="text-xs text-red-600" title={error}>
          ⚠
        </span>
      )}
    </div>
  )
}

