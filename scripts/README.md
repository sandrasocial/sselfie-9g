# Scripts Cleanup Guide

This directory contains 165+ scripts accumulated over development. Many are outdated or one-time migrations that have already been executed.

## ✅ Scripts to KEEP (Essential)

### Current Schema (Latest Only)
- Latest numbered schema files (keep highest number only)
- `create-stripe-beta-coupon.ts` - Active beta program setup

### Seed Data
- Any current seed data scripts for development/testing

### Utility Scripts
- Scripts for ongoing maintenance tasks
- Development helper scripts still in use

## ❌ Scripts to DELETE (Already Executed / Obsolete)

### Completed Migrations
All these migrations have been executed and are no longer needed:
- `migrate-*.ts` - All migration scripts
- `import-production-data.sql` - One-time data import
- `fix-*` scripts - One-time fixes for specific issues

### Duplicate Table Creation
Keep only the LATEST version of each table schema:
- `20-create-sessions-tables.sql`
- `21-create-sessions-tables.ts`
- `22-create-sessions-tables.ts`
- `21-create-feed-tables-fixed.sql` vs `22-update-feed-tables-schema.sql`

### One-Off User Fixes
These were for specific user issues and are no longer needed:
- `fix-hafdisosk-lora*.sql`
- `fix-sandra-users-lora.sql`
- `check-shannon-*.ts`
- `cleanup-test-users*.ts/sql/js`
- `delete-test-users.js`

### Analysis & Diagnostic Scripts
These were for one-time debugging:
- `analyze-*.ts`
- `diagnose-*.sql`
- `check-*.ts`
- `test-*.ts` (except active test utilities)

### Temporary/Experimental
- Scripts with "temp", "old", "backup" in the name
- Scripts numbered multiple times (keep highest number only)

## 📋 Recommended Cleanup Process

1. **Backup First**
   \`\`\`bash
   cp -r scripts scripts-backup-$(date +%Y%m%d)
   \`\`\`

2. **Review Current Database**
   - Check which migrations have already run
   - Verify current schema matches latest scripts

3. **Create Archive Folder**
   \`\`\`bash
   mkdir scripts/archive
   \`\`\`

4. **Move Obsolete Scripts**
   \`\`\`bash
   mv scripts/migrate-*.ts scripts/archive/
   mv scripts/fix-*.sql scripts/archive/
   mv scripts/cleanup-*.ts scripts/archive/
   \`\`\`

5. **Organize Remaining Scripts**
   \`\`\`
   scripts/
   ├── schema/           # Current table schemas
   ├── seed/             # Seed data for dev/test
   ├── utils/            # Ongoing utility scripts
   └── archive/          # Completed migrations & fixes
   \`\`\`

## 📊 Estimated Impact

- **Current:** 165 files
- **After cleanup:** ~20-30 essential files
- **Space saved:** Minimal (but better organization)
- **Risk:** Low (keep archive folder for reference)

## ⚠️ Safety Notes

- Never delete scripts until you've verified migrations have run
- Keep at least one copy of production data imports
- Archive rather than delete if unsure
- Document what each remaining script does

## 🔄 Maintenance Going Forward

**New Script Naming Convention:**
- Use timestamps: `YYYYMMDD-description.ts`
- Mark one-time scripts: `one-time-fix-issue-123.ts`
- Document purpose at top of file
- Delete after execution (for one-time scripts)

**Example:**
\`\`\`typescript
/**
 * ONE-TIME SCRIPT - Safe to delete after execution
 * Purpose: Fix duplicate user emails from migration bug
 * Date: 2025-01-15
 * Status: ✅ Executed on production
 */
