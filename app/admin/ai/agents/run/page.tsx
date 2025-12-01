import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/security/require-admin"
import Link from "next/link"
import RunAgentClient from "@/components/admin/ai/RunAgentClient"

export default async function RunAgentPage() {
  const admin = await requireAdmin()
  if (admin instanceof Response) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-4xl font-extralight tracking-[0.3em] uppercase text-stone-950">
              Run Agent
            </h1>
            <p className="text-sm text-stone-600 mt-2 font-light">Execute a single AI agent</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/admin/ai/agents"
              className="px-6 py-3 bg-white text-stone-950 rounded-xl text-sm tracking-wider uppercase hover:bg-stone-100 transition-colors font-light border border-stone-200"
            >
              Back
            </Link>
            <Link
              href="/admin"
              className="px-6 py-3 bg-stone-950 text-white rounded-xl text-sm tracking-wider uppercase hover:bg-stone-800 transition-colors font-light"
            >
              Admin Home
            </Link>
          </div>
        </div>

        <RunAgentClient />
      </div>
    </div>
  )
}

