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

  // APP-CUTOVER-01 Phase 2 gate: admin always; active members when the rollout env is on.
  // Rollback is one env flip (APP_V3_MEMBERS_ENABLED=false returns members to /studio).
  if (!isAdminEmail(user.email)) {
    let isActiveMember = false
    if (process.env.APP_V3_MEMBERS_ENABLED === "true") {
      try {
        const { getUserIdFromSupabase } = await import("@/lib/user-mapping")
        const { sql } = await import("@/lib/db/client")
        const neonUserId = await getUserIdFromSupabase(user.id)
        if (neonUserId) {
          const rows = await sql`
            SELECT 1 FROM subscriptions
            WHERE user_id = ${String(neonUserId)}
              AND product_type = 'sselfie_studio_membership'
              AND status = 'active'
              AND (is_test_mode = FALSE OR is_test_mode IS NULL)
            LIMIT 1
          `
          isActiveMember = rows.length > 0
        }
      } catch (e) {
        console.error("[/app gate] membership check failed, falling back to /studio:", e)
      }
    }
    if (!isActiveMember) redirect("/studio")
  }

  const firstName =
    (user.user_metadata?.first_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    null

  return <AppV3Shell firstName={firstName} />
}
