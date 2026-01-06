# Database Schema Documentation

## ⚠️ IMPORTANT: Source of Truth

**This document describes the ACTUAL database schema in use.**

**Source File**: `scripts/00-create-all-tables.sql` ✅

**Deprecated Files** (DO NOT USE):
- `scripts/01-create-users-tables.sql` - UUID version (NOT APPLIED)
- `scripts/02-create-maya-tables.sql` - UUID version (NOT APPLIED)
- `scripts/04-create-photo-tables.sql` - UUID version (NOT APPLIED)

---

## Schema Type System

### Critical Rules

1. **Most table IDs are SERIAL (INTEGER)**, NOT UUID
2. **user_id columns are TEXT**, NOT UUID (stores Supabase UUID as string)
3. **users.id is TEXT**, NOT UUID (stores Supabase auth UUID as string)
4. **Never use `::uuid` cast** without verifying the actual table schema first

### Why TEXT for user_id?

- Supabase authentication uses UUIDs for user IDs
- Our Neon database stores these UUIDs as TEXT strings
- This allows us to use Supabase UUIDs directly without type conversion

---

## Core Tables

### users

**ID Type**: `TEXT` (stores Supabase UUID as string)

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,                    -- ✅ TEXT (Supabase UUID as string)
  email TEXT UNIQUE,
  display_name TEXT,
  profile_image_url TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'free',
  role TEXT DEFAULT 'user',
  monthly_generation_limit INTEGER DEFAULT 50,
  generations_used_this_month INTEGER DEFAULT 0,
  gender TEXT,
  profession TEXT,
  brand_style TEXT,
  photo_goals TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);
```

**Query Pattern**:
```typescript
// ✅ Correct
WHERE id = ${userId}  // No cast needed - both are TEXT

// ❌ Wrong
WHERE id = ${userId}::uuid  // Don't cast to UUID
```

---

### maya_chats

**ID Type**: `SERIAL` (INTEGER)  
**user_id Type**: `TEXT`

```sql
CREATE TABLE maya_chats (
  id SERIAL PRIMARY KEY,                  -- ✅ INTEGER
  user_id TEXT REFERENCES users(id),      -- ✅ TEXT
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Query Pattern**:
```typescript
// ✅ Correct
WHERE id = ${parseInt(chatId, 10)}
WHERE user_id::text = ${userId}

// ❌ Wrong
WHERE id = ${chatId}::uuid
WHERE user_id = ${userId}::uuid
```

---

### maya_chat_messages

**ID Type**: `SERIAL` (INTEGER)  
**chat_id Type**: `INTEGER`  
**Note**: Has `concept_cards` and `styling_details` JSONB columns

```sql
CREATE TABLE maya_chat_messages (
  id SERIAL PRIMARY KEY,                  -- ✅ INTEGER
  chat_id INTEGER REFERENCES maya_chats(id),  -- ✅ INTEGER
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  concept_cards JSONB,                    -- Stores concept cards array
  styling_details JSONB,                  -- Legacy: stores feed cards (use feed_cards column)
  feed_cards JSONB,                       -- Stores feed cards array
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Query Pattern**:
```typescript
// ✅ Correct
WHERE id = ${parseInt(messageId, 10)}
WHERE chat_id = ${parseInt(chatId, 10)}

// ❌ Wrong
WHERE id = ${messageId}::uuid
```

---

### generated_images

**ID Type**: `SERIAL` (INTEGER)  
**user_id Type**: `TEXT`  
**Important**: Does NOT have `concept_card_id` column

```sql
CREATE TABLE generated_images (
  id SERIAL PRIMARY KEY,                  -- ✅ INTEGER
  user_id TEXT REFERENCES users(id),      -- ✅ TEXT
  model_id INTEGER REFERENCES training_runs(id),
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  prompt TEXT NOT NULL,
  image_urls TEXT[] NOT NULL,             -- ✅ TEXT array (NOT single image_url)
  selected_url TEXT,                     -- ✅ TEXT (NOT image_url)
  saved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Query Pattern**:
```typescript
// ✅ Correct
WHERE id = ${parseInt(imageId, 10)}
WHERE user_id::text = ${userId}

// ❌ Wrong
WHERE id = ${imageId}::uuid
WHERE concept_card_id = ${conceptId}::uuid  // Column doesn't exist!
```

---

### ai_images

**ID Type**: `SERIAL` (INTEGER)  
**user_id Type**: `TEXT`  
**Has**: `prediction_id` (TEXT) for Pro Mode image tracking

```sql
CREATE TABLE ai_images (
  id SERIAL PRIMARY KEY,                  -- ✅ INTEGER
  user_id TEXT,                           -- ✅ TEXT
  image_url TEXT,
  prompt TEXT,
  generated_prompt TEXT,
  prediction_id TEXT,                     -- ✅ TEXT (for Pro Mode)
  generation_status TEXT,
  source TEXT,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Query Pattern**:
```typescript
// ✅ Correct
WHERE id = ${parseInt(imageId, 10)}
WHERE user_id::text = ${userId}
WHERE prediction_id = ${predictionId}  // Both TEXT, no cast needed

// ❌ Wrong
WHERE id = ${imageId}::uuid
WHERE user_id = ${userId}::uuid
```

---

### concept_cards

**ID Type**: `SERIAL` (INTEGER)  
**user_id Type**: `TEXT`  
**chat_id Type**: `INTEGER`

```sql
CREATE TABLE concept_cards (
  id SERIAL PRIMARY KEY,                  -- ✅ INTEGER
  user_id TEXT REFERENCES users(id),      -- ✅ TEXT
  chat_id INTEGER REFERENCES maya_chats(id),  -- ✅ INTEGER
  title TEXT NOT NULL,
  description TEXT,
  aesthetic TEXT,
  prompt TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Query Pattern**:
```typescript
// ✅ Correct
WHERE id = ${parseInt(conceptId, 10)}
WHERE user_id::text = ${userId}
WHERE chat_id = ${parseInt(chatId, 10)}
```

---

### subscriptions

**ID Type**: `SERIAL` (INTEGER)  
**user_id Type**: `TEXT`

```sql
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,                  -- ✅ INTEGER
  user_id TEXT REFERENCES users(id),     -- ✅ TEXT
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  plan_name TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Query Pattern**:
```typescript
// ✅ Correct
WHERE user_id::text = ${userId}  // Or WHERE user_id = ${userId} if both TEXT
WHERE id = ${parseInt(subscriptionId, 10)}
```

---

### training_runs

**ID Type**: `SERIAL` (INTEGER)  
**user_id Type**: `TEXT`

```sql
CREATE TABLE training_runs (
  id SERIAL PRIMARY KEY,                  -- ✅ INTEGER
  user_id TEXT REFERENCES users(id),      -- ✅ TEXT
  replicate_model_id TEXT,
  trigger_word TEXT NOT NULL,
  training_status TEXT DEFAULT 'pending',
  model_name TEXT,
  replicate_version_id TEXT,
  training_progress INTEGER DEFAULT 0,
  estimated_completion_time TIMESTAMPTZ,
  failure_reason TEXT,
  trained_model_path TEXT,
  lora_weights_url TEXT,
  training_id TEXT,
  is_luxury BOOLEAN DEFAULT false,
  model_type TEXT,
  finetune_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

---

### Other Common Tables

#### writing_assistant_outputs

**ID Type**: `SERIAL` (INTEGER)  
**user_id Type**: `TEXT`

```sql
CREATE TABLE writing_assistant_outputs (
  id SERIAL PRIMARY KEY,                  -- ✅ INTEGER
  user_id TEXT,                           -- ✅ TEXT
  content_pillar VARCHAR(100),
  output_type VARCHAR(50),
  content TEXT NOT NULL,
  context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### freebie_subscribers

**ID Type**: `SERIAL` (INTEGER)

```sql
CREATE TABLE freebie_subscribers (
  id SERIAL PRIMARY KEY,                  -- ✅ INTEGER
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  access_token VARCHAR(255) NOT NULL UNIQUE,
  -- ... other columns
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Quick Reference Table

| Table | ID Type | user_id Type | Notes |
|-------|---------|--------------|-------|
| `users` | TEXT | N/A | Stores Supabase UUID as string |
| `maya_chats` | SERIAL | TEXT | |
| `maya_chat_messages` | SERIAL | N/A | Has `concept_cards`, `feed_cards` JSONB |
| `generated_images` | SERIAL | TEXT | No `concept_card_id` column |
| `ai_images` | SERIAL | TEXT | Has `prediction_id` (TEXT) |
| `concept_cards` | SERIAL | TEXT | |
| `subscriptions` | SERIAL | TEXT | |
| `training_runs` | SERIAL | TEXT | |
| `writing_assistant_outputs` | SERIAL | TEXT | |
| `freebie_subscribers` | SERIAL | N/A | |

---

## Common Query Patterns

### INTEGER ID Queries

```typescript
// ✅ Correct
WHERE id = ${parseInt(id, 10)}
WHERE id = ANY(${ids.map(id => parseInt(id, 10))}::integer[])

// ❌ Wrong
WHERE id = ${id}::uuid
WHERE id = ANY(${ids}::uuid[])
```

### TEXT user_id Queries

```typescript
// ✅ Correct (explicit cast)
WHERE user_id::text = ${userId}

// ✅ Also correct (if both are TEXT)
WHERE user_id = ${userId}

// ❌ Wrong
WHERE user_id = ${userId}::uuid
```

### TEXT ID Queries (users table)

```typescript
// ✅ Correct
WHERE id = ${userId}  // Both TEXT, no cast needed

// ❌ Wrong
WHERE id = ${userId}::uuid
```

---

## Migration Notes

### Why Multiple Schema Files Exist

The codebase has multiple schema files because:
1. Initial schema used SERIAL/TEXT (`scripts/00-create-all-tables.sql`)
2. Attempts were made to migrate to UUID (never applied)
3. `CREATE TABLE IF NOT EXISTS` allows conflicting schemas to coexist

### Which Schema is Active?

**Only `scripts/00-create-all-tables.sql` was actually applied to the database.**

All other schema files with UUID types are **deprecated and not in use**.

---

## TypeScript Types

See `lib/db/schema-types.ts` for TypeScript interfaces matching this schema.

---

## Questions?

If you're unsure about a table's schema:
1. Check `scripts/00-create-all-tables.sql` first
2. Check this document (`DATABASE_SCHEMA.md`)
3. Check `lib/db/schema-types.ts` for TypeScript types
4. Query `information_schema.columns` if needed

**Never assume UUID types - always verify!**

