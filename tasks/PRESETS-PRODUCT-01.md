# PRESETS-PRODUCT-01 — Launch "The SSELFIE Presets" as a standalone one-off product

**Owner:** Codex (infra/backend/logic) + Claude (design + copy) · spec by Claude 2026-06-16 · Sandra validated demand via IG Stories → many DM requests

## Ownership split (LOCKED 2026-06-16)
- **Claude owns ALL landing-page design + all copy** (landing, delivery email, DM launch). Claude delivers the premium page UI/layout + copy. It must look PREMIUM (Sandra's explicit bar) and follow `docs/SSELFIE_DESIGN_SYSTEM.md`.
- **Codex owns ALL infrastructure, backend, and logic** — Stripe prices, checkout action, webhook fulfillment, access/entitlement, data-driven collections, download delivery, email plumbing. Codex wires its data/checkout into Claude's page; it does not redesign or rewrite the copy.
- **Images:** Sandra provides before/after comparison images for every preset (showcase). Until then, Claude uses **black placeholder blocks** (correct aspect ratios, labeled) so the page is built and ready to drop the real images in later with no redesign. Codex must keep these as swappable image slots.
**Why:** Sandra's Lightroom presets currently exist ONLY bundled inside the Starter Kit ($37). She showed her presets in an IG Story and got a wave of DM requests. Demand is proven — now finish them as a standalone premium product and launch to the DM askers.

**Decisions (locked with Sandra 2026-06-16):**
- **Tiered, USD** (matches the $27 Vault / $37 Starter Kit low-ticket band):
  - **Single collection: $19** (entry — for the DM askers, fast yes).
  - **Full bundle: $39** (all preset collections, mobile + desktop, yours forever, NEW collections added over time — mirrors the Vault model). Premium creator tier; do NOT price cheap.
- Model = one purchase, growing library (full bundle entitles to all current + future collections, auto-added like Vault drops).

## ✅ DONE 2026-06-17 (Claude) — redesigned setup guide
- **In-app setup guide built: `app/presets/setup/page.tsx`** (verified rendering). Premium, brand-consistent with /presets, mobile-first: which-files → phone walkthrough (embedded Vimeo) + 5 steps + 3 screenshot slots → desktop 4 steps → for-best-results → support + back-to-access.
- **Video DONE 2026-06-17:** Sandra supplied the correct walkthrough (`Applying your presets.mp4`). It had an old-website + Google-Drive intro (cut) — re-edited via Remotion (branded title-card intro: "Applying your presets" → Step 1 save Mobile .dng → Step 2 open Lightroom) + ffmpeg trim (drop 0–30.5s) + concat. Final 2:46, 1080p, hosted on Vercel Blob (`https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/presets/applying-your-presets.mp4`) and wired into `app/presets/setup/page.tsx` as a `<video>` (verified loads 200, 1920x1080). Source MP4 on Sandra's Desktop ("Applying your presets - SSELFIE.mp4"); Remotion project at `/Users/MD760HA/preset-remotion`. CAVEAT: visual cut is clean; Sandra should watch to confirm her narration in the kept part doesn't verbally reference the old Drive/site.
- **Codex to wire:** (1) point the access page (`app/access/presets/[token]`) + delivery email (`lib/email/templates/presets-delivery.ts`) "Setup guide" link to `/presets/setup` (the new in-app guide) instead of / alongside the per-collection PDF; (2) generate a downloadable PDF from this guide content and set `SETUP_PDF_URL` in the page.
- **Access page REDESIGNED (Claude, verified):** `app/access/presets/[token]/page.tsx` rebuilt into a premium "your presets" home — full-bleed Lake Como welcome hero, "Welcome in. They're yours." + tier/email card, a "Start here · set up in 2 minutes" card (links to /presets/setup, bow-detail image), collection gallery that shows each collection's before/after (or cover) images from the DB with the 3 download links (placeholder block when images null), "for best results" tip, "tag me @sandra.social" loop, premium empty state ("on its way"), support. ALL data-fetching/analytics logic preserved (Codex's lane untouched). Uses local images in `public/images/presets/` (access-welcome.jpg, access-guide.jpg) + collection before/after from Blob. Codex: keep the data logic; don't rewrite the design/copy.
- **Sandra:** confirm the video; supply step screenshots (optional, slots ready).

## ✅ DONE 2026-06-16 (Claude)
- **Stripe products + prices created (LIVE, one-time, USD)** and env vars set in `.env.local` + Vercel **production**: `STRIPE_PRICE_PRESETS_SINGLE=price_1TjHLMEVJvME7vkwntxJY3Ys` ($19), `STRIPE_PRICE_PRESETS_BUNDLE=price_1TjHLNEVJvME7vkwpWAGv6G6` ($39). (Take effect on next prod deploy.)
- **Delivery email + DM-launch copy APPROVED by Sandra.** Delivery email (Codex: implement via `renderStoneShell`, eyebrow "THE SSELFIE PRESETS", subject "your presets are here 🤍"):
  > Hi {{first_name}}, they're yours 🤍 / Tap below and they're on your phone in two minutes: **[ Open my presets ]** / Two quick things: · Phone and desktop are both in there. The short setup guide walks you through it, step by step. · One tap on any photo and it's done. That's the whole point. / Tag me when you post. I genuinely love seeing them. And if anything won't install, just reply here, I read every message. / Sandra x
  > **Bundle variant adds:** "You've got the full collection. Every new one I add lands right here, automatically. Nothing to buy again."
- **Remaining launch dependency = ONLY Sandra uploading/publishing the real preset collection rows + files (.dng/.xmp) + before/after images.** Stripe + env + page + copy are done.

## 🚀 LAUNCH KIT (staged 2026-06-17 — ready to flip when collections are published)

**Warm launch list — tagged `presets_waitlist` in ManyChat (11 confirmed "Preset" askers, verified by last message):** Adanica Ronchetti, Katja Y, Christine Cioc, Melody Bonomo, Natasa Venetidou-Palma, Sara Lynn, Alexandra Jung, Alaska, Kelly Verlez, Jenny, Nik. (More arriving hourly — the keyword automation below catches the rest. NOTE Eveliene is NOT a preset asker — she has a member-support question about finding old photos post-cutover; left for Sandra.)

**"Preset" keyword automation (build in ManyChat UI — can't be created via API; mirror the existing SELFIE/PROMPT keyword setup):**
- Trigger: Instagram keyword match-any: `preset`, `presets`, `perser` (common typo). Apply to DMs + story replies/comments.
- Actions: (1) add tag `presets_waitlist`; (2) send the auto-reply below.
- It's an OUTBOUND automation — Sandra enables/flips it (nothing auto-sends without her).

**Auto-reply — HOLDING version (safe to run NOW, no buy link, keeps askers warm):**
> Hi {{first_name}} 🤍 You asked about my presets, thank you! They're almost ready, I'm adding the final collections now. I'll send you the link the moment they're live, this week. Hang tight 🫶

**Auto-reply — LIVE version (swap in at launch, has the link):**
> Hi {{first_name}} 🤍 Here they are. My presets, the exact filters I use on every photo. Phone and desktop, one tap. Grab one look or all of them: sselfie.ai/presets

**Launch DM to the `presets_waitlist` tag (APPROVED by Sandra — send to the backlog at launch, Sandra's go):**
> Okay, you asked, so I did it 🤍 My presets are finally their own thing. The exact filters I use on every photo, phone and desktop, one tap. Grab one look or all of them here: sselfie.ai/presets
> Thank you for pushing me to finally do this 🫶

**GO-LIVE CHECKLIST (in order):**
1. Publish real preset collections — files (.dng/.xmp) + before/after images → `preset_collections` populated (currently EMPTY; a buyer would get an empty bundle, so this gates everything).
2. Re-confirm prod Stripe env vars present (`STRIPE_PRICE_PRESETS_SINGLE/BUNDLE` — set this session; memory flagged a worktree mismatch to double-check) + redeploy so they're live.
3. ONE test purchase each (single + bundle) → confirm delivery email + access-page downloads work.
4. Swap the keyword auto-reply HOLDING → LIVE.
5. Send the approved launch DM to the `presets_waitlist` tag (Sandra approves the send).
6. Confirm the "Preset" keyword automation is on so new askers auto-serve.

## Hand-off status (2026-06-16) — READY for Codex
- **Claude (done):** landing page built (`app/presets/page.tsx`, verified) + hero/lifestyle images placed + delivery-email + DM-launch copy drafted (awaiting Sandra approval before any send).
- **Codex (start now):** everything in "Build" below — data-driven collections + Stripe wiring + checkout + fulfillment + access page + wire the page's CTAs. Don't touch the page design/copy.
- **Sandra (dependencies, can run in parallel):** (1) create the two Stripe products/prices ($19 single, $39 bundle) and give Codex the price IDs for the env vars — Claude/Codex do not modify the Stripe account. (2) Supply the preset files (.dng mobile + .xmp desktop) + the Quick Setup Guide + the per-collection before/after images. The build can be finished structurally before these land (placeholders/empty slots).

## Reuse the existing one-off pattern (don't reinvent)
Mirror the Prompt Vault / Starter Kit flow: Stripe checkout → webhook fulfillment → token access page + delivery email with download links. Files on Vercel Blob. Relevant existing refs: `lib/products.ts` (presets currently described as a Starter Kit feature — extract), `app/checkout/page.tsx`, the prompt-vault access/delivery pattern (`app/access/prompt-vault/[token]`, `lib/email/templates/prompt-vault-delivery.ts`), payment handlers in `lib/payments/handlers/*`.

## Build
1. **Product + Stripe prices:** two new prices — `STRIPE_PRICE_PRESETS_SINGLE` ($19) and `STRIPE_PRICE_PRESETS_BUNDLE` ($39) (create in Stripe; add env vars). Product names "SSELFIE Presets · [Collection]" and "SSELFIE Presets · Full Collection".
2. **Data-driven collections (critical — Sandra adds collections constantly):** preset collections must be a data/DB structure (name, slug, cover image, the mobile `.dng` + desktop `.xmp` files, setup guide), NOT hardcoded. Adding a new collection = add a row + upload files, NO code deploy. Full-bundle buyers automatically get every collection including future ones (entitlement check at access time, like Vault drops). Model this on how the Vault publishes collections (`lib/vault/published-collections.ts`).
3. **Checkout:** `/checkout/presets` (single + bundle options) reusing `landing-checkout` action. Email capture + automatic_payment_methods (card/Apple/Google Pay/Klarna) as the other checkouts.
4. **Fulfillment (webhook handler):** on `presets_single` / `presets_bundle` purchase, grant access, send the delivery email with download links + the Quick Preset Setup Guide. New handler in `lib/payments/handlers/`.
5. **Access page:** `/access/presets/[token]` — download links per collection (bundle shows all + any new ones added later), mobile + desktop, plus the setup guide. Single-pack buyers see their one collection.
6. **Landing page:** `/presets` — **BUILT by Claude 2026-06-16 at `app/presets/page.tsx`** (verified rendering, no errors). Codex's job: wire the real checkout into the two CTAs (currently `/checkout/presets?tier=single` and `?tier=bundle` placeholders) + add attribution, and keep the before/after black `Placeholder` blocks as swappable image slots (Sandra drops in before/afters + the hero later; two grid lifestyle images already placed at `public/images/presets/`). Do NOT redesign or rewrite the copy. Original design intent below: Premium editorial, the look in action via before/after comparison blocks (black placeholders until Sandra supplies images — keep them as swappable image slots), tiers ($19 single / $39 full), positioning: these edit YOUR real photos to her signature warm editorial look (distinct from the AI Vault). Design-system compliant, no gold, no gradients.
7. **Upgrade path (nice-to-have):** single-pack buyer → full bundle for the difference (mirror BRIDGE-01 one-time→upgrade).

## Money / data contract
Revenue from `stripe_payments` / Stripe only. Presets are one-time products stored like other one-offs (owners, never "members"). Tag checkout_attribution for the DM-launch campaign.

## Copy / voice (Claude provides; Sandra approves)
Landing, delivery email, and DM-launch copy are drafted by Claude in Sandra's voice (story-first, warm, contractions, no banned words incl. "elevated", no em-dashes) and approved by Sandra before anything sends. The DM launch goes to the people who asked (ManyChat) — Sandra approves, nothing auto-sends.

## Acceptance
- Single ($19) and full bundle ($39) both purchasable; full bundle grants all current + future collections automatically.
- Adding a new preset collection needs NO code deploy (data/DB + file upload only).
- Purchase delivers download links (mobile .dng + desktop .xmp) + setup guide via access page AND email.
- Presets remain available inside the Starter Kit bundle for existing buyers (don't break that).
- No hardcoded collection count anywhere (it grows) — see CONTENT-BRIEF-UPGRADE-01 same principle.

## Do NOT
- Don't price cheap (premium brand; $19 entry / $39 bundle is the floor).
- Don't auto-send the DM launch — Sandra approves.
- Don't break the Starter Kit's existing preset inclusion.
