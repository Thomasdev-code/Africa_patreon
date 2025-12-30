"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"

function LoginContent() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Show success message if redirected from signup
    if (searchParams.get("signup") === "success") {
      setSuccess("Account created successfully! Please log in.")
      // Clear the query parameter from URL
      router.replace("/login", { scroll: false })
    }
  }, [searchParams, router])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()
    
    setError("")
    setLoading(true)

    try {
      // Use NextAuth signIn with credentials
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false, // Handle redirect manually
      })

      // Handle the result explicitly
      if (result?.error) {
        setError("Invalid email or password")
        setLoading(false)
        return
      }

      if (result?.ok) {
        // Refresh router to get updated session
        router.refresh()
        
        // Small delay to ensure session is set
        await new Promise((resolve) => setTimeout(resolve, 100))
        
        // Get user session to determine redirect
        const res = await fetch("/api/auth/session")
        const session = await res.json()

        if (session?.user) {
          const { role, isOnboarded } = session.user

          // Determine redirect URL
          let redirectUrl = "/dashboard"
          if (role === "admin") {
            redirectUrl = "/admin"
          } else if (role === "creator") {
            redirectUrl = !isOnboarded ? "/creator/onboarding" : "/creator/dashboard"
          } else if (role === "fan") {
            redirectUrl = "/dashboard"
          }

          // Use router.push for client-side navigation
          router.push(redirectUrl)
        } else {
          // Fallback redirect if session not available
          router.push("/dashboard")
        }
      } else {
        setError("Login failed. Please try again.")
        setLoading(false)
      }
    } catch (err) {
      console.error("Login error:", err)
      setError("An error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-900">
          Login
        </h1>
        <form 
          onSubmit={handleSubmit} 
          action="#" 
          method="get"
          className="flex flex-col gap-4"
        >
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}
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
          />
          <div className="flex items-center justify-between">
            <Link
              href="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <p className="mt-4 text-center text-gray-600">
          Don't have an account?{" "}
          <Link href="/signup" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}

