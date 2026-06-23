# Codex — Launch e2e handover (Vault flash + Founding annual)

**From Claude, 2026-06-23.** All content is final, tested, and on main. This is the single checklist to take the launch end to end. **Every send to a real audience is Sandra's own click — never auto-send.**

## Already done + verified (do not redo)
- **Stripe:** Vault $27→$37 flip scheduled (Sat 2026-06-27 00:01 Oslo, `price_1TlDJwEVJvME7vkw8BYjwqi3`). Founding annual €697/yr live (`price_1TlDJxEVJvME7vkwown2wYzc`), founding checkout `/checkout/membership?interval=annual&plan=founding` resolves €697 under 25 spots / before 2026-07-05 23:59 Oslo, else €970. (`CODEX-CASH-LAUNCH-STRIPE-2026-06-22.md`)
- **Broadcast pipeline fixed (011f77f5):** `sendNewsletterBroadcast` now calls `broadcasts.send` after create; only marks `sent` on confirmation. Cron `send-scheduled-newsletters` registered.
- **Trial front-door** verified present (claim → /app, no password detour, selfie-first).
- **Proof on pages** live (Vault, membership, checkout-capture).
- **All launch copy FINAL + tested** (price-block redesign approved by Sandra):
  - Flash (3): `lib/email/templates/vault-flash-launch.ts` — announce / proof / last-call.
  - Founding (5): `lib/email/templates/founding-annual-launch.ts` — open / proof / value / objection / last-call.
  - Greeting renders "Hey love," (no merge tags → passes `assertNoUnsupportedBroadcastMergeTags`).

## To complete e2e

### 1. Safe-test capability (do first)
The sender targets the global `RESEND_AUDIENCE_ID` (Main Audience) — there is no way to aim a test at one person. Add a per-campaign audience override (read `target_audience.audience_id` and prefer it over the env) so a campaign can target a 1-person test audience. Without this, any "test" hits the whole list.

### 2. Pipeline delivery test (Sandra only)
Create a one-person audience (just `ssa@ssasocial.com`), send the flash **announce** through the fixed path, and **confirm it lands in Sandra's inbox** (not just DB `status='sent'`). This proves the fix delivers. (`CODEX-CREATE-FLASH-BROADCAST-2026-06-23.md`)

### 3. Confirm the real Main Audience size
Skill file says ~2,965; CLAUDE.md says 6,589. Report the actual number before any list send.

### 4. Build the drafts (do NOT send — Sandra sends each)
For each, create a Resend broadcast to the **Main Audience**, leave it a **DRAFT** in the dashboard:
- **Flash announce** (`generateVaultFlashAnnounceEmail`) — Sandra sends today/tomorrow AM.
- **Flash proof** (`generateVaultFlashProofEmail`) — for Wed.
- **Flash last-call** (`generateVaultFlashLastCallEmail`) — for Fri. (Price flips Sat 00:01.)
- **Founding 1-5** (`generateFoundingAnnualOpenEmail` … `…LastCallEmail`) — for Jun 29 → Jul 5.
Render each with `firstName: "love"`. Subjects come from the templates.

### 5. Report back
Confirm: (a) per-campaign audience override shipped, (b) Sandra-only announce test landed in her inbox, (c) real Main Audience size, (d) all drafts are sitting in the Resend dashboard ready for Sandra's send.

## Guardrails
- Never send to the Main Audience — Sandra clicks send, every time.
- Use the template output verbatim (already Sandra-approved). No-Fake, no em-dashes (already compliant).
- Money numbers from `stripe_payments` / Stripe only.

## Timeline
Flash: announce (now) → proof (Wed) → last-call (Fri) → $27→$37 flip Sat 00:01 Oslo.
Founding: open (Mon Jun 29) → … → last-call (Sun Jul 5), €697 first-25 lifetime-locked.
