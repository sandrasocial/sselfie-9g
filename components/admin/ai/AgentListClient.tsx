"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import Link from "next/link"

interface AgentMetadata {
  name: string
  version?: string
  description?: string
}

interface AgentListItem {
  name: string
  metadata: AgentMetadata
}

export default function AgentListClient() {
  const [agents, setAgents] = useState<AgentListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/admin/agents/list", {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      })
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch agents: ${errorText}`)
      }
      const data = await response.json()
      if (data.agents && Array.isArray(data.agents)) {
        setAgents(
          data.agents.map((agent: any) => ({
            name: agent.name,
            metadata: {
              name: agent.name,
              version: agent.version,
              description: agent.description,
            },
          })),
        )
      } else {
        setAgents([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-12">
        <div className="text-center">
          <div className="text-red-600 mb-4 font-light">Error loading agents</div>
          <div className="text-sm text-stone-500 mb-4 font-light">{error}</div>
          <button
            onClick={fetchAgents}
            className="px-6 py-3 bg-stone-950 text-white rounded-xl text-sm tracking-wider uppercase hover:bg-stone-800 transition-colors font-light"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <div className="p-6 border-b border-stone-200">
        <h2 className="font-serif text-xl font-extralight tracking-[0.15em] uppercase text-stone-950">
          All Agents ({agents.length})
        </h2>
      </div>

      {agents.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-stone-500 font-light">No agents found</p>
        </div>
      ) : (
        <div className="divide-y divide-stone-100">
          {agents.map((agent) => (
            <div
              key={agent.name}
              className="p-6 hover:bg-stone-50 transition-colors flex items-start justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <h3 className="text-lg font-light text-stone-950">{agent.name}</h3>
                  {agent.metadata.version && (
                    <span className="text-xs text-stone-500 font-light">
                      v{agent.metadata.version}
                    </span>
                  )}
                </div>
                {agent.metadata.description && (
                  <p className="text-sm text-stone-600 font-light leading-relaxed">
                    {agent.metadata.description}
                  </p>
                )}
              </div>
              <Link
                href={`/admin/ai/agents/run?agent=${encodeURIComponent(agent.name)}`}
                className="ml-6 px-4 py-2 bg-stone-950 text-white rounded-lg text-xs hover:bg-stone-800 transition-colors font-light uppercase tracking-wider whitespace-nowrap"
              >
                Run
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

