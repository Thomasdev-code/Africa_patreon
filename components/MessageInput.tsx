"use client"

import { useState, useRef } from "react"
import MediaUploader from "@/components/MediaUploader"
import type { MediaType } from "@/lib/types"

interface MessageInputProps {
  receiverId: string
  onMessageSent: () => void
}

export default function MessageInput({
  receiverId,
  onMessageSent,
}: MessageInputProps) {
  const [content, setContent] = useState("")
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<MediaType>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [showMediaUpload, setShowMediaUpload] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim() && !mediaUrl) {
      setError("Message cannot be empty")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId,
          content: content.trim() || undefined,
          mediaUrl: mediaUrl || undefined,
          mediaType: mediaType || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to send message")
        return
      }

      setContent("")
      setMediaUrl(null)
      setMediaType(null)
      setShowMediaUpload(false)
      onMessageSent()

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    } catch (err) {
      console.error("Message send error:", err)
      setError("An error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error}
        </div>
      )}

      {showMediaUpload && (
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
          <MediaUploader
            onUploadComplete={(url, type) => {
              setMediaUrl(url)
              setMediaType(type)
            }}
            currentMediaUrl={mediaUrl}
            currentMediaType={mediaType}
            disabled={isSubmitting}
          />
          <button
            type="button"
            onClick={() => {
              setShowMediaUpload(false)
              setMediaUrl(null)
              setMediaType(null)
            }}
            className="mt-2 text-sm text-gray-600 hover:text-gray-800"
          >
            Remove media
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => {
            setContent(e.target.value)
            e.target.style.height = "auto"
            e.target.style.height = `${e.target.scrollHeight}px`
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Press Enter to send, Shift+Enter for new line)"
          rows={1}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none max-h-32"
          disabled={isSubmitting}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowMediaUpload(!showMediaUpload)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            title="Attach media"
          >
            📎
          </button>
          <button
            type="submit"
            disabled={isSubmitting || (!content.trim() && !mediaUrl)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </form>
  )
}

