"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"

export default function SubscriptionVerifyPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const provider = params.provider as string
  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying")
  const [error, setError] = useState("")

  useEffect(() => {
    verifyPayment()
  }, [])

  const verifyPayment = async () => {
    try {
      const reference =
        searchParams.get("reference") ||
        searchParams.get("session_id") ||
        searchParams.get("tx_ref") ||
        searchParams.get("CheckoutRequestID")

      if (!reference) {
        setStatus("failed")
        setError("No payment reference found")
        return
      }

      // Verify payment with provider
      const res = await fetch(`/api/payments/verify?provider=${provider}&reference=${reference}`)
      const data = await res.json()

      if (res.ok && data.status === "success") {
        setStatus("success")
        // Redirect to success page after 2 seconds
        setTimeout(() => {
          router.push("/payment/success?reference=" + reference)
        }, 2000)
      } else {
        setStatus("failed")
        setError(data.error || "Payment verification failed")
      }
    } catch (err) {
      console.error("Verification error:", err)
      setStatus("failed")
      setError("An error occurred during verification")
    }
  }

  if (status === "verifying") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your payment...</p>
          <p className="text-sm text-gray-500 mt-2">
            Please wait while we confirm your payment
          </p>
        </div>
      </div>
    )
  }

  if (status === "failed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">✕</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Payment Verification Failed
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <div className="text-green-500 text-6xl mb-4">✓</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Payment Verified!
        </h1>
        <p className="text-gray-600 mb-6">
          Redirecting you to your dashboard...
        </p>
      </div>
    </div>
  )
}

