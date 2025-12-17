import { PrismaClient } from "@prisma/client"

const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Standard Next.js safe singleton pattern
// Reduced log level to minimize connection error noise (retry logic handles them)
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ["error"], // Only log errors, not queries/warnings (reduces connection error spam)
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

// Helper to execute Prisma operations with automatic reconnection on closed connections
// Handles Neon DB auto-sleep and connection pool issues
export async function executeWithReconnect<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: any
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Execute the operation directly
      return await operation()
    } catch (error: any) {
      lastError = error
      
      // Check if it's a connection closed error
      const isConnectionError =
        error?.code === "P1001" ||
        error?.message?.includes("Closed") ||
        error?.message?.includes("connection") ||
        error?.kind === "Closed" ||
        error?.cause === null ||
        (error?.message && typeof error.message === "string" && 
         (error.message.includes("connection") || error.message.includes("Closed")))
      
      if (isConnectionError && attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)))
        
        try {
          // Force disconnect and reconnect
          await prisma.$disconnect().catch(() => {})
          await new Promise((resolve) => setTimeout(resolve, 100))
          await prisma.$connect()
          // Wait a bit more for connection to stabilize
          await new Promise((resolve) => setTimeout(resolve, 100))
        } catch (reconnectError) {
          // If reconnect fails, continue to next retry attempt
          if (attempt < maxRetries - 1) {
            continue
          }
        }
        continue // Retry the operation
      }
      
      // For non-connection errors or max retries reached, throw immediately
      throw error
    }
  }
  
  throw lastError
}

// Optional: simple connection health check (used only in Node/server actions, not middleware)
export async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch (error) {
    console.error("Database connection check failed:", error)
    return false
  }
}

