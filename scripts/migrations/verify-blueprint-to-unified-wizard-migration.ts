/**
 * Verification Script: Verify blueprint_subscribers → user_personal_brand migration
 * 
 * This script:
 * 1. Checks if all blueprint users have user_personal_brand records
 * 2. Verifies data integrity
 * 3. Reports any missing/incomplete data
 */

import { neon } from "@neondatabase/serverless"
import * as dotenv from "dotenv"
import * as path from "path"
import * as fs from "fs"

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), ".env.local")
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
} else {
  dotenv.config() // Fallback to .env
}

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error("❌ Missing required environment variable: DATABASE_URL")
  process.exit(1)
}

const sql = neon(databaseUrl)

async function verifyMigration() {
  console.log("🔍 Verifying blueprint → unified wizard migration")
  console.log("")

  try {
    // 1. Count total blueprint users with form_data
    const totalBlueprintUsers = await sql`
      SELECT COUNT(*) as count
      FROM blueprint_subscribers bs
      WHERE bs.user_id IS NOT NULL
        AND bs.form_data IS NOT NULL
        AND bs.form_data::text != 'null'::text
    `
    const totalCount = parseInt(totalBlueprintUsers[0].count as string, 10)
    console.log(`📊 Total blueprint users with form_data: ${totalCount}`)

    // 2. Count users with user_personal_brand records
    const migratedUsers = await sql`
      SELECT COUNT(*) as count
      FROM blueprint_subscribers bs
      INNER JOIN user_personal_brand upb ON bs.user_id = upb.user_id
      WHERE bs.user_id IS NOT NULL
        AND bs.form_data IS NOT NULL
        AND bs.form_data::text != 'null'::text
    `
    const migratedCount = parseInt(migratedUsers[0].count as string, 10)
    console.log(`✅ Users with user_personal_brand records: ${migratedCount}`)

    // 3. Count users with complete user_personal_brand records
    const completeUsers = await sql`
      SELECT COUNT(*) as count
      FROM blueprint_subscribers bs
      INNER JOIN user_personal_brand upb ON bs.user_id = upb.user_id
      WHERE bs.user_id IS NOT NULL
        AND bs.form_data IS NOT NULL
        AND bs.form_data::text != 'null'::text
        AND upb.business_type IS NOT NULL
        AND upb.ideal_audience IS NOT NULL
        AND upb.is_completed = true
    `
    const completeCount = parseInt(completeUsers[0].count as string, 10)
    console.log(`✅ Users with complete records: ${completeCount}`)

    // 4. Check for missing migrations
    const missingUsers = await sql`
      SELECT 
        bs.user_id,
        bs.email,
        bs.name,
        bs.form_data->>'business' as blueprint_business,
        bs.form_data->>'dreamClient' as blueprint_dream_client
      FROM blueprint_subscribers bs
      WHERE bs.user_id IS NOT NULL
        AND bs.form_data IS NOT NULL
        AND bs.form_data::text != 'null'::text
        AND NOT EXISTS (
          SELECT 1 FROM user_personal_brand upb
          WHERE upb.user_id = bs.user_id
            AND upb.business_type IS NOT NULL
            AND upb.ideal_audience IS NOT NULL
        )
      LIMIT 10
    `
    const missingCount = missingUsers.length
    if (missingCount > 0) {
      console.log("")
      console.log(`⚠️  Found ${missingCount} users without complete user_personal_brand records:`)
      missingUsers.forEach((user: any) => {
        console.log(`   - ${user.email} (user_id: ${user.user_id})`)
      })
    }

    // 5. Check for incomplete data
    const incompleteUsers = await sql`
      SELECT 
        bs.user_id,
        bs.email,
        upb.business_type,
        upb.ideal_audience,
        upb.brand_vibe,
        upb.visual_aesthetic,
        upb.settings_preference
      FROM blueprint_subscribers bs
      INNER JOIN user_personal_brand upb ON bs.user_id = upb.user_id
      WHERE bs.user_id IS NOT NULL
        AND bs.form_data IS NOT NULL
        AND bs.form_data::text != 'null'::text
        AND (
          upb.business_type IS NULL
          OR upb.ideal_audience IS NULL
          OR upb.is_completed = false
        )
      LIMIT 10
    `
    const incompleteCount = incompleteUsers.length
    if (incompleteCount > 0) {
      console.log("")
      console.log(`⚠️  Found ${incompleteCount} users with incomplete user_personal_brand records:`)
      incompleteUsers.forEach((user: any) => {
        console.log(`   - ${user.email} (user_id: ${user.user_id})`)
        console.log(`     business_type: ${user.business_type ? "✅" : "❌"}`)
        console.log(`     ideal_audience: ${user.ideal_audience ? "✅" : "❌"}`)
        console.log(`     brand_vibe: ${user.brand_vibe ? "✅" : "❌"}`)
        console.log(`     visual_aesthetic: ${user.visual_aesthetic ? "✅" : "❌"}`)
        console.log(`     settings_preference: ${user.settings_preference ? "✅" : "❌"}`)
      })
    }

    // 6. Summary
    console.log("")
    console.log("📋 Verification Summary:")
    console.log(`   Total blueprint users: ${totalCount}`)
    console.log(`   Migrated users: ${migratedCount} (${((migratedCount / totalCount) * 100).toFixed(1)}%)`)
    console.log(`   Complete records: ${completeCount} (${((completeCount / totalCount) * 100).toFixed(1)}%)`)
    console.log(`   Missing migrations: ${missingCount}`)
    console.log(`   Incomplete records: ${incompleteCount}`)

    if (missingCount === 0 && incompleteCount === 0) {
      console.log("")
      console.log("✅ All verifications passed!")
    } else {
      console.log("")
      console.log("⚠️  Some issues found - review the details above")
    }
  } catch (error) {
    console.error("❌ Verification failed:", error)
    throw error
  }
}

// Run verification
verifyMigration()
  .then(() => {
    console.log("")
    console.log("🎉 Verification completed")
    process.exit(0)
  })
  .catch((error) => {
    console.error("")
    console.error("💥 Verification failed:", error)
    process.exit(1)
  })
