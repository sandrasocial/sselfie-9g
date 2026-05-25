# Prompt Vault — Add New Collection SOP

*Read this every time Sandra says "I have a new collection to add."*

---

## The Rule (Never Change This)

Every new photoshoot collection follows this split:

| Where | What gets added |
|-------|----------------|
| **Freebie** (`/ai-prompts/access/[token]`) | Shot 1 only — first prompt card + first image |
| **Vault** (`/access/prompt-vault/[token]`) | Full collection — all shots + all images |
| **Vault landing page** (`/prompt-vault`) | New collection name added to the collections list |
| **Vault delivery email** | New collection name added to the "inside your vault" list |

The freebie always has a taste. The vault has everything. This is the upgrade hook.

---

## File Map

```
lib/ai-prompts/prompt-data.ts           ← ALL prompt data lives here
public/images/ai-prompts/               ← ALL images live here
app/ai-prompts/access/[token]/page.tsx  ← Freebie access page (shows FREEBIE_COLLECTION_PREVIEWS)
app/access/prompt-vault/[token]/page.tsx ← Vault access page (shows all series)
app/prompt-vault/page.tsx               ← Vault landing/sales page
lib/email/templates/prompt-vault-delivery.ts ← Delivery email
```

---

## Step-by-Step

### Step 1 — Get the assets from Sandra

Sandra will provide:
- A collection name (e.g. "Pink Cashmere Hotel Editorial")
- Images — shot-1, shot-2, shot-3 etc.
- Prompt text for each shot

Ask if not provided: **"What's the collection name and which image is shot 1?"**

---

### Step 2 — Name and place the images

Naming convention: `[collection-slug]-shot-N.jpg` (or `.png` if provided as PNG)

**Collection slug examples:**
- "Pink Cashmere Hotel Editorial" → `pink-cashmere`
- "Morning Terrace Coffee Editorial" → `morning-terrace`
- "Dark Studio Leather Editorial" → `dark-studio`

Place ALL images in:
```
/public/images/ai-prompts/[collection-slug]-shot-1.jpg
/public/images/ai-prompts/[collection-slug]-shot-2.jpg
... etc
```

---

### Step 3 — Add full collection to `prompt-data.ts`

Open `lib/ai-prompts/prompt-data.ts`.

**Ordering rule: newest collection goes at the TOP of the file** (above the previous newest).

Add a new export block like this:

```typescript
// ---------------------------------------------------------------------------
// NEWEST — [Collection Full Name] ([N] shots)
// ---------------------------------------------------------------------------

export const [COLLECTION_SLUG]_SERIES: PromptCard[] = [
  {
    number: "[next available number]",   // continues from last prompt number
    id: "[collection-slug]-shot-1",
    title: "[Collection Name] · [Shot Title]",
    whenToUse: "[Sandra's description of when to use this shot]",
    mood: "[mood tags · separated · by · dots]",
    prompt: `[full prompt text]`,
    exampleImage: "/images/ai-prompts/[collection-slug]-shot-1.jpg",
  },
  {
    number: "[N+1]",
    id: "[collection-slug]-shot-2",
    // ... rest of shots
  },
]
```

**Prompt numbers are continuous across all collections.**
Check the current highest number in the file and continue from there.

---

### Step 4 — Add shot 1 to the freebie previews

In the same `prompt-data.ts` file, find the `FREEBIE_COLLECTION_PREVIEWS` export.

Add the first card from the new series to the TOP of the array:

```typescript
export const FREEBIE_COLLECTION_PREVIEWS: PromptCard[] = [
  // ← Add new collection preview here (shot 1 only)
  {
    number: "[same number as shot 1 above]",
    id: "[collection-slug]-shot-1",
    title: "[Collection Name] · [Shot Title]",
    whenToUse: "[Sandra's description]",
    mood: "[mood tags]",
    prompt: `[full prompt text]`,
    exampleImage: "/images/ai-prompts/[collection-slug]-shot-1.jpg",
  },
  // existing previews below...
]
```

**If `FREEBIE_COLLECTION_PREVIEWS` doesn't exist yet**, create it in `prompt-data.ts` and add the import to the freebie access page (Step 6 below).

---

### Step 5 — Add the new series to the vault access page

Open `app/access/prompt-vault/[token]/page.tsx`.

**1. Add the import** at the top:

```typescript
import {
  MARBLE_CAFE_SERIES,
  DENIM_STREET_SERIES,
  COZY_LEATHER_SERIES,
  [COLLECTION_SLUG]_SERIES,   // ← add this
  type PromptCard,
} from "@/lib/ai-prompts/prompt-data"
```

**2. Add a new section** in the JSX, above the previous newest section:

```tsx
{/* [Collection Name] */}
<section className="pv-section">
  <div className="pv-section-inner">
    <p className="pv-series-eyebrow">COLLECTION 0N · [COLLECTION NAME IN CAPS]</p>
    <h2 className={`pv-series-title ${cormorant.className}`}>
      [Collection Full Name]
    </h2>
    <p className="pv-series-note">
      [One sentence description of the collection.]
    </p>
    <div className="pv-cards">
      {[COLLECTION_SLUG]_SERIES.map((card) => (
        <PromptCardEl key={card.id} card={card} />
      ))}
    </div>
  </div>
</section>
```

---

### Step 6 — Add freebie preview section to freebie access page

Open `app/ai-prompts/access/[token]/page.tsx`.

**1. Add the import** (if not already there):

```typescript
import {
  REUSABLE_STARTER,
  MAIN_LOOKS,
  BONUS_LOOKS,
  FREEBIE_COLLECTION_PREVIEWS,   // ← add this
  type PromptCard,
} from "@/lib/ai-prompts/prompt-data"
```

**2. Add a "Vault Preview" section** at the bottom of the prompt cards (before the footer), if it doesn't exist yet. If it does exist, the `FREEBIE_COLLECTION_PREVIEWS` data already feeds it — no JSX change needed.

The vault preview section should include an upgrade CTA:

```tsx
{/* Vault preview — first shot from each paid collection */}
{FREEBIE_COLLECTION_PREVIEWS.length > 0 && (
  <section className="pv-section">
    <div className="pv-section-inner">
      <p className="pv-series-eyebrow">VAULT PREVIEW</p>
      <h2 className={`pv-series-title ${cormorant.className}`}>
        A taste of what's in the Vault.
      </h2>
      <p className="pv-series-note">
        These are the opening shots from each editorial collection inside the Prompt Vault.
        Get the full collection — every shoot, every angle.
      </p>
      <div className="pv-cards">
        {FREEBIE_COLLECTION_PREVIEWS.map((card) => (
          <PromptCardEl key={card.id} card={card} />
        ))}
      </div>
      <div style={{ marginTop: "32px" }}>
        <a href="/prompt-vault" style={{ /* vault CTA button styles */ }}>
          Get the Full Vault — $27
        </a>
      </div>
    </div>
  </section>
)}
```

---

### Step 7 — Update the vault landing page

Open `app/prompt-vault/page.tsx`.

The collections display is inside the three section blocks. Add a new section for the new collection — following the same editorial layout pattern as the others. Pick the most cinematic images from the new collection for the display.

Also update the final CTA bullet list to include the new collection name:

```tsx
// Find the bullet list in the CTA section and add:
"[Collection Full Name]",
```

---

### Step 8 — Update the delivery email

Open `lib/email/templates/prompt-vault-delivery.ts`.

Find the `<ul>` list of collection names and add the new one:

```typescript
// In the bodyHtml string, find the <ul> and add:
<li>[Collection Full Name]</li>

// In the text version, find the list and add:
- [Collection Full Name]
```

---

### Step 9 — Commit and push

Stage ONLY the files you touched:

```bash
git add \
  lib/ai-prompts/prompt-data.ts \
  public/images/ai-prompts/[collection-slug]-shot-*.jpg \
  app/access/prompt-vault/\[token\]/page.tsx \
  app/ai-prompts/access/\[token\]/page.tsx \
  app/prompt-vault/page.tsx \
  lib/email/templates/prompt-vault-delivery.ts
```

Commit message format:
```
Add [Collection Name] to Prompt Vault and freebie preview

- [N] shots added to vault ([collection-slug]-series)
- Shot 1 added to freebie FREEBIE_COLLECTION_PREVIEWS
- Vault landing page updated with new collection section
- Delivery email updated to list new collection
- Prompt numbers [X]–[Y]
```

Push to main via the worktree (same as always):
```bash
git push origin HEAD:main
```

---

## What NOT to Touch

| File | Reason |
|------|--------|
| `app/api/webhooks/stripe/route.ts` | Webhook — no changes needed for new collections |
| `app/checkout/prompt-vault/page.tsx` | Checkout — product is the same |
| `lib/email/templates/prompt-vault-delivery.ts` | Only update the collection list, nothing else |
| `freebie_subscribers` DB table | No schema changes needed |
| Any Maya, Feed Planner, or Academy files | Unrelated — do not touch |

---

## Quick Checklist

- [ ] Images placed in `/public/images/ai-prompts/` with correct naming
- [ ] Full series added to `prompt-data.ts` (top of file, numbers continuous)
- [ ] Shot 1 added to `FREEBIE_COLLECTION_PREVIEWS` in `prompt-data.ts`
- [ ] New series imported + section added in vault access page
- [ ] Freebie access page imports `FREEBIE_COLLECTION_PREVIEWS` and shows vault preview section
- [ ] Vault landing page updated (new section + bullet list)
- [ ] Delivery email updated (collection name in list)
- [ ] Only the correct files staged and pushed
- [ ] Verified on sselfie.ai/access/prompt-vault/[test-token] after deploy
