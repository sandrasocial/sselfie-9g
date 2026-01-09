# PR-1: Add Paid Blueprint Email Tracking Columns
**Date:** 2026-01-09  
**Status:** ✅ Complete  
**Migration File:** `/scripts/migrations/add-paid-blueprint-email-columns.sql`

---

## 📋 INVESTIGATION FINDINGS

### Existing FREE Blueprint Email Columns

**File:** `/scripts/add-blueprint-followup-email-columns.sql`  
**Columns:**
- `day_3_email_sent` (BOOLEAN DEFAULT FALSE)
- `day_3_email_sent_at` (TIMESTAMP WITH TIME ZONE)
- `day_7_email_sent` (BOOLEAN DEFAULT FALSE)
- `day_7_email_sent_at` (TIMESTAMP WITH TIME ZONE)
- `day_14_email_sent` (BOOLEAN DEFAULT FALSE)
- `day_14_email_sent_at` (TIMESTAMP WITH TIME ZONE)

**Indexes:**
- `idx_blueprint_subscribers_day3_email` ON `(day_3_email_sent, created_at) WHERE day_3_email_sent = FALSE`
- `idx_blueprint_subscribers_day7_email` ON `(day_7_email_sent, created_at) WHERE day_7_email_sent = FALSE`
- `idx_blueprint_subscribers_day14_email` ON `(day_14_email_sent, created_at) WHERE day_14_email_sent = FALSE`

**Pattern:** Uses `created_at` timestamp (for FREE blueprint, emails sent after signup)

---

### Migration Convention

**Location:** `/scripts/migrations/*.sql`  
**Pattern:**
- Use `BEGIN;` and `COMMIT;` for transactions
- Use `ADD COLUMN IF NOT EXISTS` for safety
- Track in `schema_migrations` table
- Include rollback SQL in comments
- Can be run directly with `psql $DATABASE_URL -f <file>`

**Examples:**
- `add-paid-blueprint-tracking.sql` - Uses BEGIN/COMMIT, schema_migrations
- `016_add_flodesk_sync_tracking.sql` - Simpler, no BEGIN/COMMIT
- `add-blueprint-generation-tracking.sql` - Uses BEGIN/COMMIT, schema_migrations

**Decision:** Follow `add-paid-blueprint-tracking.sql` pattern (same feature area)

---

## ✅ COLUMNS ADDED

### New Columns (6 total)

1. `day_1_paid_email_sent` (BOOLEAN DEFAULT FALSE)
2. `day_1_paid_email_sent_at` (TIMESTAMP WITH TIME ZONE)
3. `day_3_paid_email_sent` (BOOLEAN DEFAULT FALSE)
4. `day_3_paid_email_sent_at` (TIMESTAMP WITH TIME ZONE)
5. `day_7_paid_email_sent` (BOOLEAN DEFAULT FALSE)
6. `day_7_paid_email_sent_at` (TIMESTAMP WITH TIME ZONE)

**Naming Convention:**
- Matches FREE blueprint: `day_X_email_sent` → `day_X_paid_email_sent`
- Timestamps: `day_X_email_sent_at` → `day_X_paid_email_sent_at`

**Defaults:**
- BOOLEAN columns: `DEFAULT FALSE` (matches FREE blueprint)
- TIMESTAMP columns: `NULL` (no default, set on send)

---

## 📊 INDEXES CREATED

### New Indexes (3 total)

1. `idx_blueprint_paid_email_day1`
   - ON: `(day_1_paid_email_sent, paid_blueprint_purchased_at)`
   - WHERE: `paid_blueprint_purchased = TRUE AND day_1_paid_email_sent = FALSE`

2. `idx_blueprint_paid_email_day3`
   - ON: `(day_3_paid_email_sent, paid_blueprint_purchased_at)`
   - WHERE: `paid_blueprint_purchased = TRUE AND day_3_paid_email_sent = FALSE`

3. `idx_blueprint_paid_email_day7`
   - ON: `(day_7_paid_email_sent, paid_blueprint_purchased_at)`
   - WHERE: `paid_blueprint_purchased = TRUE AND day_7_paid_email_sent = FALSE`

**Key Difference from FREE:**
- FREE uses `created_at` (signup time)
- PAID uses `paid_blueprint_purchased_at` (purchase time)
- Both filter on `email_sent = FALSE` for unsent emails

---

## 🚀 HOW TO RUN

### Local/Staging

```bash
# Direct psql
psql $DATABASE_URL -f scripts/migrations/add-paid-blueprint-email-columns.sql

# Or with explicit connection
psql postgresql://user:pass@host/dbname -f scripts/migrations/add-paid-blueprint-email-columns.sql
```

### Production

```bash
# Same command, ensure DATABASE_URL is production connection string
psql $DATABASE_URL -f scripts/migrations/add-paid-blueprint-email-columns.sql
```

**Note:** Migration is idempotent (uses `IF NOT EXISTS`), safe to run multiple times.

---

## ✅ VERIFICATION

### Schema Check

```sql
-- Verify columns exist
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'blueprint_subscribers'
AND column_name LIKE 'day_%_paid_email%'
ORDER BY column_name;
```

**Expected Output:**
```
column_name              | data_type                  | column_default | is_nullable
-------------------------|----------------------------|----------------|-------------
day_1_paid_email_sent    | boolean                    | false          | NO
day_1_paid_email_sent_at | timestamp with time zone   | NULL           | YES
day_3_paid_email_sent    | boolean                    | false          | NO
day_3_paid_email_sent_at | timestamp with time zone   | NULL           | YES
day_7_paid_email_sent    | boolean                    | false          | NO
day_7_paid_email_sent_at | timestamp with time zone   | NULL           | YES
```

### Index Check

```sql
-- Verify indexes exist
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'blueprint_subscribers'
AND indexname LIKE 'idx_blueprint_paid_email%'
ORDER BY indexname;
```

**Expected Output:**
```
indexname                      | indexdef
-------------------------------|--------------------------------------------------
idx_blueprint_paid_email_day1  | CREATE INDEX ... WHERE paid_blueprint_purchased = TRUE AND day_1_paid_email_sent = FALSE
idx_blueprint_paid_email_day3  | CREATE INDEX ... WHERE paid_blueprint_purchased = TRUE AND day_3_paid_email_sent = FALSE
idx_blueprint_paid_email_day7  | CREATE INDEX ... WHERE paid_blueprint_purchased = TRUE AND day_7_paid_email_sent = FALSE
```

### Migration Record Check

```sql
-- Verify migration recorded
SELECT version, applied_at
FROM schema_migrations
WHERE version = 'add-paid-blueprint-email-columns';
```

**Expected Output:**
```
version                              | applied_at
-------------------------------------|--------------------------
add-paid-blueprint-email-columns     | 2026-01-09 12:00:00+00
```

### Data Check

```sql
-- Verify defaults applied to existing rows
SELECT 
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE day_1_paid_email_sent = FALSE) as day1_false,
  COUNT(*) FILTER (WHERE day_3_paid_email_sent = FALSE) as day3_false,
  COUNT(*) FILTER (WHERE day_7_paid_email_sent = FALSE) as day7_false,
  COUNT(*) FILTER (WHERE day_1_paid_email_sent_at IS NULL) as day1_null,
  COUNT(*) FILTER (WHERE day_3_paid_email_sent_at IS NULL) as day3_null,
  COUNT(*) FILTER (WHERE day_7_paid_email_sent_at IS NULL) as day7_null
FROM blueprint_subscribers;
```

**Expected:** All existing rows should have `FALSE` for boolean columns and `NULL` for timestamp columns.

---

## 🔄 ROLLBACK

If needed, run this SQL to rollback:

```sql
BEGIN;

ALTER TABLE blueprint_subscribers
  DROP COLUMN IF EXISTS day_1_paid_email_sent,
  DROP COLUMN IF EXISTS day_1_paid_email_sent_at,
  DROP COLUMN IF EXISTS day_3_paid_email_sent,
  DROP COLUMN IF EXISTS day_3_paid_email_sent_at,
  DROP COLUMN IF EXISTS day_7_paid_email_sent,
  DROP COLUMN IF EXISTS day_7_paid_email_sent_at;

DROP INDEX IF EXISTS idx_blueprint_paid_email_day1;
DROP INDEX IF EXISTS idx_blueprint_paid_email_day3;
DROP INDEX IF EXISTS idx_blueprint_paid_email_day7;

DELETE FROM schema_migrations WHERE version = 'add-paid-blueprint-email-columns';

COMMIT;
```

**Warning:** Rolling back will lose email send state. Only rollback if migration was applied incorrectly.

---

## 📝 CHANGES SUMMARY

**File Created:**
- `/scripts/migrations/add-paid-blueprint-email-columns.sql` (67 lines)

**Database Changes:**
- 6 columns added to `blueprint_subscribers` table
- 3 indexes created
- 1 record added to `schema_migrations` table

**No Breaking Changes:**
- All columns use `IF NOT EXISTS` (safe to run multiple times)
- All columns have defaults (existing rows unaffected)
- No existing columns modified
- No existing data modified

---

## ✅ ACCEPTANCE CRITERIA

- [x] Migration file created following existing pattern
- [x] Columns match FREE blueprint naming convention
- [x] Indexes match FREE blueprint pattern (with paid_blueprint_purchased_at)
- [x] Migration tracked in schema_migrations
- [x] Rollback SQL included
- [x] Documentation complete

**Ready for:** PR-2 (Email Templates)
