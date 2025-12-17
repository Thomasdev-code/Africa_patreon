"use server"

import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { PLATFORM_FEE_PERCENT } from "@/app/config/platform"
import { revalidatePath } from "next/cache"

export default async function PlatformFeePage() {
  const session = await auth()
  if (!session?.user || session.user.role !== "admin") {
    redirect("/login")
  }

  const config = await prisma.config.findUnique({
    where: { key: "platform_fee_percent" },
  })
  const currentFee =
    (config && Number.isFinite(Number(config.value)) && Number(config.value)) ||
    PLATFORM_FEE_PERCENT

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

    await prisma.config.upsert({
      where: { key: "platform_fee_percent" },
      create: { key: "platform_fee_percent", value: feePercent.toString() },
      update: { value: feePercent.toString() },
    })

    revalidatePath("/admin/platform-fee")
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Platform Fee Settings</h1>
        <p className="text-gray-600 mt-2">
          Configure the global platform fee. Updates apply to new payments only.
        </p>
      </div>

      <form action={updateFee} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Platform fee (%)
          </label>
          <input
            name="feePercent"
            type="number"
            step="0.1"
            min="0"
            max="100"
            defaultValue={currentFee}
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Only new payments will use the updated fee. Existing records remain unchanged.
          </p>
        </div>
        <button
          type="submit"
          className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Save fee
        </button>
      </form>
    </div>
  )
}

