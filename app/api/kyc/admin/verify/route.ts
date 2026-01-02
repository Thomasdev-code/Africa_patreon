export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { calculateRiskScore } from "@/lib/risk-engine"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { kycId, status, adminNotes } = body

    if (!kycId || !status) {
      return NextResponse.json(
        { error: "KYC ID and status are required" },
        { status: 400 }
      )
    }

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be 'approved' or 'rejected'" },
        { status: 400 }
      )
    }

    const kyc = await prisma.kycVerification.findUnique({
      where: { id: kycId },
      include: {
        user: true,
      },
    })

    if (!kyc) {
      return NextResponse.json(
        { error: "KYC verification not found" },
        { status: 404 }
      )
    }

    // Update KYC status
    await prisma.kycVerification.update({
      where: { id: kycId },
      data: {
        status,
        adminNotes,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
    })

    // If approved, recalculate risk score (KYC approval reduces risk)
    if (status === "approved") {
      await calculateRiskScore(kyc.userId)

      // Initialize wallet if creator
      if (kyc.user.role === "creator") {
        await (prisma as any).creatorWallet.upsert({
          where: { userId: kyc.userId },
          create: {
            userId: kyc.userId,
            balance: 0,
            currency: "USD",
          },
          update: {},
        })
      }
    }

    return NextResponse.json({
      success: true,
      kyc: {
        id: kyc.id,
        status,
        adminNotes,
        reviewedAt: new Date(),
      },
    })
  } catch (error: any) {
    console.error("KYC verification error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")

    const where: any = {}
    if (status) {
      where.status = status
    }

    const kycs = await prisma.kycVerification.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({
      kycs: kycs.map((kyc) => ({
        id: kyc.id,
        userId: kyc.userId,
        userEmail: kyc.user.email,
        userRole: kyc.user.role,
        status: kyc.status,
        adminNotes: kyc.adminNotes,
        reviewedBy: kyc.reviewedBy,
        reviewedAt: kyc.reviewedAt,
        createdAt: kyc.createdAt,
      })),
    })
  } catch (error: any) {
    console.error("KYC list error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

