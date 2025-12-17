import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import AiConfigClient from "@/components/admin/AiConfigClient"

export default async function AiConfigPage() {
  const session = await auth()

  if (!session?.user || session.user.role !== "admin") {
    redirect("/login")
  }

  // Get AI configuration stats
  const [totalUsage, proUsers, recentUsage] = await Promise.all([
    prisma.aiUsageHistory.count(),
    prisma.user.count({ where: { subscriptionPlan: "pro" } }),
    prisma.aiUsageHistory.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            subscriptionPlan: true,
          },
        },
      },
    }),
  ])

  // Get usage by tool
  const usageByTool = await prisma.aiUsageHistory.groupBy({
    by: ["toolType"],
    _count: {
      id: true,
    },
  })

  const toolStats = usageByTool.reduce(
    (acc, item) => {
      acc[item.toolType] = item._count.id
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI Configuration</h1>
          <p className="mt-2 text-gray-600">
            Manage AI credits, view usage, and configure settings
          </p>
        </div>

        <AiConfigClient
          totalUsage={totalUsage}
          proUsers={proUsers}
          toolStats={toolStats}
          recentUsage={recentUsage.map((usage) => ({
            id: usage.id,
            userId: usage.userId,
            userEmail: usage.user.email || "Unknown",
            toolType: usage.toolType,
            creditsUsed: usage.creditsUsed,
            success: usage.success,
            createdAt: usage.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  )
}

