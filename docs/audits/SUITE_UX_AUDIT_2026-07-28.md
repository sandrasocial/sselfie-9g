# SSELFIE SUITE — Customer-Experience Audit (2026-07-28)

Blind live-product test first (no code read), then code-level root-cause tracing.
Tested on production `sselfie.ai`, mobile viewport 375×812, signed in as `ssa@ssasocial.com` (Admin, Unlimited credits).
Spend: 8 generations (1 photo + 7 carousel slides). Nothing published, nothing deleted; the one caption mutation was undone and verified restored.

**Not testable this session** (needs a live QA-account session — agent cannot type passwords or create accounts): checkout, fresh-account onboarding, first selfie upload, empty-state Maya, trial UX. Desktop at 1280px could not be reliably rendered by the test browser (tool artifact); the ~800px layout looked correct.

---

## 1. Executive verdict

**The creative core is genuinely excellent; the connective tissue between surfaces is where it stops feeling like a partner.** When Maya works, she works like nothing a member could get from ChatGPT: one strong personalized recommendation ("your Brand Glow-Up Secrets pillar", "the Dark & Moody world your calendar's already living in", "pulling this from Shadow Study"), one tap, visible credit cost, a 7-slide carousel where every slide is a distinct, on-brand, teachable frame. The memory surface (learned prefs with FORGET, photo-correction notes) is best-in-class transparency.

But today the Suite behaves like **four good rooms with broken doors**: the home recommendation loses its format on the way into Maya; the "recommended next step" buttons after a carousel are literally dead; "Use in Calendar" throws away the image you chose; and a finished carousel ends without a caption or a calendar action — the two things that make it *publishable*. A member following only the buttons Maya offers her will hit a silent dead end within two recommendations. That's why it can still feel like "a collection of connected tools": the tools are connected by navigation, not by the work itself.

The fix profile is unusually favorable: the three worst breaks are wiring bugs (one-line-class), not design problems, and the design fixes are mostly *removals* (confirmation stacks, jargon, duplicate copy).

---

## 2. Journey maps

### Returning member (as tested)
Goal: "make today's content" starting from Maya's pick.

| Step | What happened | Taps | Wait |
|---|---|---|---|
| Open app | (Deployed build) last Maya drawer can auto-open over home | +1 to close | — |
| Home pick "MAYA RECOMMENDS · CAROUSEL" → CREATE THIS WITH MAYA | Generic drawer, **PHOTO mode**, carousel intent dropped | 1 | — |
| SHOW ME PHOTO IDEAS | Personalized reply, then **error**: "That didn't come through." | 1 | ~10s |
| SHOW ME NEW IDEAS (retry) | Fake user bubble "Let's create photos."; 1 photo concept | 1 | ~8s |
| CREATE MY PHOTO · 1 CREDIT | Inline progress → photo, saved-state, next-step card | 1 | ~40s |
| CAROUSEL chip | **Silent** (state toggle + auto-attached inspiration); SEND disabled | 2 | — |
| Type request + SEND | Bubble replaced by canned "Let's make a carousel."; proposal card | 2 | ~15s |
| CREATE THIS · 7 CREDITS | Spinner only — no slide count, no cancel | 1 | ~3.5min |
| Result: 7 excellent slides | **No caption, no calendar action**; "Turn this into Stories" **dead**; MORE+ **empty** | — | — |

Time to first useful asset ≈ 2.5 min (including one error). To finished carousel ≈ 9 min. Dead ends hit in one sitting: 4 (format chips alone, Stories CTA, Use in Calendar, MORE+). Recovery that worked: error retry card, caption UNDO, NEW CHAT reset.

### First-time member (partial — pre-purchase only)
- Landing hero clear; eyebrow text flashes/overlaps H1 during intro animation; header LOGIN needed two taps; typed `/login` = raw unbranded 404.
- `/join/studio`: price present ("SSELFIE SUITE · €97/MO", low contrast over photo), promise clear, two CTAs.
- Everything after "Join" untested this session (see top).

---

## 3. The ten most important problems

| # | Sev | Problem |
|---|---|---|
| 1 | **P0** | Every "graphic-format" CTA in Maya is dead: "TURN THIS INTO STORIES", CAROUSEL / STORIES / REEL-COVER chips do nothing visible |
| 2 | **P1** | Home recommendation's format is dropped — a recommended CAROUSEL becomes a PHOTO session |
| 3 | **P1** | "USE IN CALENDAR" discards the chosen image and just navigates to the planner |
| 4 | **P1** | A finished carousel is not publishable: no caption, no add-to-calendar, dead next-step |
| 5 | **P1** | First-try concept failure with mislabeled retry ("SHOW ME NEW IDEAS" retries the *format*, not the idea) |
| 6 | **P2** | Free, undoable caption improve = 4 identical confirmations, and the caption itself is never shown (before or after) |
| 7 | **P2** | Stale session context: floating bubble resumes old scoped session; session format is sticky ("a photo" → 6-credit carousel quote); deployed build auto-opens last drawer on load |
| 8 | **P2** | System puts words in the member's mouth: canned "YOU" bubbles ("Let's create photos.") replace or precede her actual words |
| 9 | **P2** | Gallery is flat storage: a carousel is 7 unrelated cards, viewer counter "1/24" is the page size, MAKE VIDEO has no cost, trash sits beside download |
| 10 | **P3** | Trust-erosion cluster: stale US-format feed date; inapplicable helper copy; "Add a short bio" + empty YOUR BRAND while Maya demonstrably knows the brand; "SELFIE ENGINE" jargon; `/login` 404; Learn recommends day-one content to a 450-image member (with a paragraph duplicated on screen); home pick never marks itself done |

### Details

**1. Dead graphic CTAs — P0**
- Evidence: tapped "TURN THIS INTO STORIES" twice, waited 25s: only the "Inspiration attached" thumbnail swapped. CAROUSEL chip: selected state + silent inspiration attach; second tap deselected; SEND disabled.
- Why confusing: the button is the *product's own recommendation*. Silence reads as "the app is broken" — no error, no explanation.
- Consequence: the flagship loop (photo → carousel → stories) halts; members conclude Maya can't do it; support load; wasted sessions.
- Root cause: `components/app-v3/maya-concierge.tsx:3752` — `if (!needsGraphicTextChoice) sendMessage(...)`. For graphic formats (`isGraphicOutputFormat` :165-172: reel-cover, story-slide, story-sequence, carousel) no message is sent; only state mutates (`setInspirationUrl` :3739 — the thumbnail swap; `setOutputFormat` :3746). The text-overlay gate that should take over never opens because `setSetupOpen(false)` (:3747) collapses setup and auto-pull is blocked for graphic formats (:1708-1711). Chips wired via `maya-inline-components.tsx:438-442, 524-549`.
- Change: on tap, graphic CTAs must immediately either send the format request or open the text-overlay choice sheet. Never a silent state change.
- Remove/keep: keep the single-recommendation card pattern; remove the silent-toggle behavior.
- Acceptance: tapping any next-step CTA or format chip produces a visible response (message, sheet, or progress) within 1s; a member can go carousel → stories with taps only, no typing.

**2. Home recommendation format drop — P1**
- Evidence: card said "MAYA RECOMMENDS · CAROUSEL"; drawer opened "PHOTO · SELFIE ENGINE"; primary CTA "SHOW ME PHOTO IDEAS"; outcome was a 1-credit photo; next rec was a Reel cover — the carousel never happened via the recommended path.
- Why confusing: she tapped a specific promise; the product delivered a different format without saying so.
- Consequence: recommendation trust collapses; duplicate credit spend to get the promised thing.
- Root cause: card passes `format` correctly (`visual-front-door.tsx:334-344, 581-594`; `concierge-context.tsx:98, 181-197`) but the session resolved to the photo default (`maya-concierge.tsx:2101` `outputFormat ?? "photo"`). Because the seed auto-sent (only possible for non-graphic), `session.outputFormat` was not "carousel" at pull time → suspect the `/api/app-v3/maya/recommendations` payload's `format` field (or fallback rec) — needs one runtime check.
- Change: format from the pick card must be authoritative in the session; drawer header + primary CTA must name the idea and format ("Start this carousel").
- Acceptance: for a carousel pick, the first primary CTA in the drawer says carousel and the first proposal is a "Create this · N credits" carousel.

**3. "USE IN CALENDAR" discards the image — P1**
- Evidence: from gallery viewer, tapping it landed on planner top; no apply-mode, no banner; image forgotten.
- Root cause: `components/app-v3/app-v3-shell.tsx:347` — `onUseInCalendar={() => goToSection("calendar")}` drops the `asset` argument that `gallery-view.tsx:750-758` passes. The correct flow already exists, unwired: `openForCalendarPost` (`concierge-context.tsx:244`) + `apply_to_post` preview→confirm (`maya-concierge.tsx:5004-5016`, `maya-action-card.tsx:23`, `feed-gallery-selector.tsx:155-165`).
- Change: wire the button into the existing apply flow with a post picker; keep preview→confirm (genuine mutation — correct place for it).
- Acceptance: Gallery → Use in Calendar → pick post → preview replacement → confirm → post shows new photo; cancel leaves post untouched; image context never lost en route.

**4. Finished carousel isn't publishable — P1**
- Evidence: post-carousel actions were Favorite / Create another · 7 credits / View slides / Download all 7 / (dead) Stories. No caption anywhere in the flow; no calendar/schedule action. Meanwhile Calendar posts have excellent captions — the two systems never touch.
- Why confusing: the member's finish line is a *post*, not seven images. She must invent the caption and posting plan herself — the exact "homework" Maya exists to remove.
- Change: every completed carousel/photo ends with (a) a caption in her voice (the Calendar caption system already exists), (b) one tap "Add to my feed plan" (creates/fills a planner post), (c) then the next-format suggestion.
- Acceptance: after any creation, "caption + add to plan" appear without asking; adding to plan is undoable; the Calendar post shows the asset and caption.

**5. First-try concept failure + mislabeled retry — P1 (reliability)**
- Evidence: first "SHOW ME PHOTO IDEAS" → "That didn't come through. One tap and Maya tries again." Retry worked but posted canned "Let's create photos."
- Root cause: `conceptsLost` (`maya-concierge.tsx:4976-4980`) — the model's `emit_concepts` payload had zero schema-valid concepts (truncated stream or zod-invalid; `app/api/app-v3/maya/chat/route.ts:1083-1208, 1244-1284`) after both repair layers failed. Retry re-sends `FORMAT_PHRASE[format]` (:5230) — the format, not the failed brief.
- Change: retry must resend the same brief; label it "TRY AGAIN". Track `conceptsLost` rate as a metric; the repair pipeline failing means prompt/token budget tuning, not UI copy.
- Acceptance: retry regenerates the same idea; conceptsLost < 1% of concept pulls in telemetry.

**6. Caption improve: 4 confirmations, invisible result — P2**
- Evidence: Improve with Maya → card+PREVIEW → same card+CONTINUE → same card+"No credits"+CONFIRM AND IMPROVE → "Done"+UNDO. The caption text was never displayed at any step; to see it she must navigate back to the post. ("Preview" previews nothing.)
- Why confusing: three identical screens imply danger for a free, undoable action; "No credits" reads as an error; "Done" with no visible change reads as nothing happened.
- Change: one tap → show the *new caption* with Keep / Undo. Reserve preview→confirm for paid or destructive actions only (that's the Phase-5 rule — apply it in both directions).
- Acceptance: free undoable actions execute in ≤2 taps and always display their result inline.

**7. Stale session context & sticky format — P2**
- Evidence: floating bubble from Calendar reopened the old "Post 1 · My Feed - 7/27/2026" session; typing "a bright, airy **photo**…" produced a **carousel** proposal at 6 credits (format stuck from the previous task; color/mood adapted fine, Vault-aware). Fresh /app load auto-opened a stale "Learn with Maya" drawer.
- Root causes: session format persists and plain-language format words don't override it (`FORMAT_PHRASE`/auto-pull machinery); drawer auto-open = persisted `isOpen` restored on mount — current HEAD forces closed (`concierge-context.tsx:697, :718`, fix commit `e2a3445f`), so **the deployed build appears to predate the fix — verify deployment**.
- Change: deploy the fix; make explicit format nouns in the member's message override session format; bubble on a new surface offers "continue last: …" instead of silently resuming scope.
- Acceptance: cold /app load always lands on home; saying "a photo" never yields a multi-asset quote; switching surfaces never silently inherits an old scope.

**8. Canned "YOU" bubbles — P2**
- Evidence: "Let's create photos." and "Let's make a carousel." rendered as the member's own messages; her typed sentence was not the visible turn.
- Root cause: `FORMAT_PHRASE` map (`maya-concierge.tsx:393-401`) injected by retry (:5230) and post-format-commit auto-pull (:1718-1726); intentional per comments (:3514-3517).
- Why it matters: for an audience afraid of "using AI wrong / looking fake", the product literally fabricating her words is a trust violation — it also erases her actual instruction.
- Change: system-initiated turns should render as Maya action chips ("Maya is starting your carousel") — never in the YOU bubble; typed text must always be the visible turn.
- Acceptance: nothing ever appears as the member's message except text she typed.

**9. Gallery = flat storage — P2**
- Evidence: 7 slides as 7 identical-titled cards in a 450-item grid; viewer counter "1/24" and "DOWNLOAD ALL 24" (= `GALLERY_PAGE_SIZE`, `gallery-view.tsx:29`, list fed at :397-401); no carousel/set concept in the schema (`lib/app-v3/gallery-assets.ts:12-32` — only `variantOf`); MAKE VIDEO on every card with no credit cost; trash icon beside download.
- Change: group by creation (one "carousel · 7 slides" object; download-all = the set); show cost on MAKE VIDEO; move delete behind the viewer with confirm. Longer-term: organize by post/project so the library reads as accumulated brand assets.
- Acceptance: a carousel opens as its own 7-item set; "Download all" count equals the set; no paid CTA without a cost.

**10. Trust-erosion cluster — P3**
- Stale title "My Feed - 7/27/2026": stamped once at creation with server-locale `toLocaleDateString()` (`app/api/feed/create-manual/route.ts:43`, rendered `feed-header.tsx:507-533`).
- "Tap any post to create just that one." hard-rendered regardless of state (`calendar-bulk-create.tsx:242-244`).
- "Add a short bio…" + Memory "YOUR BRAND" empty while Maya knows the brand: bio lives only in `instagram_bios` (`app/api/feed/[feedId]/route.ts:89,181`) with no fallback to `user_personal_brand`; the Memory textarea binds only `maya_memory.brand_notes` (`memory-modal.tsx:288-293`, `memory-store.ts:57-78`) while Maya's real context reads `user_personal_brand` + feed-style stores — the page contradicts observable behavior.
- "PHOTO · SELFIE ENGINE · SELFIE IN…" header jargon; "REMOVE" floating on the post image; "Post" pill reads like a publish button; `/login` has no redirect (`next.config.mjs:8-37`); hero eyebrow flash = `.mf` reveal + IntroScreen timing (`public-marketing.tsx:323-342, 353-416, 554`); Learn drawer recommends "first concrete step" starter content to an established member and duplicates the same paragraph twice on one screen; home pick card never updates after the recommended item is created.
- Change: small copy/logic fixes each; collectively they decide whether the product feels like it *knows her*.

---

## 4. Hypothesis verdicts

| Hypothesis | Verdict |
|---|---|
| Too many steps/confirmations before creation | **Partly** — creation itself is 1 tap (great); confirmations pile up on *free* actions (caption: 4 taps) and after-creation next steps |
| "My look and photo" controls unclear | **Confirmed-adjacent** — "CHOOSE YOUR STYLE" shows unlabeled look thumbnails mixed into a caption task; selfie card itself is clear |
| Calendar posts open wrong action | **Not reproduced** — READY posts open proper details (good) |
| Selecting images/posts inconsistent | **Confirmed** — Use in Calendar drops selection; chips are silent toggles |
| Maya more generic in Calendar than Create | **Not reproduced** — calendar captions are strongly on-brand; but the *Improve* flow around them is bureaucratic |
| Plan Settings exist but unused visibly | **Partly** — pillars/world clearly drive recommendations, but nothing on Calendar shows "this comes from your plan"; no dates/scheduling visible at all |
| Maya asks what she could infer | **Confirmed** — bio nag, empty brand field, Branding-Planner rec to advanced member |
| Maya creates when member wants an answer | **Not observed** (proposal cards always interposed a Create button — good) |
| Vault/inspiration/visual DNA transfer | **Confirmed working** — Vault looks, Shadow Study, Dark & Moody all flowed in unprompted |
| New sessions inherit old context | **Confirmed** — scope + format stickiness; deployed drawer auto-open |
| Library feels like storage | **Confirmed** — flat 450-item dump, no sets |
| Assets without clear next action | **Confirmed for carousel** (no caption/plan); photo flow has good next steps |
| Features available but undiscoverable | **Confirmed** — "CHANGE" hides the excellent path picker; apply-to-post flow exists but unreachable from Gallery |
| Phase 5: one direct "Create this · N credits" | **Confirmed working** (photo 1cr, carousel 7cr, single action, cost visible) |
| Phase 5: preview→confirm only for genuine mutations | **Violated in both directions** — free caption gets 4 confirms; carousel slides each built from own brief ✔ (verified visually: distinct poses/scenes/copy per slide) |

---

## 5. Ideal happy paths (proposed)

**New member (target ≤5 min, ≤6 taps):**
Join → pay → ONE screen: upload 1 selfie + one line "what you do / who you help" → Maya proposes one starter post (photo + caption, cost shown) → Create → result + caption together → "Add to your plan" → done. Everything else (Vault, looks, courses) discovered later, not up front.

**Returning member (target ≤3 taps + 1 wait):**
Open app → home states today's gap ("Wednesday needs a post — here's the one I'd make") → "Create today's post · N credits" → result WITH caption → "Add to plan" (undoable) → done. Pick card marks itself ✓ done afterward.

---

## 6. Replacement copy (exact)

| Where | Now | Replace with |
|---|---|---|
| Concept error retry link | SHOW ME NEW IDEAS | TRY AGAIN (and retry same brief) |
| Drawer primary CTA (from a pick) | SHOW ME PHOTO IDEAS | START THIS IDEA (format carried) |
| Post-creation next CTA behavior | silent | acts on tap; if a text choice is needed: sheet titled "Words on these images?" with "Maya writes them / No text" |
| Caption improve card | "Maya will use the Calendar caption system already connected to this post." | "Maya rewrites this caption in your voice. Your current one is saved." |
| Cost line (free) | No credits | Free |
| Caption confirm stack | Preview → Continue → Confirm and improve | one card: "Rewrite this caption? You can undo." [REWRITE] [CANCEL] |
| Caption result | Done | show the new caption + [KEEP IT] [UNDO] |
| Gallery viewer | USE IN CALENDAR | ADD TO A POST (opens post picker with image) |
| Post details top-left pill | Post | PREVIEW (or remove) |
| Planner primary button | NEW GRID | PLAN A NEW GRID (secondary style) |
| Planner header | My Feed - 7/27/2026 | My Feed — Monday (live, localized) |
| Planner helper (all ready) | Tap any post to create just that one. | All 9 posts are ready. Tap one to review it. |
| Bio empty state | Add a short bio so people know what you do and who you help. | Maya drafted your bio from your brand — tap to review. |
| Memory brand empty state | (placeholder) | "Here's what Maya knows about your brand: … Edit anything." (prefilled from user_personal_brand + learned style) |
| Drawer mode header | PHOTO · SELFIE ENGINE · SELFIE IN… | Photo · with your selfie · CHANGE |
| Maya-initiated turns | rendered as YOU bubble | Maya chip: "Maya is starting your carousel" |

---

## 7. Reliability bugs vs UX/design problems

**Reliability (code defects):**
R1 Dead graphic CTAs — `maya-concierge.tsx:3752` + `:1708-1711` gate (P0)
R2 Use-in-Calendar drops asset — `app-v3-shell.tsx:347` (P1)
R3 Concept generation zero-valid payloads — chat route repair pipeline (P1)
R4 Recommendation format not landing in session (runtime confirm of recommendations payload) (P1)
R5 Deployed drawer auto-open — fix exists at HEAD (`e2a3445f`); verify deployment (P2)
R6 Lightbox set = page size 24, wrong counts for carousels (P2)
R7 "MORE +" empty expander after carousel (P3; statically unreproducible — likely 1-concept "See more ideas" details, `maya-concierge.tsx:5456-5468`)
R8 `/login` 404 — add redirect (P3)
R9 Stale feed title, server-locale date (P3)
R10 Hero eyebrow reveal flash / IntroScreen overlap (P3)
R11 Auth-state flap: `/app` showed login card while a valid session existed moments later (observed once; needs repro) (P3)
R12 Bottom-nav tabs unresponsive at 1280px in test browser (unverified — retest on real desktop) (P3)

**UX/design (behavior as built):**
U1 No caption/plan action after creation (P1) · U2 Caption-improve confirmation stack, invisible result (P2) · U3 Canned YOU bubbles (P2) · U4 Sticky scope/format vs plain-language override (P2) · U5 Flat gallery, no sets, costless MAKE VIDEO, adjacent trash (P2) · U6 Bio/brand fields contradict Maya's knowledge (P2) · U7 Jargon cluster + "Post" pill + REMOVE placement (P3) · U8 Learn maturity-blind recommendation + duplicated paragraph (P3) · U9 Home pick no done-state (P3) · U10 Style picker mixed into caption task (P3)

---

## 8. Regression checklist

**Creation**
- [ ] Home pick format carries into drawer; primary CTA names idea + format
- [ ] Concept failure → TRY AGAIN retries same brief; no injected member text
- [ ] Photo: 1 tap, cost shown, saved-state, next action
- [ ] Carousel: one "Create this · N credits"; progress "slide k of N" + cancel; slides from own briefs; ends with caption + add-to-plan
- [ ] Stories/reel-cover/carousel chips and next-step CTAs respond visibly on first tap
- [ ] MORE/See-more expanders never render empty

**Calendar**
- [ ] READY post → details (not create); helper copy matches actual counts
- [ ] Caption improve ≤2 taps, shows result, undo works — incl. after navigating away
- [ ] Gallery → Add to a post → picker → preview → confirm; cancel = no change
- [ ] REMOVE requires confirm and is undoable; header date live + localized

**Maya context**
- [ ] Cold /app load = home, no auto-drawer
- [ ] Bubble on new surface offers continue-vs-new; never silently resumes old scope
- [ ] Explicit format words ("a photo") override session format
- [ ] New chat resets scope/format/inspiration; inspiration never auto-attaches silently
- [ ] Memory page mirrors what Maya actually uses; FORGET changes behavior

**Credits & recovery**
- [ ] Cost on every paid CTA (incl. MAKE VIDEO); free actions say Free
- [ ] Member (non-admin) balance visible; decrements; failed generation refunds with message (verify against credit ledger)
- [ ] Kill network mid-generation → clear error + retry, no double charge
- [ ] Back/away mid-generation → completes; result in Gallery
- [ ] Session expiry on /app → login → returns to /app

**Gallery**
- [ ] Carousel = one set of N; counters and Download-all match set
- [ ] Delete confirmed; favorites persist; newest first

**Both breakpoints:** all of the above at 375px and ≥1280px (incl. bottom-nav tab navigation).

---

## 9. Seven-day dogfooding plan (Sandra)

Phone only, as a member. Log per day: taps, minutes-to-done, dead ends, "Maya should have known this" moments, screenshots.

- **D1 — Cold open to posted.** Follow Maya's pick to an actually-posted piece. Note everything you had to do outside the app (caption? scheduling? downloads?).
- **D2 — Carousel day.** Pick → carousel → post it for real. Where did the caption come from? How did slides get to Instagram?
- **D3 — Change direction.** In an existing chat ask for the opposite aesthetic and an explicit format ("one photo"). Verify words beat session state. Repeat in NEW CHAT; compare.
- **D4 — Calendar day.** Improve 2 captions (count taps; can you see results?), apply 1 gallery image to a post, try to schedule the week to dates.
- **D5 — Recovery day.** Airplane-mode mid-generation; kill the app mid-carousel; check credits, retry, where results landed; UNDO 10 minutes after a change.
- **D6 — Memory day.** Read "What Maya remembers"; mark wrong/missing/jargon lines; FORGET one thing and verify behavior changes; compare brand field vs what Maya says in chat.
- **D7 — New eyes.** Give a real ICP friend the QA account for 20 min: "post something today." Watch silently; log stalls.

End of week: which of the top-10 did you reproduce; anything new → same evidence format.

---

## Proposed fix order (awaiting approval — no code changed in this pass)

1. **R1** dead graphic CTAs (one gate fix + sheet trigger) — unblocks the flagship loop
2. **R2** wire Use-in-Calendar into existing `openForCalendarPost` flow
3. **R4/2** make pick-card format authoritative end-to-end (+ runtime check of recommendations payload)
4. **U1** caption + add-to-plan after every creation (reuse Calendar caption system)
5. **U2** collapse caption-improve to act→show→undo; **U3** kill canned YOU bubbles
6. **R5** verify deployment of drawer auto-open fix; **R8** `/login` redirect; **R9** live localized feed title
7. **U5/R6** carousel-as-set in gallery
8. Copy pass from §6 (one PR)

*Note: several fixes touch Maya Experience (Track B) surfaces; the Maya creative pipeline (Track A — prompts, assembly, routing) is frozen per docs/product/MAYA_CREATIVE_FREEZE_2026-07-15.md and none of the above requires touching it.*

---

# Addendum 2026-07-29 — two member-reported issues, verified

## A. Baked-text editing (carousels + all text-baking formats)

**Live evidence:** in the CEO-carousel chat, "Change the text on the cover slide to: …" got Maya's reply "Love that swap… Updating the cover now." — and then the session was hijacked by the stale draft (see B) and the exchange was **lost both times it was attempted**; the cover was never updated. The inline edit boxes and the create-after-edit failure are confirmed in code:

- **The inline manual edit boxes** are `concept-card.tsx:336-405` ("The words on each slide"): raw per-slide `<input>`+`<textarea>` pairs seeded from the brief (`lib/app-v3/maya/concept-copy-edit.ts`). They appear **pre-generation on every text-baking format** (carousel, reel-cover, story-slide, story-sequence — `concept-copy-edit.ts:16-25`), stacked inside the chat card with 10px labels — the confusing UI Sandra saw. (They also have a documented history of breaking iOS layout: comment at `concept-card.tsx:375-379`.)
- **Edited text IS passed** into generation (`maya-concierge.tsx:5040-5051 → 2738-2741`, `applyEditedConceptCopy`). The "won't generate" experiences come from four silent no-op gates:
  1. Create disabled with no reference selfie (`maya-concierge.tsx:5129-5133`, early return `:2754-2762`) — greyed button, no explanation;
  2. in-flight key guard swallows taps silently (`:2766`), incl. after a stuck/aborted stream that never cleared;
  3. the graphic text-choice gate (`:3752` + stale `lastPulledFormatRef` guard `:5482`) can leave neither message nor choice card;
  4. "Try text again" shares one continuation lock with the auto-bake (`:3882-3883`, released at `:3945`) — while (or after a crash of) the auto-continuation, taps no-op.
- **Two different edit systems** confuse the member: pre-generation inline boxes vs the chat "reword" path (`parseTextRefinement`/`applyTextRefinement`, `maya-concierge.tsx:2327-2331, 3984-4082`) which only works on already-finished slides, is **disabled for stories** (`:3991`), and silently consumes the member's message (never reaches Maya) when it matches.
- **Open server-side question:** post-generation bake continuation uses server-returned `textOverlaySpecs` (`:3070-3085`) — verify `/api/app-v3/maya/generate` builds specs from the edited `slides`, else bakes can print Maya's original words despite an edit.

**Direction (per Sandra):** Maya should own text changes. One reliable mechanism: chat instruction → per-slide re-bake (extend `applyTextRefinement` to pre-generation concepts and stories), keep ONE visible "Words on your slides" editor only as a fallback behind an explicit "Edit the words myself" action, and make every silent no-op gate either work or say why not.

## B. Mobile drawer misbehavior — three distinct defects

1. **Active-session hijack (P0, observed live twice; causes message loss).** The mount-time `GET /api/app-v3/maya/draft` race: `concierge-context.tsx:682-724` stamps `restoredSavedAtRef` only in `openFresh`/local-restore; `open`/`openWithAesthetic`/`openForLesson`/`openForCalendarPost`/`restoreHistoryTask` don't, so a late-resolving server draft passes the `:707` guard and `setSession` clobbers the live, mid-stream session (and closes the drawer). The just-sent message is lost: the 700ms debounced PUT (`maya-concierge.tsx:1341-1352`) is cancelled by the swap, chatId guards (`:1294-1304`) block it during the transition, and the single per-user draft slot (`draft-store.ts:50-52`) is overwritten by the restored session. Matches the live symptom exactly: "Updating the cover now" → drawer replaced by stale "Learn with Maya" → reopened chat has no trace of the exchange.
2. **Drawer "drops down" on mobile (P1 — Sandra's direct report).** The only thing that moves the drawer is the keyboard-tracking transform `maya-concierge.tsx:4180-4184`, driven by the `visualViewport` **resize** handler (`:947-964`). Any resize where the viewport shrinks >80px and `offsetTop > 0` (iOS toolbar show/hide, partial keyboard dismissal) latches a positive `translateY` that persists until the *next* resize — so the drawer sits dropped, showing the create page behind, until the member taps to refocus (fires a corrective resize). Exactly "drops down and the user needs to tap on the screen to bring it back up."
3. **Auto-open of stale drawer on load + regenerating Learn content (P2).** ~~Production running a pre-fix build~~ — **corrected 2026-07-29 post-deploy**: the restore path was already fixed (`e2a3445f`), but the auto-open persisted because the task-hydration effect (which runs even while the drawer is closed — the `!isOpen` return sits after the hooks) calls `updateCurrentSession`, which ended with an unconditional `setIsOpen(true)`. Every interactive caller already has the drawer open, so `updateCurrentSession` is now visibility-neutral (commit `15fbc983`); verified fixed on production (cold /app load: drawer closed, launcher visible). Separately, the "Learn with Maya" surface re-calls `POST /api/app-v3/maya/guidance` on every open with no cache and temp 0.2 (`maya-guidance-workspace.tsx:42-76`, `guidance/service.ts:259-267`) — new advice wording every open (observed 3 different versions live), token cost per open (client cache added for same-page-session opens; a server-side cache per taskId is the follow-up), and a latent trap: `continuity.ts:624-645` re-persists server `isOpen` that future code must never trust.

## Post-deploy verification 2026-07-29 (commits 13ad92c4 + 15fbc983 live)

- Cold `/app` load: drawer stays closed, floating launcher visible ✓ (previously auto-opened every load)
- "Turn this into Stories" on the finished carousel: responds instantly with a neutral "STARTING A STORY SEQUENCE" status line (not a fabricated YOU bubble) and Maya continues hands-free into a guided story flow with one tappable clarifying question ✓ (previously dead)
- `/login` → 308 → `/auth/login`, `/signup` → 308 → `/auth/sign-up` ✓ (previously 404)
- Full test suite 1788 green; production build green; both commits authored ssa@ssasocial.com

## Updated fix order (approved 2026-07-29)

1. **B1** session-hijack + draft-race fix (stamp/invalidate restore on every open path; flush message PUT immediately, not only debounced)
2. **B2** keyboard transform fix (clear `keyboardBox` when keyboard closes; never latch positive offset)
3. **R1** dead graphic CTAs (`:3752` family — also unblocks part of A)
4. **A** text-edit reliability: fix the four silent no-op gates; verify server uses edited slides; clearer editor copy + Maya-first reword (extend chat reword to pre-generation + stories)
5. **R2** wire Use-in-Calendar to the existing apply flow
6. **R4** pick-format authoritative end-to-end
7. **R8** `/login` redirect · **R9** live localized feed title · guidance response cache (B3)
8. **U2** caption-improve collapse + show result · **U3** kill canned YOU bubbles
9. **U1** caption + add-to-plan after creation
10. **U5/R6** carousel-as-set in gallery · copy pass (§6)
11. Push to main → Vercel deploy (resolves the stale-build auto-open, R5)
