// SSELFIE Studio 3.0 - Feed Planner Phase 2b: Maya auto-drafts the month.
// POST-only (has side effects: writes feed_layouts/feed_posts rows). Fired once per user per
// calendar month by the Calendar tab / standalone /feed-planner route on open, when no plan
// exists yet for the current month - see app/feed-planner/feed-planner-client.tsx.
//
// Thin auth wrapper: the lock, guards, LLM call, and write all live in
// lib/feed-planner/auto-draft.ts, shared with the monthly rollover cron.

import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { draftMonthPlanForUser } from "@/lib/feed-planner/auto-draft"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST() {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const neonUser = await getUserByAuthId(user.id)
  if (!neonUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

  try {
    const outcome = await draftMonthPlanForUser(user.id, neonUser.id)
    if (outcome.created) return NextResponse.json(outcome)
    if (outcome.reason === "draft_in_progress") return NextResponse.json(outcome, { status: 409 })
    if (outcome.reason === "generation_failed") return NextResponse.json(outcome, { status: 502 })
    return NextResponse.json(outcome)
  } catch (error) {
    console.error("[feed-plan draft] failed:", error)
    return NextResponse.json({ created: false, error: "draft_failed" }, { status: 500 })
  }
}
