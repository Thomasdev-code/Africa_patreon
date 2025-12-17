import { useState, useEffect, useCallback } from "react"
import type { Comment, CreateCommentInput } from "@/lib/types"

export function useComments(postId: string) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments/${postId}`)
      const data = await res.json()

      if (res.ok) {
        setComments(data.comments || [])
        setError("")
      } else {
        setError(data.error || "Failed to load comments")
      }
    } catch (err) {
      console.error("Comments fetch error:", err)
      setError("An error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [postId])

  useEffect(() => {
    fetchComments()
    // Poll for new comments every 10 seconds
    const interval = setInterval(fetchComments, 10000)
    return () => clearInterval(interval)
  }, [fetchComments])

  const addComment = useCallback(
    async (input: CreateCommentInput) => {
      try {
        const res = await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || "Failed to post comment")
        }

        await fetchComments()
        return data.comment
      } catch (err) {
        console.error("Comment creation error:", err)
        throw err
      }
    },
    [fetchComments]
  )

  return {
    comments,
    isLoading,
    error,
    addComment,
    refresh: fetchComments,
  }
}

