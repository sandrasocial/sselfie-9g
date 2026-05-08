import { NextResponse } from "next/server"

import {
  getAcademyEntitlementState,
  userHasAcademyProductAccess,
} from "@/lib/academy-entitlements"
import { createServerClient } from "@/lib/supabase/server"
import { hasStudioMembership } from "@/lib/subscription"
import { getUserByAuthId } from "@/lib/user-mapping"

export class AcademyRouteError extends Error {
  status: number
  body: Record<string, unknown>

  constructor(status: number, body: Record<string, unknown>) {
    super(typeof body.error === "string" ? body.error : "Academy route error")
    this.status = status
    this.body = body
  }
}

export type AcademyServerUser = {
  authUser: {
    id: string
    email?: string | null
  }
  neonUser: {
    id: string
    email?: string | null
  }
}

export async function requireAcademyUser(): Promise<AcademyServerUser> {
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !authUser) {
    throw new AcademyRouteError(401, {
      error: "Unauthorized",
      hasAccess: false,
    })
  }

  const neonUser = await getUserByAuthId(authUser.id)
  if (!neonUser) {
    throw new AcademyRouteError(404, {
      error: "User not found",
      hasAccess: false,
    })
  }

  return {
    authUser: {
      id: authUser.id,
      email: authUser.email,
    },
    neonUser: {
      id: String(neonUser.id),
      email: neonUser.email,
    },
  }
}

export async function requireAcademyProductAccess(productId: string) {
  const user = await requireAcademyUser()
  const [state, hasAccess] = await Promise.all([
    getAcademyEntitlementState(user.neonUser.id),
    userHasAcademyProductAccess(user.neonUser.id, productId),
  ])

  if (!hasAccess) {
    throw new AcademyRouteError(403, {
      error: "Academy product access required",
      hasAccess: false,
      requiredProductId: productId,
    })
  }

  return {
    ...user,
    entitlementState: state,
  }
}

export async function requireAcademyMembershipCollectionAccess(collectionKey: string) {
  const user = await requireAcademyUser()
  const hasAccess = await hasStudioMembership(user.neonUser.id)

  if (!hasAccess) {
    throw new AcademyRouteError(403, {
      error: "Studio Membership required",
      hasAccess: false,
      requiredAccess: "membership",
      requiredCollection: collectionKey,
    })
  }

  return user
}

export function academyRouteErrorToResponse(error: unknown) {
  if (error instanceof AcademyRouteError) {
    return NextResponse.json(error.body, { status: error.status })
  }

  return null
}
