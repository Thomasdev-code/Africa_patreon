"use client"

import { useState } from "react"

interface CommentFormProps {
  postId: string
  replyToId?: string | null
  onCommentAdded: () => void
}

export default function CommentForm({
  postId,
  replyToId,
  onCommentAdded,
}: CommentFormProps) {
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim()) {
      setError("Comment cannot be empty")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          content: content.trim(),
          replyToId: replyToId || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to post comment")
        return
      }

      setContent("")
      onCommentAdded()
    } catch (err) {
      console.error("Comment submission error:", err)
      setError("An error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      {error && (
        <div className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
      <div className="flex gap-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={replyToId ? "Write a reply..." : "Write a comment..."}
          rows={3}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed self-end"
        >
          {isSubmitting ? "Posting..." : replyToId ? "Reply" : "Post"}
        </button>
      </div>
    </form>
  )
}

