import { neon } from "@neondatabase/serverless"

const prodDb = neon(
  "postgresql://neondb_owner:npg_4JbrOoe0YugU@ep-dawn-mountain-adwrqtdk-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require",
)

async function checkData() {
  console.log("[v0] Checking production database for essential data...\n")

  try {
    // Check users
    const userCount = await prodDb`SELECT COUNT(*) as count FROM users`
    console.log(`[v0] Users: ${userCount[0].count}`)

    // Check user_models
    const modelCount = await prodDb`SELECT COUNT(*) as count FROM user_models`
    console.log(`[v0] Trained Models: ${modelCount[0].count}`)

    // Check generated_images
    const imageCount = await prodDb`SELECT COUNT(*) as count FROM generated_images`
    console.log(`[v0] Generated Images: ${imageCount[0].count}`)

    // Check maya_chats
    const chatCount = await prodDb`SELECT COUNT(*) as count FROM maya_chats`
    console.log(`[v0] Maya Chats: ${chatCount[0].count}`)

    // Check subscriptions
    const subCount = await prodDb`SELECT COUNT(*) as count FROM subscriptions`
    console.log(`[v0] Subscriptions: ${subCount[0].count}`)

    console.log("\n[v0] ✓ Data check complete!")
  } catch (error) {
    console.error("[v0] Error:", error.message)
  }
}

checkData()
