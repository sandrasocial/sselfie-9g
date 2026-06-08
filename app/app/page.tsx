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

  // Phase 1 gate: only the admin opens Studio 3.0. The 7 members remain on legacy /studio.
  if (!isAdminEmail(user.email)) {
    redirect("/studio")
  }

  const firstName =
    (user.user_metadata?.first_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    null

  return <AppV3Shell firstName={firstName} />
}
