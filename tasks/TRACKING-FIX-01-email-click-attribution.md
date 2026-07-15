# TRACKING-FIX-01 — resolve the 99-clicks vs ~24-visits attribution gap

Status: READY for Codex 2026-07-14. Build/investigate on a branch now; merge after 2026-07-15
18:05 CEST. BLOCKS the campaign test (contract v2 precondition: no conversion conclusions until
this is explained).

## The discrepancy

The One Selfie "Open" broadcast recorded 99 clicks (Resend) while `analytics_events` attributed
~24 email-source `offer_landing_view` events to `/one-selfie` in the same window.

## Investigate, in order

1. **Bot/prefetch inflation**: Apple Mail Privacy Protection and security scanners follow links.
   Check Resend click metadata (user agents, timing bursts, duplicate IPs) if available; quantify
   how many "clicks" are machine.
2. **Attribution loss**: does `/one-selfie` fire `offer_landing_view` reliably (client-side only?
   blocked by consent/adblock? SSR vs hydration race)? Do UTM params survive every email link
   variant and any redirects (www vs apex, http→https)? Is the event deduped per session in a way
   that undercounts?
3. Cross-check denominator: server logs / Vercel analytics for `/one-selfie` requests in the
   window vs analytics_events count.

## Fix + acceptance

- Ship whatever the evidence demands (server-side view logging for offer pages, UTM persistence,
  bot filtering note in admin reporting) — smallest fix that makes email→landing measurable.
- Document the verdict in the PR: how many of the 99 were human, where the loss was, and the new
  trustworthy funnel numbers for the event window (feeds Thursday's postmortem).
- Admin Data Contract holds: behavior from `analytics_events`, money from `stripe_payments` only.
- Full suite green before merge.
