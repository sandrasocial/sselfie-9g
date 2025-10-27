import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

async function listAllModels() {
  console.log("🤖 ALL Trained Models in database:\n")

  const allModels = await sql`
    SELECT um.id, um.user_id, um.model_name, um.training_status, um.created_at,
           u.email, u.first_name, u.last_name
    FROM user_models um
    LEFT JOIN users u ON um.user_id = u.id
    ORDER BY um.created_at DESC
  `

  if (allModels.length === 0) {
    console.log("❌ No trained models found in database\n")
    return
  }

  console.log(`Found ${allModels.length} trained models:\n`)

  allModels.forEach((model, index) => {
    console.log(`${index + 1}. ${model.model_name}`)
    console.log(`   User: ${model.email}`)
    console.log(`   Name: ${model.first_name || ""} ${model.last_name || ""}`)
    console.log(`   User ID: ${model.user_id}`)
    console.log(`   Status: ${model.training_status}`)
    console.log(`   Created: ${new Date(model.created_at).toLocaleString()}\n`)
  })

  console.log("✅ Complete!")
}

listAllModels().catch(console.error)
