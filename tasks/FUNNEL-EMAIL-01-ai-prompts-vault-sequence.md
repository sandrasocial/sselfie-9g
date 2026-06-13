# FUNNEL-EMAIL-01 — Rework the AI-prompts → $27 Vault nurture sequence

OWNER: codex (queued — copy approved by Sandra 2026-06-13; implement on a `codex/` branch)

> Claude wrote this spec + the approved copy. Codex implements the template files + the
> sequence wiring. Lane: this is all email-template/cron code, zero `/app` collision.
> Rationale + data: `docs/funnel/FREE_TO_PAID_OFFER_FIX_2026-06-13.md`.

## Why

The current sequence asks for the $27 Vault once (day-7, 0.7% click) then jumps free users
straight to a SUITE trial (day-10, 0% click), skipping the $27 and muddying the ladder.
We are making the $27 ask concrete, adding proof + a why-now touch, and moving the SUITE
trial after the Vault sequence. Free-content emails get 17-34% clicks; the money asks get
under 2%. This is an offer/copy fix, not a deliverability fix.

## Scope: 5 changes

1. Rewrite the **day-7** copy (template exists).
2. Add a new **day-9** "proof + how" email.
3. Add a new **day-11** "why-now" email.
4. **Move the SUITE trial from day-10 to day-14** and reframe its copy (template exists).
5. Wire the two new email types into the sequence + both cron send-switches.

### Files to touch
- `lib/email/ai-prompts-email-sequence.ts` — the `AiPromptsEmailType` union + the
  `AI_PROMPTS_EMAIL_TOUCHES` schedule.
- `lib/email/templates/ai-prompts-day7-prompt-vault-offer.ts` — rewrite body/subject (keep
  the export signature + `buildRevenueEmailLink`/`promptVaultCheckoutUrl` wiring + stone shell).
- `lib/email/templates/ai-prompts-day9-prompt-vault-proof.ts` — **new**, mirror day-7's
  structure (stone shell, revenue link, `recipientEmail` param).
- `lib/email/templates/ai-prompts-day11-prompt-vault-why-now.ts` — **new**, same pattern.
- `lib/email/templates/ai-prompts-day10-suite-trial.ts` — reframe copy; rename or keep the
  emailType but reschedule to day 14 (see note).
- `app/api/cron/ai-photoshoot-nurture/route.ts` — add `case`s for the two new types (and the
  rescheduled trial); import the new generators. The trial case needs the `claimUrl` (see its
  existing day-10 case at ~line 242).
- `app/api/cron/nurture-sequence/route.ts` — same switch additions (this cron has the same
  emailType→generator map at ~line 561).

### New schedule (`AI_PROMPTS_EMAIL_TOUCHES`)
```
{ days: 1,  emailType: "ai-prompts-day1-vault-bridge" }                                   // keep
{ days: 5,  emailType: "ai-prompts-day5-edit-makes-postable" }                            // keep
{ days: 7,  emailType: "ai-prompts-day7-prompt-vault-offer",
            suppressIfSentTypes: ["ai-prompts-day7-starter-kit-offer"] }                 // rewrite copy
{ days: 9,  emailType: "ai-prompts-day9-prompt-vault-proof" }                             // NEW
{ days: 11, emailType: "ai-prompts-day11-prompt-vault-why-now" }                          // NEW
{ days: 14, emailType: "ai-prompts-day10-suite-trial",
            suppressIfSentTypes: ["suite_trial_unlock"] }                                 // moved 10->14
```
- Keep the existing buyer-exclusion: anyone who bought the Vault must NOT receive day-9/11
  (verify the candidate query already excludes Vault buyers, as day-7/day-10 rely on; if it
  filters by sent-type only, add the same exclusion for the new touches).
- The day-14 trial keeps `suppressIfSentTypes: ["suite_trial_unlock"]` so Vault buyers (who
  get the trial on purchase) don't get it twice. Keeping the `ai-prompts-day10-suite-trial`
  emailType string avoids a DB migration of logged types; only its `days` changes. If you
  rename the type for clarity, add a migration/back-compat for already-logged rows.

## Proof: resolved 2026-06-13
Day-9 uses a REAL published testimonial from `admin_testimonials` (Sandra confirmed all
published rows are consented for marketing). **Text only — do NOT render the screenshot
image** (the stored screenshots are ~1 year old and undersell current quality; Sandra's
call). The approved quote is embedded in the copy below. No placeholder remains; day-9 is
cleared for the live schedule. Still never invent or alter a testimonial — quote it faithfully.

## Voice + doctrine locks (do not drift)
- No em-dashes anywhere. Period, colon, or middle dot for separators.
- No-fake doctrine: "keeps your face", recognizable, true-to-you, AI-assisted, editorial.
  Never "no one will know", "look rich", "fake", "perfect face". Never "learn prompts".
- Signoff "Sandra x". Short sentences, contractions. Banned: leverage, transform, etc.

---

## APPROVED COPY (verbatim — implement exactly)

### Day 7 — `ai-prompts-day7-prompt-vault-offer` (rewrite)
**Subject:** one shot each. the Vault is the whole story.

```
In the free pack, you got the opening shot of every world. The half-light close-up. The clean-girl morning. The denim street.

One shot each. Just the door.

Here's what most people miss. Each of those is shot 1 of a whole story.

Take Quiet Luxury London. It's not one café photo. It's nine. The arrival. The coffee run. The seated hero shot. The reel-cover exit. A whole day, from one selfie.

The Vault has ten of those worlds. 92 shots, start to finish. Every one keeps your face. Still you, just on your best day.

You already know it works. You've watched your own selfie turn into something you'd actually post.

This is the rest of it.

[ Get the Vault · $27 · one time ]

Start with one world. Use one clear selfie. See where it goes.

Sandra x
```

### Day 9 — `ai-prompts-day9-prompt-vault-proof` (NEW)
**Subject:** will it actually look like me?

```
The question I get most about the Vault: "will it actually look like me, or some AI version of me?"

Honest answer: it looks like you.

Every prompt starts the same way. It locks your face first. Your eyes, your features, your skin. The AI changes the room, the light, the mood. Not you. That's the whole point. AI should not erase you. It should frame you.

And it's easier than you think. Three steps:
1. Open ChatGPT. Upload one clear selfie.
2. Paste the prompt.
3. That's it. Your photo's done in under two minutes.

No app to learn. No photographer. No "tech girlie" required. If you can text, you can do this.

From a SSELFIE customer:
"I am blown away. I'm so picky it's not even funny. But this? My God."

[ See the worlds · $27 ]

Sandra x
```
> Implementation note: render the testimonial as a quoted text line (e.g. inside a stone
> panel), NOT as an image. Do not attach `screenshot_url`. Quote verbatim.

### Day 11 — `ai-prompts-day11-prompt-vault-why-now` (NEW)
**Subject:** still sitting in your camera roll?

```
You've had the free shots for almost two weeks now.

Maybe you used them. Maybe they're still sitting there, waiting for the "right" moment.

Here's the thing about showing up. The right moment doesn't come. You just start.

The Vault is $27. One time. Ten full worlds, 92 shots, and every new drop I add is yours too. No subscription. No catch.

The women who get the most out of this aren't the ones with the best selfies. They're the ones who stopped waiting to feel ready.

Your face is your brand. You've already got the camera.

[ Get the Vault · $27 ]

Sandra x
```

### Day 14 — `ai-prompts-day10-suite-trial` (reframe, moved from day 10)
**Subject:** loved making those? there's a faster way.

```
If you've been making photos with the prompts, you know the feeling. That little "oh, that's actually me" moment.

Here's something I don't talk about much.

Doing it by hand with prompts works. But there's a faster way inside my Studio. Her name's Maya.

She's the creative director I built. She already knows every prompt I've ever written. You pick a look, she pulls three concepts, your photos are done in minutes. They keep your face. Same promise, less work.

Try her free. 7 days in the SUITE, 20 photos on me. No card. Nothing turns into a charge. It just ends.

Your prompts stay yours either way.

[ Claim your 7 days ]

Sandra x
```

## Acceptance
- [ ] Day-7 copy replaced; day-9 + day-11 templates created and wired into BOTH crons.
- [ ] Trial rescheduled to day 14; copy reframed; double-send suppression intact.
- [ ] Vault buyers excluded from day-9/11.
- [ ] Day-9 ships with the real testimonial as TEXT (no screenshot image), quoted verbatim.
- [ ] No em-dashes; doctrine phrases intact; "Sandra x" signoff; links use `buildRevenueEmailLink`.
- [ ] No autonomous send: this only changes templates/schedule; the cron sends on its normal cadence after merge.
