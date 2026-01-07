export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import crypto from "crypto"
import { isCloudinaryConfigured } from "@/lib/env-validation"

/**
 * Cloudinary signed upload signature generation
 * 
 * SINGLE SOURCE OF TRUTH: Server defines all signed parameters
 * Client must send ONLY the parameters returned by this endpoint
 * 
 * Cloudinary Rule: resource_type is determined ONLY by the upload URL
 * - /video/upload = video
 * - /image/upload = image
 * - /raw/upload = raw
 * 
 * Signature Contract:
 * - Signed params: timestamp, folder, chunk_size (videos only)
 * - resource_type is NOT signed (determined by URL)
 * - Unsigned params (sent but not signed): file, api_key, signature
 * - Never signed: public_id, resource_type (let Cloudinary determine from URL)
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

    // Validate Cloudinary configuration
    if (!isCloudinaryConfigured()) {
      console.error("[SIGNATURE] Cloudinary not configured")
      return NextResponse.json(
        { error: "Media upload service is not configured" },
        { status: 503 }
      )
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME!
    const apiKey = process.env.CLOUDINARY_API_KEY!
    const apiSecret = process.env.CLOUDINARY_API_SECRET!

    // Generate timestamp (required for signed uploads)
    const timestamp = Math.round(new Date().getTime() / 1000)

    // Normalized folder path - single source of truth on server
    // Always use "africa-patreon/media" - no client-defined folders
    const folderPath = "africa-patreon/media"

    // Build parameters for signature
    // CRITICAL: resource_type is NOT included - it's determined by upload URL
    // Cloudinary signature rules:
    // 1. Sort parameters alphabetically by key
    // 2. Concatenate as key=value pairs joined by &
    // 3. Append API_SECRET (NOT API_KEY) to the string
    // 4. Hash with SHA1
    const params: Record<string, string> = {
      timestamp: timestamp.toString(),
      folder: folderPath,
    }

    // For videos, enable resumable uploads with chunk_size (~6MB)
    // chunk_size MUST be included in signature if it will be sent in upload
    params.chunk_size = "6291456" // 6MB in bytes - always include for video uploads

    // Generate signature string (alphabetically sorted)
    const sortedKeys = Object.keys(params).sort()
    const signatureString = sortedKeys
      .map((key) => `${key}=${params[key]}`)
      .join("&")
    
    // CRITICAL: Use API_SECRET (not API_KEY) for signature generation
    const signature = crypto
      .createHash("sha1")
      .update(signatureString + apiSecret)
      .digest("hex")

    // Return ONLY the parameters the client needs
    // NOTE: resourceType is NOT returned - client uses /video/upload URL instead
    return NextResponse.json({
      signature,
      timestamp,
      cloudName,
      apiKey,
      folder: folderPath, // Exact value used in signature
      chunkSize: params.chunk_size, // Exact value used in signature (videos only)
    })
  } catch (error: any) {
    // Defensive logging - never leak secrets
    console.error("[SIGNATURE] Error:", {
      message: error.message,
      name: error.name,
      // Do not log stack or any env vars
    })

    return NextResponse.json(
      { error: "Failed to generate upload signature" },
      { status: 500 }
    )
  }
}

