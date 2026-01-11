import { redirect } from "next/navigation"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import BrandBlueprintPageClient from "./page-client"
import AuthenticatedBlueprintWrapper from "./authenticated-blueprint-wrapper"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Server component wrapper for Blueprint page
 * 
 * Responsibilities:
 * - Check if user is authenticated (prioritize authenticated flow)
 * - For authenticated users: render authenticated Blueprint experience
 * - For guest users: Check URL params (?email=... or ?token=...)
 * - Query database for subscriber state
 * - Determine completion state (new/partial/completed/paid)
 * - Pass structured props to client component
 * - Handle redirects for paid users
 */
export default async function BrandBlueprintPageServer({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string; message?: string; purchase?: string }>
}) {
  const params = await searchParams
  const emailParam = params?.email
  const tokenParam = params?.token
  const purchaseParam = params?.purchase

  // Fix #5: Check if user is authenticated (prioritize authenticated flow)
  try {
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (authUser) {
      // Authenticated user flow
      const { getUserByAuthId } = await import("@/lib/user-mapping")
      const neonUser = await getUserByAuthId(authUser.id)

      if (neonUser) {
        // Render authenticated Blueprint experience
        return (
          <AuthenticatedBlueprintWrapper 
            userId={neonUser.id} 
            purchaseSuccess={purchaseParam === "success"}
          />
        )
      }
    }
  } catch (authError) {
    // Auth check failed - fall through to guest flow
    console.log("[Blueprint Server] Auth check failed, falling back to guest flow:", authError)
  }

  // Guest flow (email/token params) - existing logic below
  // If no email or token, pass null props (new user flow)
  if (!emailParam && !tokenParam) {
    return (
      <BrandBlueprintPageClient
        initialEmail={null}
        initialAccessToken={null}
        initialResumeStep={0}
        initialHasStrategy={false}
        initialHasGrid={false}
        initialIsCompleted={false}
        initialIsPaid={false}
        initialFormData={null}
        initialSelectedFeedStyle={null}
        initialSelfieImages={null}
      />
    )
  }

  // Query database for subscriber
  let subscriber = null
  try {
    if (emailParam) {
      const result = await sql`
        SELECT 
          email,
          access_token,
          form_data,
          strategy_generated,
          grid_generated,
          grid_url,
          grid_frame_urls,
          selfie_image_urls,
          feed_style,
          paid_blueprint_purchased,
          paid_blueprint_photo_urls
        FROM blueprint_subscribers
        WHERE email = ${emailParam}
        LIMIT 1
      `
      subscriber = result.length > 0 ? result[0] : null
    } else if (tokenParam) {
      const result = await sql`
        SELECT 
          email,
          access_token,
          form_data,
          strategy_generated,
          grid_generated,
          grid_url,
          grid_frame_urls,
          selfie_image_urls,
          feed_style,
          paid_blueprint_purchased,
          paid_blueprint_photo_urls
        FROM blueprint_subscribers
        WHERE access_token = ${tokenParam}
        LIMIT 1
      `
      subscriber = result.length > 0 ? result[0] : null
    }
  } catch (error) {
    console.error("[Blueprint Server] Error querying subscriber:", error)
    // Continue with null subscriber (new user flow)
  }

  // If subscriber not found, treat as new user
  if (!subscriber) {
    return (
      <BrandBlueprintPageClient
        initialEmail={emailParam || null}
        initialAccessToken={null}
        initialResumeStep={0}
        initialHasStrategy={false}
        initialHasGrid={false}
        initialIsCompleted={false}
        initialIsPaid={false}
        initialFormData={null}
        initialSelectedFeedStyle={null}
        initialSelfieImages={null}
      />
    )
  }

  // Check if paid user - redirect to paid blueprint page
  if (subscriber.paid_blueprint_purchased && subscriber.access_token) {
    redirect(`/blueprint/paid?access=${subscriber.access_token}`)
  }

  // PR-8: Determine state using canonical definition (strategy + grid = completed)
  const hasStrategy = subscriber.strategy_generated === true
  const hasGrid = subscriber.grid_generated === true && subscriber.grid_url
  // Canonical completion: strategy_generated AND grid_generated
  const isCompleted = hasStrategy && hasGrid
  
  // PR-8: Also check blueprint_completed flag for consistency
  const dbMarkedCompleted = subscriber.blueprint_completed === true
  
  // Use canonical definition, but log if DB flag differs
  if (isCompleted !== dbMarkedCompleted) {
    console.warn(`[Blueprint Server] Completion mismatch for ${subscriber.email}: canonical=${isCompleted}, db_flag=${dbMarkedCompleted}`)
  }

  // PR-8: Determine resume step based on state
  let resumeStep = 0
  if (isCompleted) {
    // Completed (strategy + grid) - show upgrade view (step 7 = upgrade/results view)
    resumeStep = 7
  } else if (hasGrid && !hasStrategy) {
    // Has grid but no strategy (edge case - shouldn't happen normally)
    // Still allow viewing grid, but prompt for strategy
    resumeStep = 3.5 // Grid generation step (will show existing grid)
  } else if (hasStrategy && !hasGrid) {
    // Has strategy, needs grid generation
    resumeStep = 3.5 // Grid generation step
  } else if (subscriber.form_data && typeof subscriber.form_data === "object" && Object.keys(subscriber.form_data).length > 0) {
    // Has form data, needs strategy generation
    // Check if feed style is selected (determines if ready for strategy)
    if (subscriber.feed_style) {
      resumeStep = 3.5 // Ready for grid generation (after strategy)
    } else {
      resumeStep = 3 // Feed style selection (before strategy generation)
    }
  } else {
    // Has email but no form data - start at questions (step 1)
    // Email capture already done (we're here because subscriber exists)
    resumeStep = 1
  }

  // Parse form data
  let formData = null
  if (subscriber.form_data && typeof subscriber.form_data === "object") {
    formData = subscriber.form_data
  }

  // Parse selfie images
  let selfieImages: string[] | null = null
  if (subscriber.selfie_image_urls && Array.isArray(subscriber.selfie_image_urls)) {
    selfieImages = subscriber.selfie_image_urls.filter((url: any) => typeof url === "string" && url.startsWith("http"))
  }

  return (
    <BrandBlueprintPageClient
      initialEmail={subscriber.email}
      initialAccessToken={subscriber.access_token}
      initialResumeStep={resumeStep}
      initialHasStrategy={hasStrategy}
      initialHasGrid={hasGrid}
      initialIsCompleted={isCompleted}
      initialIsPaid={false}
      initialFormData={formData}
      initialSelectedFeedStyle={subscriber.feed_style || null}
      initialSelfieImages={selfieImages}
    />
  )
}
