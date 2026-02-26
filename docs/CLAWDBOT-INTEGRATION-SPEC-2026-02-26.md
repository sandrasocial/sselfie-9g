# ClawDBot ↔ SSELFIE Integration Spec
**Date:** 2026-02-26  
**Author:** Integration Architecture Agent  
**Status:** Active — bridge is live, `inject_maya_context` action now deployed  
**Companion doc:** `MAYA-INTELLIGENCE-BRIEF-2026-02-26.md`

---

## 1. Current Bridge Status

Two live channels connect OpenClaw to the SSELFIE app as of 2026-02-26.

### Outbound: SSELFIE → OpenClaw
**Function:** `notifyNorth()` in `lib/north-notifier.ts`  
**Target:** `http://127.0.0.1:18789/hooks/agent`  
**Auth:** Static bearer token  
**Trigger surface:** Stripe webhook handler (`app/api/webhooks/stripe/route.ts`)

**What fires today:**

| Event | Stripe hook | Data sent to OpenClaw |
|---|---|---|
| New subscription | `customer.subscription.created` | path, customerId, email, firstName, plan, amount |
| Subscription cancellation | `customer.subscription.deleted` | path, customerId, email, firstName |
| Payment failed | `invoice.payment_failed` | path, customerId, email, firstName, amount |

Messages are sent as newline-separated key=value strings. ClawDBot receives them at the `north` agent with `wakeMode: "now"`, `channel: "telegram"`, and a 30-second execution timeout. These trigger downstream Telegram notifications and can kick off ClawDBot workflows (welcome sequences, churn recovery, payment retry flows).

### Inbound: OpenClaw → SSELFIE
**Endpoint:** `POST https://sselfie.ai/api/stella/bridge`  
**Auth:** Bearer token or `x-stella-token` header, or `token` body field — all validated against `STELLA_BRIDGE_TOKEN` env var  
**What existed before today:** Pass a `message` (+ optional `mode`) to invoke Stella/Maya AI reply. Returns `{ response, mode, timestamp }`.

**What's new as of today:** `inject_maya_context` action (see Section 2 below).

---

## 2. The Enrichment Just Built: ClawDBot → Maya Context Injection

### What it does
ClawDBot agents can now write a context note into any user's Maya session. The next time that user opens Maya, the note is injected into Maya's system prompt as a clearly labelled intelligence block. Maya uses it as recent, relevant background knowledge — without the user having to say anything.

### How it's stored
Context notes are written to the `memory_data` JSONB column of the `maya_personal_memory` table using an upsert:

```sql
INSERT INTO maya_personal_memory (user_id, memory_data)
VALUES ($userId, '{"agent_context_note": "...", "agent_context_updated_at": "..."}')
ON CONFLICT (user_id) DO UPDATE
SET
  memory_data = maya_personal_memory.memory_data || '{"agent_context_note": "...", "agent_context_updated_at": "..."}'::jsonb,
  updated_at = NOW()
```

The `||` operator merges the new keys into the existing JSONB object, preserving any other keys already stored in `memory_data`.

### How it's surfaced in Maya
`lib/maya/get-user-context.ts` queries `memory_data->>'agent_context_note'` for the current user as part of the parallel context fetch block. If a note exists, it's appended to the system prompt context as:

```
=== AGENT CONTEXT (from your automation team) ===
[contextNote content here]
This context was added by your background agents — treat it as recent, relevant intelligence.
```

This section appears after the user's recent concepts block, immediately before Maya's final context assembly. It is omitted silently if empty. The query is wrapped in `try/catch` — a database failure here never blocks the session.

### The API call OpenClaw makes

```http
POST https://sselfie.ai/api/stella/bridge
Authorization: Bearer <STELLA_BRIDGE_TOKEN>
Content-Type: application/json

{
  "action": "inject_maya_context",
  "userId": "abc123",
  "contextNote": "User mentioned wanting beach content for a retreat launch in March. Suggest coastal/travel-inspired photoshoots."
}
```

**Response (success):**
```json
{ "success": true }
```

**Response (validation failure):**
```json
{ "error": "Missing required fields: userId and contextNote" }
```
Status 400.

**Note on userId:** This must be the Neon `users.id` value (TEXT) — the same ID used throughout the SSELFIE database. OpenClaw should store this when it receives member events via `notifyNorth`, which includes `customerId` (Stripe). To bridge from Stripe customer to Neon user ID, ClawDBot can query `GET /api/admin/user-lookup?stripeCustomerId=cus_xxx` (or you can extend `notifyNorth` to include the Neon user ID in future — see Section 5).

---

## 3. Five Automation Scenarios Now Possible

These are immediately actionable with the bridge as deployed today.

### Scenario 1: Post-publish content loop
**Trigger:** User publishes an Instagram post (tracked via `instagram_posts` table or webhook from Instagram API)  
**ClawDBot action:** Query post metrics after 24h. Push a context note:  
`"Your most recent Instagram post (lifestyle editorial, posted yesterday) got strong early engagement. Maya should reference this momentum and suggest a follow-up in the same aesthetic."`  
**Maya effect:** Opens the next session with awareness of what just worked. Can say: "That lifestyle post landed well — let's build on that energy. Want a follow-up that keeps the same vibe?"  
**Why this matters:** Closes the loop between content performance and content creation. Maya stops suggesting things in a vacuum.

---

### Scenario 2: Re-engagement awareness for lapsed users
**Trigger:** User has not logged in for 7+ days (detectable from `users.last_login_at`)  
**ClawDBot action:** Fire a context note before the re-engagement email or push:  
`"This user has been inactive for 9 days. Their last session focused on wellness coaching content. Open with warmth and reference what they were building — don't start from scratch."`  
**Maya effect:** When the user returns (via email link or app open), Maya opens with: "Welcome back — last time we were building out your wellness coaching look. Want to pick up where we left off, or try something new?"  
**Why this matters:** Turns re-engagement from generic → personal. The user feels remembered, not marketed to.

---

### Scenario 3: Launch campaign preparation
**Trigger:** ClawDBot detects a launch event (manual trigger from Notion, calendar integration, or a webhook from a sales page tool)  
**ClawDBot action:** Push a strategic context note 5 days before the launch date:  
`"User is launching her 'Aligned Business Accelerator' coaching programme on March 10. She needs confidence content, behind-the-scenes process shots, and a warm authority headshot before then. Proactively guide the next 3 sessions around these needs."`  
**Maya effect:** Maya shifts from reactive (generate what they ask for) to proactive (I know you have a launch coming — here's what you need to shoot this week). Becomes a true creative director.  
**Why this matters:** The 12-month vision explicitly names "Business milestone integration" as Layer 4. This builds it from the bridge, without waiting for a native calendar feature.

---

### Scenario 4: Academy course completion feedback
**Trigger:** User completes a course in the SSELFIE Academy (trackable via `user_lesson_progress` or `academy_course_purchases`)  
**ClawDBot action:** Push a context note immediately after completion:  
`"User just completed 'Lighting for Personal Brand Photos' in the Academy. She now understands golden hour and soft natural light. Reference this knowledge — suggest concepts that apply what she's just learned. Don't explain basics she already knows."`  
**Maya effect:** Maya can say: "I see you just finished the lighting course — nice. Let's put that golden hour knowledge to work. Here are three concepts designed specifically around the techniques you just learned."  
**Why this matters:** Directly addresses the "Academy integration" gap flagged in the Maya Intelligence Brief (Layer 4, Months 6–10). Bridges two product surfaces that currently have zero awareness of each other.

---

### Scenario 5: Subscription renewal intelligence
**Trigger:** `stripe-new-member` or subscription renewal event via `notifyNorth` (already firing)  
**ClawDBot action:** On first successful renewal (2nd billing cycle), push an acknowledgment:  
`"This user has now been an active member for 30+ days. She's a committed user, not a new trial. Maya should treat her as a power user — skip the basics, go deeper on creative direction, and reference her build-up of concepts."`  
**Maya effect:** Maya calibrates her tone to match engagement level. A 30-day member gets more ambitious creative direction than a day-1 signup. Less hand-holding, more editorial precision.  
**Why this matters:** Today every session starts the same regardless of tenure. This closes the gap identified in the brief: "Maya has no awareness of how long the user has been on the platform."

---

## 4. What OpenClaw Needs to Do

### Authentication
Store `STELLA_BRIDGE_TOKEN` as a secret in OpenClaw's vault. This is the same token configured in SSELFIE's environment. Pass it as:
- `Authorization: Bearer <token>` header (preferred), OR
- `x-stella-token: <token>` header, OR
- `"token": "<token>"` in the JSON body

### The inject_maya_context call

```json
POST https://sselfie.ai/api/stella/bridge
{
  "action": "inject_maya_context",
  "token": "<STELLA_BRIDGE_TOKEN>",
  "userId": "<neon_user_id>",
  "contextNote": "<plaintext intelligence note for Maya>"
}
```

**Field specs:**
- `action` — must be exactly `"inject_maya_context"`
- `userId` — the Neon `users.id` TEXT value (e.g., `"usr_abc123"` or a UUID string matching the SSELFIE users table)
- `contextNote` — free text, no length limit imposed by the endpoint, but keep under 2000 characters for clean prompt injection. Plain text, no markdown required (Maya will handle it naturally).

### Getting the Neon userId
Currently `notifyNorth` sends `customerId` (Stripe). For context injection, OpenClaw needs the Neon `users.id`. Options:
1. **Extend `notifyNorth`** — add `neonUserId` to the `NorthEvent` payload (requires a small backend change to the Stripe webhook to look up the user ID and pass it along)
2. **ClawDBot lookup** — when OpenClaw receives a Stripe event, it queries SSELFIE for the user: `GET /api/admin/user-lookup?email=<email>` (if this endpoint exists or is built)
3. **Store the mapping in ClawDBot** — when a `stripe-new-member` event arrives, ClawDBot holds onto the email; later it queries SSELFIE to resolve to a Neon ID as needed

Option 1 is the cleanest long-term solution. It requires one line added to `lib/north-notifier.ts` and a user lookup in the Stripe webhook handler.

### Writing a context note — timing guidance
- **Write once per trigger**, not per session. The note persists in the database until overwritten.
- **Overwrite freely** — the upsert replaces the previous note for the same user. Keep context notes current and relevant. A stale note from 3 weeks ago is worse than no note.
- **Clear after use (optional)** — the bridge could expose a `clear_maya_context` action if you want notes to be single-use (Maya uses it once, then it's cleared). Not currently implemented but trivial to add.

---

## 5. The 12-Month Vision: Context Notes as the Foundation of Agent-to-User Intelligence

### Where we are today (Month 0 baseline)
The bridge is live and bidirectional. SSELFIE pushes Stripe events to OpenClaw (new members, cancellations, payment failures). OpenClaw can now push context notes into Maya for any user. This is **read-write** between the two systems.

### Months 1–3: Context note richness
The `contextNote` field is free text today. In the near term, ClawDBot should structure its notes with consistent sections:

```
[TIMING] User last active: 3 days ago
[CONTENT] Last session: luxury editorial, wellness coaching concept
[SIGNAL] Recent Instagram post performance: above average engagement
[INTENT] User mentioned wanting to promote spring retreat (from DM thread)
[DIRECTIVE] Lean into travel/coastal content this session
```

Maya doesn't need structured parsing — she reads this naturally as prose and acts on it. But structured notes make it easier for ClawDBot to compose them programmatically and for the team to audit what intelligence is flowing.

### Months 3–6: Expand the bridge's action vocabulary
The bridge currently supports two actions:
- `message` → Stella AI reply (existing)
- `inject_maya_context` → write a context note (new today)

The next actions to build:

| Action | What it does |
|---|---|
| `get_user_summary` | ClawDBot requests a Maya-generated summary of a user's recent creative activity (for CRM enrichment) |
| `trigger_concept_generation` | ClawDBot triggers Maya to pre-generate 3 concepts for a user (delivered via push notification or email) |
| `update_styling_notes` | ClawDBot writes to `personalized_styling_notes` directly (a more permanent memory lane than `contextNote`) |
| `clear_maya_context` | Clear the current agent context note after it's been consumed |
| `get_user_context` | Read the current context Maya has for a user (audit trail for ClawDBot) |

### Months 6–9: Context becomes longitudinal memory
Today's context note is single-record, last-write-wins. In Month 6, upgrade to a `maya_agent_context_log` table:

```sql
CREATE TABLE maya_agent_context_log (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  context_note TEXT NOT NULL,
  source TEXT DEFAULT 'clawdbot',
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

`get-user-context.ts` queries the last N unconsumed notes and injects them in order. After injection, marks them `consumed_at = NOW()`. Now Maya has a feed of agent intelligence, not just one sticky note.

### Months 9–12: Proactive AI operating system
The endgame: ClawDBot doesn't just push context when triggered — it watches signals across the member's entire lifecycle and pushes intelligence proactively, without a human initiating it.

- **Trend injection:** A weekly cron in ClawDBot monitors Instagram trend data, cross-references each member's niche, and pushes a context note: "Coastal autumn aesthetics are trending in wellness coaching accounts this week — relevant for this user."
- **Churn prevention:** At day 5 of inactivity, ClawDBot pushes a warm context note into Maya AND sends a personal-feeling outreach via the existing Telegram bridge: "You were building something beautiful. Here are 3 concepts ready for you."
- **Quarterly brand audit:** Every 90 days, ClawDBot aggregates a user's full concept history, active subscription duration, most-used categories, and favorite images. Pushes a structured context note that Maya uses to open the next session as a full brand check-in.
- **Model drift detection:** ClawDBot monitors generation quality signals (user feedback, favorites rate). When quality drops, pushes a context note and triggers a retraining recommendation.

### The architectural bet this rests on
> **The bridge is not a notification channel. It's a shared memory layer.**

Today it looks like a messaging bus (ClawDBot sends events, SSELFIE sends events). The 12-month evolution is treating the bridge as a shared state store where every agent — whether running inside SSELFIE, inside OpenClaw, or in a future third system — can read and write to a user's current context. Maya becomes the presentation layer for intelligence that lives across the whole stack.

This is the infrastructure that makes "Maya as Personal AI OS" real: not a single smart chat interface, but a user representation that every agent in the ecosystem can read from and write to.

---

## Appendix: Files Changed in This Implementation

| File | Change |
|---|---|
| `app/api/stella/bridge/route.ts` | Added `inject_maya_context` action handler — validates fields, upserts context note into `maya_personal_memory.memory_data` JSONB |
| `lib/maya/get-user-context.ts` | Added query for `memory_data->>'agent_context_note'` in parallel fetch block; injects `=== AGENT CONTEXT ===` section into Maya's system prompt if note exists |

No schema migrations required. The `memory_data` JSONB column in `maya_personal_memory` absorbs the new key via `||` merge, preserving all existing data.

---

*Spec produced 2026-02-26 by integration architecture agent. Based on audit of `app/api/stella/bridge/route.ts`, `lib/north-notifier.ts`, `app/api/webhooks/stripe/route.ts`, `lib/maya/get-user-context.ts`, `lib/data/maya.ts`, `scripts/00-create-all-tables.sql`, and `docs/MAYA-INTELLIGENCE-BRIEF-2026-02-26.md`.*
