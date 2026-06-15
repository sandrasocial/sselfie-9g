# Prompt Vault — Add New Collection SOP

_Read this every time Sandra says "I have a new collection to add."_

---

## The Rule (Never Change This)

Every new photoshoot collection follows this split:

| Where                                      | What gets added                                                                           |
| ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| **Freebie** (`/ai-prompts/access/[token]`) | Curated starter shoot only: 5 evergreen preview looks + the newest published drop preview |
| **Vault** (`/access/prompt-vault/[token]`) | Full collection — all shots + all images                                                  |
| **Vault landing page** (`/prompt-vault`)   | New collection name added to the collections list                                         |
| **Vault delivery email**                   | New collection name added to the "inside your vault" list                                 |

The freebie is a starter shoot, not a growing archive. The Vault has everything. This is the upgrade hook.

**Important:** The freebie must never import or render full paid series arrays directly. It should render the curated helper output from `getCuratedStaticVaultFreebieCollections()` plus at most `FREEBIE_ROTATING_DROP_LIMIT` published drop preview from the DB. Do not show one free shot from every collection forever.

**Primary upgrade from the prompt freebie:** the full Prompt Vault / photoshoot vault.

**Starter Kit is not the main upgrade from this freebie.** It may remain as a secondary, separate next step only when the copy clearly explains that it helps the original selfie become stronger before AI. Do not position Starter Kit as the paid unlock for the Prompt Vault.

---

## File Map

```
lib/ai-prompts/prompt-data.ts           ← ALL prompt data lives here
public/images/ai-prompts/               ← ALL images live here
app/ai-prompts/access/[token]/page.tsx  ← Freebie access page (shows curated starter previews)
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

### Step 4 — Decide whether this collection belongs in the evergreen freebie starter

In the same `prompt-data.ts` file, find `FREEBIE_STATIC_STARTER_CARD_IDS`.

Most new collections should **not** be added here. They already enter the paid Vault, SUITE Library, Maya style context, and the newest-drop freebie preview through the publish pipeline.

Only add the new collection's first card id to `FREEBIE_STATIC_STARTER_CARD_IDS` if Sandra explicitly wants it to replace one of the 5 evergreen starter looks.

```typescript
const FREEBIE_STATIC_STARTER_CARD_IDS = [
  "mysterious-vogue-shot-1",
  "clean-girl-morning-shot-1",
  "noir-femme-shot-1",
  "quiet-luxury-london-shot-1",
  "dark-feminine-cafe-shot-1",
]
```

Keep the starter list capped at `FREEBIE_STATIC_STARTER_LIMIT` (currently 5). If you add one, remove one.

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

### Step 6 — Confirm the freebie access page still uses curation

Open `app/ai-prompts/access/[token]/page.tsx`.

The page should use:

```typescript
import {
  REUSABLE_STARTER,
  MAIN_LOOKS,
  BONUS_LOOKS,
  WORKFLOW_PROMPTS,
  FREEBIE_ROTATING_DROP_LIMIT,
  getCuratedStaticVaultFreebieCollections,
  type PromptCard,
} from "@/lib/ai-prompts/prompt-data"
```

and:

```typescript
const publishedCollections = await getPublishedFreebieCollectionPreviews({
  limit: FREEBIE_ROTATING_DROP_LIMIT,
})
const freebieCollections = [...publishedCollections, ...getCuratedStaticVaultFreebieCollections()]
```

Do not add full collection sections to the freebie page. Do not map `COZY_LEATHER_SERIES`, `DENIM_STREET_SERIES`, `MARBLE_CAFE_SERIES`, or any future paid series directly on `/ai-prompts/access/[token]`.

Do not keep appending every new Shot 1 to the freebie. New collections belong in the paid Vault by default. The freebie stays capped and curated.

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
Add [Collection Name] to Prompt Vault

- [N] shots added to vault ([collection-slug]-series)
- Freebie curation left capped; new collection will appear as the newest rotating drop preview when published
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

The email drop is a **batched, idempotent, manually triggered** process.
It cannot send in a single request — it is designed for ~1,500 recipients.
Follow every sub-step in order. Do not skip.

---

#### Prerequisites before running any drop

**The migration must be applied first (one-time setup):**

```bash
# Apply in Neon console or via psql — one time only
\i migrations/20260527_vault_drop_runs.sql
```

**`VAULT_EMAIL_DROP_SECRET` must be set in Vercel:**

1. Go to Vercel → Project Settings → Environment Variables
2. Add `VAULT_EMAIL_DROP_SECRET` with a strong random value (e.g. from `openssl rand -hex 32`)
3. Set for Production, Preview, Development
4. Redeploy the project

**You cannot run any drop commands until both the migration and env var exist.**

---

#### 10a — Add the new collections to the drop log

When you add a new collection, open `lib/vault/drop-log.ts` and add an entry:

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

Leave `includedInEmailDrop: false` until the drop completes successfully.

---

#### 10b — Arm the system for dry run

Open `lib/vault/drop-log.ts`. Set:

```typescript
export const VAULT_EMAIL_CONFIG = {
  automationApproved: true, // ← arm the system
  dryRun: true, // ← stay on dry run first
  dropLabel: "Two New Shoots Just Dropped",
}
```

Commit and push this change before calling any endpoints.

---

#### 10c — Run the dry run

```bash
curl -X POST https://sselfie.ai/api/vault/email-drop \
  -H "Authorization: Bearer YOUR_SECRET_HERE" \
  -H "Content-Type: application/json"
```

The response shows:

- `segments.nonBuyers.count` — how many non-buyers will receive the upsell
- `segments.buyers.count` — how many vault owners will receive the update
- `segments.nonBuyers.sampleRecipients` — first 5 email addresses
- `segments.nonBuyers.subjectPreview` — exact subject line
- `idempotencyKeys` — the email_type keys used for duplicate protection

Review the counts. A healthy response looks like ~1,500 non-buyers, ~5–10 buyers.
**Sandra must approve the counts before you proceed.**

No run is created. No emails are sent. Nothing is logged to email_logs.

---

#### 10d — Create a live run

After Sandra approves the dry-run counts, set `dryRun: false` in `lib/vault/drop-log.ts`:

```typescript
export const VAULT_EMAIL_CONFIG = {
  automationApproved: true,
  dryRun: false, // ← flip after Sandra approval
  dropLabel: "Two New Shoots Just Dropped",
}
```

Commit and push. Then call the start endpoint:

```bash
curl -X POST https://sselfie.ai/api/vault/email-drop \
  -H "Authorization: Bearer YOUR_SECRET_HERE" \
  -H "Content-Type: application/json"
```

The response returns a `runId`. **Save this.** You need it for all batch calls.

Example response:

```json
{
  "dryRun": false,
  "runId": "abc123-...",
  "segments": {
    "nonBuyers": { "totalPending": 1507 },
    "buyers": { "totalPending": 8 }
  }
}
```

---

#### 10e — Send batches (repeat until done)

Call `/process` repeatedly with the runId. Each call sends 25 emails per segment.
~1,507 non-buyers takes ~61 calls.

```bash
curl -X POST https://sselfie.ai/api/vault/email-drop/process \
  -H "Authorization: Bearer YOUR_SECRET_HERE" \
  -H "Content-Type: application/json" \
  -d '{"runId": "abc123-...", "audienceType": "all"}'
```

The response shows progress:

```json
{
  "done": { "nonBuyer": false, "buyer": true },
  "progress": {
    "nonBuyer": { "sent": 25, "total": 1507, "pct": 2 },
    "buyer": { "sent": 8, "total": 8, "pct": 100 }
  }
}
```

Keep calling until `done.all === true`.

**Idempotency is active.** If you call /process twice before the first batch finishes, the second call will skip already-sent addresses. It is safe to repeat calls.

**If some fail:** Re-run the same /process call. Only addresses without a 'sent' record are retried. Already-sent addresses are skipped automatically.

**To process segments separately:**

```bash
# Only non-buyers
curl ... -d '{"runId": "abc123-...", "audienceType": "non_buyer"}'

# Only buyers
curl ... -d '{"runId": "abc123-...", "audienceType": "buyer"}'
```

---

#### 10f — Check status at any time

```bash
curl -G "https://sselfie.ai/api/vault/email-drop/status" \
  -H "Authorization: Bearer YOUR_SECRET_HERE" \
  --data-urlencode "runId=abc123-..."
```

Or get the most recent run:

```bash
curl -G "https://sselfie.ai/api/vault/email-drop/status" \
  -H "Authorization: Bearer YOUR_SECRET_HERE" \
  --data-urlencode "latest=true"
```

Run statuses:

- `pending` — created, no batches sent yet
- `processing` — batches in progress
- `completed` — all recipients processed, 0 failures
- `partially_completed` — all processed, some failures (check `failed` counts)
- `failed` — run could not start

---

#### 10g — Test with a single address (development)

To verify emails look right before sending to the full list:

```bash
curl -X POST https://sselfie.ai/api/vault/email-drop/process \
  -H "Authorization: Bearer YOUR_SECRET_HERE" \
  -H "Content-Type: application/json" \
  -d '{"runId": "abc123-...", "audienceType": "all", "testRecipientEmail": "your@email.com"}'
```

Only the specified address is targeted. Real recipients are untouched.

---

#### 10h — Mark collections as sent (after run completes)

Only do this **after** `runStatus` is `completed` or `partially_completed` and you've reviewed the result.

1. Open `lib/vault/drop-log.ts`
2. For each collection in the drop:
   ```typescript
   includedInEmailDrop: true,
   droppedAt: "YYYY-MM-DD",   // today's date
   ```
3. Reset config flags:
   ```typescript
   automationApproved: false,
   dryRun: true,
   ```

Commit with:

```
Mark [Collection A] + [Collection B] as email-dropped (YYYY-MM-DD)
```

---

#### How idempotency works

Each drop generates a deterministic short `email_type` from the collection slugs:

```
vault_drop_1g9j3xf_nonbuyer
vault_drop_1g9j3xf_buyer
```

The full human-readable slug key still lives in `vault_drop_runs.drop_key`. The short
`email_type` is intentional because `email_logs.email_type` is limited to 50 characters.

Before sending to any address, the route checks `email_logs` for a record with this `email_type` and `status IN ('sent', 'delivered', 'suppressed')`. If found → skip.

This means:

- Calling `/process` twice is safe — second call skips already-sent addresses
- Calling `/start` twice for the same collections creates two runs, but `/process` deduplicates at the email level
- Only 'failed' records are eligible for retry (no 'sent' record blocks retries)

---

#### Drop rules (never change these)

- Never send a drop for fewer than 2 new collections
- Never skip the dry-run step — always review counts first
- Sandra must approve dry-run counts before `dryRun: false`
- `automationApproved` is always reset to `false` after a completed drop
- Never mark collections `includedInEmailDrop: true` until the run status is `completed` or `partially_completed`
- Do NOT call `/process` repeatedly in a tight loop without pausing — Resend has rate limits
- Do NOT call `/start` repeatedly — each call creates a new run record

---

#### What NOT to do

- Do not call the live `/start` endpoint more than once per collection set — it creates duplicate run records
- Do not mark collections as dropped before all sends finish
- Do not try to send all 1,500 recipients in one request — that was the old unsafe approach
- Do not change `dryRun: false` before Sandra approves the dry-run counts

---

## What NOT to Touch

| File                                                                 | Reason                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `app/api/webhooks/stripe/route.ts`                                   | Webhook — no changes needed for new collections                          |
| `app/checkout/prompt-vault/page.tsx`                                 | Checkout — product is the same                                           |
| `lib/email/templates/prompt-vault-delivery.ts`                       | Only update the collection list, nothing else                            |
| `freebie_subscribers` DB table                                       | No schema changes needed                                                 |
| Any Maya, Feed Planner, or Academy files                             | Unrelated — do not touch                                                 |
| Full paid series imports on `app/ai-prompts/access/[token]/page.tsx` | Freebie must only use curated helper output, never full paid collections |

---

## Quick Checklist

### Every new collection (Steps 1–9)

- [ ] Images placed in `/public/images/ai-prompts/` with correct naming
- [ ] Full series added to `prompt-data.ts` (top of file, numbers continuous)
- [ ] Freebie starter curation reviewed; if replacing an evergreen look, `FREEBIE_STATIC_STARTER_CARD_IDS` still has max 5 ids
- [ ] New collection entry added to `VAULT_COLLECTIONS` in `lib/vault/drop-log.ts`
- [ ] New series imported + section added in vault access page
- [ ] Freebie access page imports only curated helper output for paid collection previews
- [ ] Freebie access page does not map full paid series arrays
- [ ] Freebie has clear CTA: `Get the Full Photoshoot Vault · $27`
- [ ] Starter Kit, if present, is secondary and framed as help for stronger original selfies
- [ ] Vault landing page updated (new section + bullet list)
- [ ] Delivery email updated (collection name in list)
- [ ] Only the correct files staged and pushed
- [ ] Verified on sselfie.ai/access/prompt-vault/[test-token] after deploy

### After every 2nd new collection (Step 10 — email drop)

- [ ] Migration `20260527_vault_drop_runs.sql` applied (one-time only)
- [ ] `VAULT_EMAIL_DROP_SECRET` set in Vercel env (one-time only)
- [ ] New collection entries added to `VAULT_COLLECTIONS` in `drop-log.ts`
- [ ] `automationApproved: true` + `dryRun: true` set, committed, deployed
- [ ] Dry-run: `POST /api/vault/email-drop` — reviewed counts (~1,500 non-buyers)
- [ ] Sandra approved the dry-run counts
- [ ] `dryRun: false` set, committed, deployed
- [ ] Live run created: `POST /api/vault/email-drop` — `runId` saved
- [ ] Batches sent: `POST /api/vault/email-drop/process` repeated until `done.all === true`
- [ ] Status checked: `GET /api/vault/email-drop/status?runId=...` — `completed` or `partially_completed`
- [ ] Failed count reviewed — if > 0, retried via `/process` (idempotent)
- [ ] Collections marked `includedInEmailDrop: true` + `droppedAt` in drop log
- [ ] `automationApproved: false`, `dryRun: true` reset in drop log
- [ ] Final drop log commit pushed
