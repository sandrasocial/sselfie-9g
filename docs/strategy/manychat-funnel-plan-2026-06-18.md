# ManyChat funnel — strategy + setup plan (2026-06-18)

Goal: stop the free-pack over-delivery leak, make each post deliver the EXACT prompt it showed (aivideoskool model), capture email every time, push the Vault, and set ManyChat up ONCE so Sandra never builds a new automation per reel.

## The core strategic shift: free = the taste, Vault = the meal

**Today (leaks):** the free `/ai-prompts` is a whole PACK of prompts. It over-delivers — people get enough free prompts that they have no reason to buy the Vault (confirmed in the funnel-conversion audit). The keyword delivery is also built per-post by hand.

**New model (how aivideoskool does it):** every post gives away ONLY the single exact prompt shown in that post. The paid Vault becomes "all of them, organized, plus new drops." The free single prompt creates appetite ("if one prompt is this good…"), it does not satisfy it.

| Tier | Old | New |
|---|---|---|
| FREE | a pack of prompts (satisfies) | the ONE prompt from the post (a taste) |
| VAULT $27 | "more prompts" (weak upgrade) | the full named library + new drops (the obvious next step) |
| SUITE €97 | Maya makes them for you | unchanged — the "done for you" tier |

**Recommendation: reposition, do NOT delete the free.** Keep a free entry (it grows the list ~2,600 opt-ins/mo), but the free thing is now a single prompt, not a library. Critically, KEEP email capture on it — that list is the only way to nurture to Vault/SUITE.

## How aivideoskool avoids building an automation per post

He does NOT make a new automation per reel. The trick: **one evergreen comment trigger set to "any post / all future posts,"** keyed to a keyword. Sandra has been using the per-post version ("this specific post + this keyword"), which is why she rebuilds it every time. The fix is to switch to the all-posts evergreen trigger and let the keyword (a number) do the routing.

He uses **numbered keywords** ("Comment 220") instead of words. Why numbers win:
- Unique per prompt → he can see exactly which prompt drives demand.
- Implies a huge library ("there are 220+ of these") → makes the Vault feel inevitable.
- Collectible / series feel.

## The system (target architecture)

**ONE evergreen flow, content lives in Sandra's app, ManyChat touched once.**

1. **Trigger (set once):** one comment-trigger growth tool scoped to ALL posts/reels + a matching DM keyword trigger, listening for a number (and for "PROMPT"). Catches comments AND typed DMs (fixes the typed-text-gets-nothing leak).
2. **Opening DM (Meta-compliant):** a button first ("Tap and I'll send prompt #14 🤍" → [Send it]). Required — IG won't let the bot open cold without a tap.
3. **Deliver the single prompt** via a link to `sselfie.ai/p/{number}` — a lightweight single-prompt page in her app.
4. **The page does 3 jobs:** (a) light email gate ("enter email to copy the full prompt") → keeps list growth, (b) shows the ONE prompt, (c) upsells the Vault right there ("this is 1 of [X]. Get every shoot world → $27").
5. **In-DM follow-up:** "Want the whole Vault? → See it" button + capture email if not already. Tag as prompt-requester → a short DM nurture sequence (24h window) + the email nurture.

**Why the page (not raw prompt text in the DM):** the prompt lives in HER app/DB, so a new post = she just publishes the prompt at `/p/{number}` — she never opens ManyChat. It also lets her email-gate + Vault-upsell, which a raw DM can't do well.

### Zero-touch routing (the "set once forever" piece)
Two ways to map number → prompt:
- **Interim (no code, this week):** one flow with a small keyword list — add the new number as a keyword row when she posts. One place, ~20 seconds, NOT a new automation. Stops the per-post-build pain immediately.
- **Target (Codex build):** a ManyChat External Request to a tiny endpoint (`/api/manychat/prompt?n=14`) that returns the prompt + Vault CTA, OR the flow just routes to `sselfie.ai/p/{number}` dynamically. Then she truly never touches ManyChat — she only publishes the prompt in her app. This is the aivideoskool model, done better (email + No-Fake + her own platform).

## What to build (Codex queue)
1. **Single-prompt pages** `sselfie.ai/p/{number}` — email-gated, shows one prompt, Vault upsell. Numbered to match the post.
2. **Number the Vault prompts** (give every prompt/collection a stable number) so posts and pages line up.
3. **ManyChat external-request endpoint** (optional, the zero-touch upgrade) so the number in the comment resolves to the right prompt automatically.
4. **Reposition `/ai-prompts`**: from "pack" to "single rotating taste + Vault pitch" (aligns with the existing `codex/freebie-curation` cap work).

## Keyword scheme (going forward)
- **A number per prompt post** → that exact prompt + Vault upsell. (the new default for prompt reels)
- **SELFIE** → free selfie guide (keep — it's her biggest DM driver).
- **ANDROID** → Android variant (keep).
- Retire the generic "PROMPT → whole pack" as the satisfy-the-desire path.

## What this fixes (the leaks, by name)
- Over-delivery → free is now one prompt, not a library.
- Manual per-post automations → one evergreen trigger, content in her app.
- No-email-capture on cold DM buyers → page + DM both capture email.
- Typed-text-gets-nothing → trigger catches DMs + comments, opening is a tappable button.
- No per-post tracking → numbers tell her which prompt sells.

## Decisions — LOCKED by Sandra 2026-06-18
1. ✅ Free = single exact prompt per post (taste); Vault = full library + drops.
2. ✅ Light email gate on the free prompt (protect list growth + nurture).
3. ✅ Numbered keywords per prompt post (SELFIE + ANDROID stay as words).

Build spec: `tasks/MANYCHAT-FUNNEL-01-numbered-prompts.md` (Codex).
