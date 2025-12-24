"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { getCurrencySymbol } from "@/lib/payments/currency"

export default function UpgradePage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [priceInfo, setPriceInfo] = useState<{ price: number; currency: string; priceUSD: number } | null>(null)

  useEffect(() => {
    if (session?.user && session.user.role !== "creator") {
      router.push("/login")
    }
  }, [session, router])

  // Fetch price info on mount
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch("/api/payments/price-info?priceUSD=9.99&country=KE")
        if (res.ok) {
          const data = await res.json()
          setPriceInfo({
            price: data.price,
            currency: data.currency,
            priceUSD: data.priceUSD,
          })
        }
      } catch (err) {
        console.error("Failed to fetch price:", err)
      }
    }
    fetchPrice()
  }, [])

  const handleUpgrade = async () => {
    if (!session?.user) {
      router.push("/login?callbackUrl=/creator/upgrade")
      return
    }

    if (session.user.role !== "creator") {
      setError("Only creators can upgrade to Pro")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const res = await fetch("/api/subscriptions/pro/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: "KE" }), // Kenya for KES
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create subscription")
      }

      // Redirect to Paystack payment page
      const paymentUrl = data.payment_url || data.redirectUrl
      
      if (paymentUrl) {
        window.location.href = paymentUrl
      } else {
        throw new Error("Payment URL not received. Please try again.")
      }
    } catch (error: any) {
      setError(error.message || "Failed to start upgrade process")
      setIsLoading(false)
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
              {priceInfo ? (
                <>
                  <span className="text-5xl font-bold text-gray-900">
                    {getCurrencySymbol(priceInfo.currency as any)}
                    {new Intl.NumberFormat("en-US", {
                      minimumFractionDigits: priceInfo.currency === "KES" ? 0 : 2,
                      maximumFractionDigits: priceInfo.currency === "KES" ? 0 : 2,
                    }).format(priceInfo.price)}
                  </span>
                  <span className="text-gray-600">/month</span>
                  {priceInfo.priceUSD !== priceInfo.price && (
                    <p className="text-sm text-gray-500 mt-2">
                      (Approx ${priceInfo.priceUSD.toFixed(2)} USD)
                    </p>
                  )}
                </>
              ) : (
                <>
                  <span className="text-5xl font-bold text-gray-900">KSh 1,299</span>
                  <span className="text-gray-600">/month</span>
                  <p className="text-sm text-gray-500 mt-2">(Approx $9.99 USD)</p>
                </>
              )}
            </div>
            <p className="mb-8 text-gray-600">
              Billed monthly • Cancel anytime • Secure payment via Paystack
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

          {/* Single Upgrade Button */}
          <div className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-red-700">
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}
            
            <button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 text-lg font-semibold text-white transition-all hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                "Upgrade to Pro"
              )}
            </button>
            
            <p className="text-center text-sm text-gray-500">
              🔒 Secure payments powered by Paystack
            </p>
          </div>
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

