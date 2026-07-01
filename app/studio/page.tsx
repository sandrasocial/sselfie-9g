import { sql } from "@/lib/db/client"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"
import { getUserSubscription, shouldEnforceLiveSubscriptionRows } from "@/lib/subscription"
import { redirect } from "next/navigation"
import SselfieApp from "@/components/sselfie/sselfie-app"
import { parseStudioAcademyContext } from "@/lib/academy/studio-query-context"
// Studio 3.0: admin-only override to route the admin to the new /app shell.
import { isAdminEmail } from "@/lib/admin-feature-flags"

export const dynamic = "force-dynamic"

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{
    welcome?: string
    showCheckout?: string
    checkout?: string
    impersonate?: string
    tab?: string
    purchase?: string
    source?: string
    product?: string
    first_time_product_user?: string
    legacy?: string
  }>
}) {
  // Await searchParams in Next.js 15+
  const params = await searchParams
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params || {})) {
    if (typeof v === "string" && v) qs.set(k, v)
  }
  const returnTo = `/studio${qs.toString() ? `?${qs.toString()}` : ""}`

  let supabase
  try {
    supabase = await createServerClient()
  } catch (error) {
    console.error("[v0] Error creating Supabase client:", error)
    redirect(`/auth/login?error=supabase_config&returnTo=${encodeURIComponent(returnTo)}`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`)
  }

  // Check if admin is impersonating (simple cookie check)
  const { getImpersonatedUserId } = await import("@/lib/simple-impersonation")
  const impersonatedUserId = await getImpersonatedUserId()

  // Studio 3.0 admin override: send the admin straight to the new /app shell, UNLESS they
  // are impersonating a member or explicitly inspecting legacy with ?legacy=1. This is
  // admin-only - the 7 active members never match isAdminEmail, so their legacy Studio is
  // completely untouched.
  if (!impersonatedUserId && params.legacy !== "1" && isAdminEmail(user.email)) {
    redirect("/app")
  }

  let neonUser = null
  let userError = null

  if (impersonatedUserId) {
    // Admin is impersonating - get the impersonated user
    const { getNeonUserById } = await import("@/lib/user-mapping")
    try {
      neonUser = await getNeonUserById(impersonatedUserId)
      if (neonUser) {
        console.log("[v0] [IMPERSONATION] Admin impersonating user:", neonUser.email)
      }
    } catch (error) {
      console.error("[v0] Error fetching impersonated user:", error)
      userError = error
    }
  }
  
  if (!neonUser) {
    // Normal flow - get current user
    try {
      neonUser = await getUserByAuthId(user.id)
    } catch (error) {
      console.error("[v0] Error fetching user by auth ID:", error)
      userError = error
    }

    if (!neonUser && user.email && !userError) {
      try {
        neonUser = await getOrCreateNeonUser(user.id, user.email, user.user_metadata?.name || user.user_metadata?.display_name)
      } catch (error) {
        console.error("[v0] Error syncing user with database:", error)
        userError = error
      }
    }
  }

  if (!neonUser || userError) {
    console.error("[v0] User authenticated but could not be synced with database")
    redirect(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`)
  }

  // Studio 3.0 member forward: send active members + trials to the new /app shell, mirroring
  // the admin override above. Without this, returning members who log in normally land on
  // legacy /studio (retired Replicate generation) and can't generate with Maya. Gated by
  // APP_V3_MEMBERS_ENABLED (one-flip rollback), the same ?legacy=1 escape hatch, and the
  // impersonation guard. Uses the same getSuiteAccess check /app uses, so there is no redirect
  // loop; "limited"/"none" (expired trials, one-time owners) stay on legacy Studio.
  // NOTE: redirect() must run OUTSIDE the try/catch - it throws NEXT_REDIRECT, which a catch
  // would swallow.
  if (!impersonatedUserId && params.legacy !== "1" && process.env.APP_V3_MEMBERS_ENABLED === "true") {
    let forwardToApp = false
    try {
      const { getSuiteAccess } = await import("@/lib/trial/suite-trial")
      const access = await getSuiteAccess(String(neonUser.id))
      forwardToApp = access.level === "member" || access.level === "trial"
    } catch (error) {
      console.error("[studio] App v3 member-forward check failed, staying on legacy:", error)
    }
    if (forwardToApp) {
      redirect("/app")
    }
  }

  console.log("[v0] [STUDIO PAGE] Starting credit grant check for user:", neonUser.email, neonUser.id)

  // Decision 1: Grant free user credits to ALL free users who haven't received them yet
  // This ensures credits are granted for all signups, regardless of when they signed up
  // or whether they used the old blueprint system
  console.log(`[Studio] 🔍🔍🔍 CHECKING CREDIT GRANT for user ${neonUser.id} (email: ${neonUser.email})`)
  try {
    console.log(`[Studio] ✅✅✅ Database connection established`)
    
    // Check if user has active subscription (only free users get welcome credits)
    const enforceLiveMode = shouldEnforceLiveSubscriptionRows()
    const hasSubscription = await sql`
      SELECT COUNT(*) as count
      FROM subscriptions
      WHERE user_id = ${neonUser.id} AND status = 'active'
        AND (${enforceLiveMode} = false OR COALESCE(is_test_mode, false) = false)
    `
    
    const subscriptionCount = Number(hasSubscription[0]?.count || 0)
    console.log(`[Studio] 📊📊📊 Subscription check: user ${neonUser.id} has ${subscriptionCount} active subscription(s) (raw: ${hasSubscription[0]?.count}, type: ${typeof hasSubscription[0]?.count})`)
    
    if (subscriptionCount === 0) {
      console.log(`[Studio] ✅ User ${neonUser.id} is FREE user - checking for welcome bonus`)
      
      // Check if welcome bonus transaction already exists (prevent duplicates)
      const existingTransaction = await sql`
        SELECT id FROM credit_transactions 
        WHERE user_id = ${neonUser.id} 
        AND transaction_type = 'bonus' 
        AND description = 'Free blueprint credits (welcome bonus)'
        LIMIT 1
      `
      
      console.log(`[Studio] 🔍🔍🔍 Bonus transaction check: found ${existingTransaction.length} existing bonus transaction(s) for user ${neonUser.id}`)
      
      if (existingTransaction.length === 0) {
        console.log(`[Studio] 💰💰💰 GRANTING 2 CREDITS to user ${neonUser.id} (NO existing bonus transaction found)`)
        
        // Grant 2 credits to all free users who haven't received welcome bonus yet
        const { grantFreeUserCredits } = await import("@/lib/credits")
        const creditResult = await grantFreeUserCredits(neonUser.id)
        
        if (creditResult.success) {
          console.log(`[Studio] ✅✅✅✅✅ SUCCESS: Free user credits (2) granted to user ${neonUser.id} (email: ${neonUser.email}) - New balance: ${creditResult.newBalance}`)
        } else {
          console.error(`[Studio] ❌❌❌❌❌ FAILED: Failed to grant free user credits to ${neonUser.id}: ${creditResult.error}`)
        }
      } else {
        console.log(`[Studio] ⏭️⏭️⏭️ User ${neonUser.id} already received welcome bonus (transaction ID: ${existingTransaction[0].id}) - SKIPPING`)
      }
    } else {
      console.log(`[Studio] ⏭️⏭️⏭️ User ${neonUser.id} has active subscription - SKIPPING free credits`)
    }
  } catch (creditError) {
    console.error(`[Studio] ❌❌❌❌❌ EXCEPTION granting free user credits for ${neonUser.id}:`, creditError)
    if (creditError instanceof Error) {
      console.error(`[Studio] ❌ Error message:`, creditError.message)
      console.error(`[Studio] ❌ Error stack:`, creditError.stack)
    }
    // Don't fail Studio load if credit grant fails
  }

  const subscription = await getUserSubscription(neonUser.id)

  console.log("[v0] [STUDIO PAGE] User:", neonUser.email)
  console.log("[v0] [STUDIO PAGE] Subscription status:", subscription?.status ?? "none")

  const isWelcome = params.welcome === "true"
  const shouldShowCheckout = params.showCheckout === "true" || params.checkout === "one_time"
  const purchaseSuccess = params.purchase === "success"
  const initialTab = params.tab || undefined // Pass tab param to SselfieApp
  const { academyPurchaseSource, academyPurchaseProduct, firstTimeProductUser } = parseStudioAcademyContext(params)

  const isImpersonating = !!impersonatedUserId

  return (
    <>
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-400 border-b-2 border-yellow-500 shadow-lg px-4 py-2 text-center">
          <p className="text-sm font-medium text-black">
            🎭 Viewing as <span className="font-semibold">{neonUser.email}</span>
            {" "}
            {/* removed in CLEANUP-01: /admin/exit-impersonation */}
          </p>
        </div>
      )}
      <SselfieApp
        userId={neonUser.id}
        userName={neonUser.display_name ?? null}
        userEmail={neonUser.email}
        isWelcome={isWelcome}
        shouldShowCheckout={shouldShowCheckout}
        subscriptionStatus={subscription?.status ?? null}
        productType={subscription?.product_type ?? null}
        userRole={neonUser.role ?? null}
        purchaseSuccess={purchaseSuccess}
        initialTab={initialTab}
        academyPurchaseSource={academyPurchaseSource}
        academyPurchaseProduct={academyPurchaseProduct}
        firstTimeProductUser={firstTimeProductUser}
      />
    </>
  )
}
