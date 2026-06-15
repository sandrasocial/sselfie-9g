# MAYA-FIX-02 - Edit Mode Likeness + Tap-First Graphics + Caption Voice (P1)

OWNER: Codex (Sandra approves merge)

Status: spec ready. Source: Maya deep audit 2026-06-15. Do AFTER MAYA-FIX-01.

P1 quality items: where likeness drifts back toward "fake", where the tap-first vision
stops, and where captions drift off Sandra's voice.

---

## 1. Edit Mode: stop likeness drift on refinements

### Problem
When a customer refines an image ("brighter", "new background", "crop closer"), Edit Mode feeds
the *previous generated image* back in (`app/api/app-v3/maya/edit/route.ts:148`, source =
`body.imageUrl`), and `buildEditPrompt` (`edit/route.ts:68-76`) drops the full `IDENTITY_ANCHOR`
(only `ELEVATION` is appended). gpt-image-2 edits drift the face each pass, so 3-4 edits
compound away from her real face. Edit presets (`components/app-v3/edit-mode.tsx:24-54`) invite
whole-image re-grades, so this is a common path. There is also no doctrine guard: a free-text
edit like "make me look slimmer / flawless / younger" is applied verbatim (`edit/route.ts:98`).

### Change
- Re-attach the **original member selfie** as an input on edit calls (alongside the prior image),
  OR at minimum inject `IDENTITY_ANCHOR` (from `lib/app-v3/maya/ingredients.ts`) into
  `buildEditPrompt`. Re-attaching the selfie is the real fix; prefer it.
- Append `AVOID_LIST` (or a trimmed identity-safety clause) to the edit prompt, and softly
  reframe "flawless / perfect / younger / slimmer" instructions toward "natural, true-to-you".
- Match generate quality: `edit/route.ts:157` hardcodes `quality: "medium"`; use the same
  `qualityForFormat` / `APP_V3_IMAGE_QUALITY` the generate route uses, so refining a "high"
  photo doesn't silently downgrade it.
- (Nice-to-have) reuse the generate route's SSE streaming so an edit shows progress, not a blank
  spinner (`edit-mode.tsx:123-130`).

### Verify
- Generate a photo, then run 3 sequential edits. Face stays recognizably the same person.
- A free-text edit asking for "flawless skin" produces a natural, not plastic, result.
- Edited image quality matches the original (no visible downgrade).

---

## 2. Extend tap-first to carousel / reel cover / story (not just photos)

### Problem
Photo flow is genuinely zero-typing. But picking carousel/reel/story hits a blank "type your
topic" wall (`components/app-v3/maya-concierge.tsx` openers ~98-100, 106-108; persona
`lib/app-v3/maya/persona.ts:80-85`). That's the chat-first pattern the North Star rejects.
The `ask_clarify` tool already returns tappable options; the copy and default behavior just
don't use it for these formats.

### Change
- For carousel/reel/story, change the openers to promise tappable options ("I'll pull a few
  angle ideas, pick one") instead of "tell me your topic".
- Ensure Maya **leads with `ask_clarify`** (inferring angle options from the customer's brand
  profile + recent activity, which are already loaded) rather than waiting for typed input.
  The persona already tells her to at ~line 172; make it the default for these formats.

### Verify
- Pick "Carousel" with a brand profile present → Maya opens with 3-4 tappable angle options,
  no typing required to proceed. Same for reel cover and story.

---

## 3. Caption generator: enforce Sandra's banned-word list

### Problem
The Feed Planner caption writer bans a generic AI-phrase list (`lib/feed-planner/caption-writer.ts:351`)
but does NOT ban Sandra's exact locked words, and `enforceCaptionPublishingRules`
(`caption-writer.ts:136`) only strips prompt-leak lines + caps hashtags. So a caption with
"transform your brand" / "unlock your potential" can ship. (The app-v3 persona bans these at
`persona.ts:142`, but the caption writer uses its own system prompt with no such guard.)

### Change
- Add Sandra's banned words to the caption prompt kill-list (`caption-writer.ts:351`):
  leverage, synergy, transform, game-changer, skyrocket, "unlock your potential", and elevate
  (per CLAUDE.md voice rules).
- Add a regex check in `enforceCaptionPublishingRules` / `shouldRegenerateCaption` that flags
  these for a rewrite pass. Also flag m-dashes (—) and normalize to a period/colon/middle dot.
- Reconsider the "2-3 emojis TOTAL" mandate (`caption-writer.ts:368`) → "0-2 emojis, only if
  natural" to match the persona's restraint.

### Verify
- Generate captions until one would have contained a banned word/m-dash; confirm it's caught
  and rewritten. Add/extend a test in `tests/feed-caption-quality.test.ts`.

---

## 4. Slim and refresh the shared "brain" (kills generic phrasing)

### Problem
`lib/maya/core-personality.ts` injects the full `MAYA_CORE_INTELLIGENCE` block (~78-247) into
every member chat via `persona.ts:251`. It contains a ~150-line static 2025 brand encyclopedia,
a "Visibility = Financial Freedom" mission, and "Authenticity > Perfection" (line 91, adjacent
to banned "perfect"). It's dated ("Spring '25") and the file header still describes Flux/Nano
Banana modes that don't exist in v3. This pushes Maya to name-drop the same brands regardless of
customer (reads generic) and into corporate-mission register, not "texting a girlfriend".

### Change
- Slim the injected brain to **voice + intelligence rules** (variety, match-to-positioning,
  anti-generic). Move the static brand catalog to a reference the prompt-compiler can pull from
  per-customer, NOT the conversational system prompt.
- Soften the mission/"elite" language to Sandra's register; replace "Perfection" with "real".
- Refresh dates / remove dead Flux/Nano-Banana header text (v3 is gpt-image-2 only).

### Verify
- Ask Maya the same request as two different fake brand profiles; concept titles/brand
  references differ meaningfully (not the same canonical brands every time).
- Persona reads warm/conversational, no "elite/financial freedom" mission phrasing.

---

## 5. Cleanup: delete dead overlay/caption modules carrying forbidden fonts

### Problem (P2, but do it here)
Zero-importer dead modules that encode forbidden fonts (Playfair Display, Dancing Script,
Montserrat, Bodoni, Poppins) and box styles — a landmine if a future "improve overlays" task
reconnects them:
- `lib/maya/feed-text-overlays.ts`
- `lib/maya/prompt-templates/instagram-text-rules.ts`
- `lib/instagram-strategist/caption-logic.tsx` (`generateCaptionsForFeed`, no callers)
- `components/app-v3/generate-image-client.ts` + `compileMayaPrompt` in
  `lib/app-v3/prompt-compiler.ts` (dead legacy single-ref path, weaker identity line)

### Change
- Confirm zero importers (grep) for each, then delete. For `generate-image-client.ts`, also
  confirm `/api/maya/generate-image-openai` isn't an active legacy `/studio` dependency before
  removing that route.

### Verify
- `npm run build` + lint clean after deletion. No broken imports.

---

## Acceptance (whole spec)
- Edits preserve likeness across multiple passes; no quality downgrade; doctrine guard on edits.
- Carousel/reel/story are tap-first (Maya leads with options, no forced typing).
- Captions never ship banned words or m-dashes; emoji restraint matches persona.
- Shared brain is slimmer, on-voice, current; outputs less generic.
- Dead modules deleted; build + lint clean; existing Maya tests pass.
