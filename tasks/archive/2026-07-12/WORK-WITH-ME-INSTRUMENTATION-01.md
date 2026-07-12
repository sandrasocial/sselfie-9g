# WORK-WITH-ME-INSTRUMENTATION-01 — See what's actually happening on the warm-lead page

## Why

From Codex's 2026-07-12 audit ("zero persisted Work With Me applications") plus verification the same
day. Checked the actual form (`InquiryForm` in `components/sselfie/public-marketing.tsx`): it's
already a real, well-built qualifying form — name/email/Instagram, two open questions about what's
stuck and what she wants next, current offer, a help-focus picker, AND an existing budget qualifier
("Are you open to a private €2,000 sprint if it is the right fit?"). This is not a thin form missing a
qualification step — Codex's read of "add one qualification question" doesn't match what's actually
built.

The real gap: **zero analytics instrumentation anywhere on this page or form.** No page-view event, no
form-start event, no submit-success/error event logged to `analytics_events` — confirmed by grep,
nothing in `app/work-with-me/page.tsx` or `InquiryForm` calls `logAnalyticsEvent`. Combined with the
page having been substantially rewritten only 2026-07-10 (2 days before this audit) and 0 applications
in `brand_engine_applications` since, there's currently no way to tell whether this is "nobody's
visited yet," "people visit but bounce immediately," or "people start the form and abandon partway."
Don't guess and redesign — instrument first, per the audit's own "only investigate UI changes at the
step where the measured drop occurs" principle.

OWNER: codex

## Scope

- Add `logAnalyticsEvent` calls (same pattern used elsewhere, e.g. `masterclass_checkout_email_capture_view`
  in `app/checkout/masterclass/page.tsx`) for three moments:
  1. `work_with_me_landing_view` — page view, server-side in `app/work-with-me/page.tsx` (mirror how
     other landing pages log their view event).
  2. `work_with_me_application_started` — fires once, first time any form field is touched (not on
     every keystroke — debounce or fire-once via a ref/state flag).
  3. `work_with_me_application_submitted` — on successful submit (the existing `setSuccess(true)`
     branch in `InquiryForm`), and a `work_with_me_application_failed` on the existing error branch.
- Do NOT change the form's fields, copy, question order, or the existing qualifier question — this
  task is instrumentation only. Do not add a new pre-form qualification step; that's a redesign
  decision to make later, with real drop-off data in hand, not now.
- Do NOT touch `app/api/inquiry/submit/route.ts`'s DB/email logic beyond what's needed to fire the
  submitted/failed events at the right point.

## Acceptance

- All three (four, counting the failure case) events fire correctly and appear in `analytics_events`
  within a day of a real visit/submit.
- No visible or behavioral change to the page or form for a visitor.
- A follow-up note in `tasks/README.md`'s Held section: once 1-2 weeks of real data exist, revisit
  whether a progressive-disclosure redesign (Codex's original suggestion) is actually justified by
  where the real drop-off is, or whether the form is fine and the page just needs more traffic/time.
