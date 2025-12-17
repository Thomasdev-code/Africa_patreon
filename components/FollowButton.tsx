"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Check, UserPlus } from "lucide-react"

interface FollowButtonProps {
  creatorId: string
  initialIsFollowing?: boolean
  onChange?: (followed: boolean) => void
  size?: "sm" | "md"
}

export default function FollowButton({
  creatorId,
  initialIsFollowing,
  onChange,
  size = "md",
}: FollowButtonProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isFollowing, setIsFollowing] = useState<boolean>(
    initialIsFollowing ?? false
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (initialIsFollowing !== undefined) {
      setIsFollowing(initialIsFollowing)
      return
    }

    const load = async () => {
      if (!creatorId || status !== "authenticated" || session?.user.role !== "fan")
        return

      try {
        const res = await fetch(`/api/follow/check?creatorId=${creatorId}`)
        if (!res.ok) return
        const data = await res.json()
        setIsFollowing(!!data.isFollowing)
      } catch (err) {
        console.error("Follow check failed", err)
      }
    }

    load()
  }, [creatorId, status, session?.user?.role, initialIsFollowing])

  const handleClick = async () => {
    if (!session) {
      router.push("/login")
      return
    }

    if (session.user.role !== "fan") {
      // Non-fans cannot follow; optionally route creators/admins somewhere else
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/follow/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorId }),
      })

      if (!res.ok) {
        console.error("Failed to toggle follow")
        return
      }

      const data = await res.json()
      setIsFollowing(data.followed)
      onChange?.(data.followed)
    } catch (err) {
      console.error("Follow toggle failed", err)
    } finally {
      setLoading(false)
    }
  }

  const baseClasses =
    "inline-flex items-center justify-center rounded-full font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"

  const sizeClasses =
    size === "sm"
      ? "px-3 py-1.5 text-xs"
      : "px-4 py-2 text-sm"

  const activeClasses = isFollowing
    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
    : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md"

  return (
    <button
      onClick={handleClick}
      disabled={loading || status === "loading"}
      className={`${baseClasses} ${sizeClasses} ${activeClasses} disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {isFollowing ? (
        <>
          <Check className="w-4 h-4 mr-1.5" />
          <span>Following</span>
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4 mr-1.5" />
          <span>Follow</span>
        </>
      )}
    </button>
  )
}


