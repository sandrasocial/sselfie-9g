# PREVIEW FEED vs FULL FEED - IMPLEMENTATION PLAN

**Date:** January 2025  
**Status:** 🔍 **ANALYZING & PLANNING**

---

## CURRENT UNDERSTANDING

### ✅ What's Working Now

1. **Free Mode Preview Feed:**
   - Created via `/api/feed/create-free-example`
   - Creates ONE feed with ONE post (position 1)
   - Post generates a 9:16 image (single preview grid showing 3x4 layout)
   - Stored in `feed_layouts` with `status: 'saved'`
   - Single post in `feed_posts` with `position: 1`
   - Uses `aspect_ratio: '9:16'` for generation

2. **Paid Mode Full Feed:**
   - Created via `/api/feed/create-manual` or webhook expansion
   - Creates feed with 12 posts (positions 1-12)
   - Each post generates one 4:5 image individually
   - Stored in `feed_layouts` with `status: 'saved'`
   - Posts in `feed_posts` with positions 1-12
   - Uses `aspect_ratio: '4:5'` for generation

---

## PROBLEM IDENTIFIED

### Current Issues:

1. **No Distinction Between Feed Types:**
   - Both preview feeds and full feeds have `status: 'saved'`
   - Both appear in feed history (correct)
   - Both could appear in paid feed planner grid (WRONG - preview feeds shouldn't)
   - No way to identify which feeds are previews vs full feeds

2. **Missing UI Features:**
   - No "New Preview Feed" button for paid users
   - Only "New Feed" button exists (creates 3x4 grid)
   - Paid users can't create new preview feeds

3. **Display Logic:**
   - Preview feeds (1 post, 9:16) shouldn't show in paid feed planner grid view
   - Preview feeds should show in feed history as single 9:16 image
   - Full feeds (12 posts, 4:5) should show in paid feed planner grid view

---

## PROPOSED SOLUTION

### 1. Database Schema Changes

**Option A: Use `layout_type` field (RECOMMENDED)**
- Preview feeds: `layout_type: 'preview'` (or `'preview_9x16'`)
- Full feeds: `layout_type: 'grid_3x4'` (already exists)
- Maya chat feeds: `layout_type: 'grid_3x3'` (already exists)

**Option B: Add `is_preview` boolean field**
- Add `is_preview BOOLEAN DEFAULT FALSE` to `feed_layouts`
- Preview feeds: `is_preview: true`
- Full feeds: `is_preview: false`

**RECOMMENDATION: Option A (use `layout_type`)**
- Already exists in schema
- More descriptive
- No migration needed (just set correct value)

---

### 2. Feed Creation Logic

#### A. Preview Feed Creation (for paid users)

**New Endpoint:** `/api/feed/create-preview` (or reuse `/api/feed/create-free-example` with access check)

**Logic:**
1. Check if user is paid blueprint user
2. Create feed with:
   - `layout_type: 'preview'`
   - `status: 'saved'`
   - ONE post at position 1
   - Post uses `aspect_ratio: '9:16'`
   - Post uses `generation_mode: 'pro'`
3. Return feed ID

**Reuse Existing:**
- Can reuse `/api/feed/create-free-example` logic
- Just change `layout_type` to `'preview'`
- Allow paid users to call it

#### B. Full Feed Creation (already exists)

**Endpoint:** `/api/feed/create-manual`

**Logic:**
1. Create feed with:
   - `layout_type: 'grid_3x4'`
   - `status: 'saved'`
   - 12 posts (positions 1-12)
   - Each post uses `aspect_ratio: '4:5'`
2. Return feed ID

---

### 3. Feed Display Logic

#### A. Feed History (Feed Selector)

**Location:** `components/sselfie/sselfie-app.tsx` (lines 717-793)

**Current:** Shows all feeds with `status IN ('saved', 'completed', 'draft')`

**Change:** 
- Keep showing all feeds (preview + full)
- For preview feeds, show single 9:16 image thumbnail
- For full feeds, show grid thumbnail or first image

**Implementation:**
```typescript
// In feed selector dropdown
{feeds.map((feed) => {
  const isPreview = feed.layout_type === 'preview'
  
  return (
    <DropdownMenuItem>
      {isPreview ? (
        // Show single 9:16 image
        <Image src={feed.posts[0]?.image_url} aspectRatio="9:16" />
      ) : (
        // Show grid thumbnail or first image
        <Image src={feed.posts[0]?.image_url} aspectRatio="1:1" />
      )}
      <span>{feed.title}</span>
    </DropdownMenuItem>
  )
})}
```

#### B. Paid Feed Planner Grid View

**Location:** `components/feed-planner/feed-grid.tsx` or `instagram-feed-view.tsx`

**Current:** Shows all feeds (could include preview feeds)

**Change:**
- Filter out preview feeds (`layout_type !== 'preview'`)
- Only show full feeds (`layout_type === 'grid_3x4'`)
- Preview feeds should NOT appear in grid view

**Implementation:**
```typescript
// In feed data fetching
const feeds = await sql`
  SELECT * FROM feed_layouts
  WHERE user_id = ${user.id}
    AND status IN ('saved', 'completed', 'draft')
    AND layout_type != 'preview'  -- EXCLUDE preview feeds
  ORDER BY created_at DESC
`
```

---

### 4. UI Changes

#### A. Add "New Preview Feed" Button

**Location:** `components/feed-planner/feed-header.tsx` (line 189)

**Current:** Only "New Feed" button

**Change:**
- Add "New Preview Feed" button next to "New Feed"
- Show for ALL users (free and paid)
- Calls `/api/feed/create-free-example` (modified to allow all users and set `layout_type: 'preview'`)
- Credit check already implemented (users need credits to generate)

**Implementation:**
```typescript
<div className="flex gap-2">
  <button onClick={handleCreatePreviewFeed}>
    New Preview Feed
  </button>
  <button onClick={handleCreateNewFeed}>
    New Feed
  </button>
</div>
```

#### B. Preview Feed Display in History

**Location:** Feed selector dropdown

**Change:**
- Show preview feeds with single 9:16 image
- Show full feeds with grid thumbnail
- Both appear in history

---

### 5. API Changes

#### A. Modify `/api/feed/create-free-example`

**Current:** Only allows free users, doesn't set `layout_type`

**Change:**
- Allow ALL users (free and paid) to call it
- Set `layout_type: 'preview'` for ALL preview feeds (free and paid)
- Credit check already implemented (users need credits to generate)

#### B. Modify `/api/feed/list`

**Current:** Returns all feeds

**Change:**
- Include `layout_type` in response
- For preview feeds: Use `feed_posts[0].image_url` as preview image (no separate field needed)
- For full feeds: Use first post image or grid thumbnail

#### C. Modify Feed Fetching Logic

**Location:** `app/api/feed/[feedId]/route.ts` or feed polling

**Change:**
- Check `layout_type` to determine display mode
- Preview feeds: Show single 9:16 placeholder
- Full feeds: Show 3x4 grid

---

## IMPLEMENTATION STEPS

### Step 1: Database (No Migration Needed)
- ✅ `layout_type` field already exists
- Set `layout_type: 'preview'` for preview feeds
- Set `layout_type: 'grid_3x4'` for full feeds

### Step 2: Modify Preview Feed Creation
- Update `/api/feed/create-free-example` to:
  - Allow paid users
  - Set `layout_type: 'preview'`
  - Or create new `/api/feed/create-preview` endpoint

### Step 3: Update Feed Display Logic
- Filter preview feeds from paid feed planner grid view
- Show preview feeds in feed history
- Display preview feeds as single 9:16 image

### Step 4: Add UI Button
- Add "New Preview Feed" button in feed header
- Only show for paid users
- Call preview feed creation endpoint

### Step 5: Update Feed List API
- Include `layout_type` in response
- Include preview image URL for preview feeds

---

## CRITICAL QUESTIONS - ANSWERED ✅

1. **Should preview feeds use `layout_type: 'preview'` or a new value?**
   - ✅ **Answer:** `'preview'` (confirmed)

2. **Should free users' preview feeds also use `layout_type: 'preview'`?**
   - ✅ **Answer:** Yes, for consistency (confirmed)

3. **Should preview feeds appear in feed history?**
   - ✅ **Answer:** Yes, as single 9:16 image (confirmed)

4. **Should preview feeds be excluded from paid feed planner grid?**
   - ✅ **Answer:** Yes, only full feeds should show in grid (confirmed)

5. **Should "New Preview Feed" button be available to free users?**
   - ✅ **Answer:** Yes, but they can only generate if they have credits (already implemented)

6. **Should preview feeds be stored with `preview_image_url` in `feed_layouts`?**
   - ✅ **Answer:** No, use `feed_posts[0].image_url` instead (confirmed)

---

## RISK ASSESSMENT

### Low Risk:
- Using existing `layout_type` field (no migration)
- Preview feeds already work (just need to mark them correctly)
- Feed history already shows all feeds

### Medium Risk:
- Need to filter preview feeds from grid view
- Need to update feed list API response
- Need to add new button

### High Risk:
- None identified

---

## TESTING CHECKLIST

### Preview Feed Creation:
- [ ] Paid user clicks "New Preview Feed"
- [ ] Feed created with `layout_type: 'preview'`
- [ ] Feed has ONE post at position 1
- [ ] Post uses 9:16 aspect ratio
- [ ] Preview feed appears in feed history

### Full Feed Creation:
- [ ] Paid user clicks "New Feed"
- [ ] Feed created with `layout_type: 'grid_3x4'`
- [ ] Feed has 12 posts (positions 1-12)
- [ ] Posts use 4:5 aspect ratio
- [ ] Full feed appears in feed planner grid

### Feed Display:
- [ ] Preview feeds appear in feed history
- [ ] Preview feeds do NOT appear in paid feed planner grid
- [ ] Full feeds appear in paid feed planner grid
- [ ] Preview feeds show as single 9:16 image in history
- [ ] Full feeds show as grid in feed planner

---

## SUMMARY

**What needs to be done:**

1. ✅ Use `layout_type: 'preview'` for preview feeds
2. ✅ Filter preview feeds from paid feed planner grid view
3. ✅ Add "New Preview Feed" button for paid users
4. ✅ Update feed creation to set correct `layout_type`
5. ✅ Update feed list API to include `layout_type`
6. ✅ Display preview feeds correctly in history

**What NOT to break:**

- ✅ Free mode preview feed creation (already working)
- ✅ Paid mode full feed creation (already working)
- ✅ Feed history display (already working)
- ✅ Feed selector dropdown (already working)

---

**Status: ✅ CONFIRMED - Ready for implementation**

## CONFIRMED DECISIONS

1. ✅ All preview feeds (free and paid) use `layout_type: 'preview'`
2. ✅ Preview image stored in `feed_posts[0].image_url` (no separate `preview_image_url` field)
3. ✅ "New Preview Feed" button available to all users (credit check already implemented)
4. ✅ Preview feeds excluded from paid feed planner grid view
5. ✅ Preview feeds appear in feed history as single 9:16 image
