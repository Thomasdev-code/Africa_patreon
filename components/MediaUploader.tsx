"use client"

import { useState, useRef } from "react"
import Image from "next/image"
import type { MediaType } from "@/lib/types"

interface MediaUploaderProps {
  onUploadComplete: (mediaUrl: string, mediaType: MediaType) => void
  currentMediaUrl?: string | null
  currentMediaType?: MediaType
  disabled?: boolean
}

export default function MediaUploader({
  onUploadComplete,
  currentMediaUrl,
  currentMediaType,
  disabled = false,
}: MediaUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [preview, setPreview] = useState<string | null>(
    currentMediaUrl || null
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/aac",
      "audio/m4a",
      "audio/ogg",
      "audio/flac",
    ]

    if (!validTypes.includes(file.type)) {
      setUploadError(
        "Invalid file type. Allowed: images, videos, or audio files."
      )
      return
    }

    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      setUploadError("File size exceeds 50MB limit")
      return
    }

    setIsUploading(true)
    setUploadError("")

    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/creator/posts/media-upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setUploadError(data.error || "Upload failed")
        setIsUploading(false)
        return
      }

      // Create preview URL
      const previewUrl = data.mediaUrl
      setPreview(previewUrl)
      onUploadComplete(data.mediaUrl, data.mediaType)
      setIsUploading(false)
    } catch (err) {
      console.error("Upload error:", err)
      setUploadError("An error occurred during upload")
      setIsUploading(false)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    onUploadComplete("", null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Media (Optional)
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*"
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <p className="mt-1 text-sm text-gray-500">
          Upload an image, video, or audio file (max 50MB)
        </p>
      </div>

      {isUploading && (
        <div className="text-sm text-blue-600">Uploading...</div>
      )}

      {uploadError && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {uploadError}
        </div>
      )}

      {preview && (
        <div className="relative border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-medium text-gray-700">
              Media Preview
            </span>
            <button
              type="button"
              onClick={handleRemove}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          </div>
          <div className="mt-2">
            {currentMediaType === "image" || preview.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
              <div className="relative w-full h-64">
                <Image
                  src={preview}
                  alt="Preview"
                  fill
                  className="object-contain rounded"
                />
              </div>
            ) : currentMediaType === "video" || preview.match(/\.(mp4|webm|mov)$/i) ? (
              <video
                src={preview}
                controls
                className="w-full max-h-64 rounded"
              >
                Your browser does not support the video tag.
              </video>
            ) : currentMediaType === "audio" || preview.match(/\.(mp3|wav|aac|m4a|ogg|flac)$/i) ? (
              <audio src={preview} controls className="w-full">
                Your browser does not support the audio tag.
              </audio>
            ) : (
              <p className="text-sm text-gray-600">Media uploaded: {preview}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

