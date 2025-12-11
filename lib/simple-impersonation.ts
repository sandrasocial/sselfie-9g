import { cookies } from "next/headers"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId, getNeonUserById } from "@/lib/user-mapping"

const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * Simple impersonation helper
 * Returns the impersonated user ID if admin is impersonating, otherwise null
 */
export async function getImpersonatedUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const impersonateUserId = cookieStore.get("impersonate_user_id")?.value

    if (!impersonateUserId) {
      return null
    }

    // Verify current user is admin
    const { user } = await getAuthenticatedUser()
    if (!user) {
      return null
    }

    const adminUser = await getUserByAuthId(user.id)
    if (!adminUser || adminUser.email !== ADMIN_EMAIL) {
      // Not admin - clear cookie
      cookieStore.delete("impersonate_user_id")
      return null
    }

    return impersonateUserId
  } catch (error) {
    console.error("[v0] Error checking impersonation:", error)
    return null
  }
}

/**
 * Get the effective user ID (impersonated if admin is impersonating, otherwise current user)
 * Use this in API routes that need to know which user to fetch data for
 */
export async function getEffectiveUserId(authUserId: string): Promise<string> {
  const impersonatedId = await getImpersonatedUserId()
  if (impersonatedId) {
    return impersonatedId
  }

  // Normal flow - get current user's Neon ID
  const user = await getUserByAuthId(authUserId)
  if (!user) {
    throw new Error("User not found")
  }
  return user.id
}

/**
 * Get the effective Neon user object
 * Use this in API routes instead of getUserByAuthId
 */
export async function getEffectiveNeonUser(authUserId: string) {
  const impersonatedId = await getImpersonatedUserId()
  if (impersonatedId) {
    const user = await getNeonUserById(impersonatedId)
    if (user) {
      return user
    }
  }

  // Normal flow
  return await getUserByAuthId(authUserId)
}
