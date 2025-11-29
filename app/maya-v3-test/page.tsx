import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"
import { redirect } from "next/navigation"
import MayaV3Screen from "@/components/sselfie/maya-v3-screen"

export const dynamic = "force-dynamic"

/**
 * Maya 3.0 Test Interface (Developer-Only)
 *
 * This is a private testing route for Maya 3.0 prompt generation.
 * It's not linked in navigation and is only accessible via direct URL.
 */
export default async function MayaV3TestPage() {
  // Authenticate user using Supabase
  let supabase
  try {
    supabase = await createServerClient()
  } catch (error) {
    console.error("[v0] Error creating Supabase client:", error)
    redirect("/auth/login?error=supabase_config&returnTo=/maya-v3-test")
  }

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect("/auth/login?returnTo=/maya-v3-test")
  }

  // Get or create Neon user
  let neonUser = null
  let userError = null

  try {
    neonUser = await getUserByAuthId(authUser.id)
  } catch (error) {
    console.error("[v0] Error fetching user by auth ID:", error)
    userError = error
  }

  if (!neonUser && authUser.email && !userError) {
    try {
      neonUser = await getOrCreateNeonUser(authUser.id, authUser.email, authUser.user_metadata?.display_name)
    } catch (error) {
      console.error("[v0] Error syncing user with database:", error)
      userError = error
    }
  }

  if (!neonUser || userError) {
    console.error("[v0] User authenticated but could not be synced with database")
    redirect("/auth/login?returnTo=/maya-v3-test")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="mb-8 pb-6 border-b border-stone-200">
          <h1 className="text-2xl font-serif font-extralight tracking-[0.3em] text-stone-950 uppercase mb-2">
            Maya 3.0 Test Interface
          </h1>
          <p className="text-sm text-stone-600 tracking-wide">Developer-Only Testing Environment</p>
        </div>

        <MayaV3Screen userId={neonUser.id} userName={neonUser.display_name} userEmail={neonUser.email} />
      </div>
    </div>
  )
}
