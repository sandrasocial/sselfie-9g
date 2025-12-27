# Loops Email Marketing Setup

## Overview

SSELFIE uses **Loops** for all marketing emails and **Resend** for transactional emails. This dual-platform approach ensures optimal deliverability and proper email categorization.

## Email Platform Strategy

### Resend (Transactional Only)
- Login/magic links
- Password resets
- Purchase receipts
- Account notifications
- System alerts

### Loops (Marketing Only)
- Newsletters
- Product launches
- Welcome sequences
- Nurture campaigns
- Promotional emails
- Re-engagement campaigns

**Decision Rule:** If a user action triggered it → Resend. If it's marketing/promotional → Loops.

## Email Capture

All signup forms sync contacts to **BOTH** platforms:

- **Freebie Subscribers** (`/api/freebie/subscribe`)
  - Resend: For transactional emails
  - Loops: For marketing campaigns
  - Tags: `freebie-guide`, `lead`

- **Blueprint Subscribers** (`/api/blueprint/subscribe`)
  - Resend: For transactional emails
  - Loops: For marketing campaigns
  - Tags: `brand-blueprint`, `lead`

- **Prompt Guide Subscribers** (`/api/prompt-guide/subscribe`)
  - Resend: For transactional emails
  - Loops: For marketing campaigns
  - Tags: `prompt-guide`, `[list-specific-tag]`

- **Stripe Purchases** (`/api/webhooks/stripe`)
  - Resend: For receipts and account notifications
  - Loops: For marketing to paying customers
  - Tags: `customer`, `paid`, `[product-tag]`
  - User Group: `paid`

## Database Tracking

Each subscriber table has Loops tracking columns:

```sql
-- freebie_subscribers
loops_contact_id VARCHAR(255)      -- Contact ID in Loops
synced_to_loops BOOLEAN           -- Whether synced successfully
loops_synced_at TIMESTAMP         -- Timestamp of sync

-- blueprint_subscribers
loops_contact_id VARCHAR(255)      -- Contact ID in Loops
synced_to_loops BOOLEAN           -- Whether synced successfully
loops_synced_at TIMESTAMP         -- Timestamp of sync
```

**Indexes:**
- `idx_freebie_loops_contact` - Fast lookup by Loops ID
- `idx_freebie_loops_synced` - Find unsynced contacts
- `idx_blueprint_loops_contact` - Fast lookup by Loops ID
- `idx_blueprint_loops_synced` - Find unsynced contacts

## Alex Integration

Alex has 4 Loops tools for marketing automation:

### 1. `compose_loops_email`
Create marketing email campaigns in Loops.

**Usage:**
- "Create a newsletter about Maya Pro Mode features"
- "Create a welcome email for new Studio members"
- "Create a promotional campaign for Black Friday"

**Features:**
- Generates email HTML in Sandra's voice
- Creates draft campaign in Loops
- Supports testimonials and images
- Audience segmentation

### 2. `create_loops_sequence`
Build multi-email sequences with delays.

**Usage:**
- "Create a 5-email welcome sequence"
- "Create a nurture sequence for blueprint subscribers"

**Features:**
- Generates multiple emails with timing
- Provides HTML for each step
- Instructions for Loops dashboard setup

### 3. `add_to_loops_audience`
Add contacts to Loops with specific tags/segments.

**Usage:**
- "Add test@example.com to Loops with tag 'beta-tester'"
- "Tag all Studio members as 'engaged'"

**Features:**
- Add/update contacts
- Apply tags for segmentation
- Set user groups

### 4. `get_loops_analytics`
View campaign performance metrics.

**Usage:**
- "Get analytics for recent Loops campaigns"
- "Show performance for last 10 campaigns"

**Features:**
- Open rates
- Click rates
- Sent counts
- Campaign summaries

## Automated Sequences

Marketing sequences run in **Loops** (not via cron jobs). Cron jobs add tags to trigger Loops automations.

### Required Loops Sequences

#### Blueprint Followups (`send-blueprint-followups` cron)
1. **Blueprint Day 3** automation
   - Trigger: Tag added = `blueprint-day-3`
   - Subject: "3 Ways to Use Your Blueprint This Week"
   - Template: `generateBlueprintFollowupDay3Email`

2. **Blueprint Day 7** automation
   - Trigger: Tag added = `blueprint-day-7`
   - Subject: "[Name] went from 5K to 25K followers using this system"
   - Template: `generateBlueprintFollowupDay7Email`

3. **Blueprint Day 14** automation
   - Trigger: Tag added = `blueprint-day-14`
   - Subject: "Still thinking about it? Here's $10 off 💕"
   - Template: `generateBlueprintFollowupDay14Email`

#### Blueprint Email Sequence (`blueprint-email-sequence` cron)
1. **Blueprint Upsell Day 3** automation
   - Trigger: Tag added = `blueprint-upsell-day-3`
   - Subject: "Ready for the Next Level?"

2. **Blueprint Nurture Day 7** automation
   - Trigger: Tag added = `blueprint-upsell-day-7`
   - Subject: "One Week In"

3. **Blueprint Upsell Day 10** automation
   - Trigger: Tag added = `blueprint-upsell-day-10`
   - Subject: "Ready for the Next Level?"

4. **Blueprint Win Back Day 14** automation
   - Trigger: Tag added = `blueprint-upsell-day-14`
   - Subject: "We Miss You - Here's Something Special"

#### Re-engagement Campaigns (`reengagement-campaigns` cron)
- Create automations for each campaign in `reengagement_campaigns` table
- Trigger: Tag added = `reengagement-{campaign_id}`
- Use campaign-specific subject and content from database

### Setting Up Sequences in Loops

1. Go to https://app.loops.so/loops
2. Click "Create New Loop"
3. Set trigger: "Tag added" = `[tag-name]`
4. Add email step with content from template
5. Set delays if needed
6. Activate the loop

**Important:** Without setting up these Loops sequences, no emails will be sent! The cron jobs only add tags - Loops handles the actual email sending.

## Backfill Existing Contacts

To sync existing contacts to Loops:

```bash
npm run sync-to-loops
```

This script:
- Finds all contacts where `synced_to_loops = false` or `NULL`
- Syncs each contact to Loops with appropriate tags
- Updates database with `loops_contact_id`, `synced_to_loops = true`, `loops_synced_at`
- Shows progress every 50 contacts
- Provides summary report

**Rate Limiting:** 150ms delay between API calls to avoid overwhelming Loops API.

## Testing

### Automated Tests
Run the integration test suite:

```bash
npx tsx scripts/test-loops-integration.ts
```

### Manual Testing Checklist

1. **Email Capture Dual-Sync**
   - Submit freebie form with test email
   - Check Resend dashboard → Should appear ✓
   - Check Loops dashboard → Should appear ✓
   - Verify database: `SELECT loops_contact_id, synced_to_loops FROM freebie_subscribers WHERE email = 'test@example.com'`

2. **Alex Loops Tools**
   - Ask Alex: "Create a test marketing email campaign in Loops"
   - Verify: Campaign created in Loops dashboard ✓
   - Ask Alex: "Create a 3-email welcome sequence"
   - Verify: Alex generates 3 emails with delays ✓

3. **Platform Decision**
   - Ask Alex: "Send password reset email" → Should use Resend ✓
   - Ask Alex: "Create newsletter about Maya updates" → Should use Loops ✓
   - Ask Alex: "Send purchase receipt" → Should use Resend ✓

4. **Stripe Integration**
   - Make test purchase
   - Check Resend dashboard → Customer added ✓
   - Check Loops dashboard → Customer added with 'paid' tag ✓
   - Check database → `loops_contact_id` populated ✓

## Troubleshooting

### Contacts Not Syncing
- Check `LOOPS_API_KEY` is set in `.env.local`
- Verify API key is valid: `npx tsx scripts/test-loops-connection.ts`
- Check database: `SELECT COUNT(*) FROM freebie_subscribers WHERE synced_to_loops = false`

### Cron Jobs Not Triggering Sequences
- Verify Loops sequences are created in dashboard
- Check trigger tags match exactly (case-sensitive)
- Verify sequences are activated (not draft)
- Check cron job logs for tag addition success

### Alex Tools Not Working
- Verify Loops API key is configured
- Check Alex system prompt includes Loops guidance
- Test API connection: `npx tsx scripts/test-loops-connection.ts`

## Related Documentation

- [LOOPS_MIGRATION_AUDIT.md](./LOOPS_MIGRATION_AUDIT.md) - Complete migration audit and status
- [lib/admin/email-brand-guidelines.ts](../lib/admin/email-brand-guidelines.ts) - Email brand guidelines with platform strategy
- [lib/admin/alex-system-prompt.ts](../lib/admin/alex-system-prompt.ts) - Alex system prompt with Loops vs Resend decision tree

## Support

- Loops Documentation: https://loops.so/docs
- Loops API Reference: https://loops.so/docs/api-reference
- Loops Dashboard: https://app.loops.so

