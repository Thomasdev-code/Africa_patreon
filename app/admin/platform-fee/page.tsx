"use server"

import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PLATFORM_FEE_PERCENT, getPlatformFeePercent, invalidatePlatformFeeCache } from "@/app/config/platform"
import { revalidatePath } from "next/cache"
import Link from "next/link"
import { PlatformFeeForm } from "./PlatformFeeForm"

export default async function PlatformFeePage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    redirect("/login")
  }

  const currentFee = await getPlatformFeePercent()
  const isUsingDefault = !(await prisma.config.findUnique({
    where: { key: "platform_fee_percent" },
  }))

  // Get recent payment stats to show impact
  const recentPayments = await prisma.payment.findMany({
    where: {
      status: "success",
      createdAt: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      },
    },
    select: {
      amount: true,
      platformFee: true,
    },
    take: 100,
  })

  const totalRevenue = recentPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const totalPlatformFee = recentPayments.reduce((sum, p) => sum + (p.platformFee || 0), 0)

  async function updateFee(formData: FormData) {
    "use server"
    const session = await auth()
    if (!session?.user || session.user.role !== "admin") {
      throw new Error("Unauthorized")
    }

    const feePercent = Number(formData.get("feePercent"))
    if (!Number.isFinite(feePercent) || feePercent < 0 || feePercent > 100) {
      throw new Error("Fee percent must be between 0 and 100")
    }

    // Log the change for audit trail
    const oldFee = await getPlatformFeePercent()
    console.log(`[PLATFORM_FEE_UPDATE] Admin ${session.user.id} changing fee from ${oldFee}% to ${feePercent}%`)

    try {
      const result = await prisma.config.upsert({
        where: { key: "platform_fee_percent" },
        create: { 
          key: "platform_fee_percent", 
          value: feePercent.toString(),
        },
        update: { 
          value: feePercent.toString(),
        },
      })
      
      console.log(`[PLATFORM_FEE_UPDATE] Successfully updated fee to ${feePercent}%`, { configId: result.id })
      
      // Verify the update
      const verifyConfig = await prisma.config.findUnique({
        where: { key: "platform_fee_percent" },
      })
      
      if (!verifyConfig || verifyConfig.value !== feePercent.toString()) {
        throw new Error("Failed to verify platform fee update")
      }
    } catch (dbError: any) {
      console.error("[PLATFORM_FEE_UPDATE] Database error:", dbError)
      throw new Error(`Failed to save platform fee: ${dbError.message || "Database error"}`)
    }

    // Invalidate cache so new fee is used immediately
    invalidatePlatformFeeCache()
    revalidatePath("/admin/platform-fee")
    revalidatePath("/admin")
  }

  // Calculate example impact
  const exampleAmounts = [1000, 5000, 10000, 50000] // In minor units (kobo/cents)

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Platform Fee Settings</h1>
            <p className="text-gray-600 mt-2">
              Configure the global platform fee percentage. Changes apply to all new payments immediately.
            </p>
          </div>
          <Link
            href="/admin"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to Admin
          </Link>
        </div>
      </div>

      {/* Current Fee Display */}
      <div className="mb-6 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Current Platform Fee</p>
            <p className="text-4xl font-bold text-blue-600 mt-1">{currentFee}%</p>
            {isUsingDefault && (
              <p className="text-xs text-gray-500 mt-1">
                Using default from environment (PLATFORM_FEE_PERCENT)
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Last 30 Days</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {(totalPlatformFee / 100).toLocaleString("en-KE", {
                style: "currency",
                currency: "KES",
                minimumFractionDigits: 0,
              })}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              from {(totalRevenue / 100).toLocaleString("en-KE", {
                style: "currency",
                currency: "KES",
                minimumFractionDigits: 0,
              })} total
            </p>
          </div>
        </div>
      </div>

      {/* Fee Calculator Examples */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Fee Impact Examples</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exampleAmounts.map((amount) => {
            const fee = Math.floor((amount * currentFee) / 100)
            const creatorEarnings = amount - fee
            return (
              <div key={amount} className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-600 mb-2">
                  Payment: {(amount / 100).toLocaleString("en-KE", {
                    style: "currency",
                    currency: "KES",
                    minimumFractionDigits: 0,
                  })}
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Platform Fee:</span>
                    <span className="font-semibold text-red-600">
                      {(fee / 100).toLocaleString("en-KE", {
                        style: "currency",
                        currency: "KES",
                        minimumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Creator Earnings:</span>
                    <span className="font-semibold text-green-600">
                      {(creatorEarnings / 100).toLocaleString("en-KE", {
                        style: "currency",
                        currency: "KES",
                        minimumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Update Form */}
      <PlatformFeeForm currentFee={currentFee} updateFee={updateFee} />

      {/* Info Box */}
      <div className="mt-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
        <div className="flex">
          <svg className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-yellow-800">Note</p>
            <p className="text-sm text-yellow-700 mt-1">
              Platform fees are calculated server-side for security. The fee percentage is stored in the database and can be overridden via the <code className="bg-yellow-100 px-1 rounded">PLATFORM_FEE_PERCENT</code> environment variable (default: {PLATFORM_FEE_PERCENT}%).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

