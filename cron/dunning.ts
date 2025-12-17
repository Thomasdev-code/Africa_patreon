/**
 * Dunning Cron Job
 * Runs hourly to process failed payment retries
 * 
 * To run this, set up a cron job or use a service like Vercel Cron:
 * https://vercel.com/docs/cron-jobs
 * 
 * Or use a service like node-cron in a separate worker process
 */

import { processDunningAttempts } from "@/lib/dunning/dunning-engine"

export async function handler() {
  try {
    console.log("Running dunning process...")
    await processDunningAttempts()
    console.log("Dunning process completed")
    return { success: true }
  } catch (error) {
    console.error("Dunning process error:", error)
    return { success: false, error: String(error) }
  }
}

// For Vercel Cron
export default handler

// For node-cron or similar
// import cron from "node-cron"
// cron.schedule("0 * * * *", async () => {
//   await handler()
// })

