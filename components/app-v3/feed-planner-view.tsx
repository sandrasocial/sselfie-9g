"use client"

// SSELFIE Studio 3.0 - Calendar tab (Feed Planner Phase 2, 2026-07-06).
// Thin wrapper: reuses FeedPlannerClient's data/wizard-routing logic completely unchanged
// (free/paid-blueprint/membership branching, onboarding wizard, welcome wizard, activation
// checklist - all untouched). This mounts the SAME client that powers the standalone
// /feed-planner route inside the Suite shell's Calendar tab. Its presentational children
// (FeedHeader, FeedTabs, the grid, the post editor) are what carry the visual rebuild -
// changing them here also upgrades the standalone route for any Blueprint-only buyer who
// isn't a Suite member, since both paths render the same components.

import FeedPlannerClient from "@/app/feed-planner/feed-planner-client"

export function FeedPlannerView() {
  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[#F8FAFA] pb-24">
      <FeedPlannerClient userId="" />
    </div>
  )
}
