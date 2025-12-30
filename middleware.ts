import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verify } from "jsonwebtoken"

// Helper to verify JWT token from cookie
function verifyJWTToken(token: string): any {
  try {
    const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
    if (!JWT_SECRET) return null
    
    const decoded = verify(token, JWT_SECRET)
    return decoded
  } catch {
    return null
  }
}

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Skip all API routes - they handle their own authentication
  if (pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  // Explicitly reject POST requests to /login page route
  if (pathname === "/login" && req.method === "POST") {
    return NextResponse.json(
      { 
        error: "Method not allowed",
        message: "POST requests to /login are not allowed. Please use /api/login endpoint"
      },
      { status: 405 }
    )
  }

  // Public routes - NO authentication required
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/discover" ||
    pathname === "/about" ||
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname === "/refund-policy" ||
    pathname === "/anti-scam" ||
    pathname === "/community-guidelines" ||
    pathname === "/contact" ||
    pathname === "/trust-center" ||
    pathname.startsWith("/legal/") || // All legal pages
    pathname.startsWith("/payment/") ||
    pathname.startsWith("/r/") || // Referral links
    (pathname.startsWith("/creator/") &&
      pathname !== "/creator/onboarding" &&
      pathname !== "/creator/dashboard") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/public/") ||
    pathname.startsWith("/api/creator/profile/") ||
    pathname.startsWith("/api/payments/webhooks/") // Webhooks are public but verified by signature

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Check for authentication - try NextAuth session first, then JWT token
  let user: any = null
  let role: string | null = null
  let isOnboarded: boolean = false
  let isBanned: boolean = false

  if (session?.user) {
    // Use NextAuth session
    user = session.user
    role = session.user.role
    isOnboarded = session.user.isOnboarded || false
    isBanned = session.user.isBanned || false
  } else {
    // Try JWT token from cookie
    const token = req.cookies.get("token")?.value
    if (token) {
      const decoded = verifyJWTToken(token)
      if (decoded) {
        user = { id: decoded.userId, email: decoded.email, role: decoded.role }
        role = decoded.role
        isOnboarded = decoded.isOnboarded || false
        isBanned = false // JWT doesn't include isBanned, would need to check DB
      }
    }
  }

  // Protected routes - require authentication
  if (!user || !role) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check if user is banned (only if we have session data)
  if (isBanned) {
    return NextResponse.redirect(new URL("/login?error=banned", req.url))
  }

  // Fan dashboard - fan only
  if (pathname === "/dashboard") {
    if (role !== "fan") {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    return NextResponse.next()
  }

  // Creator onboarding - creator only, not onboarded
  if (pathname === "/creator/onboarding") {
    if (role !== "creator") {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    if (isOnboarded) {
      return NextResponse.redirect(new URL("/creator/dashboard", req.url))
    }
    return NextResponse.next()
  }

  // Creator dashboard and sub-routes - creator only, must be onboarded
  if (pathname === "/creator/dashboard" || pathname.startsWith("/creator/dashboard/")) {
    if (role !== "creator") {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    if (!isOnboarded) {
      return NextResponse.redirect(new URL("/creator/onboarding", req.url))
    }
    return NextResponse.next()
  }

  // Creator AI tools - creator only
  if (pathname.startsWith("/creator/ai-tools")) {
    if (role !== "creator") {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    return NextResponse.next()
  }

  // Creator public pages - anyone can view (username-based routes)
  if (pathname.startsWith("/creator/") && pathname !== "/creator/onboarding" && pathname !== "/creator/dashboard" && !pathname.startsWith("/creator/dashboard/")) {
    return NextResponse.next()
  }

  // Admin routes - admin only
  if (pathname.startsWith("/admin")) {
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/login", req.url))
    }
    return NextResponse.next()
  }

  // Note: API routes handle their own authentication
  // Middleware only protects page routes

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

