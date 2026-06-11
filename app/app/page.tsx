// SSELFIE Studio 3.0 — /app route (server component).
//
// Access (Phase 1):
// - Not authenticated  → /auth/login (returnTo=/app)
// - Admin (ssa@ssasocial.com) → full unrestricted access to Studio 3.0
// - Everyone else (incl. the 7 current members) → bounced to legacy /studio
//   so the live members stay on the untouched app until the deliberate cutover.

import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { isAdminEmail } from "@/lib/admin-feature-flags"
import { AppV3Shell } from "@/components/app-v3/app-v3-shell"

export const metadata = {
  title: "SSELFIE Studio",
}

// Auth-gated route: always rendered per-request (uses cookies via Supabase).
export const dynamic = "force-dynamic"

export default async function StudioV3Page() {
  let supabase
  try {
    supabase = await createServerClient()
  } catch (error) {
    console.error("[app-v3] Supabase client error:", error)
    redirect(`/auth/login?returnTo=${encodeURIComponent("/app")}`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?returnTo=${encodeURIComponent("/app")}`)
  }

  // APP-CUTOVER-01 Phase 2 gate + BRIDGE-01 Phase D access levels: admin always full;
  // members full; active trials full (with badge); expired trials and one-time owners get
  // the limited shell (Library + Photos stay open, generation locked server-side too).
  // Rollback is one env flip (APP_V3_MEMBERS_ENABLED=false returns members to /studio).
  let accessLevel: "full" | "trial" | "limited" = "full"
  let trialDaysLeft: number | null = null
  if (!isAdminEmail(user.email)) {
    let resolved: "full" | "trial" | "limited" | "none" = "none"
    if (process.env.APP_V3_MEMBERS_ENABLED === "true") {
      try {
        const { getUserIdFromSupabase } = await import("@/lib/user-mapping")
        const neonUserId = await getUserIdFromSupabase(user.id)
        if (neonUserId) {
          const { getSuiteAccess } = await import("@/lib/trial/suite-trial")
          const access = await getSuiteAccess(String(neonUserId))
          if (access.level === "member") resolved = "full"
          else if (access.level === "trial") {
            resolved = "trial"
            trialDaysLeft = access.trialDaysLeft
          } else if (access.level === "limited") resolved = "limited"
        }
      } catch (e) {
        console.error("[/app gate] access check failed, falling back to /studio:", e)
      }
    }
    if (resolved === "none") redirect("/studio")
    accessLevel = resolved
  }

  const firstName =
    (user.user_metadata?.first_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    null

  return <AppV3Shell firstName={firstName} accessLevel={accessLevel} trialDaysLeft={trialDaysLeft} />
}
