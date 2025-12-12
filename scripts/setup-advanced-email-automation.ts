/**
 * Setup Advanced Email Automation Tables
 * 
 * Runs the SQL migration to create A/B testing, segmentation, and re-engagement tables
 */

import { neon } from "@neondatabase/serverless"
import { readFileSync } from "fs"
import { join } from "path"
import { config } from "dotenv"

config({ path: join(process.cwd(), ".env.local") })
config({ path: join(process.cwd(), ".env") })

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error("❌ DATABASE_URL environment variable is not set")
  process.exit(1)
}

const sql = neon(databaseUrl)

async function runMigration() {
  try {
    console.log("🚀 Setting up advanced email automation tables...\n")

    // Execute each table creation and statement individually using tagged templates
    console.log("1. Creating email_ab_tests table...")
    await sql`
      CREATE TABLE IF NOT EXISTS email_ab_tests (
        id SERIAL PRIMARY KEY,
        test_name TEXT NOT NULL UNIQUE,
        parent_campaign_id INTEGER REFERENCES admin_email_campaigns(id),
        test_type TEXT NOT NULL,
        variant_a_campaign_id INTEGER REFERENCES admin_email_campaigns(id),
        variant_b_campaign_id INTEGER REFERENCES admin_email_campaigns(id),
        split_ratio NUMERIC DEFAULT 0.5,
        status TEXT DEFAULT 'draft',
        start_date TIMESTAMPTZ,
        end_date TIMESTAMPTZ,
        min_sample_size INTEGER DEFAULT 100,
        confidence_level NUMERIC DEFAULT 0.95,
        winner_variant TEXT,
        winner_declared_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    console.log("   ✓ email_ab_tests table created")

    console.log("\n2. Creating email_ab_test_results table...")
    await sql`
      CREATE TABLE IF NOT EXISTS email_ab_test_results (
        id SERIAL PRIMARY KEY,
        test_id INTEGER REFERENCES email_ab_tests(id) ON DELETE CASCADE,
        variant TEXT NOT NULL,
        recipient_email TEXT NOT NULL,
        sent_at TIMESTAMPTZ DEFAULT NOW(),
        opened BOOLEAN DEFAULT FALSE,
        opened_at TIMESTAMPTZ,
        clicked BOOLEAN DEFAULT FALSE,
        clicked_at TIMESTAMPTZ,
        converted BOOLEAN DEFAULT FALSE,
        converted_at TIMESTAMPTZ,
        UNIQUE(test_id, recipient_email)
      )
    `
    console.log("   ✓ email_ab_test_results table created")

    console.log("\n3. Creating email_segments table...")
    await sql`
      CREATE TABLE IF NOT EXISTS email_segments (
        id SERIAL PRIMARY KEY,
        segment_name TEXT NOT NULL UNIQUE,
        segment_type TEXT NOT NULL,
        criteria JSONB NOT NULL,
        description TEXT,
        is_auto_refreshed BOOLEAN DEFAULT TRUE,
        last_refreshed_at TIMESTAMPTZ,
        member_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    console.log("   ✓ email_segments table created")

    console.log("\n4. Creating email_segment_members table...")
    await sql`
      CREATE TABLE IF NOT EXISTS email_segment_members (
        id SERIAL PRIMARY KEY,
        segment_id INTEGER REFERENCES email_segments(id) ON DELETE CASCADE,
        user_email TEXT NOT NULL,
        added_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(segment_id, user_email)
      )
    `
    console.log("   ✓ email_segment_members table created")

    console.log("\n5. Creating reengagement_campaigns table...")
    await sql`
      CREATE TABLE IF NOT EXISTS reengagement_campaigns (
        id SERIAL PRIMARY KEY,
        campaign_name TEXT NOT NULL,
        trigger_segment_id INTEGER REFERENCES email_segments(id),
        trigger_condition TEXT NOT NULL,
        email_template_type TEXT NOT NULL,
        subject_line TEXT NOT NULL,
        body_html TEXT,
        body_text TEXT,
        offer_code TEXT,
        offer_amount NUMERIC,
        is_active BOOLEAN DEFAULT TRUE,
        send_frequency_days INTEGER DEFAULT 30,
        last_sent_at TIMESTAMPTZ,
        total_sent INTEGER DEFAULT 0,
        total_opened INTEGER DEFAULT 0,
        total_clicked INTEGER DEFAULT 0,
        total_converted INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    console.log("   ✓ reengagement_campaigns table created")

    console.log("\n6. Creating reengagement_sends table...")
    await sql`
      CREATE TABLE IF NOT EXISTS reengagement_sends (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES reengagement_campaigns(id) ON DELETE CASCADE,
        user_email TEXT NOT NULL,
        sent_at TIMESTAMPTZ DEFAULT NOW(),
        opened BOOLEAN DEFAULT FALSE,
        clicked BOOLEAN DEFAULT FALSE,
        converted BOOLEAN DEFAULT FALSE,
        UNIQUE(campaign_id, user_email)
      )
    `
    console.log("   ✓ reengagement_sends table created")

    console.log("\n7. Creating email_previews table...")
    await sql`
      CREATE TABLE IF NOT EXISTS email_previews (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES admin_email_campaigns(id),
        preview_type TEXT NOT NULL,
        content_hash TEXT,
        html_preview TEXT,
        text_preview TEXT,
        spam_score NUMERIC,
        spam_issues TEXT[],
        rendering_issues TEXT[],
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `
    console.log("   ✓ email_previews table created")

    console.log("\n8. Creating indexes...")
    await sql`CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON email_ab_tests(status)`
    await sql`CREATE INDEX IF NOT EXISTS idx_ab_tests_parent_campaign ON email_ab_tests(parent_campaign_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_ab_results_test_variant ON email_ab_test_results(test_id, variant)`
    await sql`CREATE INDEX IF NOT EXISTS idx_ab_results_email ON email_ab_test_results(recipient_email)`
    await sql`CREATE INDEX IF NOT EXISTS idx_segments_type ON email_segments(segment_type)`
    await sql`CREATE INDEX IF NOT EXISTS idx_segments_auto_refresh ON email_segments(is_auto_refreshed)`
    await sql`CREATE INDEX IF NOT EXISTS idx_segment_members_segment ON email_segment_members(segment_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_segment_members_email ON email_segment_members(user_email)`
    await sql`CREATE INDEX IF NOT EXISTS idx_reengagement_active ON reengagement_campaigns(is_active)`
    await sql`CREATE INDEX IF NOT EXISTS idx_reengagement_trigger ON reengagement_campaigns(trigger_segment_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_reengagement_sends_campaign ON reengagement_sends(campaign_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_reengagement_sends_email ON reengagement_sends(user_email)`
    await sql`CREATE INDEX IF NOT EXISTS idx_previews_campaign ON email_previews(campaign_id)`
    await sql`CREATE INDEX IF NOT EXISTS idx_previews_hash ON email_previews(content_hash)`
    console.log("   ✓ All indexes created")

    console.log("\n9. Creating triggers...")
    await sql`
      CREATE OR REPLACE FUNCTION update_email_automation_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `
    await sql`DROP TRIGGER IF EXISTS email_ab_tests_updated_at ON email_ab_tests`
    await sql`
      CREATE TRIGGER email_ab_tests_updated_at
      BEFORE UPDATE ON email_ab_tests
      FOR EACH ROW
      EXECUTE FUNCTION update_email_automation_updated_at()
    `
    await sql`DROP TRIGGER IF EXISTS email_segments_updated_at ON email_segments`
    await sql`
      CREATE TRIGGER email_segments_updated_at
      BEFORE UPDATE ON email_segments
      FOR EACH ROW
      EXECUTE FUNCTION update_email_automation_updated_at()
    `
    await sql`DROP TRIGGER IF EXISTS reengagement_campaigns_updated_at ON reengagement_campaigns`
    await sql`
      CREATE TRIGGER reengagement_campaigns_updated_at
      BEFORE UPDATE ON reengagement_campaigns
      FOR EACH ROW
      EXECUTE FUNCTION update_email_automation_updated_at()
    `
    console.log("   ✓ Triggers created")

    console.log("\n10. Creating pre-defined segments...")
    const segments = [
      { name: 'highly_engaged', type: 'engagement', criteria: { last_opened_days: 7, min_opens: 3, min_clicks: 1 }, desc: 'Opened 3+ emails and clicked in last 7 days' },
      { name: 'moderately_engaged', type: 'engagement', criteria: { last_opened_days: 30, min_opens: 1, max_opens: 2 }, desc: 'Opened 1-2 emails in last 30 days' },
      { name: 'inactive_30d', type: 'engagement', criteria: { last_opened_days: 30, max_opens: 0 }, desc: 'No opens in last 30 days' },
      { name: 'inactive_60d', type: 'engagement', criteria: { last_opened_days: 60, max_opens: 0 }, desc: 'No opens in last 60 days' },
      { name: 'never_purchased', type: 'purchase_history', criteria: { has_purchased: false }, desc: 'Never made a purchase' },
      { name: 'one_time_buyers', type: 'purchase_history', criteria: { purchase_count: 1 }, desc: 'Made exactly one purchase' },
      { name: 'repeat_customers', type: 'purchase_history', criteria: { purchase_count: { $gte: 2 } }, desc: 'Made 2+ purchases' },
      { name: 'blueprint_completers', type: 'behavior', criteria: { completed_blueprint: true }, desc: 'Completed brand blueprint' },
      { name: 'blueprint_non_converted', type: 'behavior', criteria: { completed_blueprint: true, converted: false }, desc: 'Completed blueprint but never purchased' },
    ]

    for (const seg of segments) {
      await sql`
        INSERT INTO email_segments (segment_name, segment_type, criteria, description, is_auto_refreshed)
        VALUES (${seg.name}, ${seg.type}, ${JSON.stringify(seg.criteria)}::jsonb, ${seg.desc}, TRUE)
        ON CONFLICT (segment_name) DO NOTHING
      `
    }
    console.log(`   ✓ Created ${segments.length} pre-defined segments`)

    console.log("\n✅ Advanced email automation tables created successfully!")
    console.log("\n📊 Created tables:")
    console.log("   - email_ab_tests (A/B testing)")
    console.log("   - email_ab_test_results (A/B test tracking)")
    console.log("   - email_segments (Dynamic segmentation)")
    console.log("   - email_segment_members (Segment membership)")
    console.log("   - reengagement_campaigns (Re-engagement automation)")
    console.log("   - reengagement_sends (Re-engagement tracking)")
    console.log("   - email_previews (Email preview & spam checking)")
    console.log("\n🎯 Pre-defined segments created:")
    console.log("   - highly_engaged")
    console.log("   - moderately_engaged")
    console.log("   - inactive_30d")
    console.log("   - inactive_60d")
    console.log("   - never_purchased")
    console.log("   - one_time_buyers")
    console.log("   - repeat_customers")
    console.log("   - blueprint_completers")
    console.log("   - blueprint_non_converted")
  } catch (error: any) {
    console.error("\n❌ Migration failed:", error.message)
    process.exit(1)
  }
}

runMigration()
