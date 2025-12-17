import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { checkProAccess } from "@/lib/ai/check-pro-access"
import { UpgradeBanner } from "@/components/ai/UpgradeBanner"

export default async function AiToolsPage() {
  const session = await auth()

  if (!session?.user || session.user.role !== "creator") {
    redirect("/login")
  }

  const { hasAccess, aiCredits } = await checkProAccess(session.user.id)

  if (!hasAccess) {
    return <UpgradeBanner />
  }

  const tools = [
    {
      id: "thumbnail",
      name: "Thumbnail Generator",
      description: "Generate eye-catching thumbnails with watermark for your posts",
      icon: "🖼️",
      href: "/creator/ai-tools/thumbnail",
      color: "bg-purple-500",
    },
    {
      id: "post-writer",
      name: "Post Writer",
      description: "AI-powered post writing assistant to create engaging content",
      icon: "✍️",
      href: "/creator/ai-tools/post-writer",
      color: "bg-blue-500",
    },
    {
      id: "title-generator",
      name: "Title Generator",
      description: "Generate compelling titles that grab attention",
      icon: "📝",
      href: "/creator/ai-tools/title-generator",
      color: "bg-green-500",
    },
    {
      id: "ideas-generator",
      name: "Content Ideas",
      description: "Get AI-generated content ideas and topics for your niche",
      icon: "💡",
      href: "/creator/ai-tools/ideas-generator",
      color: "bg-orange-500",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI Tools</h1>
          <p className="mt-2 text-gray-600">
            Powerful AI tools to help you create better content faster
          </p>
        </div>

        {/* Credits Display */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">AI Credits</h2>
              <p className="text-sm text-gray-600">
                You have <span className="font-bold text-blue-600">{aiCredits}</span> credits
                remaining
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Credits reset monthly</p>
            </div>
          </div>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
          {tools.map((tool) => (
            <Link
              key={tool.id}
              href={tool.href}
              className="group relative overflow-hidden rounded-lg bg-white p-6 shadow transition-all hover:shadow-lg"
            >
              <div className="flex items-start space-x-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-lg ${tool.color} text-2xl`}
                >
                  {tool.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                    {tool.name}
                  </h3>
                  <p className="mt-2 text-gray-600">{tool.description}</p>
                  <div className="mt-4 flex items-center text-sm text-blue-600">
                    <span>Use Tool</span>
                    <svg
                      className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-8 rounded-lg bg-blue-50 p-6">
          <h3 className="mb-2 text-lg font-semibold text-gray-900">
            How AI Credits Work
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• Each AI tool usage costs 1 credit</li>
            <li>• Credits are reset monthly on your billing date</li>
            <li>• Unused credits don&apos;t roll over to the next month</li>
            <li>• You can purchase additional credits if needed</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

