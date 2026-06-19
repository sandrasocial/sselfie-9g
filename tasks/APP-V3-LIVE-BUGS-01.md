# APP-V3-LIVE-BUGS-01 — Three live /app bugs from a production e2e walkthrough

**Owner:** Codex (code). Pure UI / client-state / one display fix. No copy sends, no money path, no schema migration. Sandra's standing deploy approval covers this once CI is green.

**Relationship to TRIAL-FRONTDOOR-01:** sibling /app activation fix. TRIAL-FRONTDOOR-01 owns the trial *front door* (single-action first screen, claim redirect, activation events). This spec owns three *separate* live bugs found in the same e2e walkthrough of production `/app` (Suite v3: `app/app/`, `components/app-v3/`, `lib/app-v3/`, `app/api/app-v3/`). They touch different lines and can ship independently or together — no overlap with TRIAL-FRONTDOOR-01's edits to `visual-front-door.tsx` (that spec adds a single-action trial block; this spec does not touch it). If both land in the same branch, keep each spec's changes isolated and labeled.

Bugs in priority order: **BUG 1 (silent "Create This" dead-end) is the activation blocker — do it first.** BUG 2 (hydration #418) and BUG 3 (credits dash) are lower-stakes correctness fixes.

---

## BUG 1 — Sticky create-mode silently dead-ends "Create This" (HIGHEST priority)

### Problem (observed live)
The create mode (Photo / Photoshoot / Reel cover / Carousel / Story slide / Video) persists across sessions from the saved draft. A session left in **Video** mode reloaded still in Video. The user then asked Maya for a photo; Maya returned a proper PHOTO concept card, but clicking the card's primary CTA ("Create This") did **not** start a generation. The network showed only `PUT /api/app-v3/maya/draft` (a draft save) and **no** call to any generate endpoint — nothing visible happened. Only after manually clicking the **CHANGE** mode strip and picking **Photo** did the CTA relabel to "Start My Brand Shoot" and a real generation fire (`POST /api/app-v3/maya/custom-model/generate` 200). To a real user this reads as "I clicked Create and nothing happened" — a hard activation blocker.

### Root cause (cited)
The concept-card CTA dispatches on the **session's sticky `outputFormat`**, not on the concept's own type.

- The active format is the single source of truth and it survives reloads. The draft restores `outputFormat` verbatim: `components/app-v3/continuity.ts:90-92` (`sanitizeSession` keeps `session.outputFormat` if valid), and the server draft is rehydrated through the same path via `cacheServerMayaDraftSnapshot` (`components/app-v3/continuity.ts:208-222`). The concierge session also persists locally (`concierge-context.tsx:84-94`). So a session last left on `video` comes back as `format = "video"`.
- The concept card is handed the sticky session format, not the concept's type: `components/app-v3/maya-concierge.tsx:1673` passes `format={format}` (where `format = outputFormat ?? "photo"`, line 607) into `<ConceptCard>`.
- The CTA label is driven by that same sticky `format`: `components/app-v3/concept-card.tsx:206-210` shows `"Start my brand shoot"` only when `format === "photo"`, else `"Create this"`.
- The click handler dispatches by sticky `format`, not by the concept: `components/app-v3/maya-concierge.tsx:1674` → `generateConcept(key, concept)`, and inside `generateConcept` the **first** branch is `if (format === "video")` (`maya-concierge.tsx:735`), which POSTs to `/api/app-v3/maya/video/generate` with `imageUrl: referenceSelfieUrl` and a motion prompt built from the (photo) brief. For a photo concept this is the wrong pipeline; it produces no visible photo and reads as a no-op (the only network traffic the user saw was the unrelated debounced draft `PUT` at `maya-concierge.tsx:478-484`).
- Maya is *supposed* to self-correct by calling the `set_format` tool when the user asks for a different format (`app/api/app-v3/maya/chat/route.ts:297-310`), which the client commits in `maya-concierge.tsx:584-599` and then auto-pulls fresh directions (`maya-concierge.tsx:556-578`). But that path is **LLM-dependent and not guaranteed**: if Maya emits photo `emit_concepts` *without* first calling `set_format`, the session stays `video`, the cards render, and the CTA dispatches into the video pipeline. That is exactly the observed failure.

Net: the concept type and the dispatch pipeline can disagree, and when they do the CTA silently fires the wrong (or a dead) pipeline.

### Files / symbols to change
- `components/app-v3/maya-concierge.tsx`
  - `generateConcept(key, concept)` (~line 722) — dispatch by the **concept's own format**, not the sticky session `format`.
  - The concept render block (`maya-concierge.tsx:1661-1685`) and the photoshoot block (`1589-1659`) — they currently branch on `format === "photoshoot"` / `format !== "photoshoot"` from the sticky session; make sure cards render and dispatch by the type Maya actually proposed.
  - `handleNewChat` (~line 671) already resets `setOutputFormat(null)` — confirm and lean on this for option (c).
- `components/app-v3/concept-card.tsx` — `ConceptCard` `format` prop + CTA label (lines 36-43 `FRAME_ASPECT`, 206-210 label). The label/aspect should reflect the concept being generated.
- `components/app-v3/concierge-context.tsx` — `resetCurrentSession` / `openWithAesthetic` if option (c) needs a clean default.
- `lib/app-v3/maya/concept-types.ts` — read it; if a concept already carries an explicit format/kind, use it as the dispatch key. If concepts do **not** carry a format, the cleanest fix is option (a): commit `set_format` deterministically before/at the moment photo concepts arrive (do not rely on the model to call it).

### Desired behavior (Codex chooses the cleanest combination)
Pick the simplest reliable mix of these; (a)+(c) together is preferred if concepts don't carry their own type:
- **(a) Align mode to the proposed concept.** When Maya emits a batch of concepts for a format different from the session's sticky `outputFormat`, commit the session to that format (call `setOutputFormat`) so the CTA, label, aspect, and dispatch all match. Do this from real signal (the emitted concept batch / a `set_format` part), not from a guess.
- **(b) Dispatch by concept type, not panel mode.** Make the concept-card CTA generate in the pipeline that matches the **concept** (photo concept → photo/custom-model pipeline; video concept → video pipeline) regardless of the panel's sticky mode. This is the most robust guard even if (a) misses.
- **(c) Reset create-mode to Photo (or null) on a new chat / new session** so a stale Video mode can't carry into the next ask. `handleNewChat` already nulls it; extend the same reset to a fresh load so a restored draft doesn't silently strand the user in Video while she's asking for a photo. If a draft is restored, the mode may stay, but (a)/(b) must still make the CTA fire correctly.

Whatever the choice, the invariant is: **a photo concept card's primary CTA must fire a photo generation, never the video endpoint, never a draft-only no-op.**

### Acceptance
- From a fresh load with a prior **Video** draft, asking Maya for a photo and clicking the concept card's primary CTA fires a real generation request (a `POST` to `/api/app-v3/maya/generate` or `/api/app-v3/maya/custom-model/generate`), **not** a draft-only save and **not** the video endpoint.
- The CTA label and card aspect ratio match the concept actually being generated (photo concept reads as a photo CTA, not "Create this" wired to video).
- Switching mode via CHANGE still works exactly as before.
- No regression to the photoshoot-set path (6–9 shot cohesive set) or the real video-from-image path (Photos tab → "make motion", `createMotionFromImage` in `app-v3-shell.tsx:103-109`).

### Non-goals
- Do not remove or rewrite the `set_format` tool or Maya's conversational format switching — keep it; just stop depending on it as the *only* thing that keeps mode and concept in sync.
- Do not change the generation endpoints, credit logic, or the selfie hard-gate.
- Do not redesign the front door or the mode selector UI.

---

## BUG 2 — Recurring React hydration error #418 on /app

### Problem (observed live)
"Minified React error #418" (hydration / text-content mismatch) throws repeatedly (~once per minute) on live `/app`. The app still functions, but it is a real SSR/client divergence and pollutes the console + error logs.

### Root cause (cited)
A client component reads `localStorage` **during render** (in a `useState` initializer), so the server-rendered tree and the first client render can disagree on *which section renders*.

- `components/app-v3/app-v3-shell.tsx:72-74`:
  ```
  const [section, setSection] = useState<AppV3Section>(() =>
    initialSection === "create" ? readStoredAppSection(initialSection) : initialSection
  )
  ```
  `readStoredAppSection` reads `window.localStorage` (`continuity.ts:70-72` → `readJson` at `continuity.ts:47-55`). On the server `window` is undefined so it returns the fallback (`initialSection`, typically `"create"`); on the client's first render it returns whatever the user last stored (e.g. `"account"`). When those differ, `ShellInner` renders a different `section` block on the client than the server sent → hydration mismatch (#418). The ~once-a-minute cadence matches a re-render/re-mount of the shell.

For contrast, the concierge context does this **correctly** — it reads `localStorage` inside `useEffect`, not during render (`concierge-context.tsx:84-112`), which is the pattern to copy. So the offender is specifically the shell's section initializer. (Secondary candidates to sanity-check while in here, but the shell initializer is the confirmed one: any `new Date(...).toLocaleDateString` rendered directly during SSR such as `account-view.tsx:23-33` / `:178-181` — these only render after a client `fetch` so they are not the SSR-divergence source, but verify nothing else reads `window`/`localStorage`/`Date.now()`/`Math.random()` during render in `app-v3-shell.tsx`, `maya-concierge.tsx`, `account-view.tsx`, `concept-card.tsx`, or the gallery cards.)

### Files / symbols to change
- `components/app-v3/app-v3-shell.tsx` → `ShellInner`, the `section` `useState` initializer (lines 72-74) and the existing `useEffect`/`goToSection` that persist it (lines 78-88).

### Desired behavior (fix pattern)
Render the server-safe value first, then reconcile from `localStorage` after mount so the first client render matches the server:
- Initialize `section` from `initialSection` only (no `localStorage` read during render).
- In a `useEffect` (runs after hydration), read `readStoredAppSection(initialSection)` and, if it differs and `initialSection === "create"`, `setSection` to the stored value. This is a post-hydration state update, not a render-time divergence, so it does not trip #418.
- Keep `goToSection` and the persistence `useEffect` behavior intact. Optionally gate with a `mounted` flag if cleaner, but the effect-reconcile pattern above is sufficient.

Do not reach for `suppressHydrationWarning` here — the value is deterministic post-mount, so fix the source rather than masking it.

### Acceptance
- No React error #418 in the console on `/app` initial load and while idle.
- The last-viewed section still restores (a user who left on Account still lands on Account after the post-mount reconcile), and deep links / `?view=` still win where they do today.
- No flash regression worse than today for the common `create` default.

### Non-goals
- Do not change navigation structure, the five tabs, or `?view=` deep-linking.
- Do not blanket-add `suppressHydrationWarning` across app-v3 components.

---

## BUG 3 — Credits shows "—" instead of a number on Account

### Problem (observed live)
`components/app-v3/account-view.tsx` renders `CREDITS —` (an em-dash placeholder) on the admin account. A trial or paying member must always see a clear numeric balance; a bare dash reads as broken.

### Root cause (cited)
The Account UI falls back to a literal dash whenever the API's `credits` is not a number:
- `components/app-v3/account-view.tsx:202-204`:
  ```
  {typeof data?.credits === "number" ? `${data.credits} credits` : "—"}
  ```
- The API can legitimately return `credits: null`: `app/api/app-v3/account/route.ts` returns `empty` (`credits: null`) when there's no Neon user id (line 34) or on any throw (line 67), and otherwise returns `credits` from `getUserCredits(...).catch(() => null)` (lines 37-38, 61). So a failed/edge credit read renders as `—` with no signal of what happened. For the admin account (which may have no real balance row) this is the visible case, but the same `null → —` path would hit a trial/member whose credit read momentarily fails.

Confirm in code whether trial/member normally get a real number: `getUserCredits` (`lib/credits.ts`) returns the live balance; for a healthy trial/member it is a number and renders fine. The bug is the **fallback** masking both "unknown" and "admin/unlimited" as the same bare dash.

### Files / symbols to change
- `components/app-v3/account-view.tsx` — the Credits card render (lines 200-213), and the `AccountData.credits` handling.
- `app/api/app-v3/account/route.ts` — `GET` response shape (lines 30, 52-63). If admin is meant to be unlimited, surface that explicitly (see below) rather than returning bare `null`.

### Desired behavior
- A **trial** or **member** user always sees a numeric balance (e.g. `200 credits`, `0 credits`). `0` must render as `0 credits`, never `—` (the `typeof === "number"` check already allows 0 — keep that).
- Decide admin: admins effectively have unlimited generation, so render **"Unlimited"** for admin instead of a bare dash. Cleanest: have `/api/app-v3/account` return an explicit signal for the unlimited case (e.g. `credits: null` plus a `creditsUnlimited: true` flag, or `plan`/role-derived) so the client shows "Unlimited"; otherwise keep the numeric render. Do not invent money from analytics — credits come from `getUserCredits` / the credits source only (Admin Data Contract: this is not a money/revenue number, it's the credit balance, so it stays on the existing credits source — do not route it through `stripe_payments`).
- If `credits` is genuinely unknown (a transient API failure, not admin-unlimited), prefer a non-broken fallback over `—` (e.g. retry the fetch, or show a quiet "Couldn't load credits" line consistent with the Account tab's existing soft-fail tone), so a real member never just sees a dash with no explanation.

### Acceptance
- A **trial** user sees a numeric credit balance on Account.
- A **member** sees a numeric credit balance on Account.
- An **admin** sees a clear label ("Unlimited"), not a bare `—`.
- `0 credits` renders as `0 credits`.

### Non-goals
- Do not change credit pricing, refill logic, or the credits source of truth.
- Do not move credits onto any money/revenue path or admin data path.
- Do not redesign the Account screen beyond the Credits card.

---

## Test / verification checklist
1. **BUG 1:** seed a draft on Video, reload, ask Maya for a photo, click the photo concept CTA → a real photo generation request fires (network shows `/maya/generate` or `/maya/custom-model/generate`, not `/maya/video/generate`, not draft-only). CTA label/aspect match the concept. CHANGE → Photo still works. Photoshoot-set and Photos→"make motion" video paths unregressed.
2. **BUG 2:** load `/app` (incl. with a stored non-create section), idle for a couple minutes → zero React #418 in console. Last section still restores; `?view=` still works.
3. **BUG 3:** view Account as trial, as member, as admin → trial/member show a number (incl. `0 credits`), admin shows "Unlimited", never a bare `—`.
4. **No regressions:** lint clean, focused tests for the touched components pass, no money/admin-revenue path touched, no new colors/fonts/tokens, no m-dashes introduced in copy (the existing UI em-dash placeholder being removed is the point of BUG 3).

## Rollback
All three are pure client/display changes plus (BUG 3, optional) one additive field on a read-only account endpoint. No schema migration, no money path. Rollback = revert the branch, or revert each bug's hunk independently (they don't share lines).
