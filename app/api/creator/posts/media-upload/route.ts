export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { storage } from "@/lib/storage"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "creator") {
      return NextResponse.json(
        { error: "Only creators can upload media" },
        { status: 403 }
      )
    }

    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Validate file type
    if (!storage.validateFileType(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Allowed: images (JPEG, PNG, GIF, WebP), videos (MP4, WebM, QuickTime), audio (MP3, WAV, OGG)",
        },
        { status: 400 }
      )
    }

    // Validate file size (consistent with client-side validation)
    const mediaType = storage.getMediaType(file.type)
    
    if (!mediaType) {
      return NextResponse.json(
        { error: "Could not determine media type" },
        { status: 400 }
      )
    }

    const isVideo = mediaType === "video"
    if (!storage.validateFileSize(file.size, file.type)) {
      const maxSize = isVideo ? "150MB" : "50MB"
      return NextResponse.json(
        { error: `File size exceeds ${maxSize} limit` },
        { status: 400 }
      )
    }

    // Generate filename and upload
    const filename = storage.generateFilename(file.name)

    const result = await storage.uploadFile(file, filename, "media")

    return NextResponse.json({
      success: true,
      mediaUrl: result.url,
      mediaType: mediaType,
      filename: filename,
    })
  } catch (error: any) {
    // Log detailed error for debugging
    console.error("[MEDIA_UPLOAD] Error:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
    })

    // Return user-friendly error message
    // If it's a Cloudinary configuration error, provide specific message
    if (error.message?.includes("Cloudinary is not configured")) {
      return NextResponse.json(
        { error: "Media upload service is not configured. Please contact support." },
        { status: 503 }
      )
    }

    // If it's a Cloudinary upload error, return generic message (already logged server-side)
    if (error.message?.includes("Cloudinary upload failed")) {
      return NextResponse.json(
        { error: "Failed to upload media. Please try again." },
        { status: 500 }
      )
    }

    // Generic error fallback
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

