#!/usr/bin/env tsx
/**
 * Verify Paid Blueprint Email Columns Migration
 */

import { neon } from "@neondatabase/serverless"
import { config } from "dotenv"
import { join } from "path"

config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

const sql = neon(process.env.DATABASE_URL!)

async function verify() {
  console.log("🔍 Verifying Paid Blueprint Email Columns Migration\n")

  // Check columns
  const columns = await sql`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'blueprint_subscribers'
    AND column_name LIKE 'day_%_paid_email%'
    ORDER BY column_name
  `

  console.log(`✅ Columns (${columns.length}/6 expected):`)
  columns.forEach((col: any) => {
    console.log(`   - ${col.column_name}: ${col.data_type} (default: ${col.column_default || "NULL"})`)
  })

  // Check indexes
  const indexes = await sql`
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'blueprint_subscribers'
    AND indexname LIKE 'idx_blueprint_paid_email%'
    ORDER BY indexname
  `

  console.log(`\n✅ Indexes (${indexes.length}/3 expected):`)
  indexes.forEach((idx: any) => {
    console.log(`   - ${idx.indexname}`)
  })

  // Check migration record
  const migration = await sql`
    SELECT version, applied_at
    FROM schema_migrations
    WHERE version = 'add-paid-blueprint-email-columns'
  `

  if (migration.length > 0) {
    console.log(`\n✅ Migration recorded: ${migration[0].applied_at}`)
  } else {
    console.log("\n⚠️  Migration not recorded in schema_migrations")
  }

  // Check data defaults
  const data = await sql`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE day_1_paid_email_sent = FALSE) as day1_false,
      COUNT(*) FILTER (WHERE day_3_paid_email_sent = FALSE) as day3_false,
      COUNT(*) FILTER (WHERE day_7_paid_email_sent = FALSE) as day7_false,
      COUNT(*) FILTER (WHERE day_1_paid_email_sent_at IS NULL) as day1_null,
      COUNT(*) FILTER (WHERE day_3_paid_email_sent_at IS NULL) as day3_null,
      COUNT(*) FILTER (WHERE day_7_paid_email_sent_at IS NULL) as day7_null
    FROM blueprint_subscribers
  `

  console.log(`\n✅ Data verification:`)
  console.log(`   - Total rows: ${data[0].total}`)
  console.log(`   - day_1_paid_email_sent = FALSE: ${data[0].day1_false}/${data[0].total}`)
  console.log(`   - day_3_paid_email_sent = FALSE: ${data[0].day3_false}/${data[0].total}`)
  console.log(`   - day_7_paid_email_sent = FALSE: ${data[0].day7_false}/${data[0].total}`)
  console.log(`   - day_1_paid_email_sent_at IS NULL: ${data[0].day1_null}/${data[0].total}`)
  console.log(`   - day_3_paid_email_sent_at IS NULL: ${data[0].day3_null}/${data[0].total}`)
  console.log(`   - day_7_paid_email_sent_at IS NULL: ${data[0].day7_null}/${data[0].total}`)

  if (
    data[0].day1_false === data[0].total &&
    data[0].day3_false === data[0].total &&
    data[0].day7_false === data[0].total &&
    data[0].day1_null === data[0].total &&
    data[0].day3_null === data[0].total &&
    data[0].day7_null === data[0].total
  ) {
    console.log("\n✨ All defaults applied correctly!")
  } else {
    console.log("\n⚠️  Some rows may have non-default values")
  }
}

verify()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error)
    process.exit(1)
  })
