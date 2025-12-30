import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import type { UserRole } from "@/lib/types"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: Partial<Record<"email" | "password", unknown>>, request: Request) {
        try {
          // Validate credentials
          if (!credentials?.email || !credentials?.password) {
            console.log("[AUTH] Missing credentials")
            return null
          }

          if (typeof credentials.email !== "string" || typeof credentials.password !== "string") {
            console.log("[AUTH] Invalid credential types")
            return null
          }

          const email = credentials.email.toLowerCase().trim()
          const password = credentials.password

          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(email)) {
            console.log("[AUTH] Invalid email format:", email)
            return null
          }

          // Dynamic import Prisma to avoid Edge Runtime issues
          // This only runs in Node.js runtime during authentication
          const { prisma } = await import("@/lib/prisma")

          // Query Prisma safely - only select needed fields
          const user = await prisma.user.findUnique({
            where: { email: email },
            select: {
              id: true,
              email: true,
              password: true,
              role: true,
              isOnboarded: true,
              isBanned: true,
              isApproved: true,
            },
          })

          if (!user) {
            console.log("[AUTH] User not found:", email)
            return null
          }

          // Check if user is banned before password check
          if (user.isBanned) {
            console.log("[AUTH] Banned user attempted login:", email)
            return null
          }

          // Compare hashed password with bcrypt
          const isPasswordValid = await bcrypt.compare(password, user.password)

          if (!isPasswordValid) {
            console.log("[AUTH] Invalid password for user:", email)
            return null
          }

          // Return plain object - only essential fields, NOT the full Prisma model
          // NextAuth will use this to create the session
          return {
            id: user.id,
            email: user.email,
            name: user.email, // NextAuth requires 'name', using email as fallback
            role: user.role as UserRole,
            isOnboarded: user.isOnboarded,
            isBanned: user.isBanned,
            isApproved: user.isApproved,
          }
        } catch (error) {
          // Log all errors for production debugging
          console.error("[AUTH] Authorization error:", error)
          // Return null on any failure - never throw or expose errors
          return null
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign in, user object is available
      if (user) {
        token.id = user.id
        token.email = user.email
        token.role = user.role
        token.isOnboarded = user.isOnboarded
        token.isBanned = user.isBanned
        token.isApproved = user.isApproved
      }
      return token
    },
    async session({ session, token }) {
      // Add user data to session from token
      if (session.user && token) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.role = token.role as UserRole
        session.user.isOnboarded = token.isOnboarded as boolean
        session.user.isBanned = token.isBanned as boolean
        session.user.isApproved = token.isApproved as boolean
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})

