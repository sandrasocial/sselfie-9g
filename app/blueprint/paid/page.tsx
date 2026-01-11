import { redirect } from "next/navigation"

/**
 * Phase 2.2: Redirect Blueprint Routes to Feed Planner
 * 
 * All blueprint routes now redirect to /feed-planner
 * This consolidates blueprint functionality into the Feed Planner
 */
export default function PaidBlueprintPage() {
  redirect("/feed-planner")
}
