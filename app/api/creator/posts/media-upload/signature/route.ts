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
    const { filename, resourceType, folder = "media" } = body

    if (!filename) {
      return NextResponse.json(
        { error: "Filename is required" },
        { status: 400 }
      )
    }

    // Ensure resource_type is explicitly "video" for video uploads
    // This must match exactly what the client sends
    const uploadResourceType = resourceType || "video"

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

    // Generate timestamp (required for signed uploads)
    const timestamp = Math.round(new Date().getTime() / 1000)

    // Build folder path for organization
    const folderPath = `africa-patreon/${folder}`

    // Build parameters for signature
    // CRITICAL: Only include parameters that will be sent in the upload request
    // DO NOT include: file, api_key, cloud_name, signature, public_id (these are not signed)
    // public_id must NOT be sent - let Cloudinary auto-generate it to avoid signature mismatch
    // MUST include: timestamp, folder, resource_type, chunk_size (if video)
    const params: Record<string, string> = {
      timestamp: timestamp.toString(),
      folder: folderPath,
      resource_type: uploadResourceType, // Use explicit resource_type
    }

    // For videos, enable resumable uploads with chunk_size (~6MB)
    // chunk_size MUST be included in signature if it will be sent in upload
    if (uploadResourceType === "video") {
      params.chunk_size = "6291456" // 6MB in bytes - must match client upload
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
      folder: folderPath, // Return folder for client to use
      resourceType: params.resource_type, // Return exact value used in signature
      chunkSize: params.chunk_size || undefined, // Return exact value used in signature
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

