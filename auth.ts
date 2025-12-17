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
      async authorize(credentials: Record<"email" | "password", string> | undefined) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Dynamic import Prisma to avoid Edge Runtime issues
        // This only runs in Node.js runtime during authentication
        const { prisma } = await import("@/lib/prisma")
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        // Check if user is banned
        if (user.isBanned) {
          throw new Error("Account has been banned")
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role as UserRole,
          isOnboarded: user.isOnboarded,
          isBanned: user.isBanned,
          isApproved: user.isApproved,
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user?: any }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.isOnboarded = user.isOnboarded
        token.isBanned = user.isBanned
        token.isApproved = user.isApproved
      }
      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      if (session.user) {
        session.user.id = token.id as string
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

