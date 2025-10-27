import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function migrateChristianData() {
  const oldUserId = "e55fc938-00bf-4b23-a066-f84b1886768a"
  const christianEmail = "co@levelpartner.ai"

  console.log("🔍 Step 1: Finding Christian's Supabase account...")

  // Find Christian's current Supabase user
  const users = await sql`
    SELECT id, email, first_name, last_name, supabase_user_id
    FROM users
    WHERE email = ${christianEmail}
  `

  if (users.length === 0) {
    console.log("❌ Christian's account (co@levelpartner.ai) not found in users table")
    console.log("   Please ensure he has signed in at least once to create his account")
    return
  }

  const christianUser = users[0]
  const newUserId = christianUser.supabase_user_id || christianUser.id

  console.log("✅ Found Christian's account:")
  console.log(`   Email: ${christianUser.email}`)
  console.log(`   Name: ${christianUser.first_name} ${christianUser.last_name}`)
  console.log(`   User ID: ${christianUser.id}`)
  console.log(`   Supabase ID: ${christianUser.supabase_user_id}`)
  console.log(`   New User ID to use: ${newUserId}`)

  console.log("\n🔍 Step 2: Finding all data with old user_id...")

  // Find all data associated with old user_id
  const models = await sql`
    SELECT * FROM user_models WHERE user_id = ${oldUserId}
  `

  const images = await sql`
    SELECT * FROM ai_images WHERE user_id = ${oldUserId}
  `

  const chats = await sql`
    SELECT * FROM maya_chats WHERE user_id = ${oldUserId}
  `

  console.log(`\n📊 Found data to migrate:`)
  console.log(`   - ${models.length} trained model(s)`)
  console.log(`   - ${images.length} AI image(s)`)
  console.log(`   - ${chats.length} Maya chat(s)`)

  if (models.length === 0 && images.length === 0 && chats.length === 0) {
    console.log("\n⚠️  No data found to migrate")
    return
  }

  // Show details
  if (models.length > 0) {
    console.log("\n🤖 Trained Models:")
    models.forEach((model) => {
      console.log(`   - Model: ${model.model_name}`)
      console.log(`     Status: ${model.training_status}`)
      console.log(`     Created: ${new Date(model.created_at).toLocaleString()}`)
    })
  }

  if (images.length > 0) {
    console.log(`\n📸 AI Images: ${images.length} total`)
    console.log(`   First image: ${new Date(images[0].created_at).toLocaleString()}`)
    console.log(`   Last image: ${new Date(images[images.length - 1].created_at).toLocaleString()}`)
  }

  if (chats.length > 0) {
    console.log(`\n💬 Maya Chats: ${chats.length} total`)
  }

  console.log("\n🔄 Step 3: Migrating data to new user_id...")

  // Update user_models
  if (models.length > 0) {
    await sql`
      UPDATE user_models 
      SET user_id = ${newUserId}
      WHERE user_id = ${oldUserId}
    `
    console.log(`✅ Migrated ${models.length} trained model(s)`)
  }

  // Update ai_images
  if (images.length > 0) {
    await sql`
      UPDATE ai_images 
      SET user_id = ${newUserId}
      WHERE user_id = ${oldUserId}
    `
    console.log(`✅ Migrated ${images.length} AI image(s)`)
  }

  // Update maya_chats
  if (chats.length > 0) {
    await sql`
      UPDATE maya_chats 
      SET user_id = ${newUserId}
      WHERE user_id = ${oldUserId}
    `
    console.log(`✅ Migrated ${chats.length} Maya chat(s)`)
  }

  console.log("\n✅ Migration complete!")
  console.log(`\n🎉 All data has been linked to Christian's account (${christianEmail})`)
  console.log("   He should now see his trained model and images when he signs in.")
}

migrateChristianData().catch(console.error)
