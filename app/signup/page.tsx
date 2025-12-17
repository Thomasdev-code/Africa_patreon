"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"

export default function SignupPage() {
  const [role, setRole] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Get referral code from URL or localStorage
    const urlCode = searchParams.get("ref")
    const storedCode = typeof window !== "undefined" ? localStorage.getItem("referralCode") : null
    setReferralCode(urlCode || storedCode)
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!role) {
      setError("Please select a role")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          password, 
          role,
          referralCode: referralCode || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Signup failed")
        setLoading(false)
        return
      }

      // Auto-login after signup
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (signInResult?.ok) {
        // Refresh router to get updated session
        router.refresh()
        
        // Small delay to ensure session is set
        await new Promise((resolve) => setTimeout(resolve, 100))
        
        // Redirect based on role
        if (role === "fan") {
          router.push("/dashboard")
        } else if (role === "creator") {
          router.push("/creator/onboarding")
        }
      } else {
        setError("Account created but login failed. Please try logging in.")
        setLoading(false)
      }
    } catch (err) {
      console.error("Signup error:", err)
      setError("An error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-900">
          Sign Up
        </h1>

        {/* Role Selection */}
        <div className="flex gap-4 mb-6">
          <button
            type="button"
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
              role === "fan"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            onClick={() => setRole("fan")}
            disabled={loading}
          >
            I am a Fan
          </button>
          <button
            type="button"
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
              role === "creator"
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            onClick={() => setRole("creator")}
            disabled={loading}
          >
            I am a Creator
          </button>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <input
            type="email"
            placeholder="Email"
            className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            className="border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            minLength={6}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !role}
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="mt-4 text-center text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}

