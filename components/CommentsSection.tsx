"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { MessageCircle, Send, Trash2 } from "lucide-react"
import Avatar from "@/components/Avatar"

interface Comment {
  id: string
  postId: string
  userId: string
  replyToId: string | null
  content: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    email: string
    username: string | null
    avatarUrl: string | null
  }
  replies?: Comment[]
}

interface CommentsSectionProps {
  postId: string
  creatorId: string
  canComment?: boolean
  refreshInterval?: number
}

export default function CommentsSection({
  postId,
  creatorId,
  canComment = false,
  refreshInterval = 5000,
}: CommentsSectionProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [commentText, setCommentText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Fetch comments
  const fetchComments = async () => {
    try {
      setIsLoading(true)
      setFetchError(null)
      const res = await fetch(`/api/posts/${postId}/comments`)
      const data = await res.json()

      if (res.ok) {
        setComments(data.comments || [])
      } else {
        setFetchError(data.error || "Failed to load comments")
      }
    } catch (err) {
      console.error("Fetch comments error:", err)
      setFetchError("Failed to load comments")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchComments()

    // Set up refresh interval if provided
    let interval: NodeJS.Timeout | null = null
    if (refreshInterval && refreshInterval > 0) {
      interval = setInterval(fetchComments, refreshInterval)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, refreshInterval])

  const handleSubmitComment = async (e: React.FormEvent, replyToId?: string) => {
    e.preventDefault()

    if (!session?.user) {
      router.push("/login")
      return
    }

    const text = replyToId ? replyText : commentText
    if (!text.trim()) {
      setError("Comment cannot be empty")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          replyToId: replyToId || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to post comment")
        return
      }

      // Clear form
      if (replyToId) {
        setReplyText("")
        setReplyingTo(null)
      } else {
        setCommentText("")
      }

      // Refresh comments
      await fetchComments()
    } catch (err) {
      console.error("Comment error:", err)
      setError("An error occurred while posting comment")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) {
      return
    }

    try {
      const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "Failed to delete comment")
        return
      }

      // Refresh comments
      await fetchComments()
    } catch (err) {
      console.error("Delete comment error:", err)
      alert("An error occurred while deleting comment")
    }
  }

  const canDelete = (comment: Comment) => {
    if (!session?.user) return false
    return (
      comment.userId === session.user.id ||
      (session.user.role === "creator" && session.user.id === creatorId)
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 7) {
      return date.toLocaleDateString()
    } else if (days > 0) {
      return `${days}d ago`
    } else if (hours > 0) {
      return `${hours}h ago`
    } else if (minutes > 0) {
      return `${minutes}m ago`
    } else {
      return "just now"
    }
  }

  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircle className="h-5 w-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Comments ({comments.length})
        </h3>
      </div>

      {/* Comment Input - Only for subscribed fans */}
      {canComment && session?.user?.role === "fan" && (
        <form
          onSubmit={(e) => handleSubmitComment(e)}
          className="mb-6"
        >
          <div className="flex gap-2">
            <div className="flex-1">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !commentText.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? "Posting..." : "Post"}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </form>
      )}

      {!canComment && session?.user?.role === "fan" && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Subscribe to this creator to comment on their posts.
          </p>
        </div>
      )}

      {!session?.user && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">
            Sign in to view and post comments.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Sign In
          </button>
        </div>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : fetchError ? (
        <div className="text-center py-8 text-gray-500">
          Failed to load comments. Please refresh.
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar
                src={comment.user.avatarUrl}
                alt={comment.user.username || comment.user.email}
                size="sm"
              />
              <div className="flex-1">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-1">
                    <div>
                      <span className="font-semibold text-gray-900 text-sm">
                        {comment.user.username || comment.user.email.split("@")[0]}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                    {canDelete(comment) && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete comment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>

                {/* Reply Button */}
                {canComment && session?.user?.role === "fan" && (
                  <button
                    onClick={() =>
                      setReplyingTo(
                        replyingTo === comment.id ? null : comment.id
                      )
                    }
                    className="mt-1 text-xs text-blue-600 hover:text-blue-700"
                  >
                    {replyingTo === comment.id ? "Cancel" : "Reply"}
                  </button>
                )}

                {/* Reply Form */}
                {replyingTo === comment.id && (
                  <form
                    onSubmit={(e) => handleSubmitComment(e, comment.id)}
                    className="mt-2 flex gap-2"
                  >
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply..."
                      className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting || !replyText.trim()}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      Reply
                    </button>
                  </form>
                )}

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-3 ml-4 space-y-3 border-l-2 border-gray-200 pl-4">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex gap-3">
                        <Avatar
                          src={reply.user.avatarUrl}
                          alt={reply.user.username || reply.user.email}
                          size="sm"
                        />
                        <div className="flex-1">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-start justify-between mb-1">
                              <div>
                                <span className="font-semibold text-gray-900 text-sm">
                                  {reply.user.username ||
                                    reply.user.email.split("@")[0]}
                                </span>
                                <span className="text-xs text-gray-500 ml-2">
                                  {formatDate(reply.createdAt)}
                                </span>
                              </div>
                              {canDelete(reply) && (
                                <button
                                  onClick={() => handleDeleteComment(reply.id)}
                                  className="text-gray-400 hover:text-red-600 transition-colors"
                                  title="Delete reply"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                            <p className="text-gray-700 text-sm whitespace-pre-wrap">
                              {reply.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
