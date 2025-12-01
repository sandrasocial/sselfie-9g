"use client"

import { useState, useEffect } from "react"
import { Loader2, RefreshCw } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface Metrics {
  calls: Record<string, number>
  errors: Record<string, number>
  durations: Record<string, number[]>
}

interface AgentMetric {
  name: string
  calls: number
  errors: number
  avgDuration: number
  errorRate: number
}

export default function MetricsDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [agentList, setAgentList] = useState<string[]>([])
  const [chartData, setChartData] = useState<any[]>([])

  const fetchMetrics = async () => {
    try {
      setError(null)
      const response = await fetch("/api/admin/agents/metrics")
      if (!response.ok) {
        throw new Error("Failed to fetch metrics")
      }
      const data = await response.json()
      if (data.ok && data.metrics) {
        setMetrics(data.metrics)
        processMetrics(data.metrics)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const processMetrics = (metricsData: Metrics) => {
    // Get all agent names
    const allAgents = new Set<string>()
    Object.keys(metricsData.calls || {}).forEach((name) => allAgents.add(name))
    Object.keys(metricsData.errors || {}).forEach((name) => allAgents.add(name))
    Object.keys(metricsData.durations || {}).forEach((name) => allAgents.add(name))
    const sortedAgents = Array.from(allAgents).sort()
    setAgentList(sortedAgents)

    // Prepare chart data (top 10 agents by calls)
    const chartPoints: any[] = []
    sortedAgents
      .sort((a, b) => (metricsData.calls[b] || 0) - (metricsData.calls[a] || 0))
      .slice(0, 10)
      .forEach((agent) => {
        const calls = metricsData.calls[agent] || 0
        const errors = metricsData.errors[agent] || 0
        const durations = metricsData.durations[agent] || []
        const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0

        chartPoints.push({
          agent: agent.length > 20 ? agent.substring(0, 20) + "..." : agent,
          calls,
          errors,
          avgDuration: Math.round(avgDuration),
        })
      })
    setChartData(chartPoints)
  }

  const handleReset = async () => {
    if (!confirm("Are you sure you want to reset all metrics? This cannot be undone.")) {
      return
    }

    try {
      const response = await fetch("/api/admin/agents/metrics", {
        method: "POST",
      })
      if (!response.ok) {
        throw new Error("Failed to reset metrics")
      }
      await fetchMetrics()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset metrics")
    }
  }

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 8000) // Auto-refresh every 8 seconds
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (metrics) {
      processMetrics(metrics)
    }
  }, [metrics])

  const getAgentMetrics = (): AgentMetric[] => {
    if (!metrics) return []

    return agentList.map((name) => {
      const calls = metrics.calls[name] || 0
      const errors = metrics.errors[name] || 0
      const durations = metrics.durations[name] || []
      const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0
      const errorRate = calls > 0 ? (errors / calls) * 100 : 0

      return {
        name,
        calls,
        errors,
        avgDuration,
        errorRate,
      }
    })
  }

  const agentMetrics = getAgentMetrics()

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
          <div className="text-red-600 mb-4 font-light">Error loading metrics</div>
          <div className="text-sm text-stone-500 mb-4 font-light">{error}</div>
          <button
            onClick={fetchMetrics}
            className="px-6 py-3 bg-stone-950 text-white rounded-xl text-sm tracking-wider uppercase hover:bg-stone-800 transition-colors font-light"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header with Reset Button */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
            Agent Metrics
          </h2>
          <p className="text-sm text-stone-600 mt-2 font-light">
            Live metrics for all agents (auto-refreshes every 8 seconds)
          </p>
        </div>
        <button
          onClick={handleReset}
          className="px-6 py-3 bg-stone-950 text-white rounded-xl text-sm tracking-wider uppercase hover:bg-stone-800 transition-colors font-light flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Reset Metrics
        </button>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-8">
          <h3 className="font-serif text-xl font-extralight tracking-[0.15em] uppercase text-stone-950 mb-6">
            Top Agents Overview
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="agent" stroke="#78716c" style={{ fontSize: "12px" }} angle={-45} textAnchor="end" height={100} />
              <YAxis stroke="#78716c" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#fff", border: "1px solid #e7e5e4", borderRadius: "8px" }}
              />
              <Legend />
              <Line type="monotone" dataKey="calls" stroke="#1c1917" strokeWidth={2} name="Calls" />
              <Line type="monotone" dataKey="errors" stroke="#dc2626" strokeWidth={2} name="Errors" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Metrics Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="p-6 border-b border-stone-200">
          <h3 className="font-serif text-xl font-extralight tracking-[0.15em] uppercase text-stone-950">
            All Agents ({agentMetrics.length})
          </h3>
        </div>

        {agentMetrics.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-stone-500 font-light">No metrics available. Run some agents to see metrics here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs tracking-[0.15em] uppercase text-stone-600 font-light">
                    Agent Name
                  </th>
                  <th className="px-6 py-4 text-right text-xs tracking-[0.15em] uppercase text-stone-600 font-light">
                    Calls
                  </th>
                  <th className="px-6 py-4 text-right text-xs tracking-[0.15em] uppercase text-stone-600 font-light">
                    Errors
                  </th>
                  <th className="px-6 py-4 text-right text-xs tracking-[0.15em] uppercase text-stone-600 font-light">
                    Error Rate
                  </th>
                  <th className="px-6 py-4 text-right text-xs tracking-[0.15em] uppercase text-stone-600 font-light">
                    Avg Duration
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {agentMetrics.map((agent) => (
                  <tr key={agent.name} className="hover:bg-stone-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-stone-950 font-light">{agent.name}</td>
                    <td className="px-6 py-4 text-sm text-stone-950 font-light text-right">{agent.calls}</td>
                    <td className="px-6 py-4 text-sm text-stone-950 font-light text-right">{agent.errors}</td>
                    <td className="px-6 py-4 text-sm font-light text-right">
                      <span className={agent.errorRate > 10 ? "text-red-600" : "text-stone-950"}>
                        {agent.errorRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-stone-950 font-light text-right">
                      {agent.avgDuration.toFixed(0)}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

