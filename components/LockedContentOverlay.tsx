"use client"

import Link from "next/link"

interface LockedContentOverlayProps {
  tierName: string
  onUnlock?: () => void
  creatorUsername?: string
}

export default function LockedContentOverlay({
  tierName,
  onUnlock,
  creatorUsername,
}: LockedContentOverlayProps) {
  return (
    <div className="relative bg-gray-100 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
      <div className="mb-4">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <h4 className="text-lg font-semibold text-gray-900 mb-2">
        🔒 Premium Content
      </h4>
      <p className="text-gray-600 mb-4">
        This content is locked to the <strong>{tierName}</strong> tier.
      </p>
      <p className="text-sm text-gray-500 mb-6">
        Subscribe to unlock this and all premium content from this creator.
      </p>
      {onUnlock ? (
        <button
          onClick={onUnlock}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Subscribe to Unlock
        </button>
      ) : creatorUsername ? (
        <Link
          href={`/creator/${creatorUsername}`}
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          View Subscription Tiers
        </Link>
      ) : (
        <button
          disabled
          className="px-6 py-3 bg-gray-400 text-white rounded-lg cursor-not-allowed font-medium"
        >
          Subscribe to Unlock
        </button>
      )}
    </div>
  )
}

