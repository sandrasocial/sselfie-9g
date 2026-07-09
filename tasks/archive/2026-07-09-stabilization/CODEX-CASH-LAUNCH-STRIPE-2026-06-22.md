# Codex Spec — Cash Launch Stripe + Trial Setup (Sandra approved 2026-06-22)

**Owner:** Codex (Stripe + checkout + activation). **Approved by Sandra 2026-06-22** (founding €697, first 25, lifetime-locked; $27→$37 flip; trial fix).
**Strategy:** `docs/business/VAULT_FLASH_LAUNCH_2026-06.md` + `docs/business/FOUNDING_ANNUAL_LAUNCH_2026-06.md`
**Guardrails:** money only from `stripe_payments`/Stripe API. Existing members' lifetime founding deal (BETA coupon) is untouchable. No new outward copy without Sandra (copy here is already approved). These changes gate the list sends — confirm each to Sandra when live.

---

## T1 — Vault price flip $27 → $37 (after the flash window)
- **When:** Saturday 2026-06-27 00:01 (right after the flash deadline Fri Jun 26 23:59). Sandra fires the flash emails this week; the flip must be scheduled/ready so the "$27 → $37" deadline is true.
- **Do:** create/activate a $37 one-time price for the Prompt Vault; point `/checkout/prompt-vault` (and the freebie checkout URL builder) at $37 from the flip time. New buyers after the deadline pay $37. One-time product, so no existing-subscriber concern.
- **Keep:** every place that shows the price (sales page "$27", email/CTA copy) — leave the launch copy as-is; after the flip, update the standing `/prompt-vault` price references $27 → $37.
- **Acceptance:** before Sat, checkout charges $27; after the flip, $37; no checkout breaks; Sandra notified when flipped.

## T2 — Founding Annual SUITE price €697/yr (the $20K engine)
- **Create:** a founding annual price of **€697/year** (vs the standing €970/yr annual). Either a dedicated Stripe price or a founding promo on the annual price — whichever keeps the subscription renewing at €697 for life (founding members must NOT roll to €970 at renewal).
- **Checkout link:** `/checkout/membership?interval=annual&plan=founding&source=founding_launch` resolves to the €697 founding price (with the existing pre-Stripe email capture + proof line already shipped). This is the URL the founding emails point at.
- **Scarcity — first 25:** track founding-annual purchases (from `stripe_payments` / subscriptions). When 25 founding annual members exist OR the window (Sun 2026-07-05 23:59) closes, the founding link reverts to the standing €970 annual. Expose a live count Sandra can read (for the "X of 25 gone" IG/story line — only show real numbers).
- **Acceptance:** founding link charges €697/yr and renews at €697; standing annual stays €970; cap/window correctly closes founding; existing members unaffected; Sandra can see the founding count.

## T3 — Ship TRIAL-FRONTDOOR-01 before the founding window (Jun 29)
- New members must reach their first photo or the recurring money churns. Implement the existing `tasks/TRIAL-FRONTDOOR-01` first-run fix (remove the password detour before `/app`, make "add one selfie" the single first action, post-upload promise/preview). Ship before 2026-06-29.
- **Acceptance:** a brand-new member lands in `/app` and the single obvious first action is "add one selfie"; no password wall in between; first-run reaches a generated photo.

## T4 — Send coordination (Sandra fires; do not auto-send)
- Email templates are built and tested: `lib/email/templates/vault-flash-launch.ts` (3) and `lib/email/templates/founding-annual-launch.ts` (5).
- Flash sends this week (after T1 is scheduled). Founding sends Mon Jun 29 → Sun Jul 5 (after T2 + T3 live). The list broadcast is Sandra's send, not an auto-cron. Confirm to her when T1/T2/T3 are live so she can fire.

---

## Sequence
1. T1 scheduled + T2 founding price/link live → Sandra fires the Vault flash this week.
2. T2 cap/window + T3 trial fix live by Jun 29 → Sandra fires the founding sequence Jun 29.
3. Money read from `stripe_payments` only.
