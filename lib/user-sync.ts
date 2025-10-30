import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"

/**
 * Syncs a Supabase Auth user with their Neon database user
 * This is a wrapper around getOrCreateNeonUser for backward compatibility
 */
export async function syncUserWithNeon(authUserId: string, email: string, name?: string): Promise<any | null> {
  try {
    return await getOrCreateNeonUser(authUserId, email, name)
  } catch (error) {
    console.error("Error syncing user with Neon:", error)
    return null
  }
}

/**
 * Gets the Neon user for the currently authenticated Supabase user
 */
export async function getCurrentNeonUser(): Promise<any | null> {
  try {
    const supabase = await createServerClient()

    let authUser
    try {
      const { data, error } = await supabase.auth.getUser()

      if (error) {
        console.error("Supabase auth error:", error.message)
        return null
      }

      authUser = data.user
    } catch (authError: any) {
      console.error("Supabase auth request failed:", authError?.message || authError)
      return null
    }

    if (!authUser) {
      return null
    }

    const neonUser = await getUserByAuthId(authUser.id)

    if (neonUser) {
      return neonUser
    }

    if (authUser.email) {
      const displayName = authUser.user_metadata?.display_name || authUser.email.split("@")[0]
      return await getOrCreateNeonUser(authUser.id, authUser.email, displayName)
    }

    return null
  } catch (error) {
    console.error("Error getting current Neon user:", error)
    return null
  }
}

export { getUserByAuthId, getNeonUserById, getOrCreateNeonUser } from "@/lib/user-mapping"
