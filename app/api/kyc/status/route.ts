export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

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
      return NextResponse.json({
        status: "not_submitted",
        message: "KYC verification not submitted",
      })
    }

    return NextResponse.json({
      status: kyc.status,
      reviewedAt: kyc.reviewedAt,
      adminNotes: kyc.adminNotes,
    })
  } catch (error: any) {
    console.error("Get KYC status error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get KYC status" },
      { status: 500 }
    )
  }
}

