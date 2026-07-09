# Free → Paid Offer Fix (AI Prompts → $27 Vault)

Date: 2026-06-13 · Owner: Claude (Cowork) brief, Sandra approves direction
Governed by: `docs/funnel/NO_FAKE_AI_BRAND_PSYCHOLOGY_2026-06-10.md` (doctrine) and
`docs/funnel/PROMPT_VAULT_MEMBERSHIP_REPOSITION_PLAN_2026-05-27.md`.

Historical experiment input:
`docs/archive/2026-07-09-documentation-cleanup/PROMPT_VAULT_7_DAY_VALUE_CERTAINTY_TEST_2026-06-01.md`.

## Thesis (one line)

The free→paid bridge is not broken. It is flat. We win activation on the free pack and
then waste it with an abstract, single-touch ask. Fix the ask, make the gap visible, and
add proof. Do not touch the price or weaken the magnet.

## The numbers this is built on (live, 2026-06-13)

- Free delivery email (`ai_prompts_delivery`): **34% click**. The magnet works.
- The $27 offer email (`ai-prompts-day7`): **0.7% click**. The ask doesn't land.
- The trial email (`ai-prompts-day10`): **0% click**.
- ~2,140 engaged free prompt-copiers in 90 days produced a few dozen Vault sales.
- Checkout works (21 Vault sales last 30 days), so this is not a code break. It is the offer.

## What the customer actually has vs. what they can buy

- **Free pack:** shot **1 of each** of ~10 collections (`lib/ai-prompts/prompt-data.ts`,
  `FREEBIE_COLLECTION_PREVIEWS`). One complete, polished, usable image per world.
- **$27 Vault:** the full arc of each collection. 10 collections, 7 to 14 shots each, **92
  prompts** (`app/access/prompt-vault/[token]/page.tsx`). Each is a narrative: arrival →
  seated hero → detail → reel-cover exit, etc.

So the gap is real and good: free is a taste, paid is the story. The problem is the taste
**satisfies** instead of **teases.**

## Root cause: a complete shot kills the craving

1. **Value certainty cuts both ways.** One finished, beautiful shot does the whole job for
   a profile pic. The user is *certain* they already got value, so urgency dies. They don't
   feel what they're missing because one shot doesn't read as "1 of 9."
2. **The ask is poetic, not concrete.** Day-7 says "the full visual world," "a direction you
   can recognize yourself inside." Lovely, but it tells instead of shows. It never names the
   specific shots they're missing from the collection they already tasted, never shows the
   images, never handles an objection, never proves it.
3. **It's one soft touch, then a confusing jump.** Day-7 asks once. Day-10 then skips the
   $27 entirely and pushes a SUITE trial ("skip the prompts, meet Maya"). That undercuts the
   Vault we just offered and muddies the ladder.
4. **Activation is the hinge and we're not pressing it.** Docs: 75% revenue retention if a
   user sees a result in 7 days, 23% if not. We get 34% clicks on the free delivery, then
   stop converting that into a paid reason.

## The strategy: turn the taste into a craving (4 moves)

### Move 1 — Make the gap visible inside the free experience
On the free access page, reframe each free shot as **"Shot 1 of 9 · Quiet Luxury London,"**
with the remaining shots shown as locked/teased tiles (blurred image + title). One complete
shot feels done. "Shot 1 of 9, eight more locked" feels like a story you're one page into.
This is the single highest-leverage structural change. *(Becomes a Codex task; I'll spec it.)*

### Move 2 — Make the offer concrete and visual, not poetic
The offer email names the exact shots they're missing from the collection they already used,
with the example images and the arc spelled out. "You made the half-light close-up. Here's
the other eight in that world: the café arrival, the seated hero, the reel-cover exit..."
Show the story they're one shot into.

### Move 3 — Put proof + objection-handling in the ask
The archived objection tracker names them: *will it work for me, how do I use it, ChatGPT
friction, price pause*
(`docs/archive/2026-07-09-documentation-cleanup/PROMPT_VAULT_PROOF_AND_OBJECTION_TRACKER_2026-06-01.md`).
Each gets one line of answer and one real buyer result. Stop asking cold.

### Move 4 — Make it a 3-touch micro-sequence, not one email
- **Day 7:** the concrete offer (the missing shots from the world they tasted).
- **Day 9:** proof + the 2-minute how (kills "will it work / how do I use it / ChatGPT friction").
- **Day 11:** light why-now.
Then the SUITE trial moves to **day 14+**, reframed as "loved the Vault? the Studio does this
for you automatically," not "skip the prompts." The $27 rung comes before the membership rung.

## What NOT to do (locked)

- **Don't weaken the free pack.** It's the magnet (34% clicks). Keep the taste generous; add
  the *visible* gap, don't remove value.
- **Don't reroute prompt buyers into Starter Kit or Studio software** as the next step. They
  asked for ChatGPT prompts. The $27 Vault is the right next rung; SUITE comes after.
- **No-fake doctrine, always:** keeps your face, recognizable, true-to-you, AI-assisted,
  editorial. Never "no one will know," "look rich," "fake," "perfect face." Never "learn
  prompts" (this is creative direction, not education).
- **Don't discount the $27** without Sandra's approval. Strengthen proof, not price.
- No em-dashes in any copy. Use a period, colon, or middle dot for price separators.

## Lane / next steps

- **Claude now (on Sandra's reaction to this brief):** rewrite the day-7 single email into the
  3-touch concrete + proof + objection sequence; reorder the day-10 SUITE trial to day 14+.
  Drafts go to Sandra for approval before anything sends (locked rule: no autonomous sends).
- **Codex later (Claude specs it):** the "Shot 1 of 9, rest locked" teasing on the free
  access page (Move 1). Separate from `/app`, no collision.
- **Decision for Sandra:** approve the direction + the day-10 reorder, then I draft the emails.
