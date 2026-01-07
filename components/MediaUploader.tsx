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

  /**
   * Upload video directly to Cloudinary using signed parameters
   * 
   * STRICT CONTRACT: Client trusts ONLY the signature response
   * - No client-invented Cloudinary parameters
   * - No filename or folder sent to signature endpoint
   * - Uses exact values from signature response
   * - Includes retry logic for large uploads
   */
  const uploadVideoDirectly = async (file: File, retryCount = 0): Promise<void> => {
    const MAX_RETRIES = 3
    const RETRY_DELAY = 1000 * (retryCount + 1) // Exponential backoff

    try {
      // Request signature - server is single source of truth
      // NO body needed - server defines everything
      const signatureRes = await fetch("/api/creator/posts/media-upload/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // Empty body - server determines all params
      })

      if (!signatureRes.ok) {
        const error = await signatureRes.json()
        throw new Error(error.error || "Failed to get upload signature")
      }

      // STRICT TYPING: Only use parameters returned by signature endpoint
      // NOTE: resourceType is NOT in response - determined by upload URL
      interface SignatureResponse {
        signature: string
        timestamp: number
        cloudName: string
        apiKey: string
        folder: string
        chunkSize: string // Always present for video uploads
      }

      const signedParams: SignatureResponse = await signatureRes.json()

      // GUARD: Ensure all required params are present
      if (!signedParams.signature || !signedParams.timestamp || !signedParams.cloudName || 
          !signedParams.apiKey || !signedParams.folder || !signedParams.chunkSize) {
        throw new Error("Invalid signature response: missing required parameters")
      }

      // Build upload FormData - ONLY use signed params, no client-invented values
      // CRITICAL: resource_type is NOT included - determined by upload URL
      const formData = new FormData()
      formData.append("file", file) // Required but NOT signed
      formData.append("api_key", signedParams.apiKey) // Required but NOT signed
      formData.append("timestamp", signedParams.timestamp.toString()) // MUST match signature
      formData.append("signature", signedParams.signature) // Required but NOT signed
      formData.append("folder", signedParams.folder) // MUST match signature exactly
      formData.append("chunk_size", signedParams.chunkSize) // MUST match signature exactly

      // Upload to Cloudinary
      // resource_type is determined by URL: /video/upload = video
      const uploadUrl = `https://api.cloudinary.com/v1_1/${signedParams.cloudName}/video/upload`
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      })

      if (!uploadRes.ok) {
        let errorMessage = "Video upload failed"
        try {
          const errorData = await uploadRes.json()
          // Surface real Cloudinary error messages
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
          errorMessage = `Upload failed: ${uploadRes.status} ${uploadRes.statusText}`
        }

        // Retry logic for network errors or 5xx errors
        if (retryCount < MAX_RETRIES && (uploadRes.status >= 500 || uploadRes.status === 408)) {
          console.log(`[VIDEO_UPLOAD] Retry ${retryCount + 1}/${MAX_RETRIES} after ${RETRY_DELAY}ms`)
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
          return uploadVideoDirectly(file, retryCount + 1)
        }

        throw new Error(errorMessage)
      }

      const uploadData = await uploadRes.json()

      // Success - use secure_url from Cloudinary response
      const previewUrl = uploadData.secure_url
      setPreview(previewUrl)
      onUploadComplete(previewUrl, "video")
      setIsUploading(false)
    } catch (err) {
      // If retries exhausted or non-retryable error, throw
      if (retryCount >= MAX_RETRIES || !(err instanceof Error && err.message.includes("408"))) {
        throw err
      }
      // Retry on timeout errors
      console.log(`[VIDEO_UPLOAD] Retry ${retryCount + 1}/${MAX_RETRIES} after ${RETRY_DELAY}ms`)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
      return uploadVideoDirectly(file, retryCount + 1)
    }
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

