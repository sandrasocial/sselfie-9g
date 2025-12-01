"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2, Search, X } from "lucide-react"

interface TraceEntry {
  timestamp: number
  agent: string
  event: string
  data?: unknown
}

export default function TracesStream() {
  const [traces, setTraces] = useState<TraceEntry[]>([])
  const [filteredTraces, setFilteredTraces] = useState<TraceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<string>("")
  const [selectedEvent, setSelectedEvent] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [agentList, setAgentList] = useState<string[]>([])
  const [eventList, setEventList] = useState<string[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  const fetchTraces = async () => {
    try {
      setError(null)
      const url = selectedAgent
        ? `/api/admin/agents/traces?agent=${encodeURIComponent(selectedAgent)}`
        : "/api/admin/agents/traces"
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error("Failed to fetch traces")
      }
      const data = await response.json()
      if (data.ok && data.traces) {
        // Reverse to show newest first
        const reversedTraces = [...data.traces].reverse()
        setTraces(reversedTraces)

        // Extract unique agents and events
        const agents = new Set<string>()
        const events = new Set<string>()
        reversedTraces.forEach((trace: TraceEntry) => {
          agents.add(trace.agent)
          events.add(trace.event)
        })
        setAgentList(Array.from(agents).sort())
        setEventList(Array.from(events).sort())
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    if (!confirm("Are you sure you want to clear all traces? This cannot be undone.")) {
      return
    }

    try {
      const response = await fetch("/api/admin/agents/traces", {
        method: "POST",
      })
      if (!response.ok) {
        throw new Error("Failed to clear traces")
      }
      setTraces([])
      setFilteredTraces([])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear traces")
    }
  }

  // Apply filters
  useEffect(() => {
    let filtered = [...traces]

    // Filter by agent
    if (selectedAgent) {
      filtered = filtered.filter((trace) => trace.agent === selectedAgent)
    }

    // Filter by event type
    if (selectedEvent) {
      filtered = filtered.filter((trace) => trace.event === selectedEvent)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (trace) =>
          trace.agent.toLowerCase().includes(query) ||
          trace.event.toLowerCase().includes(query) ||
          JSON.stringify(trace.data || {}).toLowerCase().includes(query),
      )
    }

    setFilteredTraces(filtered)

    // Auto-scroll to bottom if enabled
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [traces, selectedAgent, selectedEvent, searchQuery, autoScroll])

  useEffect(() => {
    fetchTraces()
    const interval = setInterval(fetchTraces, 4000) // Auto-refresh every 4 seconds
    return () => clearInterval(interval)
  }, [selectedAgent])

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
          <div className="text-red-600 mb-4 font-light">Error loading traces</div>
          <div className="text-sm text-stone-500 mb-4 font-light">{error}</div>
          <button
            onClick={fetchTraces}
            className="px-6 py-3 bg-stone-950 text-white rounded-xl text-sm tracking-wider uppercase hover:bg-stone-800 transition-colors font-light"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
              Trace Stream
            </h2>
            <p className="text-sm text-stone-600 mt-2 font-light">
              Live execution traces (auto-refreshes every 4 seconds) • {filteredTraces.length} traces
            </p>
          </div>
          <button
            onClick={handleClear}
            className="px-6 py-3 bg-stone-950 text-white rounded-xl text-sm tracking-wider uppercase hover:bg-stone-800 transition-colors font-light"
          >
            Clear Traces
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-stone-600 font-light mb-2">Filter by Agent</label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm text-stone-950 font-light focus:outline-none focus:border-stone-400 transition-colors"
            >
              <option value="">All Agents</option>
              {agentList.map((agent) => (
                <option key={agent} value={agent}>
                  {agent}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-stone-600 font-light mb-2">Filter by Event Type</label>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm text-stone-950 font-light focus:outline-none focus:border-stone-400 transition-colors"
            >
              <option value="">All Events</option>
              {eventList.map((event) => (
                <option key={event} value={event}>
                  {event}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-stone-600 font-light mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search traces..."
                className="w-full pl-10 pr-10 py-3 bg-white border border-stone-200 rounded-xl text-sm text-stone-950 font-light focus:outline-none focus:border-stone-400 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Auto-scroll toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="autoScroll"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="w-4 h-4 text-stone-950 border-stone-300 rounded focus:ring-stone-400"
          />
          <label htmlFor="autoScroll" className="text-sm text-stone-600 font-light">
            Auto-scroll to latest
          </label>
        </div>
      </div>

      {/* Traces Stream */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div
          ref={scrollRef}
          className="max-h-[600px] overflow-y-auto p-6 space-y-3"
          style={{ scrollBehavior: "smooth" }}
        >
          {filteredTraces.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-stone-500 font-light">
                {traces.length === 0
                  ? "No traces available. Run some agents to see traces here."
                  : "No traces match your filters."}
              </p>
            </div>
          ) : (
            filteredTraces.map((trace, idx) => (
              <div
                key={idx}
                className="bg-stone-50 border border-stone-200 rounded-xl p-4 hover:bg-stone-100 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-stone-950">{trace.agent}</span>
                    <span className="text-xs text-stone-500 bg-stone-200 px-2 py-1 rounded">
                      {trace.event}
                    </span>
                  </div>
                  <span className="text-xs text-stone-500 font-mono">{formatTimestamp(trace.timestamp)}</span>
                </div>
                {trace.data && (
                  <div className="mt-3">
                    <details className="cursor-pointer">
                      <summary className="text-xs text-stone-600 font-light mb-2">View Data</summary>
                      <pre className="bg-white border border-stone-200 rounded-lg p-3 text-xs font-mono text-stone-950 overflow-auto max-h-48 mt-2">
                        {formatJson(trace.data)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

