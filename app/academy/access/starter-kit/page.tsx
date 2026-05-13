import { redirect } from "next/navigation"

import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { sql } from "@/lib/db/client"
import { requireAcademyPageUser } from "@/app/academy/_lib/course-library"

/**
 * Starter Kit access gate.
 *
 * Auth → entitlement check → look up the buyer's freebie_subscribers token →
 * redirect to /access/starter-kit/[token].
 *
 * The token-based route is the canonical Starter Kit experience: it shows
 * presets download, selfie guide link, quick-start checklist, and 7-day
 * content starter — all without requiring an active Studio session.
 */
export default async function AcademyStarterKitAccessPage() {
  const { neonUser } = await requireAcademyPageUser("/academy/access/starter-kit")

  const entitlementState = await getAcademyEntitlementState(neonUser.id)
  const hasAccess =
    entitlementState.membershipActive ||
    entitlementState.accessibleProductIds.includes("starter_kit")

  if (!hasAccess) {
    redirect("/starter-kit")
  }

  // Resolve the buyer's personal access token from freebie_subscribers.
  // The token is created by upsertStarterKitSubscriber during the webhook.
  const rows = await sql`
    SELECT fs.access_token
    FROM freebie_subscribers fs
    INNER JOIN users u ON LOWER(u.email) = LOWER(fs.email)
    WHERE u.id = ${neonUser.id}
      AND fs.access_token IS NOT NULL
    LIMIT 1
  `

  const token = (rows as { access_token: string }[])[0]?.access_token

  if (token) {
    redirect(`/access/starter-kit/${encodeURIComponent(token)}`)
  }

  // Fallback: token not found (e.g. manually granted entitlement) — redirect
  // to the public landing page so the user can contact support.
  redirect("/starter-kit")
}
