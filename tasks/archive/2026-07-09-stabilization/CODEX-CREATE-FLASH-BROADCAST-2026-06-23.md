# Codex Task — Put the Vault Flash announce into Resend (test first, then a draft for Sandra)

**Owner:** Codex (needs the PROD full-access Resend key — Claude's key is send-only and 403s on broadcasts/audiences). **Approved by Sandra 2026-06-23.**
**Why:** The flash content is approved and tested, the send pipeline is fixed (011f77f5), but there is no broadcast in Resend yet because nothing could create one. Create it the safe way: prove delivery to Sandra only, then hand her a ready-to-send Main Audience draft.

## Content (use verbatim — already Sandra-approved, do not rewrite)
Render `generateVaultFlashAnnounceEmail({ firstName: "love" })` from `lib/email/templates/vault-flash-launch.ts`.
- Subject: `your $27 Vault window (it closes Friday)`
- Greeting renders as "Hey love," (no merge tags → passes `assertNoUnsupportedBroadcastMergeTags`).
- From: `Sandra from SSELFIE <hello@sselfie.ai>` · Reply-to: `hello@sselfie.ai`
- The body's "$27 → $37 Friday" is true: the Vault price flip is already scheduled for Sat 2026-06-27 00:01 Europe/Oslo.

## Steps
1. **Verify the real Main Audience size first** and report it. The skill file says ~2,965; CLAUDE.md says 6,589. We are not sending to a list of unknown size.
2. **Pipeline delivery test (Sandra only):**
   - Create a one-person audience containing only `ssa@ssasocial.com` (or reuse an existing test audience).
   - Create + `broadcasts.send` the announce to that audience through the fixed path.
   - **Confirm it actually arrives in Sandra's inbox** — not just DB `status='sent'` or a Resend "draft". This is the real proof the `broadcasts.send` fix delivers.
3. **Main Audience draft (do NOT send):**
   - Create a second broadcast with the same content to the Main Audience (`3cd6c5e3-fdf9-4744-b7f3-fda7c8cdf6cd`).
   - Leave it as a **DRAFT** in the Resend dashboard. Sandra sends it herself with her own click. Do not auto-send.
4. **Report:** confirm (a) the Sandra-only test landed in her inbox, (b) the real Main Audience size, (c) the Main Audience draft is sitting in the dashboard ready for Sandra.

## After Sandra sends the announce
Same pattern for the rest of the flash: proof email (Wed) and last-call (Fri) as Main Audience drafts for Sandra to send. Templates: `generateVaultFlashProofEmail`, `generateVaultFlashLastCallEmail` (same file). Then the founding sequence (`lib/email/templates/founding-annual-launch.ts`, 5 emails) for Jun 29 → Jul 5.

## Guardrails
- Do NOT send anything to the Main Audience — that send is Sandra's click, every time.
- Use the approved copy verbatim. No-Fake, no em-dashes (already compliant).
- Money numbers from `stripe_payments`/Stripe only.
