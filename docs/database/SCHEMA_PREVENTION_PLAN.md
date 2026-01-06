# Schema Prevention Plan - Preventing UUID/SERIAL Confusion

## Goal
Prevent future developers (including AI assistants) from making incorrect assumptions about database schema types, especially UUID vs SERIAL/INTEGER and UUID vs TEXT.

---

## 1. Immediate Actions (Do Now)

### ✅ 1.1 Document Actual Schema
**File**: `DATABASE_SCHEMA.md` (create new)

**Content**:
- List all tables with actual column types
- Mark `scripts/00-create-all-tables.sql` as **SOURCE OF TRUTH**
- Document which schema files are deprecated/not-applied

**Action**: Create this file with actual schema from database

### ✅ 1.2 Mark Deprecated Schema Files
**Files to Update**:
- `scripts/02-create-maya-tables.sql` - Add header: `-- ⚠️ DEPRECATED: This schema was never applied. Actual schema uses SERIAL/TEXT. See scripts/00-create-all-tables.sql`
- `scripts/04-create-photo-tables.sql` - Same warning
- `scripts/01-create-users-tables.sql` - Same warning

**Action**: Add deprecation warnings to these files

### ✅ 1.3 Create Schema Type Reference
**File**: `lib/db/schema-types.ts` (create new)

**Purpose**: TypeScript types matching actual database schema

**Example**:
```typescript
/**
 * Database Schema Types - ACTUAL SCHEMA
 * 
 * ⚠️ IMPORTANT: These types match the ACTUAL database schema in scripts/00-create-all-tables.sql
 * Do NOT use UUID types - the database uses SERIAL (INTEGER) for IDs and TEXT for user_id
 */

export interface MayaChatMessage {
  id: number  // SERIAL (INTEGER), NOT UUID
  chat_id: number  // INTEGER, NOT UUID
  role: 'user' | 'assistant'
  content: string
  concept_cards?: any
  styling_details?: any
  created_at: string
}

export interface GeneratedImage {
  id: number  // SERIAL (INTEGER), NOT UUID
  user_id: string  // TEXT, NOT UUID
  image_urls: string[]  // TEXT[], NOT single image_url
  selected_url?: string  // TEXT
  // NO concept_card_id column exists
}

export interface AIImage {
  id: number  // SERIAL (INTEGER), NOT UUID
  user_id: string  // TEXT, NOT UUID
  prediction_id: string  // TEXT
  image_url: string
}

export interface User {
  id: string  // TEXT (stores Supabase UUID as string), NOT UUID type
  email: string
  // ...
}
```

**Action**: Create this file with all commonly used table types

---

## 2. Code Standards (Enforce Going Forward)

### 2.1 Query Type Casting Rules

**Rule 1: Never Cast to UUID Unless Verified**
```typescript
// ❌ BAD - Assumes UUID
WHERE id = ${id}::uuid

// ✅ GOOD - Use actual type
WHERE id = ${parseInt(id, 10)}  // For INTEGER
WHERE id = ${id}  // For TEXT (no cast needed)
```

**Rule 2: Always Cast user_id to TEXT**
```typescript
// ✅ GOOD - Explicit casting
WHERE user_id::text = ${userId}

// ⚠️ ACCEPTABLE - If both are TEXT, no cast needed
WHERE user_id = ${userId}
```

**Rule 3: Document Type Assumptions**
```typescript
// ✅ GOOD - Document the type
// NOTE: writing_assistant_outputs.id is SERIAL (INTEGER), not UUID
WHERE id = ANY(${ids}::integer[])
```

### 2.2 Schema File Naming Convention

**New Rule**: All schema files must include version/status in filename or header

**Format**:
- `scripts/00-create-all-tables.sql` - ✅ Source of truth
- `scripts/02-create-maya-tables-v2-uuid-NOT-APPLIED.sql` - Deprecated
- `scripts/migrations/YYYYMMDD-description.sql` - Applied migrations

**Action**: Rename deprecated files with `-NOT-APPLIED` suffix

### 2.3 Code Review Checklist

Add to PR template:
```
## Database Schema Checklist
- [ ] No `::uuid` casts without verification
- [ ] `user_id` comparisons use `::text` cast or are TEXT type
- [ ] ID comparisons match actual table schema (INTEGER vs TEXT)
- [ ] New tables documented in DATABASE_SCHEMA.md
```

---

## 3. Developer Documentation

### 3.1 README Section

**File**: `docs/DATABASE.md` (create new)

**Content**:
```markdown
# Database Schema Guide

## Important: Schema Type System

**⚠️ CRITICAL**: Our database uses:
- **SERIAL (INTEGER)** for most table IDs (NOT UUID)
- **TEXT** for user_id columns (NOT UUID)
- **TEXT** for users.id (stores Supabase UUID as string)

## Why This Matters

Supabase authentication uses UUIDs, but our Neon database stores them as TEXT.
Most table IDs are SERIAL (auto-incrementing integers), not UUIDs.

## Common Mistakes

❌ **WRONG**: `WHERE id = ${id}::uuid` (assumes UUID)
✅ **RIGHT**: `WHERE id = ${parseInt(id, 10)}` (INTEGER) or `WHERE id = ${id}` (TEXT)

❌ **WRONG**: `WHERE user_id = ${userId}` (if types don't match)
✅ **RIGHT**: `WHERE user_id::text = ${userId}` (explicit cast)

## Schema Files

- `scripts/00-create-all-tables.sql` - **SOURCE OF TRUTH** ✅
- Other schema files in `scripts/` may be deprecated - check headers

## Type Reference

See `lib/db/schema-types.ts` for TypeScript types matching actual schema.
```

### 3.2 AI Assistant Context

**File**: `.cursorrules` or similar (add section)

**Content**:
```
## Database Schema Rules

1. NEVER assume UUID types - most IDs are SERIAL (INTEGER)
2. user_id columns are TEXT (not UUID)
3. Always check scripts/00-create-all-tables.sql for actual schema
4. Never use ::uuid cast without verifying table schema first
5. When in doubt, use INTEGER or TEXT, not UUID
```

---

## 4. Automated Checks (Future)

### 4.1 Linter Rule (Future Enhancement)

**Tool**: ESLint custom rule or database query validator

**Rule**: Detect `::uuid` casts in SQL template literals

**Action**: Flag for manual review

### 4.2 TypeScript Type Checking

**Tool**: Use `drizzle-orm` or `prisma` for type-safe queries

**Benefit**: Compile-time type checking prevents schema mismatches

**Action**: Consider migration to type-safe ORM (long-term)

### 4.3 Schema Validation Script

**File**: `scripts/validate-schema.ts` (create new)

**Purpose**: Compare actual database schema with TypeScript types

**Action**: Create script that queries `information_schema` and validates types

---

## 5. Migration Strategy

### 5.1 Short-term (This Week)

1. ✅ Fix identified bugs (done)
2. ✅ Create `DATABASE_SCHEMA.md` documenting actual schema
3. ✅ Add deprecation warnings to conflicting schema files
4. ✅ Create `lib/db/schema-types.ts` with TypeScript types
5. ✅ Update `.cursorrules` with schema rules

### 5.2 Medium-term (This Month)

1. Rename deprecated schema files with `-NOT-APPLIED` suffix
2. Create `docs/DATABASE.md` guide
3. Add schema checklist to PR template
4. Create schema validation script

### 5.3 Long-term (Next Quarter)

1. Consider migration to type-safe ORM (drizzle-orm/prisma)
2. Implement automated schema validation in CI/CD
3. Create database migration system with version tracking

---

## 6. Prevention Checklist

### For New Developers/AI Assistants

- [ ] Read `DATABASE_SCHEMA.md` first
- [ ] Check `scripts/00-create-all-tables.sql` for actual schema
- [ ] Use types from `lib/db/schema-types.ts`
- [ ] Never use `::uuid` without verification
- [ ] Always cast `user_id` to `::text` when needed
- [ ] Document type assumptions in code comments

### For Code Reviews

- [ ] Verify no `::uuid` casts without justification
- [ ] Check that ID types match actual schema
- [ ] Ensure `user_id` comparisons are type-safe
- [ ] Confirm new tables are documented

### For Schema Changes

- [ ] Update `scripts/00-create-all-tables.sql` (source of truth)
- [ ] Update `lib/db/schema-types.ts` TypeScript types
- [ ] Update `DATABASE_SCHEMA.md` documentation
- [ ] Create migration script if changing existing tables
- [ ] Test queries with actual database

---

## 7. Quick Reference

### Common Table Types

| Table | ID Type | user_id Type | Notes |
|-------|---------|--------------|-------|
| `users` | TEXT | N/A | Stores Supabase UUID as string |
| `maya_chats` | SERIAL | TEXT | |
| `maya_chat_messages` | SERIAL | N/A | |
| `generated_images` | SERIAL | TEXT | No `concept_card_id` column |
| `ai_images` | SERIAL | TEXT | Has `prediction_id` (TEXT) |
| `writing_assistant_outputs` | SERIAL | TEXT | |
| `freebie_subscribers` | SERIAL | N/A | |

### Query Patterns

```typescript
// ✅ INTEGER ID
WHERE id = ${parseInt(id, 10)}

// ✅ TEXT ID (users table)
WHERE id = ${userId}

// ✅ TEXT user_id
WHERE user_id::text = ${userId}

// ✅ INTEGER array
WHERE id = ANY(${ids}::integer[])

// ❌ NEVER (unless verified)
WHERE id = ${id}::uuid
WHERE id = ANY(${ids}::uuid[])
```

---

## 8. Success Metrics

- ✅ Zero `::uuid` casts in codebase (except verified cases)
- ✅ All schema files clearly marked as applied/not-applied
- ✅ TypeScript types match actual database schema
- ✅ New developers can find schema documentation easily
- ✅ Code reviews catch schema mismatches before merge

---

## Implementation Order

1. **Now**: Fix bugs, create `DATABASE_SCHEMA.md`, add deprecation warnings
2. **This Week**: Create `lib/db/schema-types.ts`, update `.cursorrules`
3. **This Month**: Create `docs/DATABASE.md`, add PR checklist, rename deprecated files
4. **Next Quarter**: Consider type-safe ORM, automated validation

