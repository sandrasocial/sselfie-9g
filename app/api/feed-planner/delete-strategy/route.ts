import { NextResponse } from "next/server"

// Retired after the caller audit in docs/audits/SUITE_CALENDAR_AUDIT_2026-07-14.md.
export const POST = () =>
  NextResponse.json({ error: "FEED_PLANNER_ROUTE_RETIRED" }, { status: 410 })
