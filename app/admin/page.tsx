import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"
import { redirect } from "next/navigation"
import { AdminDashboard } from "@/components/admin/admin-dashboard"

export const dynamic = "force-dynamic"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ig_connected?: string; ig_error?: string; detail?: string }>
}) {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  let neonUser = null
  let userError = null

  try {
    neonUser = await getUserByAuthId(user.id)
  } catch (error) {
    console.error("[v0] Error fetching user by auth ID:", error)
    userError = error
  }

  if (!neonUser && user.email && !userError) {
    try {
      neonUser = await getOrCreateNeonUser(user.id, user.email, user.user_metadata?.name || user.user_metadata?.display_name)
    } catch (error) {
      console.error("[v0] Error syncing user with database:", error)
      userError = error
    }
  }

  if (!neonUser || userError) {
    console.error("[v0] User authenticated but could not be synced with database")
    redirect("/auth/login")
  }

  if (neonUser.email !== ADMIN_EMAIL) {
    redirect("/")
  }

  const params = await searchParams
  const igConnected = params.ig_connected
  const igError = params.ig_error
  const igDetail = params.detail

  return (
    <>
      {igConnected && (
        <div style={{ background: '#d4edda', border: '1px solid #c3e6cb', color: '#155724', padding: '12px 20px', margin: '16px', borderRadius: '8px', fontFamily: 'sans-serif' }}>
          ✅ Instagram connected: @{igConnected}
        </div>
      )}
      {igError && (
        <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', color: '#721c24', padding: '12px 20px', margin: '16px', borderRadius: '8px', fontFamily: 'sans-serif' }}>
          ❌ Instagram connection failed: <strong>{igError}</strong>
          {igDetail && <div style={{ marginTop: '6px', fontSize: '13px', opacity: 0.85 }}>{decodeURIComponent(igDetail)}</div>}
          <div style={{ marginTop: '8px', fontSize: '13px' }}>
            Run <code>/api/instagram/diagnose</code> (with admin secret header) for full diagnostics.
          </div>
        </div>
      )}
      <AdminDashboard
        userId={String(neonUser.id)}
        userName={neonUser.display_name || "Admin"}
      />
    </>
  )
}
