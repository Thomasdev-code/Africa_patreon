"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

export default function ReferralPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string
  const [isTracking, setIsTracking] = useState(true)

  useEffect(() => {
    const trackReferral = async () => {
      try {
        const res = await fetch("/api/referrals/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        })

        if (res.ok) {
          // Redirect to signup page with referral code
          router.push(`/signup?ref=${code}`)
        } else {
          // Invalid code, redirect to home
          router.push("/")
        }
      } catch (err) {
        console.error("Referral tracking error:", err)
        router.push("/")
      } finally {
        setIsTracking(false)
      }
    }

    if (code) {
      trackReferral()
    }
  }, [code, router])

  if (isTracking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-gray-600">Redirecting to signup...</p>
        <Link href="/signup" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
          Continue to signup
        </Link>
      </div>
    </div>
  )
}
