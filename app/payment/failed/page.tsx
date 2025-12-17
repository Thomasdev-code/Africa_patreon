"use client"

import Link from "next/link"

export default function PaymentFailedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <div className="text-red-500 text-6xl mb-4">✕</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Payment Failed
        </h1>
        <p className="text-gray-600 mb-6">
          We couldn't process your payment. Please try again or contact support if the problem persists.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/discover"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

