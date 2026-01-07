// Suppress DEP0169 warning from Cloudinary dependency
// Cloudinary 2.8.0 uses deprecated url.parse() internally
// This is safe to suppress as it's from a trusted dependency
if (typeof process !== "undefined" && process.emitWarning) {
  const originalEmitWarning = process.emitWarning.bind(process)
  ;(process as any).emitWarning = function (
    warning: string | Error,
    typeOrOptions?: string | { type?: string; code?: string },
    code?: string
  ) {
    // Suppress DEP0169 (url.parse deprecation) warnings from Cloudinary
    const deprecationCode = typeof typeOrOptions === "object" ? typeOrOptions?.code : code
    if (deprecationCode === "DEP0169" || (typeof warning === "string" && warning.includes("DEP0169"))) {
      return
    }
    return originalEmitWarning(warning, typeOrOptions as any, code)
  }
}

import { v2 as cloudinary } from "cloudinary"

export interface UploadResult {
  url: string
  path: string
}

/**
 * Storage abstraction for media uploads
 * Uses Cloudinary for all uploads (memory-based, no filesystem)
 * Compatible with Vercel serverless runtime
 */
export class StorageService {
  private cloudinaryConfigured: boolean

  constructor() {
    // Configure Cloudinary if credentials are available
    this.cloudinaryConfigured = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    )

    if (this.cloudinaryConfigured) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
      })
    }
  }

  /**
   * Upload file to storage (Cloudinary only, memory-based)
   */
  async uploadFile(
    file: File | Buffer,
    filename: string,
    folder: string = "media"
  ): Promise<UploadResult> {
    // Always use Cloudinary - no filesystem operations
    if (!this.cloudinaryConfigured) {
      throw new Error(
        "Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables."
      )
    }

    return this.uploadToCloudinary(file, filename, folder)
  }

  /**
   * Upload to Cloudinary using memory buffer (no filesystem)
   */
  private async uploadToCloudinary(
    file: File | Buffer,
    filename: string,
    folder: string
  ): Promise<UploadResult> {
    try {
      // Convert File to Buffer if needed (memory-based, no disk writes)
      const buffer: Buffer =
        file instanceof File
          ? Buffer.from(await file.arrayBuffer())
          : file

      // Upload to Cloudinary using buffer with data URI format
      // This avoids any filesystem operations
      // Consistent folder structure: always use "africa-patreon/media"
      const uploadOptions: {
        folder: string
        resource_type?: "auto" | "image" | "video" | "raw"
        public_id?: string
      } = {
        folder: "africa-patreon/media", // Normalized folder - consistent with signature endpoint
        resource_type: "auto", // Auto-detect image/video/raw
      }

      // Remove extension from filename for public_id (Cloudinary handles extensions)
      const publicId = filename.replace(/\.[^/.]+$/, "")

      // Convert buffer to data URI format for Cloudinary
      // Format: data:[<mediatype>][;base64],<data>
      const mimeType = file instanceof File ? file.type : "application/octet-stream"
      const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`

      // Upload using upload method with data URI (memory-based, no filesystem)
      const result = await cloudinary.uploader.upload(dataUri, {
        ...uploadOptions,
        public_id: publicId,
      })

      return {
        url: result.secure_url,
        path: result.public_id,
      }
    } catch (error: any) {
      // Log Cloudinary-specific errors with details
      console.error("[CLOUDINARY] Upload failed:", {
        error: error.message,
        code: error.http_code,
        name: error.name,
        folder,
        filename,
        stack: error.stack,
      })

      throw new Error(
        `Cloudinary upload failed: ${error.message || "Unknown error"}`
      )
    }
  }

  /**
   * Get media type from file
   */
  getMediaType(mimeType: string): "image" | "video" | "audio" | null {
    if (mimeType.startsWith("image/")) {
      return "image"
    } else if (mimeType.startsWith("video/")) {
      return "video"
    } else if (mimeType.startsWith("audio/")) {
      return "audio"
    }
    return null
  }

  /**
   * Validate file type
   */
  validateFileType(mimeType: string): boolean {
    const allowedTypes = [
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
      "audio/ogg",
    ]
    return allowedTypes.includes(mimeType)
  }

  /**
   * Validate file size
   * Videos: 150MB max, Others: 50MB max
   * Matches client-side validation for consistency
   */
  validateFileSize(size: number, mimeType?: string): boolean {
    const isVideo = mimeType?.startsWith("video/")
    const maxSize = isVideo ? 150 * 1024 * 1024 : 50 * 1024 * 1024 // 150MB for videos, 50MB for others
    return size <= maxSize
  }

  /**
   * Generate unique filename
   */
  generateFilename(originalName: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 15)
    const ext = originalName.split(".").pop()
    return `${timestamp}-${random}.${ext}`
  }

  /**
   * Check if file type should use direct client upload (videos only)
   * Videos go directly to Cloudinary to avoid serverless limits
   */
  shouldUseDirectUpload(mimeType: string): boolean {
    return mimeType.startsWith("video/")
  }
}

export const storage = new StorageService()

