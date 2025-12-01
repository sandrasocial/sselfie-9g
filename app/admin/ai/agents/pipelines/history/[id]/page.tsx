import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/security/require-admin"
import Link from "next/link"
import PipelineRunDetails from "@/components/admin/ai/PipelineRunDetails"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PipelineRunDetailsPage({ params }: PageProps) {
  const admin = await requireAdmin()
  if (admin instanceof Response) {
    redirect("/auth/login")
  }

  const { id } = await params

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-4xl font-extralight tracking-[0.3em] uppercase text-stone-950">
              Pipeline Run Details
            </h1>
            <p className="text-sm text-stone-600 mt-2 font-light">View detailed execution information</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/admin/ai/agents/pipelines/history"
              className="px-6 py-3 bg-white text-stone-950 rounded-xl text-sm tracking-wider uppercase hover:bg-stone-100 transition-colors font-light border border-stone-200"
            >
              Back to History
            </Link>
            <Link
              href="/admin/ai/agents"
              className="px-6 py-3 bg-white text-stone-950 rounded-xl text-sm tracking-wider uppercase hover:bg-stone-100 transition-colors font-light border border-stone-200"
            >
              AI Agents
            </Link>
            <Link
              href="/admin"
              className="px-6 py-3 bg-stone-950 text-white rounded-xl text-sm tracking-wider uppercase hover:bg-stone-800 transition-colors font-light"
            >
              Admin Home
            </Link>
          </div>
        </div>

        <PipelineRunDetails runId={id} />
      </div>
    </div>
  )
}

