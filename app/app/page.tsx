// SSELFIE Studio 3.0 - /app route (server component).
//
// Access (cutover state):
// - Not authenticated  → /auth/login (returnTo=/app)
// - Admin (ssa@ssasocial.com) → full unrestricted access to Studio 3.0
// - Active members and active trials → full Studio 3.0 access when APP_V3_MEMBERS_ENABLED=true
// - Expired trials and one-time owners → limited shell; generation stays locked server-side
// - No Suite access → bounced to legacy /studio

import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { isAdminEmail } from "@/lib/admin-feature-flags"
import { AppV3Shell } from "@/components/app-v3/app-v3-shell"
import { buildAppV3ReturnTo, resolveAppV3InitialSection } from "@/lib/app-v3/navigation"
import type { AppV3AnalyticsCohort } from "@/components/app-v3/types"

export const metadata = {
  title: "SSELFIE Studio",
}

// Auth-gated route: always rendered per-request (uses cookies via Supabase).
export const dynamic = "force-dynamic"

export default async function StudioV3Page({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string | string[] }>
}) {
  const params = searchParams ? await searchParams : {}
  const initialSection = resolveAppV3InitialSection(params.view)
  const returnTo = buildAppV3ReturnTo(initialSection)

  let supabase
  try {
    supabase = await createServerClient()
  } catch (error) {
    console.error("[app-v3] Supabase client error:", error)
    redirect(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`)
  }

  // APP-CUTOVER-01 Phase 2 gate + BRIDGE-01 Phase D access levels: admin always full;
  // members full; active trials full (with badge); expired trials and one-time owners get
  // the limited shell (Library + Photos stay open, generation locked server-side too).
  // Rollback is one env flip (APP_V3_MEMBERS_ENABLED=false returns members to /studio).
  let accessLevel: "full" | "trial" | "limited" = "full"
  let analyticsCohort: AppV3AnalyticsCohort = "member"
  let trialDaysLeft: number | null = null
  let trialHasGeneratedImages = false
  let trialHasSavedSelfie = false
  // Whether this member has a completed, non-test trained LoRA model. When true, App v3
  // surfaces a quiet "use my trained model" entry into legacy /studio?legacy=1. Never-trained
  // members never see it. Admins resolve this separately below.
  let hasTrainedModel = false
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
            try {
              const rows = await import("@/lib/db/client").then(
                ({ sql }) => sql`
                SELECT 1
                FROM ai_images
                WHERE user_id = ${neonUserId}
                  AND image_url IS NOT NULL
                  AND (generation_status = 'completed' OR generation_status IS NULL)
                LIMIT 1
              `
              )
              trialHasGeneratedImages = rows.length > 0
            } catch (imageErr) {
              console.error("[/app gate] trial generated-image check failed:", imageErr)
            }
          } else if (access.level === "limited") resolved = "limited"

          try {
            const rows = await import("@/lib/db/client").then(
              ({ sql }) => sql`
              SELECT 1
              FROM user_avatar_images
              WHERE user_id = ${String(neonUserId)}
                AND is_active = ${true}
                AND (image_type IS NULL OR image_type NOT IN ('side-profile', 'full-body', 'inspiration'))
              LIMIT 1
            `
            )
            trialHasSavedSelfie = rows.length > 0
          } catch (selfieErr) {
            console.error("[/app gate] saved-selfie check failed:", selfieErr)
          }

          try {
            const { hasCompletedTrainedModel } = await import("@/lib/data/training")
            hasTrainedModel = await hasCompletedTrainedModel(String(neonUserId))
          } catch (modelErr) {
            console.error("[/app gate] trained-model check failed:", modelErr)
          }
        }
      } catch (e) {
        console.error("[/app gate] access check failed, falling back to /studio:", e)
      }
    }
    if (resolved === "none") redirect("/studio")
    accessLevel = resolved
    analyticsCohort = resolved === "trial" ? "trial" : resolved === "limited" ? "limited" : "member"
  } else {
    analyticsCohort = "admin"
    // Admin: still surface the legacy entry if a real trained model exists.
    try {
      const { getUserIdFromSupabase } = await import("@/lib/user-mapping")
      const neonUserId = await getUserIdFromSupabase(user.id)
      if (neonUserId) {
        const { hasCompletedTrainedModel } = await import("@/lib/data/training")
        hasTrainedModel = await hasCompletedTrainedModel(String(neonUserId))
      }
    } catch (e) {
      console.error("[/app gate] admin trained-model check failed:", e)
    }
  }

  const firstName =
    (user.user_metadata?.first_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    null

  return (
    <AppV3Shell
      firstName={firstName}
      accessLevel={accessLevel}
      analyticsCohort={analyticsCohort}
      trialDaysLeft={trialDaysLeft}
      initialSection={initialSection}
      hasTrainedModel={hasTrainedModel}
      trialHasGeneratedImages={trialHasGeneratedImages}
      trialHasSavedSelfie={trialHasSavedSelfie}
    />
  )
}
