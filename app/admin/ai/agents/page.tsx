import { redirect } from "next/navigation"
import { requireAdmin } from "@/lib/security/require-admin"
import Link from "next/link"

export default async function AgentsOverviewPage() {
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
              AI Agents
            </h1>
            <p className="text-sm text-stone-600 mt-2 font-light">Manage and execute AI agents</p>
          </div>
          <Link
            href="/admin"
            className="px-6 py-3 bg-stone-950 text-white rounded-xl text-sm tracking-wider uppercase hover:bg-stone-800 transition-colors font-light"
          >
            Back to Admin
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/admin/ai/agents/list"
            className="bg-white rounded-2xl p-8 border border-stone-200 hover:border-stone-400 transition-colors group"
          >
            <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4 group-hover:text-stone-700 transition-colors">
              Agent List
            </h2>
            <p className="text-sm text-stone-600 font-light leading-relaxed">
              View all available agents and their metadata
            </p>
          </Link>

          <Link
            href="/admin/ai/agents/run"
            className="bg-white rounded-2xl p-8 border border-stone-200 hover:border-stone-400 transition-colors group"
          >
            <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4 group-hover:text-stone-700 transition-colors">
              Run Agent
            </h2>
            <p className="text-sm text-stone-600 font-light leading-relaxed">
              Execute a single agent with custom input
            </p>
          </Link>

          <Link
            href="/admin/ai/agents/pipelines"
            className="bg-white rounded-2xl p-8 border border-stone-200 hover:border-stone-400 transition-colors group"
          >
            <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4 group-hover:text-stone-700 transition-colors">
              Pipelines
            </h2>
            <p className="text-sm text-stone-600 font-light leading-relaxed">
              Build and run multi-step agent pipelines
            </p>
          </Link>

          <Link
            href="/admin/ai/agents/metrics"
            className="bg-white rounded-2xl p-8 border border-stone-200 hover:border-stone-400 transition-colors group"
          >
            <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4 group-hover:text-stone-700 transition-colors">
              Metrics
            </h2>
            <p className="text-sm text-stone-600 font-light leading-relaxed">
              Live performance metrics for all agents
            </p>
          </Link>

          <Link
            href="/admin/ai/agents/traces"
            className="bg-white rounded-2xl p-8 border border-stone-200 hover:border-stone-400 transition-colors group"
          >
            <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4 group-hover:text-stone-700 transition-colors">
              Traces
            </h2>
            <p className="text-sm text-stone-600 font-light leading-relaxed">
              Live execution traces for all agents
            </p>
          </Link>

          <Link
            href="/admin/ai/agents/pipelines/history"
            className="bg-white rounded-2xl p-8 border border-stone-200 hover:border-stone-400 transition-colors group"
          >
            <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4 group-hover:text-stone-700 transition-colors">
              Pipeline History
            </h2>
            <p className="text-sm text-stone-600 font-light leading-relaxed">
              View past pipeline executions
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}

