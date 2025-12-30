import { handlers } from "@/auth"

// Ensure this route runs on Node.js runtime, not Edge
export const runtime = "nodejs"

export const { GET, POST } = handlers

