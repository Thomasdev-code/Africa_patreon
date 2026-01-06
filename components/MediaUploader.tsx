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

  const uploadVideoDirectly = async (file: File) => {
    // Generate unique filename
    const fileTimestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    const ext = file.name.split(".").pop()
    const filename = `${fileTimestamp}-${random}.${ext}`

    // Get signed upload parameters from server
    const signatureRes = await fetch("/api/creator/posts/media-upload/signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename,
        resourceType: "video",
        folder: "media",
      }),
    })

    if (!signatureRes.ok) {
      const error = await signatureRes.json()
      throw new Error(error.error || "Failed to get upload signature")
    }

    const { signature, timestamp, cloudName, apiKey, resourceType, publicId, chunkSize } =
      await signatureRes.json()

    // Ensure resource_type is explicitly "video" for videos
    const uploadResourceType = resourceType || "video"

    // Upload directly to Cloudinary with resumable uploads enabled
    const formData = new FormData()
    formData.append("file", file)
    formData.append("api_key", apiKey)
    formData.append("timestamp", timestamp.toString())
    formData.append("signature", signature)
    formData.append("public_id", publicId)
    formData.append("resource_type", uploadResourceType)
    
    // Enable resumable uploads for videos (chunk_size ~6MB)
    if (chunkSize) {
      formData.append("chunk_size", chunkSize)
    }

    // Upload directly to Cloudinary (videos go to /video/upload endpoint)
    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${uploadResourceType}/upload`,
      {
        method: "POST",
        body: formData,
      }
    )

    if (!uploadRes.ok) {
      let errorMessage = "Video upload failed"
      try {
        const errorData = await uploadRes.json()
        // Surface real Cloudinary errors
        if (errorData.error?.message) {
          errorMessage = errorData.error.message
        } else if (errorData.error) {
          errorMessage = typeof errorData.error === "string" 
            ? errorData.error 
            : JSON.stringify(errorData.error)
        } else if (errorData.message) {
          errorMessage = errorData.message
        }
      } catch (parseError) {
        // If JSON parsing fails, use status text
        errorMessage = `Upload failed: ${uploadRes.status} ${uploadRes.statusText}`
      }
      throw new Error(errorMessage)
    }

    const uploadData = await uploadRes.json()

    // Create preview URL
    const previewUrl = uploadData.secure_url
    setPreview(previewUrl)
    onUploadComplete(previewUrl, "video")
    setIsUploading(false)
  }

  const uploadThroughServer = async (file: File) => {
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
  }

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

    // Validate file size
    const isVideo = file.type.startsWith("video/")
    const maxVideoSize = 150 * 1024 * 1024 // 150MB for videos
    const maxOtherSize = 50 * 1024 * 1024 // 50MB for images/audio

    if (isVideo && file.size > maxVideoSize) {
      setUploadError("Video file size exceeds 150MB limit")
      return
    }

    if (!isVideo && file.size > maxOtherSize) {
      setUploadError("File size exceeds 50MB limit")
      return
    }

    setIsUploading(true)
    setUploadError("")

    try {
      // Videos: Upload directly to Cloudinary (bypass serverless limits)
      // Images/Audio: Upload through server (smaller files, no issue)
      const isVideo = file.type.startsWith("video/")

      if (isVideo) {
        await uploadVideoDirectly(file)
      } else {
        await uploadThroughServer(file)
      }
    } catch (err) {
      console.error("Upload error:", err)
      // Surface the actual error message from Cloudinary or signature endpoint
      const errorMessage = err instanceof Error 
        ? err.message 
        : "An error occurred during upload"
      setUploadError(errorMessage)
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
          Upload an image, video, or audio file (videos: max 150MB, others: max 50MB)
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

