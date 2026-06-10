# DM-RELIEF-01 — Instagram DM triage + ManyChat consistency

*Spec by Claude (Cowork) 2026-06-10. Sandra's pain: DM overload + guilt about unanswered
followers + customer-service questions buried in keyword traffic.*

## Existing assets (verified live 2026-06-10)
- ManyChat MCP connected (page id 174704043326739, @sandra.socials, Pro). 18 flows: LIVE =
  Prompt Vault, Prompt Pack Automation, Visibility suite, Private 1:1 May, Menu Item,
  auto-send-link flows. STALE = Sign Up to Masterclass Waitlist (2023), "Imported from
  Rebecca Adehill" folder, Archived Selfie Flow 18 Apr 2025, Selfie Starter Kit Automation,
  duplicate auto-DM flows.
- Repo: /admin/ig-inbox (page + API), /api/webhooks/instagram receiver,
  ig-morning-briefing cron. Instagram Graph connected.
- Doctrine: docs/funnel/NO_FAKE_AI_BRAND_PSYCHOLOGY_2026-06-10.md + Sandra voice rules
  (CLAUDE.md). Resend-access repair exists in /api/admin/customer-support.

## Layer 1 — ManyChat hygiene (do first, same-day value)
1. Pull every live flow's messages/buttons via the ManyChat MCP; extract all URLs.
2. Verify each URL: current page (not a DELETE-01 redirect), full UTM set + cta_keyword +
   source per CLAUDE.md attribution priority. Produce a fix-list; apply fixes Sandra approves.
3. Archive/rename stale flows + tags so new keywords never collide with ghosts.
4. Document the keyword -> flow -> link -> analytics map in docs/funnel/ (agents + Sandra
   share one source of truth).

## Layer 2 — daily DM triage briefing
1. Ingest: last-24h DMs via Instagram webhook receiver (already lands in repo) + ManyChat
   subscriber context (tags = what she bought/opted into).
2. Classify each: needs_help / buying_question / love_note / lead / spam.
3. Draft replies in Sandra's voice (doctrine + voice rules; short, warm, contractions, no
   m-dashes). NEVER auto-send: drafts wait in /admin/ig-inbox with approve/edit/skip.
4. One-tap approved sends go out via ManyChat MCP send (24h window rules respected).
5. Extend ig-morning-briefing email: counts + the 3 most important conversations.

## Layer 3 — auto-resolve known cases (after Layer 2 trust is earned)
- "didn't get my access link" -> resend-access logic, auto-reply with the fix, tagged + logged.
- Everything auto-resolved appears in the morning briefing for audit.

## Rules
- Sandra approves all reply copy patterns before Layer 2 ships; every send is logged.
- Instagram policy: replies only within the 24h window unless via approved message tags.
- Attribution: any link sent in DMs carries source/utm/cta_keyword (CLAUDE.md priority).
