/**
 * Test database connection script
 * Run with: npx tsx scripts/test-db-connection.ts
 */

import { prisma } from "../lib/prisma"

async function testConnection() {
  try {
    console.log("Testing database connection...")
    console.log("DATABASE_URL:", process.env.DATABASE_URL?.replace(/:[^:@]+@/, ":****@"))
    
    // Test basic query
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log("✅ Database connection successful!")
    console.log("Test query result:", result)
    
    // Test if we can query a table
    try {
      const userCount = await prisma.user.count()
      console.log(`✅ Can query database. User count: ${userCount}`)
    } catch (err: any) {
      console.log("⚠️  Can connect but query failed:", err.message)
    }
    
  } catch (error: any) {
    console.error("❌ Database connection failed!")
    console.error("Error code:", error.code)
    console.error("Error message:", error.message)
    
    if (error.code === "P1001") {
      console.error("\n🔍 Troubleshooting steps:")
      console.error("1. Check if your Neon database is active (not paused)")
      console.error("2. Verify your DATABASE_URL in .env file")
      console.error("3. Check Neon dashboard: https://console.neon.tech")
      console.error("4. Try using the unpooled connection string")
      console.error("5. Check your network/firewall settings")
      console.error("6. Verify the database hasn't been deleted or suspended")
    }
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()

