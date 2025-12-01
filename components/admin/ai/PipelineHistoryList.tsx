"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import Link from "next/link"

interface PipelineRun {
  id: string
  pipeline: string
  ok: boolean
  steps: unknown
  result: unknown
  duration_ms: number | null
  started_at: Date | null
  ended_at: Date | null
  created_at: Date | null
}

export default function PipelineHistoryList() {
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [filteredRuns, setFilteredRuns] = useState<PipelineRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pipelineNames, setPipelineNames] = useState<string[]>([])
  const [selectedPipeline, setSelectedPipeline] = useState<string>("")
  const [selectedStatus, setSelectedStatus] = useState<string>("")
  const [sortBy, setSortBy] = useState<"date" | "duration">("date")

  const fetchHistory = async () => {
    try {
      setError(null)
      const response = await fetch("/api/admin/pipelines/history?limit=50")
      if (!response.ok) {
        throw new Error("Failed to fetch pipeline history")
      }
      const data = await response.json()
      if (data.ok && data.runs) {
        setRuns(data.runs)

        // Extract unique pipeline names
        const names = new Set<string>()
        data.runs.forEach((run: PipelineRun) => {
          if (run.pipeline) {
            names.add(run.pipeline)
          }
        })
        setPipelineNames(Array.from(names).sort())
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...runs]

    // Filter by pipeline name
    if (selectedPipeline) {
      filtered = filtered.filter((run) => run.pipeline === selectedPipeline)
    }

    // Filter by status
    if (selectedStatus) {
      if (selectedStatus === "success") {
        filtered = filtered.filter((run) => run.ok === true)
      } else if (selectedStatus === "failed") {
        filtered = filtered.filter((run) => run.ok === false)
      }
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "date") {
        const dateA = a.started_at ? new Date(a.started_at).getTime() : 0
        const dateB = b.started_at ? new Date(b.started_at).getTime() : 0
        return dateB - dateA // Newest first
      } else {
        const durationA = a.duration_ms || 0
        const durationB = b.duration_ms || 0
        return durationB - durationA // Longest first
      }
    })

    setFilteredRuns(filtered)
  }, [runs, selectedPipeline, selectedStatus, sortBy])

  useEffect(() => {
    fetchHistory()
  }, [])

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A"
    return new Date(date).toLocaleString()
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return "N/A"
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
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
          <div className="text-red-600 mb-4 font-light">Error loading pipeline history</div>
          <div className="text-sm text-stone-500 mb-4 font-light">{error}</div>
          <button
            onClick={fetchHistory}
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
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-stone-600 font-light mb-2">Filter by Pipeline</label>
            <select
              value={selectedPipeline}
              onChange={(e) => setSelectedPipeline(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm text-stone-950 font-light focus:outline-none focus:border-stone-400 transition-colors"
            >
              <option value="">All Pipelines</option>
              {pipelineNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-stone-600 font-light mb-2">Filter by Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm text-stone-950 font-light focus:outline-none focus:border-stone-400 transition-colors"
            >
              <option value="">All Statuses</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-stone-600 font-light mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "date" | "duration")}
              className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm text-stone-950 font-light focus:outline-none focus:border-stone-400 transition-colors"
            >
              <option value="date">Date (Newest First)</option>
              <option value="duration">Duration (Longest First)</option>
            </select>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="p-6 border-b border-stone-200">
          <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
            Pipeline History ({filteredRuns.length})
          </h2>
        </div>

        {filteredRuns.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-stone-500 font-light">
              {runs.length === 0
                ? "No pipeline runs found. Run some pipelines to see history here."
                : "No pipeline runs match your filters."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredRuns.map((run) => (
              <Link
                key={run.id}
                href={`/admin/ai/agents/pipelines/history/${run.id}`}
                className="block p-6 hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-light text-stone-950">{run.pipeline || "Unnamed Pipeline"}</h3>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-light ${
                          run.ok
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {run.ok ? "SUCCESS" : "FAILED"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-stone-600">
                      <div>
                        <span className="font-light">Started:</span>{" "}
                        <span className="font-mono">{formatDate(run.started_at)}</span>
                      </div>
                      <div>
                        <span className="font-light">Duration:</span>{" "}
                        <span className="font-mono">{formatDuration(run.duration_ms)}</span>
                      </div>
                      <div>
                        <span className="font-light">ID:</span>{" "}
                        <span className="font-mono text-xs">{run.id.substring(0, 8)}...</span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 text-stone-400">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

