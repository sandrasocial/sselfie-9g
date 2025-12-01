"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import AgentSelect from "./AgentSelect"
import JsonEditor from "./JsonEditor"
import ResultPanel from "./ResultPanel"
import { Loader2 } from "lucide-react"

interface AgentMetadata {
  name: string
  version?: string
  description?: string
}

interface AgentListItem {
  name: string
  metadata: AgentMetadata
}

export default function RunAgentClient() {
  const searchParams = useSearchParams()
  const [agents, setAgents] = useState<AgentListItem[]>([])
  const [selectedAgent, setSelectedAgent] = useState("")
  const [input, setInput] = useState("{}")
  const [result, setResult] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [executionTime, setExecutionTime] = useState<number | undefined>(undefined)
  const [traces, setTraces] = useState<unknown[]>([])
  const [metrics, setMetrics] = useState<unknown>(null)

  useEffect(() => {
    // Load agents
    fetch("/api/admin/agents/run")
      .then((res) => res.json())
      .then((data) => {
        if (data.metadata) {
          setAgents(data.metadata)
        }
      })
      .catch(console.error)

    // Check for agent param in URL
    const agentParam = searchParams.get("agent")
    if (agentParam) {
      setSelectedAgent(agentParam)
    }
  }, [searchParams])

  const handleRun = async () => {
    if (!selectedAgent) {
      setError("Please select an agent")
      return
    }

    // Validate agent name (block Maya)
    if (selectedAgent.toLowerCase().includes("maya")) {
      setError("Maya cannot be run via admin agent API")
      return
    }

    let parsedInput
    try {
      parsedInput = JSON.parse(input)
    } catch (err) {
      setError("Invalid JSON input")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    const startTime = Date.now()

    try {
      const response = await fetch("/api/admin/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: selectedAgent,
          input: parsedInput,
        }),
      })

      const data = await response.json()
      const endTime = Date.now()
      setExecutionTime(endTime - startTime)

      if (!response.ok) {
        setError(data.error || "Failed to run agent")
        return
      }

      if (data.success) {
        setResult(data.output)
        if (data.trace) {
          setTraces(data.trace)
        }
        if (data.metrics) {
          setMetrics(data.metrics)
        }
      } else {
        setError(data.error || "Agent execution failed")
      }

      // Note: Traces and metrics are automatically recorded by the API
      // They will be available in the response if the API returns them
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-8 space-y-6">
          <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
            Configuration
          </h2>

          <div>
            <label className="block text-sm text-stone-600 font-light mb-2">Agent</label>
            <AgentSelect value={selectedAgent} onChange={setSelectedAgent} agents={agents} />
          </div>

          <div>
            <label className="block text-sm text-stone-600 font-light mb-2">Input (JSON)</label>
            <JsonEditor value={input} onChange={setInput} />
          </div>

          <button
            onClick={handleRun}
            disabled={loading || !selectedAgent}
            className="w-full px-6 py-3 bg-stone-950 text-white rounded-xl text-sm tracking-wider uppercase hover:bg-stone-800 transition-colors font-light disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              "Run Agent"
            )}
          </button>
        </div>
      </div>

      <div>
        <ResultPanel
          result={result}
          error={error}
          executionTime={executionTime}
          traces={traces as any}
          metrics={metrics as any}
          agentName={selectedAgent}
        />
      </div>
    </div>
  )
}

