# 📋 SSELFIE APP — DECISIONS DOCUMENT
**Date:** 20 Feb 2026
**Status:** DRAFT — Sandra to approve
**Purpose:** Single source of truth for what stays, what gets deleted, what gets finished

---

## THE REAL NUMBERS (from audit)

| What | Count | Problem |
|------|-------|---------|
| TypeScript files | 547 | — |
| API routes | 546 | Most not called from anywhere |
| Cron jobs | 37 | Only 30 registered in vercel.json |
| Admin pages | 21 | 3 are placeholders |
| Components | 221 | Multiple duplicates |
| Total lines of code | 269,359 | ~40% estimated dead |
| Markdown docs in root | 40 | All outdated planning docs |
| Potentially unused API routes | 344 | That's 63% of all routes |

---

## IMMEDIATE DECISIONS NEEDED FROM SANDRA

### 1. ADMIN PAGES — What are you actually using?

| Page | Lines | Keep? |
|------|-------|-------|
| /admin/academy | 1966 | ✅ Keep — core product |
| /admin/agents | 227 | ✅ Keep — Gumloop control |
| /admin/analytics | 727 | ✅ Keep — needed |
| /admin/brand-engine-applications | 63 | ✅ Keep — active revenue |
| /admin/content-engine | 13 | ❌ DELETE — placeholder |
| /admin/content-templates | 291 | ❓ Sandra decides |
| /admin/credits | 70 | ✅ Keep — operational |
| /admin/exit-impersonation | NO page.tsx | ❌ DELETE — broken |
| /admin/fashion-styles | 298 | ❓ Sandra decides |
| /admin/feed-styles-v2 | 1072 | ❓ Sandra decides |
| /admin/feedback | 557 | ✅ Keep — user insights |
| /admin/generation | 6 | ❌ DELETE — placeholder |
| /admin/journal | 336 | ❓ Sandra decides |
| /admin/libraries | 809 | ❓ Sandra decides |
| /admin/login-as-user | 107 | ✅ Keep — support tool |
| /admin/marketing | 8 | ❌ DELETE — placeholder |
| /admin/maya-studio | 46 | ✅ Keep — core |
| /admin/mission-control | 299 | ✅ Keep — daily ops |
| /admin/newsletter-review | 147 | ✅ Keep — email workflow |
| /admin/project-tracker | 201 | ❓ Sandra decides |
| /admin/testimonials | 748 | ✅ Keep — social proof |

**Definite deletes: 4 pages**
**Sandra needs to decide: 6 pages**

---

### 2. CRON JOBS — Which ones actually need to run?

7 cron jobs exist in code but are NOT registered in vercel.json:
- `blueprint-email-sequence`
- `cold-reeducation-sequence`
- `nurture-sequence` (wait — this IS registered)
- `reengagement-campaigns`
- `subscription-ending-soon`
- `welcome-back-sequence`
- `win-back-sequence`

**Question for Sandra:** Are email sequences working at all right now?
If not — ALL email crons should be paused until E-02 (wrong audience ID) is confirmed fixed.

---

### 3. THE MAYA COMPONENT PROBLEM

There are TWO maya headers:
- `maya-header-unified.tsx` — 1044 lines
- `maya-header.tsx` — 886 lines  
- `maya-header-old.tsx` — 127 lines

And a 3,546 line `maya-chat-screen.tsx`.

This is the "app is confusing" problem Sandra described. The UI has multiple versions running in parallel. Codex needs to confirm which one is actually rendered in production.

---

### 4. PRO MODE — Is it live or dead?

There's a full `pro-mode/` component folder:
- `ConceptCardPro.tsx` — 2002 lines
- `ProModeHeader.tsx` — 971 lines
- `ProModeChat.tsx` — 473 lines
- `ImageUploadFlow.tsx` — 1718 lines

**Question:** Is Pro Mode currently accessible to users? Or is this dead code?

---

### 5. FEED PLANNER — Live or deprecated?

Massive feed planner component set (15+ files, thousands of lines).
Also `/api/maya/feed` routes showing as potentially unused.

**Question:** Is the feed planner still part of the user journey?

---

## WHAT I RECOMMEND (Claude's view)

### DELETE NOW (no decisions needed):
1. 40 markdown docs in root → move to `/docs/archive/`
2. 4 placeholder admin pages (content-engine, generation, marketing, exit-impersonation)
3. `/api/test/*` and `/api/debug/*` routes
4. `/api/stripe/create-test-coupon`, `/api/stripe/test-checkout`
5. Anything in `.removed-endpoints`

### PAUSE ALL CRONS until E-02 is confirmed fixed
Every email cron is potentially hitting the wrong audience. Until the RESEND_AUDIENCE_ID in Vercel production is verified correct, every email sent is going to the wrong place.

### ONE QUESTION CODEX MUST ANSWER:
Which version of the Maya UI is actually rendered for users right now?
- Is it `maya-header-unified.tsx` or `maya-header.tsx`?
- Is Pro Mode live or hidden?
- Is the feed planner accessible?

This one answer clarifies ~40% of the codebase.

---

## THE CODEX HANDOVER PROTOCOL (new rule)

Going forward, at the end of every Codex session, Codex writes to:
`/Users/MD760HA/sselfie-9g/STATUS.md`

Format:
```
## Last Updated: [date/time]
## Last Task: [what was done]
## What's Live in Production: [confirmed working]
## What's Broken: [known issues]
## Currently In Progress: [task ID and status]
## Next Task: [what should happen next]
## Blocked On: [anything waiting for Sandra]
```

Claude reads this file at the start of every conversation.
No more copy-paste relay. No more lost context.

---

## PRIORITY ORDER (once Sandra approves)

### Week 1 — Clarity
- [ ] Codex confirms what Maya version is live
- [ ] Codex confirms Pro Mode status
- [ ] Codex confirms E-02 fix in Vercel production
- [ ] Delete 40 root markdown docs
- [ ] Delete 4 placeholder admin pages
- [ ] Create STATUS.md protocol

### Week 2 — Clean
- [ ] Sandra decides on 6 admin pages
- [ ] Pause or delete unused crons
- [ ] Delete /api/debug and /api/test routes
- [ ] Consolidate duplicate components

### Week 3 — Build
- [ ] Resume A-01 (Academy mini products) with full clarity
- [ ] One email system only (Resend, kill Flodesk + Loops)
- [ ] Mini products live in Academy

---

## SANDRA'S 5 DECISIONS NEEDED

1. Content-templates, fashion-styles, feed-styles-v2, libraries, journal, project-tracker — keep or delete?
2. Is Pro Mode something you want to keep for users?
3. Is the feed planner still part of the product?
4. Which email platform do you want to keep? (Resend, Flodesk, or Loops — currently all 3 are wired up)
5. Are you happy to pause all email crons until E-02 is confirmed fixed?
