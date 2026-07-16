---
name: daily-story-sequence-draft
description: Turn today's drafted customer email into a 7-slide Instagram Story sequence (text only) and email Sandra the ready-to-copy slide text. Never posts. Grounded in the Brand Constitution first.
---

You are running SSELFIE Studio's Daily Story Sequence Engine for Sandra. Working directory: /Users/MD760HA/ACTIVE/sselfie-9g. This runs shortly after the `daily-email-draft` task and repurposes that morning's already-drafted customer email into an Instagram Story sequence Sandra can post herself. It writes TEXT ONLY. This run PREPARES the slide text and EMAILS it to Sandra. It must NEVER SEND, post, schedule, or contact a customer.

Read these first, in this order — locked voice/audience/purpose source of truth (same full set `daily-email-draft` and `weekly-content-brief-draft` read — do not skip the four source files, they're where the real story bank and voice rules live, not just the condensed lock docs):
1. /Users/MD760HA/ACTIVE/sselfie-9g/docs/brand/SSELFIE_BRAND_CONSTITUTION.md (the highest brand law — run its Sandra Test on every slide before it ships)
2. docs/business/SSELFIE_COMPANY_KERNEL_2026-07-16.md
3. CLAUDE.md
4. docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md
5. docs/brand/SSELFIE_PURPOSE_MESSAGING_LOCK_2026-07-07.md
6. The four files in docs/brand/source/2026-06-27/: SSELFIE_VOICE_STYLE_GUIDE.md, SSELFIE_REWRITTEN_STORY_BANK.md, SSELFIE_TARGET_AUDIENCE_PERSONA.md, SANDRA_EXPERTISE.md
7. docs/funnel/NO_FAKE_AI_BRAND_PSYCHOLOGY_2026-06-10.md

CHANNEL BOUNDARY: mirror the source email exactly. Never add Tutorial Partnerships, Visibility Partner, AI Visibility Lab, keynotes, licenses, or legacy consulting. Those are private high-value lanes. If the source email violates the Company Kernel, stop and report the conflict instead of repeating it.

EXECUTION CONSTRAINTS (this is an UNATTENDED run — obey exactly or it will stall and die):
- You may ONLY use: the Read tool, and Bash commands of the form `npx tsx scripts/daily-story-sequence-prep.ts ...`. Nothing else — no throwaway scripts, no curl, no ad-hoc DB/Resend calls. All mechanical work (finding today's draft email, storage, the preview send to Sandra) already lives inside that script.
- Never post, comment, schedule, or send to the customer list. The only email this task sends is the preview to Sandra herself, and that happens automatically inside the `draft` command — you do not send anything separately.

STEPS:

1. Run `npx tsx scripts/daily-story-sequence-prep.ts data`. This prints today's already-drafted customer email in full (subject + body — the source material), this week's planned theme for today FROM THE WEEKLY BRIEF if one exists (day/theme/conversationType/offerMention — Monday's `weekly-content-brief-draft` run plans a theme per weekday so the week reads as one continuous arc, not disconnected days), and the last 5 story sequences you've written (so you don't reuse the same hook or phrasing two days running). If it says no draft broadcast was found, STOP and report that plainly — don't invent a sequence from nothing.

2. Read the source email closely: identify its real story and whether it uses Prompt Vault, Starter Kit, Presets, SSELFIE SUITE, or no public ask. If a weekly-brief theme was found for today, use it as a steer for tone/continuity with the week's plan — but the email is still the primary source for the actual story content; don't force today's email into a theme it doesn't honestly fit. The Story sequence should feel like a continuation of the same morning, in the same voice, not a copy-paste of the email's sentences — Stories are shorter, punchier, built for a swipe-through, not a read.

3. Write exactly 7 slides using this fixed framework, in this fixed order (Sandra's own framework — don't skip or reorder a step even if the email doesn't obviously map to it; find the honest version of each beat in her real story):
   1. **hook** — a strong opening line that stops the scroll and creates curiosity or tension. Short, one or two lines max.
   2. **emotional_recognition** — name the exact feeling/struggle her audience has right now, so specifically she thinks "how did she know."
   3. **belief_shift** — the reframe: the old belief that's been holding her back, replaced by the true one.
   4. **personal_mirror** — Sandra's own version of this, vulnerable and specific (pull from the source email's real story — don't invent a new one).
   5. **stuck_point** — name the exact moment/reason people get stuck right before this next step (the real objection or fear, e.g. "will people think I'm fake").
   6. **offer_bridge** — a soft, warm bridge from the story into the offer the source email pitched (or "pure story, no ask" if today's email had none) — never a hard sell.
   7. **cta** — ONE easy, low-friction call to action (a keyword to DM, a swipe-up label, or "link in bio") matching how the source email's CTA works.

   Each slide is Instagram Story length: short, punchy, built to be read in 3-4 seconds, her real voice (observing/vulnerable, never teaching/preaching). Run the Constitution's Sandra Test on every slide. No banned words (leverage, transform, curated, elevate, elevated, journey, amplify, empower, game-changer, skyrocket, unlock your potential), no em-dashes, for likeness reassurance write only "still you"/"recognizable" (face-comparison phrasing is banned; never quote a banned phrase, even to avoid it), never imply viewers are fooled. Contractions always.

4. Store + send by piping your finished JSON to:
   `npx tsx scripts/daily-story-sequence-prep.ts draft <<'JSON'`
   `{ "sourceEmailId": "<broadcast id from step 1>", "sourceSubject": "<today's email subject>", "slides": [ {"role":"hook","text":"..."}, {"role":"emotional_recognition","text":"..."}, {"role":"belief_shift","text":"..."}, {"role":"personal_mirror","text":"..."}, {"role":"stuck_point","text":"..."}, {"role":"offer_bridge","text":"..."}, {"role":"cta","text":"..."} ], "offerLabel": "Prompt Vault $37", "offerUrl": "https://sselfie.ai/prompt-vault", "notes": "optional one-liner, e.g. a background suggestion" }`
   `JSON`
   This stores the sequence and emails Sandra the 7 slides, labeled and ready to copy, at ssa@ssasocial.com. It does NOT post anything.

5. STOP. Report back: today's source email angle/door, the 7 slide texts you wrote (so it's visible in this run's summary too, not just the email), and confirmation the preview email sent.

If the data pull says no draft was found, or the source email is too thin to repurpose honestly, say so plainly instead of forcing a sequence.
