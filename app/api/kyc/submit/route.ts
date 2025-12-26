import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { storage } from "@/lib/storage"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const idDocument = formData.get("idDocument") as File
    const selfie = formData.get("selfie") as File
    const addressProof = formData.get("addressProof") as File | null

    if (!idDocument || !selfie) {
      return NextResponse.json(
        { error: "ID document and selfie are required" },
        { status: 400 }
      )
    }

    // Upload documents
    const idDocumentResult = await storage.uploadFile(
      idDocument,
      `id-${Date.now()}.${idDocument.name.split(".").pop()}`,
      `kyc/${session.user.id}`
    )
    const idDocumentUrl = idDocumentResult.url

    const selfieResult = await storage.uploadFile(
      selfie,
      `selfie-${Date.now()}.${selfie.name.split(".").pop()}`,
      `kyc/${session.user.id}`
    )
    const selfieUrl = selfieResult.url

    let addressProofUrl: string | undefined

    if (addressProof) {
      const addressProofResult = await storage.uploadFile(
        addressProof,
        `address-${Date.now()}.${addressProof.name.split(".").pop()}`,
        `kyc/${session.user.id}`
      )
      addressProofUrl = addressProofResult.url
    }

    // Create or update KYC verification
    const kyc = await prisma.kycVerification.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        idDocumentUrl,
        selfieUrl,
        addressProofUrl,
        status: "pending",
      },
      update: {
        idDocumentUrl,
        selfieUrl,
        addressProofUrl,
        status: "pending", // Reset to pending if resubmitting
        adminNotes: null,
        reviewedBy: null,
        reviewedAt: null,
      },
    })

    return NextResponse.json({
      success: true,
      kyc: {
        id: kyc.id,
        status: kyc.status,
        createdAt: kyc.createdAt,
      },
    })
  } catch (error: any) {
    console.error("KYC submission error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const kyc = await prisma.kycVerification.findUnique({
      where: { userId: session.user.id },
    })

    if (!kyc) {
      return NextResponse.json({ kyc: null })
    }

    return NextResponse.json({
      kyc: {
        id: kyc.id,
        status: kyc.status,
        adminNotes: kyc.adminNotes,
        createdAt: kyc.createdAt,
        reviewedAt: kyc.reviewedAt,
      },
    })
  } catch (error: any) {
    console.error("KYC fetch error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

