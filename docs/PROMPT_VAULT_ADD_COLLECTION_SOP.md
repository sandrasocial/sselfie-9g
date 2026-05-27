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

**Important:** The freebie must never import or render full paid series arrays directly. It should only render `FREEBIE_COLLECTION_PREVIEWS`, which contains one preview card per paid collection.

**Primary upgrade from the prompt freebie:** the full Prompt Vault / photoshoot vault.

**Starter Kit is not the main upgrade from this freebie.** It may remain as a secondary, separate next step only when the copy clearly explains that it helps the original selfie become stronger before AI. Do not position Starter Kit as the paid unlock for the Prompt Vault.

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

Add the first card from the new series to the TOP of the array by referencing the series, not by copying the whole card object.

Preferred pattern:

```typescript
export const FREEBIE_COLLECTION_PREVIEWS: PromptCard[] = [
  ...(PINK_CASHMERE_SERIES.length > 0 ? [PINK_CASHMERE_SERIES[0]] : []),
  ...(COZY_LEATHER_SERIES.length > 0 ? [COZY_LEATHER_SERIES[0]] : []),
  ...(DENIM_STREET_SERIES.length > 0 ? [DENIM_STREET_SERIES[0]] : []),
  ...(MARBLE_CAFE_SERIES.length > 0 ? [MARBLE_CAFE_SERIES[0]] : []),
]
```

Replace `PINK_CASHMERE_SERIES` with the new collection export name.

This prevents drift. If shot 1 is edited in the full collection, the freebie preview updates with it.

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
  WORKFLOW_PROMPTS,
  FREEBIE_COLLECTION_PREVIEWS,   // ← add this
  type PromptCard,
} from "@/lib/ai-prompts/prompt-data"
```

**2. Add a "Vault Preview" section** at the bottom of the prompt cards (before the footer), if it doesn't exist yet. If it does exist, the `FREEBIE_COLLECTION_PREVIEWS` data already feeds it — no JSX change needed.

The vault preview section must include a clear upgrade CTA to the full Prompt Vault / photoshoot vault:

```tsx
{/* Vault preview — first shot from each paid collection */}
{FREEBIE_COLLECTION_PREVIEWS.length > 0 && (
  <section className="ap-section ap-vault-preview">
    <div className="ap-section-inner">
      <p className="ap-eyebrow ap-eyebrow-new">VAULT PREVIEW</p>
      <h2 className={`ap-section-title ${cormorant.className}`}>
        A taste of the full photoshoot vault.
      </h2>
      <p className="ap-workflow-note">
        These are the opening shots from the paid editorial collections. The full Prompt Vault
        gives you the complete shoot series, every angle, and every copy-paste prompt.
      </p>
      <div className="ap-cards">
        {FREEBIE_COLLECTION_PREVIEWS.map((card) => (
          <PromptCardEl key={card.id} card={card} />
        ))}
      </div>
      <div className="ap-vault-cta-row">
        <TrackedLink
          href="/prompt-vault?utm_source=ai_prompts&utm_medium=prompt_pack&utm_campaign=ai_prompts_to_prompt_vault"
          className="ap-bridge-cta ap-bridge-cta-primary"
          trackEvent="ai_prompts_prompt_vault_click"
          trackProperties={{
            source: "ai-prompts",
            destination: "prompt-vault",
            utm_campaign: "ai_prompts_to_prompt_vault",
          }}
        >
          Get the Full Photoshoot Vault · $27
        </TrackedLink>
      </div>
    </div>
  </section>
)}
```

Do not add full collection sections to the freebie page. Do not map `COZY_LEATHER_SERIES`, `DENIM_STREET_SERIES`, `MARBLE_CAFE_SERIES`, or any future paid series directly on `/ai-prompts/access/[token]`.

Starter Kit may appear only as a secondary "need better original selfies first?" link after the freebie content. It should not be styled or worded as the main upgrade from the prompt freebie.

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

### Step 10 — Email drop (after every 2nd new collection)

The email drop is triggered manually, not automatically. Run it only when you have added exactly 2 new collections since the last drop.

#### 10a — Update the drop log

Open `lib/vault/drop-log.ts`.

For each new collection you just added, confirm it has `includedInEmailDrop: false`.

Then set the two config flags to arm the system:

```typescript
export const VAULT_EMAIL_CONFIG = {
  automationApproved: true,   // ← set to true
  dryRun: true,               // ← leave true for dry-run first
  dropLabel: "Two New Shoots Just Dropped",
}
```

Commit this change alongside the collection files (or as a separate commit).

#### 10b — Dry-run test

Call the API route from your terminal or Insomnia with your `VAULT_EMAIL_DROP_SECRET`:

```bash
curl -X POST https://sselfie.ai/api/vault/email-drop \
  -H "Authorization: Bearer YOUR_SECRET_HERE"
```

The response shows:
- How many non-buyers will receive the upsell email
- How many buyers will receive the update email
- Sample recipients (first 5 of each)
- Subject line previews

Review the numbers. If everything looks right, move to 10c.

#### 10c — Live send

In `lib/vault/drop-log.ts`, change `dryRun` to `false`:

```typescript
export const VAULT_EMAIL_CONFIG = {
  automationApproved: true,
  dryRun: false,   // ← flip to false
  dropLabel: "Two New Shoots Just Dropped",
}
```

Call the route again:

```bash
curl -X POST https://sselfie.ai/api/vault/email-drop \
  -H "Authorization: Bearer YOUR_SECRET_HERE"
```

The route sends both emails and returns a results summary:
```json
{
  "nonBuyers": { "sent": 42, "failed": 0 },
  "buyers":    { "sent": 8,  "failed": 0, "skipped": 0 }
}
```

#### 10d — Mark collections as sent

After a successful live send, update `lib/vault/drop-log.ts`:

1. For each collection that was included in this drop, set:
   ```typescript
   includedInEmailDrop: true,
   droppedAt: "YYYY-MM-DD",   // today's date
   ```

2. Reset the config flags to safe defaults:
   ```typescript
   automationApproved: false,
   dryRun: true,
   ```

Commit with:
```
Mark [Collection A] + [Collection B] as email-dropped (YYYY-MM-DD)
```

#### 10e — Add the new collection entry to the drop log for future drops

When you add the NEXT new collection in a future sprint, also add it to `VAULT_COLLECTIONS` in `lib/vault/drop-log.ts`:

```typescript
{
  id: "[collection-slug]",
  name: "[Collection Full Name]",
  heroImage: "/images/ai-prompts/[collection-slug]-shot-1.jpg",
  moodLine: "[One short mood line for the email]",
  includedInEmailDrop: false,
  droppedAt: null,
},
```

#### Drop rules (never change these)

- Never send a drop for fewer than 2 new collections
- Never send without a dry-run review first
- Sandra must approve the dry-run recipient counts before the live send
- `automationApproved` must be set back to `false` after every send — it is never left armed
- Do NOT change `dryRun: false` without Sandra's explicit approval

---

## What NOT to Touch

| File | Reason |
|------|--------|
| `app/api/webhooks/stripe/route.ts` | Webhook — no changes needed for new collections |
| `app/checkout/prompt-vault/page.tsx` | Checkout — product is the same |
| `lib/email/templates/prompt-vault-delivery.ts` | Only update the collection list, nothing else |
| `freebie_subscribers` DB table | No schema changes needed |
| Any Maya, Feed Planner, or Academy files | Unrelated — do not touch |
| Full paid series imports on `app/ai-prompts/access/[token]/page.tsx` | Freebie must only use `FREEBIE_COLLECTION_PREVIEWS`, never full paid collections |

---

## Quick Checklist

### Every new collection (Steps 1–9)
- [ ] Images placed in `/public/images/ai-prompts/` with correct naming
- [ ] Full series added to `prompt-data.ts` (top of file, numbers continuous)
- [ ] Shot 1 referenced in `FREEBIE_COLLECTION_PREVIEWS` using `[NEW_SERIES][0]`
- [ ] New collection entry added to `VAULT_COLLECTIONS` in `lib/vault/drop-log.ts`
- [ ] New series imported + section added in vault access page
- [ ] Freebie access page imports only `FREEBIE_COLLECTION_PREVIEWS` for paid collection previews
- [ ] Freebie access page does not map full paid series arrays
- [ ] Freebie has clear CTA: `Get the Full Photoshoot Vault · $27`
- [ ] Starter Kit, if present, is secondary and framed as help for stronger original selfies
- [ ] Vault landing page updated (new section + bullet list)
- [ ] Delivery email updated (collection name in list)
- [ ] Only the correct files staged and pushed
- [ ] Verified on sselfie.ai/access/prompt-vault/[test-token] after deploy

### After every 2nd new collection (Step 10 — email drop)
- [ ] `VAULT_EMAIL_CONFIG.automationApproved` set to `true`
- [ ] `VAULT_EMAIL_CONFIG.dryRun` left as `true` for dry run
- [ ] Dry-run POST to `/api/vault/email-drop` reviewed — recipient counts look right
- [ ] Sandra approved the dry-run counts before live send
- [ ] `dryRun` flipped to `false`, live send triggered
- [ ] Results JSON reviewed — 0 failures
- [ ] Sent collections marked `includedInEmailDrop: true` + `droppedAt` in drop log
- [ ] `automationApproved` reset to `false`, `dryRun` reset to `true`
- [ ] Drop log changes committed
