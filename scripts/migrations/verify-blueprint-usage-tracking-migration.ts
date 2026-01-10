import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(process.cwd(), ".env.local") });
dotenv.config({ path: join(process.cwd(), ".env") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("[Verification] ❌ DATABASE_URL environment variable is not set");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function verifyMigration() {
  const migrationName = "add-blueprint-usage-tracking";
  console.log(`[Verification] 🔍 Verifying: ${migrationName}`);

  try {
    // 1. Check if migration was recorded
    const migrationRecord = await sql`
      SELECT applied_at FROM schema_migrations WHERE version = ${migrationName}
    `;
    if (migrationRecord.length > 0) {
      console.log(`[Verification] ✅ Migration recorded: ${migrationRecord[0].applied_at}`);
    } else {
      console.error(`[Verification] ❌ Migration record not found for ${migrationName}`);
      process.exit(1);
    }

    // 2. Check for free_grid_used_at column
    const freeGridUsedAtColumn = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'blueprint_subscribers' AND column_name = 'free_grid_used_at'
    `;
    if (freeGridUsedAtColumn.length > 0) {
      console.log(`[Verification] ✅ free_grid_used_at column exists:`);
      console.log(`   - Type: ${freeGridUsedAtColumn[0].data_type}`);
      console.log(`   - Nullable: ${freeGridUsedAtColumn[0].is_nullable === 'YES' ? 'YES' : 'NO'}`);
    } else {
      console.error(`[Verification] ❌ free_grid_used_at column not found.`);
      process.exit(1);
    }

    // 3. Check for free_grid_used_count column
    const freeGridUsedCountColumn = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'blueprint_subscribers' AND column_name = 'free_grid_used_count'
    `;
    if (freeGridUsedCountColumn.length > 0) {
      console.log(`[Verification] ✅ free_grid_used_count column exists:`);
      console.log(`   - Type: ${freeGridUsedCountColumn[0].data_type}`);
      console.log(`   - Default: ${freeGridUsedCountColumn[0].column_default}`);
    } else {
      console.error(`[Verification] ❌ free_grid_used_count column not found.`);
      process.exit(1);
    }

    // 4. Check for paid_grids_generated column
    const paidGridsGeneratedColumn = await sql`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'blueprint_subscribers' AND column_name = 'paid_grids_generated'
    `;
    if (paidGridsGeneratedColumn.length > 0) {
      console.log(`[Verification] ✅ paid_grids_generated column exists:`);
      console.log(`   - Type: ${paidGridsGeneratedColumn[0].data_type}`);
      console.log(`   - Default: ${paidGridsGeneratedColumn[0].column_default}`);
    } else {
      console.error(`[Verification] ❌ paid_grids_generated column not found.`);
      process.exit(1);
    }

    // 5. Check for indexes
    const freeGridIndex = await sql`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'blueprint_subscribers' AND indexname = 'idx_blueprint_subscribers_free_grid_used'
    `;
    if (freeGridIndex.length > 0) {
      console.log(`[Verification] ✅ Index exists: ${freeGridIndex[0].indexname}`);
    } else {
      console.error(`[Verification] ❌ Index 'idx_blueprint_subscribers_free_grid_used' not found.`);
      process.exit(1);
    }

    const paidGridsIndex = await sql`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'blueprint_subscribers' AND indexname = 'idx_blueprint_subscribers_paid_grids'
    `;
    if (paidGridsIndex.length > 0) {
      console.log(`[Verification] ✅ Index exists: ${paidGridsIndex[0].indexname}`);
    } else {
      console.error(`[Verification] ❌ Index 'idx_blueprint_subscribers_paid_grids' not found.`);
      process.exit(1);
    }

    console.log("[Verification] ✨ All checks passed!");
    console.log("[Verification] ✅ Verification completed successfully");
    process.exit(0);

  } catch (error: any) {
    console.error(`[Verification] ❌ Verification failed:`, error.message);
    console.error(error);
    process.exit(1);
  }
}

verifyMigration();
