import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export interface UploadResult {
  url: string
  path: string
}

/**
 * Storage abstraction for media uploads
 * Supports local storage (dev) and can be extended for cloud storage (S3, Cloudinary, etc.)
 */
export class StorageService {
  private uploadDir: string

  constructor() {
    // Use public/uploads for local storage
    this.uploadDir = join(process.cwd(), "public", "uploads")
  }

  /**
   * Upload file to storage
   */
  async uploadFile(
    file: File | Buffer,
    filename: string,
    folder: string = "media"
  ): Promise<UploadResult> {
    // For production, you would upload to S3, Cloudinary, etc.
    // For now, we'll use local storage

    if (process.env.STORAGE_TYPE === "s3") {
      return this.uploadToS3(file, filename, folder)
    } else if (process.env.STORAGE_TYPE === "cloudinary") {
      return this.uploadToCloudinary(file, filename, folder)
    } else {
      return this.uploadToLocal(file, filename, folder)
    }
  }

  /**
   * Upload to local storage (development)
   */
  private async uploadToLocal(
    file: File | Buffer,
    filename: string,
    folder: string
  ): Promise<UploadResult> {
    const folderPath = join(this.uploadDir, folder)
    
    // Create directory if it doesn't exist
    if (!existsSync(folderPath)) {
      await mkdir(folderPath, { recursive: true })
    }

    const filePath = join(folderPath, filename)
    const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file

    await writeFile(filePath, buffer)

    // Return public URL
    const url = `/uploads/${folder}/${filename}`
    return { url, path: filePath }
  }

  /**
   * Upload to AWS S3 (production - placeholder)
   */
  private async uploadToS3(
    file: File | Buffer,
    filename: string,
    folder: string
  ): Promise<UploadResult> {
    // TODO: Implement S3 upload
    // const s3 = new AWS.S3()
    // const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file
    // const result = await s3.upload({...}).promise()
    // return { url: result.Location, path: result.Key }
    
    throw new Error("S3 upload not implemented yet")
  }

  /**
   * Upload to Cloudinary (production - placeholder)
   */
  private async uploadToCloudinary(
    file: File | Buffer,
    filename: string,
    folder: string
  ): Promise<UploadResult> {
    // TODO: Implement Cloudinary upload
    // const cloudinary = require('cloudinary').v2
    // const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file
    // const result = await cloudinary.uploader.upload(buffer, { folder })
    // return { url: result.secure_url, path: result.public_id }
    
    throw new Error("Cloudinary upload not implemented yet")
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
   * Validate file size (max 50MB)
   */
  validateFileSize(size: number): boolean {
    const maxSize = 50 * 1024 * 1024 // 50MB
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
}

export const storage = new StorageService()

