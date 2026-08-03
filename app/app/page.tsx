// SSELFIE Studio 3.0 - /app route (server component).
//
// Access (cutover state):
// - Not authenticated  → /auth/login (returnTo=/app)
// - Admin (ssa@ssasocial.com) → full unrestricted access to Studio 3.0
// - Active members and active trials → full Studio 3.0 access when APP_V3_MEMBERS_ENABLED=true
// - Expired trials and one-time owners → limited shell; generation stays locked server-side
// - No Suite access → limited Studio 3.0 shell while App v3 is enabled

import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { isAdminEmail } from "@/lib/admin-feature-flags"
import { AppV3Shell } from "@/components/app-v3/app-v3-shell"
import {
  buildAppV3ReturnTo,
  resolveAppV3InitialAestheticId,
  resolveAppV3InitialSection,
} from "@/lib/app-v3/navigation"
import { isVideoGenerationEnabled } from "@/lib/app-v3/video-flag"
import type { AppV3AnalyticsCohort } from "@/components/app-v3/types"
import { getOrCreateNeonUser } from "@/lib/user-mapping"
import { isMayaOperatingLayerEnabled } from "@/lib/app-v3/maya/operating-layer-rollout"
import { hasStudioMembership } from "@/lib/subscription"

export const metadata = {
  title: "SSELFIE Studio",
}

// Auth-gated route: always rendered per-request (uses cookies via Supabase).
export const dynamic = "force-dynamic"

export default async function StudioV3Page({
  searchParams,
}: {
  searchParams?: Promise<{
    view?: string | string[]
    aesthetic?: string | string[]
  }>
}) {
  const params = searchParams ? await searchParams : {}
  const initialSection = resolveAppV3InitialSection(params.view)
  const initialAestheticId = resolveAppV3InitialAestheticId(params.aesthetic)
  const returnTo = buildAppV3ReturnTo(initialSection, initialAestheticId)
  const preSelfieChatEnabled = process.env.MAYA_PRESELFIE_CHAT_ENABLED === "true"

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

  // A confirmed Supabase account must also exist in the application database before
  // the access gate or any member API runs. This repairs older and interrupted signups
  // as well as protecting the first visit after email confirmation.
  if (user.email) {
    const displayName =
      (user.user_metadata?.name as string | undefined) ||
      (user.user_metadata?.display_name as string | undefined) ||
      (user.user_metadata?.first_name as string | undefined) ||
      user.email.split("@")[0]
    try {
      await getOrCreateNeonUser(user.id, user.email, displayName)
    } catch (error) {
      console.error("[/app gate] application user provisioning failed:", error)
    }
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
  let primarySelfieUrl: string | null = null
  let trialHasSeenFirstRunStep = false
  let hasVaultAccess = true
  let vaultMayaIncluded = true
  // Whether this member has a completed, non-test trained LoRA model. When true, App v3
  // surfaces a quiet "use my trained model" entry into legacy /studio?legacy=1. Never-trained
  // members never see it. Admins resolve this separately below.
  let hasTrainedModel = false
  if (!isAdminEmail(user.email)) {
    hasVaultAccess = false
    vaultMayaIncluded = false
    let resolved: "full" | "trial" | "limited" | "none" = "none"
    if (process.env.APP_V3_MEMBERS_ENABLED === "true") {
      try {
        const { getUserIdFromSupabase } = await import("@/lib/user-mapping")
        const neonUserId = await getUserIdFromSupabase(user.id)
        if (neonUserId) {
          vaultMayaIncluded = await hasStudioMembership(String(neonUserId))
          const { getSuiteAccess } = await import("@/lib/trial/suite-trial")
          const access = await getSuiteAccess(String(neonUserId))
          if (access.level === "member") {
            resolved = "full"
            // Recurring members and fixed bundle-pass holders both receive the Vault.
            hasVaultAccess = true
          } else if (access.level === "vault") {
            // Vault Maya tier: her home is the scoped studio, never the full app shell.
            redirect("/vault-maya/studio")
          } else if (access.level === "trial") {
            resolved = "trial"
            trialDaysLeft = access.trialDaysLeft
            try {
              const { userHasAcademyProductAccess } = await import("@/lib/academy-entitlements")
              hasVaultAccess = await userHasAcademyProductAccess(String(neonUserId), "prompt_vault")
            } catch (vaultErr) {
              console.error("[/app gate] Vault entitlement check failed:", vaultErr)
            }
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
            try {
              const rows = await import("@/lib/db/client").then(
                ({ sql }) => sql`
                SELECT 1
                FROM analytics_events
                WHERE user_id = ${String(neonUserId)}
                  AND event_name = 'suite_trial_first_run_seen'
                LIMIT 1
              `
              )
              trialHasSeenFirstRunStep = rows.length > 0
            } catch (seenErr) {
              console.error("[/app gate] trial first-run seen check failed:", seenErr)
            }
          } else if (access.level === "limited") resolved = "limited"

          try {
            const rows = await import("@/lib/db/client").then(
              ({ sql }) => sql`
              SELECT image_url
              FROM user_avatar_images
              WHERE user_id = ${String(neonUserId)}
                AND is_active = ${true}
                AND image_type = 'selfie'
              ORDER BY uploaded_at DESC
              LIMIT 1
            `
            )
            trialHasSavedSelfie = rows.length > 0
            primarySelfieUrl = typeof rows[0]?.image_url === "string" ? rows[0].image_url : null
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
    if (process.env.APP_V3_MEMBERS_ENABLED !== "true") redirect("/studio")
    if (resolved === "none") resolved = "limited"
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
        const rows = await import("@/lib/db/client").then(
          ({ sql }) => sql`
            SELECT image_url
            FROM user_avatar_images
            WHERE user_id = ${String(neonUserId)}
              AND is_active = ${true}
              AND image_type = 'selfie'
            ORDER BY uploaded_at DESC
            LIMIT 1
          `
        )
        trialHasSavedSelfie = rows.length > 0
        primarySelfieUrl = typeof rows[0]?.image_url === "string" ? rows[0].image_url : null
      }
    } catch (e) {
      console.error("[/app gate] admin trained-model check failed:", e)
    }
  }

  const firstName =
    (user.user_metadata?.first_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    null
  const mayaOperatingLayerEnabled = isMayaOperatingLayerEnabled({
    userId: user.id,
    email: user.email,
    accessLevel,
  })

  return (
    <AppV3Shell
      firstName={firstName}
      accessLevel={accessLevel}
      analyticsCohort={analyticsCohort}
      trialDaysLeft={trialDaysLeft}
      initialSection={initialSection}
      initialAestheticId={initialAestheticId}
      hasTrainedModel={hasTrainedModel}
      hasVaultAccess={hasVaultAccess}
      vaultMayaIncluded={vaultMayaIncluded}
      preSelfieChatEnabled={preSelfieChatEnabled}
      trialHasGeneratedImages={trialHasGeneratedImages}
      trialHasSavedSelfie={trialHasSavedSelfie}
      primarySelfieUrl={primarySelfieUrl}
      trialHasSeenFirstRunStep={trialHasSeenFirstRunStep}
      videoEnabled={isVideoGenerationEnabled()}
      mayaOperatingLayerEnabled={mayaOperatingLayerEnabled}
    />
  )
}
