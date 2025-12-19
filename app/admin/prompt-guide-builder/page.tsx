import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId, getOrCreateNeonUser } from "@/lib/user-mapping"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import PromptGuideBuilderClient from "@/components/admin/prompt-guide-builder-client"

export const dynamic = "force-dynamic"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export default async function PromptGuideBuilderPage() {
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
    redirect("/404")
  }

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Link
              href="/admin"
              className="flex items-center gap-2 text-sm tracking-[0.15em] uppercase font-light text-stone-600 hover:text-stone-950 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Admin Dashboard
            </Link>
          </div>
          <h1 className="font-serif text-5xl font-extralight tracking-[0.3em] uppercase text-stone-950 mb-2">
            Prompt Guide Builder
          </h1>
          <p className="text-xs tracking-[0.15em] uppercase font-light text-stone-500">
            Create, Test & Publish Image Prompt Guides
          </p>
        </div>

        {/* Client component with mode toggle and content */}
        <PromptGuideBuilderClient userId={String(neonUser.id)} />
      </div>
    </div>
  )
}
