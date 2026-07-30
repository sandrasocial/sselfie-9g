import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import { isAdminEmail } from "@/lib/admin-feature-flags"
import { getSuiteAccess } from "@/lib/trial/suite-trial"
import { buildVaultMayaBrief, findVaultMayaCard } from "@/lib/vault-maya/looks"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!isAdminEmail(user.email)) {
    const neonUserId = await getUserIdFromSupabase(user.id)
    if (!neonUserId) {
      return NextResponse.json({ error: "Account not found" }, { status: 403 })
    }
    const access = await getSuiteAccess(String(neonUserId))
    if (access.level !== "vault" && access.level !== "member" && access.level !== "trial") {
      return NextResponse.json({ error: "Vault Maya membership required" }, { status: 403 })
    }
  }

  let cardKey = ""
  try {
    const body = await request.json()
    if (typeof body?.cardKey === "string") cardKey = body.cardKey
  } catch {
    return NextResponse.json({ error: "Expected JSON body with cardKey" }, { status: 400 })
  }

  const resolved = await findVaultMayaCard(cardKey)
  if (!resolved) {
    return NextResponse.json({ error: "Look not found" }, { status: 404 })
  }

  return NextResponse.json({
    brief: buildVaultMayaBrief(resolved.card),
    aestheticId: resolved.aestheticId,
    title: resolved.card.title,
    collectionTitle: resolved.collectionTitle,
  })
}
