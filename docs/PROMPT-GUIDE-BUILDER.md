# Prompt Guide Builder - Integration Checklist & Testing Guide

This document provides a complete checklist for setting up, testing, and deploying the Prompt Guide Builder system.

---

## 📋 Table of Contents

1. [Database Migration Steps](#database-migration-steps)
2. [Environment Variables](#environment-variables)
3. [Testing Workflow](#testing-workflow)
4. [Admin Routes Integration](#admin-routes-integration)
5. [Feature Flags (Optional)](#feature-flags-optional)
6. [Analytics Tracking](#analytics-tracking)
7. [Troubleshooting](#troubleshooting)

---

## 🗄️ Database Migration Steps

### Step 1: Run Migration Script

```bash
# Using psql
psql $DATABASE_URL < scripts/50-create-prompt-guide-tables.sql

# Or using the DATABASE_URL environment variable
psql $DATABASE_URL -f scripts/50-create-prompt-guide-tables.sql
```

### Step 2: Verify Tables Created

```sql
-- Check that all tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'prompt_guides',
  'prompt_guide_items',
  'prompt_pages',
  'writing_assistant_outputs'
);

-- Expected output: 4 rows
```

### Step 3: Verify Indexes

```sql
-- Check indexes on prompt_guides
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'prompt_guides';

-- Check indexes on prompt_pages
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'prompt_pages';

-- Expected indexes:
-- - idx_prompt_guides_status
-- - idx_prompt_guide_items_guide_id
-- - idx_prompt_guide_items_status
-- - idx_prompt_pages_slug (UNIQUE)
-- - idx_prompt_pages_guide_id
-- - idx_writing_assistant_pillar
```

### Step 4: Verify Foreign Keys

```sql
-- Check foreign key constraints
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('prompt_guides', 'prompt_guide_items', 'prompt_pages');
```

### Step 5: Test Data Insertion

```sql
-- Test creating a guide (replace with actual admin user_id)
INSERT INTO prompt_guides (title, description, category, created_by)
VALUES ('Test Guide', 'Test description', 'Luxury', 'YOUR_ADMIN_USER_ID')
RETURNING id, title, status;

-- Should return: id, title, status='draft'
```

---

## 🔐 Environment Variables

### Required Variables

No new environment variables are required. The system reuses existing configuration:

- `DATABASE_URL` - PostgreSQL connection string (already configured)
- `ADMIN_EMAIL` - Hardcoded to `"ssa@ssasocial.com"` in all admin routes

### Verification

Confirm admin email is set correctly in:
- `/app/api/admin/prompt-guides/*/route.ts` files
- `/app/api/admin/prompt-guide/publish/route.ts`
- `/app/admin/prompt-guides/page.tsx`
- `/app/admin/prompt-guide-builder/page.tsx`

All should have:
```typescript
const ADMIN_EMAIL = "ssa@ssasocial.com"
```

---

## ✅ Testing Workflow

### Phase 1: Admin Access & Navigation

- [ ] **Admin can access `/admin/prompt-guide-builder`**
  - [ ] Non-admin users are redirected to `/404`
  - [ ] Admin sees the builder interface
  - [ ] Mode toggle works (Image Prompts / Writing Assistant)

- [ ] **Admin can access `/admin/prompt-guides`**
  - [ ] List view loads correctly
  - [ ] Stats overview displays (Total Guides, Prompts, Published Pages, Email Captures)
  - [ ] Empty state shows when no guides exist

### Phase 2: Guide Creation

- [ ] **Can create new guide**
  - [ ] Click "Create New Guide" button opens modal
  - [ ] Title field is required
  - [ ] Category dropdown shows all Universal Prompt categories
  - [ ] Description is optional
  - [ ] Submit creates guide and redirects to builder with `?guideId={id}`
  - [ ] New guide appears in list with status "Draft"

### Phase 3: Prompt Generation (Builder)

- [ ] **Chat generates concept cards**
  - [ ] User can type in chat input
  - [ ] AI responds with concept suggestions
  - [ ] Concept cards display with title, description, prompt text
  - [ ] Multiple concepts can be generated in one session

- [ ] **Can trigger image generation**
  - [ ] Click "Generate Image" on concept card
  - [ ] Loading state shows during generation
  - [ ] Generated image displays in card
  - [ ] Image URL is saved to `prompt_guide_items.image_url`

### Phase 4: Approval Workflow

- [ ] **Can approve/reject images**
  - [ ] "Approve" button sets status to 'approved'
  - [ ] "Reject" button sets status to 'rejected'
  - [ ] Approved items increment `total_approved` on guide
  - [ ] Rejected items can be regenerated
  - [ ] Status badges update correctly

- [ ] **Approved items save to database**
  - [ ] `prompt_guide_items.status = 'approved'`
  - [ ] `prompt_guide_items.approved_at` is set
  - [ ] `prompt_guide_items.approved_by` is set to admin user_id
  - [ ] `prompt_guides.total_approved` increments
  - [ ] Progress indicator updates: "X/Y prompts approved"

### Phase 5: Publishing

- [ ] **Can publish guide with custom slug**
  - [ ] Guide must have at least 5 approved prompts (validation)
  - [ ] Click "Publish" button opens modal
  - [ ] Slug auto-generates from title (can be edited)
  - [ ] Slug validation: URL-safe, unique
  - [ ] Welcome message is required
  - [ ] Email list tag is optional
  - [ ] Upsell link and text are optional
  - [ ] Submit creates `prompt_pages` record
  - [ ] Guide status updates to 'published'
  - [ ] `published_at` timestamp is set
  - [ ] Public URL is displayed: `https://sselfie.ai/prompt-guides/{slug}`

### Phase 6: Public Page

- [ ] **Public page loads at `/prompt-guides/{slug}`**
  - [ ] Page is accessible without authentication
  - [ ] Guide title and welcome message display
  - [ ] Approved prompts show with images
  - [ ] Prompts are displayed in correct order (`sort_order`)
  - [ ] Page view count increments (`view_count++`)

- [ ] **Email capture modal works**
  - [ ] Modal appears on page load (or after scroll)
  - [ ] User can enter email address
  - [ ] Submit saves email to Resend list with tag
  - [ ] `email_capture_count` increments
  - [ ] Modal can be dismissed
  - [ ] Email validation works

- [ ] **Upsell CTA shows correctly**
  - [ ] Upsell link displays if configured
  - [ ] Upsell text displays as CTA button
  - [ ] Clicking opens link in new tab
  - [ ] UTM parameters are appended (for analytics)

### Phase 7: Writing Assistant

- [ ] **Writing assistant generates content**
  - [ ] Switch to "Writing Assistant" mode
  - [ ] Select content pillar (Prompts, Story, Future Self, Photoshoot)
  - [ ] Select output type (Caption, Text Overlay, Reel Voiceover, Hashtags, Hook)
  - [ ] Enter user request
  - [ ] AI generates content in Sandra's voice
  - [ ] Response includes: main content, hashtags, suggested date

- [ ] **Can copy to clipboard**
  - [ ] "Copy to Clipboard" button works
  - [ ] Content is formatted correctly (caption + hashtags)
  - [ ] Toast notification shows success
  - [ ] Content can be pasted into external apps

- [ ] **Can save outputs to database**
  - [ ] "Save to Database" button works
  - [ ] Output saves to `writing_assistant_outputs` table
  - [ ] All fields are saved: pillar, output_type, content, context
  - [ ] Success toast appears
  - [ ] Saved outputs appear in history view

### Phase 8: Guide Management

- [ ] **Can edit existing guide**
  - [ ] Click "Edit" button redirects to builder
  - [ ] Guide ID is passed via query param
  - [ ] Existing prompts load in builder
  - [ ] Can add more prompts
  - [ ] Can regenerate rejected prompts

- [ ] **Can delete guide**
  - [ ] Click "Delete" button shows confirmation
  - [ ] Confirm deletes guide and all related items
  - [ ] Cascade delete works: items and pages are removed
  - [ ] Guide disappears from list
  - [ ] Stats update correctly

- [ ] **Stats update in real-time**
  - [ ] Total guides count updates after create/delete
  - [ ] Total prompts count updates after approval
  - [ ] Published pages count updates after publish
  - [ ] Email captures count updates (if public page tested)

---

## 🔗 Admin Routes Integration

### Add Navigation Links

Update `/app/admin/page.tsx` to include links to the new pages:

```tsx
import Link from "next/link"

// Add to the admin dashboard
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Existing admin links */}
  
  <Link 
    href="/admin/prompt-guide-builder"
    className="p-6 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
  >
    <h3 className="font-semibold mb-2">Prompt Guide Builder</h3>
    <p className="text-sm text-stone-600">
      Create and manage prompt guide collections
    </p>
  </Link>

  <Link 
    href="/admin/prompt-guides"
    className="p-6 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
  >
    <h3 className="font-semibold mb-2">Manage Guides</h3>
    <p className="text-sm text-stone-600">
      View, publish, and manage all prompt guides
    </p>
  </Link>
</div>
```

### Verify Routes

- [ ] `/admin/prompt-guide-builder` - Builder interface
- [ ] `/admin/prompt-guide-builder?guideId={id}` - Edit existing guide
- [ ] `/admin/prompt-guides` - Management dashboard
- [ ] `/prompt-guides/{slug}` - Public page (no auth required)

---

## 🚩 Feature Flags (Optional)

### Current Implementation

The system is **admin-only** by default. No feature flags are required for initial launch.

### Future: Soft Launch

If you want to enable for specific users later, add to user profile:

```sql
-- Add feature flag column
ALTER TABLE users ADD COLUMN IF NOT EXISTS can_access_prompt_builder BOOLEAN DEFAULT false;

-- Grant access to specific users
UPDATE users 
SET can_access_prompt_builder = true 
WHERE email IN ('user@example.com');
```

Then update auth checks:
```typescript
// In page.tsx
if (!neonUser || (neonUser.email !== ADMIN_EMAIL && !neonUser.can_access_prompt_builder)) {
  redirect("/404")
}
```

---

## 📊 Analytics Tracking

### Built-in Metrics

The system already tracks:

1. **Guide Views** - `prompt_pages.view_count`
   - Increments on each page load
   - Query: `SELECT view_count FROM prompt_pages WHERE slug = '{slug}'`

2. **Email Captures** - `prompt_pages.email_capture_count`
   - Increments on each email submission
   - Query: `SELECT email_capture_count FROM prompt_pages WHERE slug = '{slug}'`

### UTM Tracking for Conversions

Add UTM parameters to upsell links:

```typescript
// In publish modal or public page
const upsellLinkWithUTM = `${upsellLink}?utm_source=prompt-guide&utm_medium=cta&utm_campaign=${slug}`
```

### Analytics Queries

```sql
-- Most viewed guides
SELECT 
  pp.slug,
  pp.title,
  pp.view_count,
  pp.email_capture_count,
  ROUND(pp.email_capture_count::numeric / NULLIF(pp.view_count, 0) * 100, 2) as conversion_rate
FROM prompt_pages pp
WHERE pp.status = 'published'
ORDER BY pp.view_count DESC
LIMIT 10;

-- Guide performance by category
SELECT 
  pg.category,
  COUNT(DISTINCT pg.id) as total_guides,
  COUNT(DISTINCT pp.id) as published_pages,
  SUM(pp.view_count) as total_views,
  SUM(pp.email_capture_count) as total_captures
FROM prompt_guides pg
LEFT JOIN prompt_pages pp ON pp.guide_id = pg.id
GROUP BY pg.category
ORDER BY total_views DESC;

-- Top performing guides (conversion rate)
SELECT 
  pp.slug,
  pp.title,
  pp.view_count,
  pp.email_capture_count,
  CASE 
    WHEN pp.view_count > 0 
    THEN ROUND(pp.email_capture_count::numeric / pp.view_count * 100, 2)
    ELSE 0
  END as conversion_rate_pct
FROM prompt_pages pp
WHERE pp.status = 'published' 
  AND pp.view_count > 10
ORDER BY conversion_rate_pct DESC
LIMIT 10;
```

### Google Analytics Events (Optional)

Add event tracking to public page:

```typescript
// Track page view
gtag('event', 'prompt_guide_view', {
  'guide_slug': slug,
  'guide_category': guide.category
})

// Track email capture
gtag('event', 'prompt_guide_email_capture', {
  'guide_slug': slug,
  'email_list_tag': emailListTag
})

// Track upsell click
gtag('event', 'prompt_guide_upsell_click', {
  'guide_slug': slug,
  'upsell_link': upsellLink
})
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Migration Fails

**Error**: `relation "prompt_guides" already exists`

**Solution**: 
```sql
-- Check if tables exist
SELECT tablename FROM pg_tables WHERE tablename LIKE 'prompt_%';

-- If they exist, migration already ran. Skip or use IF NOT EXISTS.
```

#### 2. Admin Access Denied

**Error**: Redirected to `/404` even as admin

**Solution**:
- Verify `ADMIN_EMAIL` matches your email exactly
- Check `users` table: `SELECT id, email FROM users WHERE email = 'ssa@ssasocial.com'`
- Verify user mapping: Check `getUserByAuthId` returns correct user

#### 3. Slug Already Exists

**Error**: "Slug already exists" when publishing

**Solution**:
- Check existing slugs: `SELECT slug FROM prompt_pages`
- Use utility: `validateSlug()` suggests alternatives
- Or manually edit slug in publish modal

#### 4. Image Generation Fails

**Error**: Images don't generate in builder

**Solution**:
- Check Replicate API key is set
- Verify user has sufficient credits
- Check browser console for API errors
- Verify `prompt_guide_items` table allows NULL `image_url` initially

#### 5. Public Page 404

**Error**: `/prompt-guides/{slug}` returns 404

**Solution**:
- Verify page exists: `SELECT * FROM prompt_pages WHERE slug = '{slug}'`
- Check Next.js route exists: `/app/prompt-guides/[slug]/page.tsx`
- Verify `status = 'published'`

### Debug Queries

```sql
-- Check guide status
SELECT id, title, status, total_prompts, total_approved 
FROM prompt_guides 
WHERE id = {guideId};

-- Check prompt items
SELECT id, guide_id, status, image_url, approved_at
FROM prompt_guide_items
WHERE guide_id = {guideId}
ORDER BY sort_order;

-- Check published pages
SELECT id, guide_id, slug, status, view_count, email_capture_count
FROM prompt_pages
WHERE guide_id = {guideId};
```

---

## 📝 Next Steps

After completing the checklist:

1. ✅ All tests pass
2. ✅ Admin routes integrated
3. ✅ Public pages accessible
4. ✅ Analytics tracking confirmed
5. ✅ Documentation updated

**Ready for production!** 🚀

---

## 📚 Related Documentation

- [Database Schema](../scripts/50-create-prompt-guide-tables.sql)
- [Writing Assistant Guide](./WRITING-ASSISTANT.md) (if exists)
- [Admin Tools Overview](./ADMIN-TOOLS.md) (if exists)
