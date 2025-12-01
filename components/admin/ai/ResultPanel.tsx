"use client"

interface TraceEntry {
  timestamp: number
  agent: string
  event: string
  data?: unknown
}

interface Metrics {
  calls: Record<string, number>
  errors: Record<string, number>
  durations: Record<string, number[]>
}

interface ResultPanelProps {
  result?: unknown
  error?: string
  executionTime?: number
  traces?: TraceEntry[]
  metrics?: Metrics
  agentName?: string
}

export default function ResultPanel({
  result,
  error,
  executionTime,
  traces,
  metrics,
  agentName,
}: ResultPanelProps) {
  const formatJson = (obj: unknown) => {
    try {
      return JSON.stringify(obj, null, 2)
    } catch {
      return String(obj)
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const getAgentMetrics = (name: string) => {
    if (!metrics || !name) return null
    const calls = metrics.calls[name] || 0
    const errors = metrics.errors[name] || 0
    const durations = metrics.durations[name] || []
    const avgDuration =
      durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0

    return { calls, errors, avgDuration }
  }

  const agentMetrics = agentName ? getAgentMetrics(agentName) : null

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-8 space-y-6">
      <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
        Results
      </h2>

      {executionTime !== undefined && (
        <div className="text-sm text-stone-600 font-light">
          Execution time: {executionTime}ms
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="text-sm font-semibold text-red-900 mb-1">Error</div>
          <div className="text-sm text-red-700 font-mono">{error}</div>
        </div>
      )}

      {result && (
        <div>
          <div className="text-sm text-stone-600 font-light mb-2">Output</div>
          <pre className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs font-mono text-stone-950 overflow-auto max-h-96">
            {formatJson(result)}
          </pre>
        </div>
      )}

      {agentMetrics && (
        <div>
          <div className="text-sm text-stone-600 font-light mb-3">Agent Metrics</div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
              <div className="text-xs text-stone-500 font-light mb-1">Calls</div>
              <div className="text-2xl font-light text-stone-950">{agentMetrics.calls}</div>
            </div>
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
              <div className="text-xs text-stone-500 font-light mb-1">Errors</div>
              <div className="text-2xl font-light text-stone-950">{agentMetrics.errors}</div>
            </div>
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
              <div className="text-xs text-stone-500 font-light mb-1">Avg Duration</div>
              <div className="text-2xl font-light text-stone-950">
                {agentMetrics.avgDuration.toFixed(0)}ms
              </div>
            </div>
          </div>
        </div>
      )}

      {traces && traces.length > 0 && (
        <div>
          <div className="text-sm text-stone-600 font-light mb-3">Recent Traces</div>
          <div className="space-y-2 max-h-64 overflow-auto">
            {traces.slice(-10).map((trace, idx) => (
              <div
                key={idx}
                className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs font-mono"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-stone-950 font-semibold">{trace.agent}</span>
                  <span className="text-stone-500">{formatTimestamp(trace.timestamp)}</span>
                </div>
                <div className="text-stone-600 mb-1">{trace.event}</div>
                {trace.data && (
                  <div className="text-stone-500 mt-1 overflow-hidden text-ellipsis">
                    {formatJson(trace.data).substring(0, 200)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!result && !error && (
        <div className="text-sm text-stone-500 font-light text-center py-8">
          No results yet. Run an agent to see output here.
        </div>
      )}
    </div>
  )
}

