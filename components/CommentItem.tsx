"use client"

import { useState } from "react"
import Avatar from "@/components/Avatar"
import CommentForm from "@/components/CommentForm"
import type { Comment } from "@/lib/types"

interface CommentItemProps {
  comment: Comment
  postId: string
  canComment: boolean
  onReplyAdded: () => void
}

export default function CommentItem({
  comment,
  postId,
  canComment,
  onReplyAdded,
}: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false)

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return "just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(date).toLocaleDateString()
  }

  const username =
    comment.user.creatorProfile?.username ||
    comment.user.email.split("@")[0]
  const avatarUrl = comment.user.creatorProfile?.avatarUrl || null
  const isCreator = comment.user.role === "creator"

  return (
    <div className="border-l-2 border-gray-200 pl-4">
      <div className="flex items-start gap-3">
        <Avatar src={avatarUrl} alt={username} size="sm" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900">{username}</span>
            {isCreator && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                Creator
              </span>
            )}
            <span className="text-xs text-gray-500">
              {formatTime(comment.createdAt)}
            </span>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap mb-2">
            {comment.content}
          </p>
          {canComment && (
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showReplyForm ? "Cancel" : "Reply"}
            </button>
          )}
        </div>
      </div>

      {showReplyForm && (
        <div className="mt-3 ml-7">
          <CommentForm
            postId={postId}
            replyToId={comment.id}
            onCommentAdded={() => {
              setShowReplyForm(false)
              onReplyAdded()
            }}
          />
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 ml-7 space-y-4">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="border-l-2 border-gray-100 pl-4">
              <div className="flex items-start gap-3">
                <Avatar
                  src={reply.user.creatorProfile?.avatarUrl || null}
                  alt={
                    reply.user.creatorProfile?.username ||
                    reply.user.email.split("@")[0]
                  }
                  size="sm"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">
                      {reply.user.creatorProfile?.username ||
                        reply.user.email.split("@")[0]}
                    </span>
                    {reply.user.role === "creator" && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        Creator
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {formatTime(reply.createdAt)}
                    </span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {reply.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

