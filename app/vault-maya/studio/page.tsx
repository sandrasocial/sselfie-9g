import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { getOrCreateNeonUser } from "@/lib/user-mapping"
import { getSuiteAccess } from "@/lib/trial/suite-trial"
import { getUserCredits } from "@/lib/credits"
import { sql } from "@/lib/db/client"
import { isAdminEmail } from "@/lib/admin-feature-flags"
import { VaultMayaStudio } from "@/components/vault-maya/vault-maya-studio"

export const dynamic = "force-dynamic"

export default async function VaultMayaStudioPage() {
  let supabase
  try {
    supabase = await createServerClient()
  } catch {
    redirect(`/auth/login?returnTo=${encodeURIComponent("/vault-maya/studio")}`)
  }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect(`/auth/login?returnTo=${encodeURIComponent("/vault-maya/studio")}`)
  }

  const neonUser = await getOrCreateNeonUser(user.id, user.email ?? "", null)
  const neonUserId = String(neonUser.id)
  const isAdmin = isAdminEmail(user.email)

  let level: "vault" | "member" | "trial" | null = null
  if (isAdmin) {
    level = "member"
  } else {
    const access = await getSuiteAccess(neonUserId)
    if (access.level === "vault" || access.level === "member" || access.level === "trial") {
      level = access.level
    }
  }
  if (!level) {
    redirect("/vault-maya")
  }

  let initialSelfies: Array<{ id: string; url: string }> = []
  try {
    const rows = await sql`
      SELECT id, image_url
      FROM user_avatar_images
      WHERE user_id = ${neonUserId}
        AND is_active = ${true}
        AND image_type = 'selfie'
      ORDER BY uploaded_at DESC
      LIMIT 4
    `
    initialSelfies = rows
      .filter(row => row.id != null && typeof row.image_url === "string")
      .map(row => ({ id: String(row.id), url: String(row.image_url) }))
  } catch (e) {
    console.error("[vault-maya/studio] selfie lookup failed:", e)
  }

  const credits = await getUserCredits(neonUserId).catch(() => 0)

  return (
    <main className="min-h-screen bg-[#F8FAFA]">
      <VaultMayaStudio
        initialSelfies={initialSelfies}
        initialCredits={credits}
        showSuiteBridge={level === "vault"}
        includedWithSuite={level === "member"}
      />
    </main>
  )
}
