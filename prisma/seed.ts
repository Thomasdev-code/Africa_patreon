import { prisma, checkDatabaseConnection } from "../lib/prisma"
import bcrypt from "bcrypt"

// NOTE:
// This seed script only creates/updates a single ADMIN user.
// - It uses the shared Prisma client (which respects DATABASE_URL, including Neon pooled URLs
//   like ...neon.tech:5432/db?pgbouncer=true&connection_limit=1).
// - It is safe to re-run thanks to Prisma upsert.
// - It handles temporary DB connectivity issues by printing a clear, actionable error
//   instead of crashing with a long stack trace.
// - Uses environment variables ADMIN_EMAIL and ADMIN_PASSWORD with fallback defaults.

async function main() {
  console.log("🌱 Starting seed (admin user)...")

  // Quick connectivity check so Neon sleep / bad DATABASE_URL errors are clear
  const dbOk = await checkDatabaseConnection()
  if (!dbOk) {
    console.error("\n❌ Cannot reach the database server.")
    console.error(
      "   Please verify your DATABASE_URL, network access, and (for Neon) that you're using the pooled connection string,\n" +
        "   e.g. ...neon.tech:5432/<db>?pgbouncer=true&connection_limit=1 and that the database is awake."
    )
    process.exit(1)
  }

  const email = process.env.ADMIN_EMAIL || "africapatreon34@gmail.com"
  const password = process.env.ADMIN_PASSWORD || "Admin@1234"
  const name = "Admin User"

  if (!email) {
    console.error("❌ Email is required")
    process.exit(1)
  }
  if (!password) {
    console.error("❌ Password is required")
    process.exit(1)
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  // Upsert keeps the seed idempotent: same email → update, otherwise create
  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      role: "admin",
      isOnboarded: true,
    },
    create: {
      email,
      password: hashedPassword,
      role: "admin",
      isOnboarded: true,
      referralCode: "admin-" + Math.random().toString(36).slice(2, 10),
    },
    select: { id: true, email: true, role: true },
  })

  console.log("\n✅ Admin user ready:")
  console.log(`   Email: ${admin.email}`)
  console.log("   Role:  ", admin.role)
}

main()
  .catch((e: any) => {
    // Handle common connectivity issues cleanly
    if (e?.code === "P1001" || e?.message?.includes("Can't reach database server")) {
      console.error("\n❌ Seed failed: Prisma cannot reach the database server.")
      console.error(
        "   Check that:\n" +
          "   - DATABASE_URL is correct and reachable\n" +
          "   - The database is not sleeping or firewalled\n" +
          "   - For Neon, use the pooled URL with ?pgbouncer=true&connection_limit=1"
      )
    } else {
      console.error("❌ Seed error:", e)
    }
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
