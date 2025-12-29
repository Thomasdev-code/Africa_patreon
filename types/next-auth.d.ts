import { UserRole } from "@/lib/types"
import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      role: UserRole
      isOnboarded: boolean
      isBanned: boolean
      isApproved: boolean
    }
  }

  interface User {
    id: string
    email: string
    role: UserRole
    isOnboarded: boolean
    isBanned: boolean
    isApproved: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: UserRole
    isOnboarded: boolean
    isBanned: boolean
    isApproved: boolean
  }
}

