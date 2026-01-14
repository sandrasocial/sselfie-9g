import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"
import { getUserSubscription } from "@/lib/subscription"
import { redirect } from "next/navigation"
import SselfieApp from "@/components/sselfie/sselfie-app"

export const dynamic = "force-dynamic"

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; showCheckout?: string; checkout?: string; impersonate?: string; tab?: string; purchase?: string }>
}) {
  // Await searchParams in Next.js 15+
  const params = await searchParams

  let supabase
  try {
    supabase = await createServerClient()
  } catch (error) {
    console.error("[v0] Error creating Supabase client:", error)
    redirect("/auth/login?error=supabase_config&returnTo=/studio")
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?returnTo=/studio")
  }

  // Check if admin is impersonating (simple cookie check)
  const { getImpersonatedUserId } = await import("@/lib/simple-impersonation")
  const impersonatedUserId = await getImpersonatedUserId()

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
    redirect("/auth/login?returnTo=/studio")
  }

  console.log("[v0] [STUDIO PAGE] Starting credit grant check for user:", neonUser.email, neonUser.id)

  // Decision 1: Grant free user credits to ALL free users who haven't received them yet
  // This ensures credits are granted for all signups, regardless of when they signed up
  // or whether they used the old blueprint system
  console.log(`[Studio] 🔍🔍🔍 CHECKING CREDIT GRANT for user ${neonUser.id} (email: ${neonUser.email})`)
  try {
    const { neon } = await import("@neondatabase/serverless")
    const sql = neon(process.env.DATABASE_URL!)
    
    console.log(`[Studio] ✅✅✅ Database connection established`)
    
    // Check if user has active subscription (only free users get welcome credits)
    const hasSubscription = await sql`
      SELECT COUNT(*) as count
      FROM subscriptions
      WHERE user_id = ${neonUser.id} AND status = 'active'
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

  const isImpersonating = !!impersonatedUserId

  return (
    <>
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-400 border-b-2 border-yellow-500 shadow-lg px-4 py-2 text-center">
          <p className="text-sm font-medium text-black">
            🎭 Viewing as <span className="font-semibold">{neonUser.email}</span>
            {" "}
            <a href="/admin/exit-impersonation" className="underline ml-2">Exit →</a>
          </p>
        </div>
      )}
      <SselfieApp
        userId={neonUser.id}
        userName={neonUser.display_name}
        userEmail={neonUser.email}
        isWelcome={isWelcome}
        shouldShowCheckout={shouldShowCheckout}
        subscriptionStatus={subscription?.status ?? null}
        productType={subscription?.product_type ?? null}
        purchaseSuccess={purchaseSuccess}
        initialTab={initialTab}
      />
    </>
  )
}
