# SPRINT-01: Email Unblock + Maya UX Critical Fixes

**Priority:** HIGH — implement in order, commit each phase separately  
**Created:** 2026-04-25  
**Context:** Academy funnel is hardened (commit `b6fcd1b3`). This sprint unblocks the email
channel that feeds it, then fixes the Maya bugs that affect paying Studio members (€97/mo).

**Implementation order:**
1. [Phase 1 — E-01](#phase-1--e-01-fix-subscriber-count--remove-mismatch-block) ~30 min
2. [Phase 2 — UX-01](#phase-2--ux-01-maya-classic-critical-bugs) ~2–3 hr
3. [Phase 3 — UX-02](#phase-3--ux-02-maya-pro-critical-bugs) ~2 hr

Run `pnpm type-check && pnpm build` after each phase before committing.

---

## Phase 1 — E-01: Fix Subscriber Count + Remove Mismatch Block

**Why first:** The broadcast tool's Approve + Send button is currently disabled for every
send due to a broken count and a bad mismatch guard. Fixing this takes ~30 minutes and
immediately unlocks the email channel to 3 000+ subscribers.

### Files to change

| File | Change |
|------|--------|
| `lib/resend/get-audience-contacts.ts` | Fix `getAudienceContactCount`, remove broken helpers |
| `app/api/admin/marketing/brand-engine-broadcast/route.ts` | Remove mismatch logic from GET + POST |
| Broadcast admin UI component (find by searching `audienceMismatch`) | Remove warning banner + unblock button |

### 1a — Fix `getAudienceContactCount`

In `lib/resend/get-audience-contacts.ts`, the fast-count function calls
`/audiences/{id}/contacts?limit=1` and reads `payload.total`, but Resend's API does not
return a `total` field. The count has always been `1`.

**Replace** the broken `getAudienceContactCountFast` and `getAudienceContactCountStatus`
functions with a single correct implementation that reuses the existing (working)
paginated `getAudienceContacts`:

```ts
// KEEP this function unchanged — it paginates correctly:
// export async function getAudienceContacts(audienceId: string): Promise<ResendContact[]>

// REPLACE getAudienceContactCountFast + getAudienceContactCountStatus with:
export async function getAudienceContactCount(audienceId: string): Promise<number> {
  const contacts = await getAudienceContacts(audienceId)
  return contacts.length
}
```

Delete `getAudienceContactCountFast` and `getAudienceContactCountStatus` entirely.
Update any callers in the codebase that reference the removed functions to use
`getAudienceContactCount` instead.

### 1b — Remove mismatch guard from broadcast route

In `app/api/admin/marketing/brand-engine-broadcast/route.ts`, both GET and POST handlers:

- Remove the SQL query that fetches `dbSubscriberCount` from `freebie_subscribers`
- Remove `audienceMismatch` from both response bodies
- Remove `dbSubscriberCount` from both response bodies

The DB freebie count is intentionally incomplete (479 rows vs 3 000+ in Resend because
subscribers were imported from Flodesk before SSELFIE existed). Resend is the source of
truth. This comparison is meaningless and should never have blocked sends.

### 1c — Update the broadcast admin UI

Search for `audienceMismatch` in the frontend component that renders the broadcast page.

- Remove the yellow "Audience mismatch detected" warning banner entirely
- Remove any `disabled` attribute on Approve + Send tied to `audienceMismatch`
- Remove the "DB SUBSCRIBERS" stat box or relabel it "App signups" with no comparison logic
- The SUBSCRIBERS stat box should display the real Resend count from `getAudienceContactCount`

### Phase 1 success criteria

- [ ] Broadcast admin page loads without "Audience mismatch" warning
- [ ] SUBSCRIBERS stat shows ~3 000 (real Resend count), not 1
- [ ] Approve + Send button is enabled (not blocked by mismatch)
- [ ] `pnpm type-check` passes
- [ ] `pnpm build` passes

**Commit message:** `fix(email): correct subscriber count and remove false mismatch block`

---

## Phase 2 — UX-01: Maya Classic Critical Bugs

Fix the two critical bugs first (Bugs 1 and 2). Then implement the remaining fixes in
order. Do not skip to lower-priority items until the criticals are done.

### 2-CRITICAL-A — Carousel confirm modal hidden behind input bar (Bug 1)

**Symptom:** Clicking "Create Photoshoot in This Style" on a concept card opens the
`showPhotoshootConfirm` modal, but it is partially or fully hidden behind the fixed
bottom input bar. Users cannot tap "Let's Go" or "Not Now".

**File:** `components/sselfie/concept-card.tsx`

Search for `showPhotoshootConfirm`. Find the outer wrapper div of the modal and apply:

```tsx
// BEFORE:
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">

// AFTER:
<div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 pb-44 sm:pb-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
```

`z-[110]` puts the modal above the input bar (`z-[100]`). `items-end` + `pb-44` anchors
it above the input bar on mobile. `sm:items-center` + `sm:pb-4` centers it on desktop.

**Test:** Open Maya Classic → tap a concept card → tap "Create Full Photoshoot →" →
confirm modal fully visible above the input bar on a 375px viewport.

---

### 2-CRITICAL-B — Generated images clear on page refresh (Bug 2)

**Symptom:** User generates an image on a concept card → refreshes → image disappears,
even though it was saved to the database.

**Investigation steps (do these before patching):**

1. Open `app/api/maya/update-message/route.ts`
2. Confirm the Classic mode image-save path writes `generatedImageUrl` into the JSONB
   `parts` column keyed by `concept.id` (not array index). If it matches on index,
   re-ordering will silently map URLs to the wrong cards.
3. Open `components/sselfie/concept-card.tsx` and find the restore logic:
   `generatedImageUrl` initialized from `(concept as any).generatedImageUrl`.
   Confirm the `useEffect` runs after mount and that the value actually has a URL.
4. Confirm the DB query that fetches messages returns full JSONB (not truncated at
   some column width limit).

**Fix — if IDs are missing/mismatched:**

At concept-generation time, ensure each concept object has a stable `id` field before
it is saved to the DB. In `update-message`, key the JSONB save on `concept.id`:

```ts
// update-message route — pseudo-code for the fix:
const updatedParts = message.parts.map((part) => {
  if (part.type === 'concepts') {
    return {
      ...part,
      concepts: part.concepts.map((c) =>
        c.id === conceptId ? { ...c, generatedImageUrl: imageUrl } : c
      ),
    }
  }
  return part
})
```

**Test:** Generate image → `F5` → image still shows in the concept card.

---

### 2-B — Fix credits display decimal (Bug 7)

**File:** `components/sselfie/maya-chat-screen.tsx`

Search for `creditBalance.toFixed` (appears in both header and side menu):

```tsx
// BEFORE:
{creditBalance.toFixed(1)}

// AFTER:
{Math.round(creditBalance).toLocaleString()}
```

Shows `1,000,623` instead of `1000623.0`.

---

### 2-C — Fix Videos tab play icon (Bug 6)

**File:** `components/sselfie/maya/maya-videos-tab.tsx`

The ▶ play icon overlay on images in the Videos tab implies the video already exists.
Replace the play icon with a sparkle/magic icon and add an "Animate →" label:

```tsx
// Replace the play icon element with:
<div className="flex flex-col items-center gap-1">
  <span className="text-white text-2xl">✦</span>
  <span className="text-white text-xs font-medium tracking-wide">Animate →</span>
</div>
```

If the icon is an SVG component, replace it with the sparkle span above. Keep all
existing click handlers unchanged — only the visual changes.

---

### 2-D — Hide concept card ⋯ menu when empty (Bug 10)

**File:** `components/sselfie/concept-card.tsx`

Find the `showMenu` / `⋯` button. In Classic mode for non-admin users, the dropdown
contains no useful actions. Do not render the button if it would produce an empty menu:

```tsx
// Determine if the menu has any visible actions for this user/mode
const hasMenuActions = isProMode || isAdmin  // adjust to match actual conditions

// Conditionally render the ⋯ button:
{hasMenuActions && (
  <button onClick={() => setShowMenu(true)} ...>⋯</button>
)}
```

Adjust the condition to match whatever actually controls menu item visibility in the
existing code.

---

### 2-E — Quick prompts: hide after first message + scroll fade (Bugs 3b + 8)

**File:** `components/sselfie/maya-chat-screen.tsx` (quick prompts visibility)  
**File:** `components/sselfie/maya/maya-quick-prompts.tsx` (scroll fade)

**Hide after first message:**

```tsx
// In maya-chat-screen.tsx, where the quick prompts row is rendered:
{messages.length <= 1 && <MayaQuickPrompts ... />}
```

**Scroll fade on the prompts row:**

```tsx
// In maya-quick-prompts.tsx, wrap the scrollable row:
<div className="relative">
  <div className="overflow-x-auto flex gap-2 pb-1 scrollbar-none">
    {prompts.map(...)}
  </div>
  <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white to-transparent pointer-events-none" />
</div>
```

---

### 2-F — Rename photoshoot button + add supporting copy (Bug 9)

**File:** `components/sselfie/concept-card.tsx`

Find `"Create Photoshoot in This Style"` and replace:

```tsx
// BEFORE:
Create Photoshoot in This Style

// AFTER:
<span>Create Full Photoshoot →</span>
<span className="block text-[10px] font-normal opacity-60 mt-0.5">
  6–9 matching photos · ~3 min
</span>
```

Wrap in a `flex flex-col` if needed so the subtitle sits below the main label.

---

### 2-G — Lightbox: add "Add to Feed" + "Make a Video" actions (Bug 5)

**File:** `components/image-lightbox.tsx`

Find the bottom action bar (currently Heart / Download / Delete). Add two text buttons
above the existing icon row:

```tsx
<div className="flex gap-3 mb-4 justify-center">
  <button
    onClick={() => router.push('/feed-planner')}  // adjust to actual navigation
    className="px-4 py-2 text-xs font-medium bg-white text-black rounded-none border border-black"
  >
    Add to Feed →
  </button>
  <button
    onClick={handleAnimateFromLightbox}  // wire to existing animate handler
    className="px-4 py-2 text-xs font-medium bg-black text-white rounded-none"
  >
    Make a Video →
  </button>
</div>
```

For "Add to Feed": navigate to `/feed-planner` or open Feed Planner with the image
pre-selected — use whichever mechanism the rest of the app uses for cross-feature
navigation.

For "Make a Video": call the same handler as the Videos tab animate action. If no
clean handler exists yet, navigate to the Videos tab with the image URL as a param
and leave a TODO comment for the full wiring.

---

### 2-H — Dynamic input bar height (Bug 3a)

**File:** `components/sselfie/maya-chat-screen.tsx`

Replace the hardcoded `paddingBottom: '140px'` on the messages container with a CSS
variable driven by a `ResizeObserver`:

```tsx
const inputBarRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  const el = inputBarRef.current
  if (!el) return
  const obs = new ResizeObserver(([entry]) => {
    document.documentElement.style.setProperty(
      '--input-bar-height',
      `${entry.contentRect.height}px`
    )
  })
  obs.observe(el)
  return () => obs.disconnect()
}, [])

// On the messages container:
style={{ paddingBottom: 'calc(var(--input-bar-height, 140px) + env(safe-area-inset-bottom, 0px))' }}

// Add ref to the input bar wrapper div:
<div ref={inputBarRef} className="fixed bottom-0 ...">
```

---

### 2-I — Translate concept card category labels (Bug 4)

**File:** `components/sselfie/concept-card.tsx`

Add a display label map near the top of the file and use it when rendering the category
subtitle:

```tsx
const CATEGORY_LABELS: Record<string, string> = {
  'Environmental Portrait': 'Outdoor scene',
  'Half Body Lifestyle': 'Half body',
  'Close Up': 'Close-up',
  'Full Body': 'Full body',
  'Product Shot': 'Product shot',
  'Flat Lay': 'Flat lay',
  // add more as needed based on actual values in the DB
}

// When rendering:
<span>{CATEGORY_LABELS[concept.category] ?? concept.category}</span>
```

### Phase 2 success criteria

- [ ] "Create Full Photoshoot →" modal fully visible above input bar on 375px viewport
- [ ] Generate image → F5 → image still shows in concept card
- [ ] Credits shows `1,000,623` not `1000623.0`
- [ ] Videos tab shows ✦ + "Animate →" instead of ▶ play icon
- [ ] ⋯ button hidden on Classic mode non-admin cards
- [ ] Quick prompts hidden after first message sent
- [ ] Quick prompts row has right-fade gradient
- [ ] "Create Full Photoshoot →" shows subtitle copy
- [ ] Lightbox shows "Add to Feed →" and "Make a Video →" buttons
- [ ] Input bar height is dynamic (ResizeObserver), not hardcoded 140px
- [ ] Concept card category shows human label ("Outdoor scene", not "Environmental Portrait")
- [ ] `pnpm type-check` passes
- [ ] `pnpm build` passes

**Commit message:** `fix(maya): UX-01 Classic mode critical and medium bug fixes`

---

## Phase 3 — UX-02: Maya Pro Critical Bugs

### 3-CRITICAL-A — Blank screen in Pro mode (Fix 1)

**Symptom:** Switching to PRO with no messages shows a completely blank white content
area. New users think the app is broken.

**File:** `components/sselfie/maya-chat-screen.tsx`

Find where Classic mode renders its empty/welcome state. Add a parallel block for Pro:

```tsx
// When isProMode && messages.length === 0:
<div className="flex flex-col items-center justify-center flex-1 gap-4 px-6 text-center">
  <div className="w-12 h-12 flex items-center justify-center text-3xl text-[#999]">
    🖼
  </div>
  <p className="text-[16px] font-light text-[#666666] leading-relaxed max-w-xs">
    Add your reference photos to get started
  </p>
  <button
    onClick={handleOpenImageLibrary}  // same handler as the image icon in the input bar
    className="px-6 py-3 bg-[#0a0a0a] text-white text-sm font-medium"
  >
    Add Photos
  </button>
</div>
```

Use the same `handleOpenImageLibrary` (or equivalent) that the image icon in the input
bar already calls — do not create a new handler.

---

### 3-CRITICAL-B — No explanation when switching to Pro (Fix 2)

**Symptom:** Toggling CLASSIC → PRO is silent. New users have no idea what changed or
what to do.

**File:** `components/sselfie/maya-chat-screen.tsx` or `components/sselfie/maya-header.tsx`

Show a one-time dismissable tooltip banner the first time Pro is toggled:

```tsx
const [showProTooltip, setShowProTooltip] = useState(() => {
  if (typeof window === 'undefined') return false
  return !localStorage.getItem('sselfie_pro_tooltip_seen')
})

function dismissProTooltip() {
  localStorage.setItem('sselfie_pro_tooltip_seen', 'true')
  setShowProTooltip(false)
}

// Render just below the header/tab bar, only when isProMode && showProTooltip:
{isProMode && showProTooltip && (
  <div className="w-full bg-[#f5f5f5] border-b border-[#e5e5e5] px-4 py-3 flex items-start justify-between gap-3">
    <p className="text-sm font-light text-[#333] leading-snug">
      Pro Mode uses your reference photos instead of your trained model.
      Perfect for product shots, lifestyle content, and trying new looks.
    </p>
    <button
      onClick={dismissProTooltip}
      className="text-[#999] text-lg leading-none flex-shrink-0"
      aria-label="Dismiss"
    >
      ×
    </button>
  </div>
)}
```

---

### 3-B — Truncate long concept card descriptions (Fix 4)

**File:** `components/sselfie/concept-card.tsx` (or Pro-specific variant if one exists)

Pro mode descriptions are 80–120 words. Truncate to 3 lines with a See more expander:

```tsx
const [descExpanded, setDescExpanded] = useState(false)

// In the description render:
<p className={`text-sm text-[#666666] leading-relaxed ${!descExpanded ? 'line-clamp-3' : ''}`}>
  {concept.description}
</p>
{concept.description?.length > 150 && (
  <button
    onClick={() => setDescExpanded(e => !e)}
    className="text-xs text-[#0a0a0a] underline mt-1 text-left"
  >
    {descExpanded ? 'See less' : 'See more'}
  </button>
)}
```

---

### 3-C — Show credit cost before Generate (Fix 5)

**File:** `components/sselfie/concept-card.tsx`

Find the Generate button and add a cost label below it:

```tsx
<button className="w-full bg-[#0a0a0a] text-white ...">
  Generate
</button>
<p className="text-center text-xs text-[#999999] mt-1.5">
  Uses {GENERATION_CREDIT_COST} credits
</p>
```

Import or reference the credit cost constant from wherever it is defined (check
`lib/credits.ts`, `lib/constants.ts`, or similar). Do not hardcode the number.

---

### 3-D — Image icon badge in Pro mode (Fix 6)

**File:** `components/sselfie/maya/maya-unified-input.tsx` (or wherever the input bar
image icon is rendered)

In Pro mode, show a dot (0 images) or count badge (1+ images) on the image icon:

```tsx
// Assuming imageCount is available in scope (library image count for current session):
{isProMode && (
  <div className="relative">
    <ImageIcon ... />
    {imageCount === 0 ? (
      <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
    ) : (
      <span className="absolute -top-1 -right-1 bg-[#0a0a0a] text-white text-[9px]
                       w-4 h-4 rounded-full flex items-center justify-center">
        {imageCount}
      </span>
    )}
  </div>
)}
```

If `imageCount` is not already tracked in the input bar scope, thread it down from
wherever the image library state lives. Do not fetch it from the server — read it from
existing client state.

---

### 3-E — Fix image library intro copy (Fix 3 — quick option)

**File:** Find by searching `"selfies for your face and features"` in the codebase.

The intro mentions 4 categories (selfies, products, people, vibes) but only the selfie
step is implemented. Rather than building the other 3 steps now, update the intro copy
to match reality:

```
// BEFORE:
"We'll help you organize your images into categories: selfies for your face and features,
 products for brand partnerships, people for lifestyle moments, and vibes for aesthetic inspiration."

// AFTER:
"Add your selfies to power Pro mode generation. You can always add more photos later."
```

Also rename the intro CTA from `"Begin Setup"` → `"Add Photos"` in the same file.

---

### Phase 3 success criteria

- [ ] Switch to PRO with empty session → content area shows "Add your reference photos" state with "Add Photos" button, NOT blank white
- [ ] "Add Photos" button opens image library modal (same as clicking the input bar image icon)
- [ ] First-ever toggle to PRO → tooltip banner appears
- [ ] Dismissing tooltip → sets `sselfie_pro_tooltip_seen` in localStorage → never shown again
- [ ] Concept card descriptions clamp to 3 lines with "See more" expander
- [ ] Generate button shows credit cost below it
- [ ] Image icon in Pro mode shows orange dot (0 images) or count badge (1+ images)
- [ ] Image library intro copy updated — no mention of unimplemented categories
- [ ] "Begin Setup" button renamed to "Add Photos" in image library intro
- [ ] `pnpm type-check` passes
- [ ] `pnpm build` passes

**Commit message:** `fix(maya): UX-02 Pro mode blank screen, tooltip, and usability fixes`

---

## Final verification (run after all 3 phases)

```bash
pnpm type-check
pnpm build
pnpm test --run   # or vitest run if available
```

Smoke test manually:
1. Broadcast admin: shows real subscriber count, no mismatch warning, send button enabled
2. Maya Classic: concept card → photoshoot modal visible → F5 → image persists
3. Maya Classic: credits shows whole number, Videos tab shows ✦ Animate
4. Maya Pro: toggle → tooltip → dismiss → tap again → no tooltip
5. Maya Pro: empty session → "Add your reference photos" state, not blank white
6. Maya Pro: Generate button shows credit cost

## State summary for next thread

```
Context: SPRINT-01 implementation — E-01 + UX-01 + UX-02
Files touched:
  lib/resend/get-audience-contacts.ts
  app/api/admin/marketing/brand-engine-broadcast/route.ts
  [broadcast admin UI component]
  components/sselfie/concept-card.tsx
  components/sselfie/maya-chat-screen.tsx
  components/sselfie/maya/maya-quick-prompts.tsx
  components/sselfie/maya/maya-videos-tab.tsx
  components/sselfie/maya/maya-unified-input.tsx
  components/image-lightbox.tsx
  [image library modal component]
Outstanding issues after this sprint: none expected
Next steps: After merge, Sandra sends launch broadcast for Starter Kit + Masterclass
```
