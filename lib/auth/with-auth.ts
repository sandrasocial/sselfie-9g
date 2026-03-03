import type { User } from "@supabase/supabase-js"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { getAuthenticatedUser, getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"

type AuthMode = "default" | "retry"

type ResolveUserFn<TUser> = (authUserId: string) => Promise<TUser | null>

interface WithAuthOptions<TUser> {
  authMode?: AuthMode
  resolveUser?: ResolveUserFn<TUser> | false
  unauthorizedMessage?: string
  userNotFoundMessage?: string
}

export interface AuthContext<TUser> {
  request: NextRequest | Request
  authUser: User
  user: TUser
}

/**
 * Wrap API handlers with shared auth + user-resolution logic.
 *
 * Default behavior:
 * 1) authenticate via getAuthenticatedUser()
 * 2) resolve effective Neon user via getEffectiveNeonUser()
 */
export function withAuth<
  TUser = Awaited<ReturnType<typeof getEffectiveNeonUser>>,
  TArgs extends unknown[] = [],
>(
  handler: (context: AuthContext<TUser>, ...args: TArgs) => Promise<Response> | Response,
  options: WithAuthOptions<TUser> = {},
) {
  return async (request: NextRequest | Request, ...args: TArgs): Promise<Response> => {
    try {
      const authResult =
        options.authMode === "retry" ? await getAuthenticatedUserWithRetry() : await getAuthenticatedUser()
      const authUser = authResult.user

      if (authResult.error || !authUser) {
        return NextResponse.json(
          { error: options.unauthorizedMessage || "Unauthorized" },
          { status: 401 },
        )
      }

      if (options.resolveUser === false) {
        return handler(
          {
            request,
            authUser,
            user: authUser as unknown as TUser,
          },
          ...args,
        )
      }

      const resolveUser = (options.resolveUser || getEffectiveNeonUser) as ResolveUserFn<TUser>
      const resolvedUser = await resolveUser(authUser.id)

      if (!resolvedUser) {
        return NextResponse.json(
          { error: options.userNotFoundMessage || "User not found" },
          { status: 404 },
        )
      }

      return handler(
        {
          request,
          authUser,
          user: resolvedUser,
        },
        ...args,
      )
    } catch (error) {
      console.error("[withAuth] Authentication wrapper error:", error)
      return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
    }
  }
}
