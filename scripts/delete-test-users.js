import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function deleteTestUsers() {
  try {
    console.log("🗑️  Deleting test users without trained models...\n")

    // List of test user emails to delete
    const testEmails = [
      "crafrazeppoigra-7026@yopmail.com",
      "moummazoudduho-4551@yopmail.com",
      "prulloivippouffo-7891@yopmail.com",
      "tobrupreguye-4544@yopmail.com",
      "sandrasigurjons@hotmail.com",
    ]

    for (const email of testEmails) {
      console.log(`Deleting user: ${email}`)

      // Get user id
      const userResult = await sql`
        SELECT id FROM users WHERE email = ${email}
      `

      if (userResult.length === 0) {
        console.log(`  ⚠️  User not found, skipping...`)
        continue
      }

      const userId = userResult[0].id
      console.log(`  Found user ID: ${userId}`)

      await sql`DELETE FROM ai_images WHERE user_id = ${userId}`
      console.log(`  ✓ Deleted AI images`)

      await sql`DELETE FROM user_models WHERE user_id = ${userId}`
      console.log(`  ✓ Deleted user models`)

      await sql`DELETE FROM generated_images WHERE user_id = ${userId}`
      console.log(`  ✓ Deleted generated images`)

      await sql`DELETE FROM maya_chats WHERE user_id = ${userId}`
      console.log(`  ✓ Deleted Maya chats`)

      await sql`DELETE FROM user_credits WHERE user_id = ${userId}`
      console.log(`  ✓ Deleted user credits`)

      await sql`DELETE FROM credit_transactions WHERE user_id = ${userId}`
      console.log(`  ✓ Deleted credit transactions`)

      // Delete user
      await sql`DELETE FROM users WHERE id = ${userId}`

      console.log(`  ✅ Deleted successfully\n`)
    }

    console.log("✅ All test users deleted!")
  } catch (error) {
    console.error("❌ Error:", error.message)
  }
}

deleteTestUsers()
