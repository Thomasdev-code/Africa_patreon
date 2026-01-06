export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import crypto from "crypto"

/**
 * Generate Cloudinary signed upload parameters for direct client-side uploads
 * This allows videos to be uploaded directly from client to Cloudinary,
 * bypassing serverless function limits
 */
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

    const body = await req.json()
    const { filename, resourceType = "auto", folder = "media" } = body

    if (!filename) {
      return NextResponse.json(
        { error: "Filename is required" },
        { status: 400 }
      )
    }

    // Validate Cloudinary configuration
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "Cloudinary is not configured" },
        { status: 503 }
      )
    }

    // Generate unique public_id (remove extension)
    const publicId = filename.replace(/\.[^/.]+$/, "")
    const fullPublicId = `africa-patreon/${folder}/${publicId}`

    // Generate timestamp (required for signed uploads)
    const timestamp = Math.round(new Date().getTime() / 1000)

    // Build parameters for signature (only include parameters that will be sent)
    // Note: public_id includes the folder path, so we don't need separate folder param
    const params: Record<string, string> = {
      timestamp: timestamp.toString(),
      resource_type: resourceType,
      public_id: fullPublicId,
    }

    // For videos, enable resumable uploads with chunk_size (~6MB)
    // This must be included in signature calculation
    if (resourceType === "video") {
      params.chunk_size = "6291456" // 6MB in bytes
    }

    // Create signature string (must be sorted by key)
    const signatureString = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&")
    const signature = crypto
      .createHash("sha1")
      .update(signatureString + apiSecret)
      .digest("hex")

    return NextResponse.json({
      signature,
      timestamp,
      cloudName,
      apiKey,
      resourceType: params.resource_type,
      publicId: fullPublicId,
      chunkSize: params.chunk_size || undefined, // Include chunk_size for videos
    })
  } catch (error: any) {
    console.error("[SIGNATURE] Error:", {
      message: error.message,
      name: error.name,
    })

    return NextResponse.json(
      { error: "Failed to generate upload signature" },
      { status: 500 }
    )
  }
}

