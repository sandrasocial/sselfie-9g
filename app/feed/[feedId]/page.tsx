import { notFound } from "next/navigation"

// SEALED 2026-07-14 (Sandra-approved; audit: docs/audits/SUITE_CALENDAR_AUDIT_2026-07-14.md P0-1).
// This page rendered a member's feed plan (name, handle, captions, image URLs, bio,
// highlights) by sequential numeric id with NO auth and NO ownership check. In production
// it happened to 404 for every request anyway: the Next async-params migration left
// `params` un-awaited here, so the id never resolved - broken-closed by accident, not by
// design. This unconditional notFound() makes the closure deliberate so no future refactor
// can silently reopen the exposure. It is also zero behavior change: prod already 404s.
// If a publishing hub returns, it lives inside the authed suite Calendar, never on a
// public URL.
export default function FeedPage() {
  notFound()
}
