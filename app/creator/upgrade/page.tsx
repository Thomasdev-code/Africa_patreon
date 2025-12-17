"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export default function UpgradePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user && session.user.role !== "creator") {
      router.push("/login")
    }
  }, [session, router])

  const handleUpgrade = async (provider: string) => {
    if (!session?.user) {
      router.push("/login")
      return
    }

    setIsLoading(true)
    setSelectedProvider(provider)

    try {
      const res = await fetch("/api/subscriptions/pro/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: provider.toUpperCase() }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create subscription")
      }

      // Redirect to payment
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl
      } else if (data.clientSecret) {
        // Handle Stripe client secret
        // You would integrate Stripe Elements here
        alert("Stripe payment integration needed")
      }
    } catch (error: any) {
      alert(error.message || "Failed to start upgrade process")
      setIsLoading(false)
      setSelectedProvider(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
          <h1 className="text-4xl font-bold text-gray-900">Upgrade to Pro</h1>
          <p className="mt-4 text-lg text-gray-600">
            Unlock powerful AI tools and boost your content creation
          </p>
        </div>

        {/* Pricing Card */}
        <div className="mb-8 rounded-lg bg-white p-8 shadow-lg">
          <div className="text-center">
            <div className="mb-4">
              <span className="text-5xl font-bold text-gray-900">$9.99</span>
              <span className="text-gray-600">/month</span>
            </div>
            <p className="mb-8 text-gray-600">
              Billed monthly • Cancel anytime
            </p>
          </div>

          <div className="mb-8 space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Pro Features:
            </h3>
            <ul className="space-y-3">
              {[
                "AI Thumbnail Generator with watermark",
                "AI Post Writer",
                "AI Title Generator",
                "AI Content Ideas Generator",
                "50 AI credits per month",
                "Priority support",
                "Advanced analytics",
              ].map((feature, index) => (
                <li key={index} className="flex items-center">
                  <svg
                    className="mr-3 h-5 w-5 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Payment Providers */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Choose Payment Method:
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <button
                onClick={() => handleUpgrade("stripe")}
                disabled={isLoading}
                className="rounded-lg border-2 border-gray-300 p-4 text-center transition-all hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
              >
                <div className="text-2xl mb-2">💳</div>
                <div className="font-semibold">Stripe</div>
                <div className="text-sm text-gray-600">Card Payment</div>
              </button>
              <button
                onClick={() => handleUpgrade("paystack")}
                disabled={isLoading}
                className="rounded-lg border-2 border-gray-300 p-4 text-center transition-all hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
              >
                <div className="text-2xl mb-2">🇳🇬</div>
                <div className="font-semibold">Paystack</div>
                <div className="text-sm text-gray-600">Nigeria, Ghana</div>
              </button>
              <button
                onClick={() => handleUpgrade("flutterwave")}
                disabled={isLoading}
                className="rounded-lg border-2 border-gray-300 p-4 text-center transition-all hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
              >
                <div className="text-2xl mb-2">🌍</div>
                <div className="font-semibold">Flutterwave</div>
                <div className="text-sm text-gray-600">Pan-Africa</div>
              </button>
            </div>
          </div>

          {isLoading && (
            <div className="mt-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-600">Processing...</p>
            </div>
          )}
        </div>

        <div className="rounded-lg bg-blue-50 p-6">
          <h3 className="mb-2 font-semibold text-gray-900">Need Help?</h3>
          <p className="text-sm text-gray-700">
            Contact our support team at{" "}
            <a href="/contact" className="text-blue-600 hover:text-blue-700">
              support@africapatreon.com
            </a>{" "}
            if you have any questions about upgrading.
          </p>
        </div>
      </div>
    </div>
  )
}

