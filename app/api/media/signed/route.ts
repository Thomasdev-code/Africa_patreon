import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma, executeWithReconnect } from "@/lib/prisma"
import crypto from "crypto"

// Generate a signed URL token
function generateSignedToken(postId: string, userId: string, expiresIn: number = 3600): string {
  const payload = {
    postId,
    userId,
    expiresAt: Date.now() + expiresIn * 1000,
  }
  const secret = process.env.MEDIA_SIGNING_SECRET || "default-secret-change-in-production"
  const hmac = crypto.createHmac("sha256", secret)
  hmac.update(JSON.stringify(payload))
  return hmac.digest("hex") + "." + Buffer.from(JSON.stringify(payload)).toString("base64")
}

// Verify signed token
function verifySignedToken(token: string): { postId: string; userId: string; expiresAt: number } | null {
  try {
    const [signature, payloadBase64] = token.split(".")
    if (!signature || !payloadBase64) return null

    const payload = JSON.parse(Buffer.from(payloadBase64, "base64").toString())
    const secret = process.env.MEDIA_SIGNING_SECRET || "default-secret-change-in-production"
    const hmac = crypto.createHmac("sha256", secret)
    hmac.update(JSON.stringify(payload))
    const expectedSignature = hmac.digest("hex")

    if (signature !== expectedSignature) return null
    if (payload.expiresAt < Date.now()) return null

    return payload
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const { searchParams } = new URL(req.url)
    const postId = searchParams.get("postId")
    const token = searchParams.get("token")

    if (!postId) {
      return NextResponse.json({ error: "Post ID is required" }, { status: 400 })
    }

    // If token provided, verify it
    if (token) {
      const payload = verifySignedToken(token)
      if (!payload || payload.postId !== postId) {
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 403 })
      }

      // Token is valid, return the media URL
      const post = await executeWithReconnect(() =>
        prisma.post.findUnique({
          where: { id: postId },
          select: { mediaUrl: true },
        })
      )

      if (!post || !post.mediaUrl) {
        return NextResponse.json({ error: "Media not found" }, { status: 404 })
      }

      return NextResponse.json({ url: post.mediaUrl })
    }

    // No token, check access via subscription/PPV
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const post = await executeWithReconnect(() =>
      prisma.post.findUnique({
        where: { id: postId },
        include: {
          creator: true,
        },
      })
    )

    if (!post || !post.mediaUrl) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 })
    }

    // Check if user is the creator
    if (post.creatorId === session.user.id) {
      return NextResponse.json({ url: post.mediaUrl })
    }

    // Check PPV purchase
    if (post.isPPV) {
      const purchase = await executeWithReconnect(() =>
        prisma.pPVPurchase.findUnique({
          where: {
            fanId_postId: {
              fanId: session.user.id,
              postId: post.id,
            },
          },
        })
      )

      if (!purchase) {
        return NextResponse.json({ error: "PPV not purchased" }, { status: 403 })
      }
    } else if (post.tierName) {
      // Check subscription
      const subscription = await executeWithReconnect(() =>
        prisma.subscription.findFirst({
          where: {
            fanId: session.user.id,
            creatorId: post.creatorId,
            tierName: post.tierName,
            status: "active",
          },
        })
      )

      if (!subscription) {
        return NextResponse.json({ error: "Subscription required" }, { status: 403 })
      }

      // Check if subscription expired
      if (subscription.endDate && subscription.endDate < new Date()) {
        return NextResponse.json({ error: "Subscription expired" }, { status: 403 })
      }
    }

    // Generate signed token for future requests
    const signedToken = generateSignedToken(postId, session.user.id, 3600) // 1 hour expiry

    return NextResponse.json({
      url: post.mediaUrl,
      token: signedToken,
      expiresIn: 3600,
    })
  } catch (error) {
    console.error("Signed media URL error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

