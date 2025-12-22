import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"
import { redirect } from "next/navigation"
import { MayaTestingLab } from "@/components/admin/maya-testing-lab"
import { Lock, ArrowLeft } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export default async function MayaTestingPage() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  let neonUser = null
  try {
    neonUser = await getUserByAuthId(user.id)
  } catch (error) {
    console.error("[v0] Error fetching user:", error)
  }

  if (!neonUser && user.email) {
    try {
      neonUser = await getOrCreateNeonUser(user.id, user.email, user.user_metadata?.display_name)
    } catch (error) {
      console.error("[v0] Error syncing user:", error)
    }
  }

  if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-stone-100/50 to-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/50 backdrop-blur-2xl rounded-3xl p-8 border border-white/60 shadow-xl shadow-stone-900/10">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="p-6 bg-stone-950 rounded-2xl shadow-lg">
                <Lock size={40} className="text-white" strokeWidth={2} />
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl font-serif font-extralight tracking-[0.3em] uppercase text-stone-950">
                  Admin Only
                </h1>
                <p className="text-sm text-stone-600 leading-relaxed">
                  This area is restricted to administrators only.
                </p>
              </div>

              <div className="w-full pt-4">
                <Link
                  href="/admin"
                  className="w-full flex items-center justify-center gap-2 text-sm tracking-[0.15em] uppercase font-light border rounded-2xl py-5 transition-colors hover:text-stone-950 hover:bg-stone-100/30 text-stone-600 border-stone-300/40"
                >
                  <ArrowLeft size={16} />
                  Back to Admin
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <MayaTestingLab userId={String(neonUser.id)} userName={neonUser.display_name || "Admin"} />
}





















