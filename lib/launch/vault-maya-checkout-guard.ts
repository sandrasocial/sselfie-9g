export const VAULT_MAYA_ALREADY_INCLUDED =
  "Vault Maya is already included in your SSELFIE SUITE membership."

export const VAULT_MAYA_ACCESS_CHECK_FAILED =
  "We couldn't confirm your current access. Please refresh and try again before checking out."

function isAuthSessionMissing(error: unknown): boolean {
  return error instanceof Error && error.name === "AuthSessionMissingError"
}

/**
 * Prevents a signed-in SUITE member from buying a subset of access they already own.
 *
 * A missing Supabase session is the expected anonymous state and is allowed. Once a
 * user is authenticated, mapping/access failures stop checkout instead of risking a
 * duplicate subscription.
 */
export async function assertVaultMayaCheckoutAllowed(): Promise<void> {
  try {
    const { createServerClient } = await import("@/lib/supabase/server")
    const supabase = await createServerClient()
    let authResult
    try {
      authResult = await supabase.auth.getUser()
    } catch (error) {
      if (isAuthSessionMissing(error)) return
      throw error
    }

    const {
      data: { user: authUser },
      error: authError,
    } = authResult

    if (isAuthSessionMissing(authError)) return
    if (authError) throw authError
    if (!authUser?.id) return

    const { getUserIdFromSupabase } = await import("@/lib/user-mapping")
    const neonUserId = await getUserIdFromSupabase(authUser.id)
    if (!neonUserId) throw new Error("Authenticated user has no Neon mapping")

    const { getSuiteAccess } = await import("@/lib/trial/suite-trial")
    const access = await getSuiteAccess(String(neonUserId))
    if (access.level === "member") {
      throw new Error(VAULT_MAYA_ALREADY_INCLUDED)
    }
  } catch (error) {
    if (error instanceof Error && error.message === VAULT_MAYA_ALREADY_INCLUDED) {
      throw error
    }
    console.error("[vault-maya checkout] access guard failed:", error)
    throw new Error(VAULT_MAYA_ACCESS_CHECK_FAILED)
  }
}
