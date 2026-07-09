# Codex Spec — Fix the broadcast SEND pipeline (blocks the launch sends)

**Owner:** Codex. **Priority:** Critical — blocks the Vault flash + founding launch sends.
**Found 2026-06-22 while trying to schedule the Vault flash.**

## The problem (three real gaps)
1. **`sendNewsletterBroadcast` creates a draft but never sends it.** In `lib/email/send-newsletter-broadcast.ts` it calls `resend.broadcasts.create(...)` and then marks the campaign `status='sent'` — but it never calls `resend.broadcasts.send(...)`. In Resend, `create` makes a DRAFT; delivery requires a separate send call. So broadcasts via this path do not actually deliver (they sit as drafts), while the DB falsely records `sent`.
2. **The `send-scheduled-newsletters` cron is not registered** in `vercel.json`, so approved+scheduled `admin_email_campaigns` never get processed at all. (I temporarily registered then reverted it, because registering it before gap #1 is fixed would silently create non-delivering drafts.)
3. **The Resend API key in the local env is send-only (restricted)** — it 403s on `broadcasts.create` and `audiences`. Confirm the PRODUCTION `RESEND_API_KEY` has full access (broadcasts + audiences). If prod is also restricted, broadcasts can never send programmatically.

## Fixes
1. In `sendNewsletterBroadcast`: after `broadcasts.create`, when `sendImmediately`, call the Resend send (e.g. `await resend.broadcasts.send(broadcast.id)` — verify the SDK signature for the installed `resend` version). For the scheduled case, either pass `scheduled_at` to a send call or keep the create-with-scheduled_at + send. Only set DB `status='sent'` after a confirmed send (not after create). Keep the `resend_broadcast_id` dupe guard.
2. Verify the PROD `RESEND_API_KEY` is full-access. If not, add a full-access key to Vercel prod env.
3. **Verify end to end before any real send:** send one test broadcast to a tiny test audience (or Sandra only) through the fixed path and confirm it actually delivers (not just a draft). Do NOT trust DB `status='sent'` — confirm in Resend + an inbox.
4. After it's verified, register `/api/cron/send-scheduled-newsletters` in `vercel.json` (e.g. `*/30 * * * *`).

## The launch content is ready and waiting on this
- Approved + tested flash templates: `lib/email/templates/vault-flash-launch.ts` (announce/proof/lastcall).
- Approved + tested founding templates: `lib/email/templates/founding-annual-launch.ts` (5).
- A queued (now `draft`) flash announce: `admin_email_campaigns` id 38, subject "your $27 Vault window (it closes Friday)", audience Main Audience, "Hey love," greeting (no merge tags → passes `assertNoUnsupportedBroadcastMergeTags`).

## Once the pipeline is verified
Re-queue/approve the flash announce for ~09:00 Europe/Oslo, then proof (Wed) and last-call (Fri). Flash price flip is already scheduled for Sat Jun 27 00:01 Oslo. Then the founding sequence Jun 29 → Jul 5.

**Until this is fixed + verified, the fastest reliable send for the flash is Sandra sending it from the Resend dashboard using the approved copy (already in her inbox).**
