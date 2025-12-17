"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

interface UpgradeBannerProps {
  title?: string
  description?: string
}

export function UpgradeBanner({
  title = "Upgrade to Pro to Unlock AI Tools",
  description = "Get access to powerful AI tools including thumbnail generation, post writing, title generation, and content ideas.",
}: UpgradeBannerProps) {
  const router = useRouter()

  const handleUpgrade = () => {
    router.push("/creator/ai-tools/upgrade")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-8 w-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h2 className="mb-4 text-3xl font-bold text-gray-900">{title}</h2>
          <p className="mb-8 text-lg text-gray-600">{description}</p>

          <div className="mb-8 rounded-lg bg-blue-50 p-6">
            <h3 className="mb-4 text-xl font-semibold text-gray-900">
              Pro Features Include:
            </h3>
            <ul className="space-y-2 text-left text-gray-700">
              <li className="flex items-center">
                <svg
                  className="mr-2 h-5 w-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                AI Thumbnail Generator with watermark
              </li>
              <li className="flex items-center">
                <svg
                  className="mr-2 h-5 w-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                AI Post Writer
              </li>
              <li className="flex items-center">
                <svg
                  className="mr-2 h-5 w-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                AI Title Generator
              </li>
              <li className="flex items-center">
                <svg
                  className="mr-2 h-5 w-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                AI Content Ideas Generator
              </li>
              <li className="flex items-center">
                <svg
                  className="mr-2 h-5 w-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Monthly AI Credits included
              </li>
            </ul>
          </div>

          <button
            onClick={handleUpgrade}
            className="w-full rounded-lg bg-blue-600 px-6 py-3 text-lg font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Upgrade to Pro
          </button>

          <p className="mt-4 text-sm text-gray-500">
            Starting at $9.99/month • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  )
}

