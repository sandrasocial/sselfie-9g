# Database Schema Audit - UUID vs SERIAL/TEXT Confusion

## Executive Summary

**Root Cause**: Multiple conflicting schema definition files exist, creating confusion about whether the database uses UUID or SERIAL/INTEGER for IDs, and UUID or TEXT for user_id.

**Impact**: Code was written assuming UUID schema, but actual database uses SERIAL/INTEGER for IDs and TEXT for user_id, leading to query failures.

**Status**: ✅ Fixed in `app/api/maya/load-chat/route.ts`, but similar issues may exist elsewhere.

---

## 1. The Problem

### Conflicting Schema Definitions

Your codebase has **multiple CREATE TABLE statements** for the same tables with **different schemas**:

#### Table: `maya_chat_messages`

**File 1: `scripts/00-create-all-tables.sql` (ACTUAL SCHEMA)**
```sql
CREATE TABLE IF NOT EXISTS maya_chat_messages (
  id SERIAL PRIMARY KEY,                    -- ✅ INTEGER
  chat_id INTEGER REFERENCES maya_chats(id), -- ✅ INTEGER
  user_id TEXT REFERENCES users(id),        -- ✅ TEXT
  ...
)
```

**File 2: `scripts/02-create-maya-tables.sql` (CONFLICTING)**
```sql
CREATE TABLE IF NOT EXISTS maya_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- ❌ UUID (WRONG)
  chat_id UUID REFERENCES maya_chats(id),        -- ❌ UUID (WRONG)
  user_id UUID REFERENCES users(id),             -- ❌ UUID (WRONG)
  ...
)
```

#### Table: `generated_images`

**File 1: `scripts/00-create-all-tables.sql` (ACTUAL SCHEMA)**
```sql
CREATE TABLE IF NOT EXISTS generated_images (
  id SERIAL PRIMARY KEY,                    -- ✅ INTEGER
  user_id TEXT REFERENCES users(id),        -- ✅ TEXT
  image_urls TEXT[] NOT NULL,                -- ✅ TEXT array
  selected_url TEXT,                         -- ✅ TEXT
  -- NO concept_card_id column
)
```

**File 2: `scripts/04-create-photo-tables.sql` (CONFLICTING)**
```sql
CREATE TABLE IF NOT EXISTS generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- ❌ UUID (WRONG)
  user_id UUID REFERENCES users(id),             -- ❌ UUID (WRONG)
  concept_card_id UUID,                          -- ❌ Column doesn't exist
  image_url TEXT NOT NULL,                       -- ❌ Column is selected_url
  ...
)
```

#### Table: `users`

**File 1: `scripts/00-create-all-tables.sql` (ACTUAL SCHEMA)**
```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,  -- ✅ TEXT (matches Supabase auth ID)
  ...
)
```

**File 2: `scripts/01-create-users-tables.sql` (CONFLICTING)**
```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- ❌ UUID (WRONG)
  ...
)
```

---

## 2. Why This Happened

### Root Causes

1. **Multiple Schema Evolution Paths**
   - `scripts/00-create-all-tables.sql` - Original schema (SERIAL/TEXT)
   - `scripts/02-create-maya-tables.sql` - Attempted UUID migration (never applied)
   - `scripts/04-create-photo-tables.sql` - Another UUID attempt (never applied)
   - `scripts/01-create-users-tables.sql` - UUID version (never applied)

2. **Supabase Authentication Confusion**
   - Supabase auth uses UUIDs for user IDs
   - Your Neon database uses TEXT for user IDs (storing Supabase UUID as TEXT)
   - Schema files assumed UUID throughout, but actual DB uses TEXT

3. **No Single Source of Truth**
   - No documentation stating which schema file is authoritative
   - No migration tracking to show which schema was actually applied
   - Code comments don't clarify actual vs. intended schema

4. **CREATE TABLE IF NOT EXISTS**
   - Multiple schema files can coexist without errors
   - First one that runs becomes the actual schema
   - Later files with different schemas are silently ignored

---

## 3. Evidence of Actual Schema

### Code Usage Patterns (What Actually Works)

**1. Message IDs are INTEGER:**
```typescript
// app/api/maya/update-message/route.ts
const messageIdNum = typeof messageId === 'string' ? parseInt(messageId, 10) : messageId
// ✅ Uses parseInt - confirms INTEGER
```

**2. User IDs are TEXT:**
```typescript
// app/api/maya/load-chat/route.ts
const userId = String(neonUser.id)
// ✅ Casts to string - confirms TEXT
```

**3. Generated Images use INTEGER:**
```typescript
// app/api/maya/check-generation/route.ts
WHERE id = ${Number.parseInt(generationId)}
// ✅ Uses parseInt - confirms INTEGER
```

**4. No concept_card_id column:**
```typescript
// app/api/maya/generate-image/route.ts
INSERT INTO generated_images (
  user_id, prompt, image_urls, ...  // ✅ No concept_card_id
)
```

---

## 4. Similar Issues Found

### ✅ Fixed Issues

1. **`app/api/maya/load-chat/route.ts`** - Fixed UUID casting for `concept_card_id` and `user_id`

### ❌ Confirmed Issues (Need Fixes)

1. **`app/api/admin/writing-assistant/delete/route.ts`** - **CONFIRMED BUG**
   ```typescript
   WHERE id = ANY(${ids}::uuid[])
   ```
   - **Problem**: `writing_assistant_outputs.id` is `SERIAL` (INTEGER), not UUID
   - **Schema**: `scripts/50-create-prompt-guide-tables.sql` shows `id SERIAL PRIMARY KEY`
   - **Impact**: Bulk delete will fail with type casting error
   - **Fix**: Remove `::uuid[]` cast or change to `::integer[]`

2. **`app/api/email/track-click/route.ts`** - **CONFIRMED BUG**
   ```typescript
   WHERE id = ${trackingId}::uuid
   ```
   - **Problem**: `freebie_subscribers.id` is `SERIAL` (INTEGER), not UUID
   - **Schema**: `scripts/setup-freebie-table.ts` and `scripts/create-freebie-subscribers-table.sql` show `id SERIAL PRIMARY KEY`
   - **Impact**: Email click tracking will fail with type casting error
   - **Fix**: Remove `::uuid` cast or change to `::integer`

3. **`app/api/admin/dashboard/beta-users/route.ts`**
   ```typescript
   INNER JOIN subscriptions s ON u.id = s.user_id::varchar
   ```
   - **Status**: ✅ Correct (casting to varchar for TEXT comparison)
   - **Note**: Uses `::varchar` instead of `::text`, but should work

4. **`app/api/admin/email/create-beta-segment/route.ts`**
   ```typescript
   INNER JOIN subscriptions s ON u.id = s.user_id::varchar
   INNER JOIN credit_transactions ct ON u.id = ct.user_id::varchar
   ```
   - **Status**: ✅ Correct (casting to varchar for TEXT comparison)

### 🔍 Queries Without Explicit Casting (May Work, But Inconsistent)

Many queries don't cast `user_id` at all, which works if types match, but creates inconsistency:

```typescript
// app/api/maya/check-generation/route.ts
WHERE user_id = ${userId}  // No casting - works if both TEXT
```

```typescript
// app/api/maya/load-chat/route.ts (FIXED)
WHERE user_id::text = ${userId}  // Explicit casting - safer
```

---

## 5. Recommendations

### Immediate Actions

1. **Document Actual Schema**
   - Create `DATABASE_SCHEMA.md` documenting the ACTUAL schema
   - Mark `scripts/00-create-all-tables.sql` as the source of truth
   - Deprecate conflicting schema files

2. **Add Schema Validation**
   - Create a script to query `information_schema` and document actual column types
   - Compare against schema files to find discrepancies

3. **Fix Type Casting**
   - Audit all queries for UUID casts (`::uuid`)
   - Replace with appropriate types (INTEGER, TEXT, or remove if not needed)
   - Add explicit `::text` casts for `user_id` comparisons

4. **Consolidate Schema Files**
   - Remove or clearly mark conflicting schema files as "NOT APPLIED"
   - Keep only the actual schema in `scripts/00-create-all-tables.sql`

### Long-term Actions

1. **Type Safety**
   - Create TypeScript types matching actual database schema
   - Use a tool like `drizzle-orm` or `prisma` for type-safe queries

2. **Migration Tracking**
   - Implement a migration system (like `drizzle-kit` or custom)
   - Track which migrations have been applied
   - Prevent conflicting schemas

3. **Testing**
   - Add integration tests that verify schema matches code assumptions
   - Test queries with actual database types

---

## 6. Schema Summary (Actual Database)

| Table | ID Type | user_id Type | Notes |
|-------|---------|--------------|-------|
| `users` | TEXT | N/A | Stores Supabase UUID as TEXT |
| `maya_chats` | SERIAL (INTEGER) | TEXT | References users(id) |
| `maya_chat_messages` | SERIAL (INTEGER) | N/A | References maya_chats(id) |
| `generated_images` | SERIAL (INTEGER) | TEXT | No `concept_card_id` column |
| `ai_images` | SERIAL (INTEGER) | TEXT | Has `prediction_id` (TEXT) |
| `concept_cards` | SERIAL (INTEGER) | TEXT | References maya_chats(id) |

**Key Points:**
- ✅ All IDs are SERIAL (INTEGER) except `users.id` which is TEXT
- ✅ All `user_id` columns are TEXT (storing Supabase UUID as string)
- ✅ No UUID types in actual database
- ✅ `generated_images` does NOT have `concept_card_id` column

---

## 7. Files to Review

### High Priority (May Have Similar Issues)

1. `app/api/admin/writing-assistant/delete/route.ts` - UUID cast
2. `app/api/email/track-click/route.ts` - UUID cast
3. Any other files using `::uuid` casts

### Medium Priority (Inconsistent Casting)

1. All files querying `user_id` without explicit `::text` cast
2. Files using `::varchar` instead of `::text` (should standardize)

### Low Priority (Documentation)

1. All schema files in `scripts/` directory
2. Type definitions in `lib/data/` that might assume UUID

---

## 8. Conclusion

**The misunderstanding occurred because:**
1. Multiple conflicting schema files exist
2. No clear documentation of which schema is actual
3. Supabase authentication (which uses UUIDs) led to assumptions
4. `CREATE TABLE IF NOT EXISTS` allows conflicting schemas to coexist

**The fix:**
- ✅ Removed UUID casting in `enrichConceptsWithImages`
- ✅ Added explicit `::text` cast for `user_id` in `ai_images` query
- ⚠️ Need to audit other files for similar issues

**Next Steps:**
1. Audit all `::uuid` casts in codebase
2. Document actual schema
3. Consolidate schema files
4. Add type safety

