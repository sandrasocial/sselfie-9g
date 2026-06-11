// BRIDGE-01 Phase D — SUITE trial claim (the spine of the trial: Vault/Kit buyers bought
// via token email, most have no password yet). The claim link arrives in the trial-unlock
// email; opening it resolves the buyer (freebie_subscribers.access_token), makes sure she
// has an auth account + Neon user, grants the one-ever 7-day trial with 20 credits, and
// sends her into /app (via password setup when she's never set one).
//
// Grant is idempotent (one suite_trial row per user, ever), so reloading this page is safe.

import { redirect } from "next/navigation"
import { sql } from "@/lib/db/client"
import { createAdminClient } from "@/lib/supabase/admin"
import { getOrCreateNeonUser } from "@/lib/user-mapping"
import { generatePasswordSetupLinkForPurchase } from "@/lib/payments/shared"
import { grantSuiteTrial } from "@/lib/trial/suite-trial"
import { logAnalyticsEvent } from "@/lib/analytics/events"

export const metadata = {
  title: "Claim your 7 days | SSELFIE",
}

export const dynamic = "force-dynamic"

function InvalidLink() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFA] px-6">
      <div className="max-w-md text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#818283]">SSELFIE SUITE</p>
        <h1 className="mt-3 font-serif text-[28px] font-light leading-tight text-[#0D0E10]">
          This link isn't valid anymore.
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-[#4F5052]">
          If you bought the Prompt Vault or Starter Kit and think this is a mistake, reply to
          your delivery email or write to support@sselfie.ai and I'll sort it out.
        </p>
      </div>
    </main>
  )
}

export default async function ClaimTrialPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const cleanToken = (token || "").trim()
  if (!cleanToken || cleanToken.length < 16) return <InvalidLink />

  const subscribers = await sql`
    SELECT id, email, name FROM freebie_subscribers
    WHERE access_token = ${cleanToken}
    LIMIT 1
  `
  const subscriber = subscribers[0] as { id: number; email: string; name: string | null } | undefined
  if (!subscriber?.email) return <InvalidLink />

  let destination = "/app"

  try {
    const supabaseAdmin = createAdminClient()

    // Most buyers already have an auth account (the purchase webhook creates one), so this
    // is a lookup first, create only as the fallback for older buyers.
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    let authUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === subscriber.email.toLowerCase()
    )

    if (!authUser) {
      const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: subscriber.email,
        email_confirm: true,
        user_metadata: {
          created_via: "suite_trial_claim",
          first_name: subscriber.name || undefined,
        },
      })
      if (createError || !created?.user) {
        console.error("[claim] auth user creation failed:", createError?.message)
        return <InvalidLink />
      }
      authUser = created.user
    }

    const neonUser = await getOrCreateNeonUser(authUser.id, subscriber.email, subscriber.name)
    const userId = String(neonUser.id)

    const grant = await grantSuiteTrial(userId, `claim:${subscriber.id}`)

    if (grant.created) {
      await logAnalyticsEvent({
        eventName: "trial_claimed",
        userId,
        properties: { source: "claim_page", subscriber_id: subscriber.id },
      }).catch(() => {})
    }

    // She came from an email, so she almost certainly has no session. If she's never set a
    // password, the recovery link signs her in and lands her in /app after setup.
    const setupLink = await generatePasswordSetupLinkForPurchase(userId, subscriber.email, "/app")
    if (setupLink) destination = setupLink
  } catch (e) {
    console.error("[claim] trial claim failed:", e)
    return <InvalidLink />
  }

  redirect(destination)
}
