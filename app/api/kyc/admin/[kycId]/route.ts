import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ kycId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { kycId } = await params
    const kyc = await prisma.kycVerification.findUnique({
      where: { id: kycId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
      },
    })

    if (!kyc) {
      return NextResponse.json(
        { error: "KYC verification not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      kyc: {
        id: kyc.id,
        userId: kyc.userId,
        user: kyc.user,
        idDocumentUrl: kyc.idDocumentUrl,
        selfieUrl: kyc.selfieUrl,
        addressProofUrl: kyc.addressProofUrl,
        status: kyc.status,
        adminNotes: kyc.adminNotes,
        reviewedBy: kyc.reviewedBy,
        reviewedAt: kyc.reviewedAt,
        createdAt: kyc.createdAt,
        updatedAt: kyc.updatedAt,
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

