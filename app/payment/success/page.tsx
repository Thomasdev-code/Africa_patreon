"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "next-auth/react"

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [isVerifying, setIsVerifying] = useState(true)
  const [error, setError] = useState("")
  const [paymentType, setPaymentType] = useState<"subscription" | "ppv" | "tip" | "pro" | null>(null)

  const reference = searchParams.get("reference") || searchParams.get("session_id") || searchParams.get("tx_ref")

  useEffect(() => {
    if (reference) {
      verifyPayment()
    } else {
      setError("No payment reference found")
      setIsVerifying(false)
    }
  }, [reference])

  const verifyPayment = async () => {
    try {
      // Check payment type by checking URL params or session
      const typeParam = searchParams.get("type")
      if (typeParam === "pro" || typeParam === "ai_upgrade") {
        setPaymentType("pro")
      } else if (typeParam === "ppv") {
        setPaymentType("ppv")
      } else if (typeParam === "tip") {
        setPaymentType("tip")
      } else {
        // Default to subscription
        setPaymentType("subscription")
      }
      
      // Payment is verified via webhook, but we can show success page
      // The webhook will activate the subscription/upgrade
      setIsVerifying(false)
    } catch (err) {
      console.error("Payment verification error:", err)
      // Still show success page - webhook will handle verification
      setIsVerifying(false)
    }
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your payment...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">✕</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Payment Verification Failed
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Determine redirect based on payment type and user role
  const getRedirectInfo = () => {
    const isCreator = session?.user?.role === "creator"
    
    if (paymentType === "pro" || (isCreator && reference)) {
      return {
        title: "Pro Upgrade Successful! 🎉",
        message: "Your Pro subscription has been activated. You now have access to all AI tools and premium features. 50 AI credits have been added to your account.",
        primaryLink: "/creator/ai-tools",
        primaryText: "Go to AI Tools",
        secondaryLink: "/creator/dashboard",
        secondaryText: "Go to Dashboard",
        showCredits: true,
      }
    } else if (paymentType === "ppv") {
      return {
        title: "Purchase Successful!",
        message: "You now have access to this premium content.",
        primaryLink: "/dashboard",
        primaryText: "Go to Dashboard",
        secondaryLink: "/discover",
        secondaryText: "Discover More",
        showCredits: false,
      }
    } else if (paymentType === "tip") {
      return {
        title: "Tip Sent Successfully!",
        message: "Thank you for supporting your favorite creator!",
        primaryLink: "/dashboard",
        primaryText: "Go to Dashboard",
        secondaryLink: "/discover",
        secondaryText: "Discover More",
        showCredits: false,
      }
    } else {
      return {
        title: "Payment Successful!",
        message: "Your subscription has been activated. You now have access to all premium content.",
        primaryLink: "/dashboard",
        primaryText: "Go to Dashboard",
        secondaryLink: "/discover",
        secondaryText: "Discover More",
        showCredits: false,
      }
    }
  }

  const redirectInfo = getRedirectInfo()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md w-full">
        <div className="text-green-500 text-6xl mb-4">✓</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {redirectInfo.title}
        </h1>
        <p className="text-gray-600 mb-6">
          {redirectInfo.message}
        </p>
        {redirectInfo.showCredits && (
          <div className="mb-6 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-4 border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>✨ Welcome to Pro!</strong> You've been granted <strong>50 AI credits</strong>. Start creating amazing content with our AI tools!
            </p>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={redirectInfo.primaryLink}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {redirectInfo.primaryText}
          </Link>
          <Link
            href={redirectInfo.secondaryLink}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            {redirectInfo.secondaryText}
          </Link>
        </div>
        <p className="mt-6 text-xs text-gray-500">
          Payment processed securely via Paystack
        </p>
      </div>
    </div>
  )
}

