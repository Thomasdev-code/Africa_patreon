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

    // Validate file size
    if (!storage.validateFileSize(file.size)) {
      return NextResponse.json(
        { error: "File size exceeds 50MB limit" },
        { status: 400 }
      )
    }

    // Generate filename and upload
    const filename = storage.generateFilename(file.name)
    const mediaType = storage.getMediaType(file.type)

    if (!mediaType) {
      return NextResponse.json(
        { error: "Could not determine media type" },
        { status: 400 }
      )
    }

    const result = await storage.uploadFile(file, filename, "media")

    return NextResponse.json({
      success: true,
      mediaUrl: result.url,
      mediaType: mediaType,
      filename: filename,
    })
  } catch (error) {
    console.error("Media upload error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

