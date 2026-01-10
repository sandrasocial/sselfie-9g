import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import { grantFreeUserCredits } from "../lib/credits"

dotenv.config({ path: ".env.local" })

async function testGrantCredits() {
  const userId = process.argv[2] || "c15e91f4-6711-4801-bfe5-7482e6d6703e"

  console.log(`[Test] Testing credit grant for user: ${userId}\n`)

  try {
    const result = await grantFreeUserCredits(userId)
    
    console.log(`[Test] Grant result:`, result)
    
    if (result.success) {
      console.log(`\n✅ SUCCESS: Credits granted! New balance: ${result.newBalance}`)
    } else {
      console.log(`\n❌ FAILED: ${result.error}`)
    }
  } catch (error) {
    console.error("\n❌ EXCEPTION:", error)
    if (error instanceof Error) {
      console.error("Stack:", error.stack)
    }
  }
}

testGrantCredits()
  .then(() => {
    console.log("\n✅ Test complete!")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Error:", error)
    process.exit(1)
  })
