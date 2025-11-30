/**
 * Authentication helpers for email automation API routes
 * Supports both admin key (x-admin-key header) and Supabase session authentication
 */

import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { requireAdmin, type AdminContext } from "@/lib/security/require-admin"

const ADMIN_KEY = process.env.ADMIN_KEY || process.env.X_ADMIN_KEY

/**
 * Check if request has valid admin key
 */
function hasValidAdminKey(request: Request): boolean {
  if (!ADMIN_KEY) {
    return false
  }
  const adminKey = request.headers.get("x-admin-key")
  return adminKey === ADMIN_KEY
}

/**
 * Get authenticated user from Supabase session
 */
async function getAuthenticatedUser(): Promise<
  | { success: true; userId: string; email: string }
  | { success: false; response: NextResponse }
> {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser()

    if (error || !authUser) {
      return {
        success: false,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      }
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return {
        success: false,
        response: NextResponse.json({ error: "User not found" }, { status: 404 }),
      }
    }

    return {
      success: true,
      userId: neonUser.id.toString(),
      email: neonUser.email || authUser.email || "",
    }
  } catch (error) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 },
      ),
    }
  }
}

/**
 * Require admin access (admin key OR admin user)
 */
export async function requireAdminOrKey(
  request: Request,
): Promise<NextResponse | AdminContext> {
  // Check admin key first
  if (hasValidAdminKey(request)) {
    // Return a mock admin context for admin key
    return {
      authUserId: "admin-key",
      neonUserId: 0,
      email: "admin@sselfie.ai",
    }
  }

  // Fall back to admin user check
  return await requireAdmin(request)
}

/**
 * Require user OR admin access
 */
export async function requireUserOrAdmin(
  request: Request,
): Promise<
  | { success: true; userId: string; email: string; isAdmin: boolean }
  | { success: false; response: NextResponse }
> {
  // Check admin key first
  if (hasValidAdminKey(request)) {
    return {
      success: true,
      userId: "admin-key",
      email: "admin@sselfie.ai",
      isAdmin: true,
    }
  }

  // Check if admin user
  const adminCheck = await requireAdmin(request)
  if (!(adminCheck instanceof NextResponse)) {
    return {
      success: true,
      userId: adminCheck.neonUserId.toString(),
      email: adminCheck.email,
      isAdmin: true,
    }
  }

  // Check regular user
  const userCheck = await getAuthenticatedUser()
  if (!userCheck.success) {
    return {
      success: false as const,
      response: userCheck.response,
    }
  }

  return {
    success: true as const,
    userId: userCheck.userId,
    email: userCheck.email,
    isAdmin: false,
  }
}

