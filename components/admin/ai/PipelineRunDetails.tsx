"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"

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

interface PipelineRunDetailsProps {
  runId: string
}

export default function PipelineRunDetails({ runId }: PipelineRunDetailsProps) {
  const [run, setRun] = useState<PipelineRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRun = async () => {
      try {
        setError(null)
        const response = await fetch(`/api/admin/pipelines/history/${runId}`)
        if (!response.ok) {
          throw new Error("Failed to fetch pipeline run")
        }
        const data = await response.json()
        if (data.ok && data.run) {
          setRun(data.run)
        } else {
          throw new Error("Pipeline run not found")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }

    if (runId) {
      fetchRun()
    }
  }, [runId])

  const formatJson = (obj: unknown) => {
    try {
      return JSON.stringify(obj, null, 2)
    } catch {
      return String(obj)
    }
  }

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
          <div className="text-red-600 mb-4 font-light">Error loading pipeline run</div>
          <div className="text-sm text-stone-500 mb-4 font-light">{error}</div>
        </div>
      </div>
    )
  }

  if (!run) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
        <p className="text-stone-500 font-light">Pipeline run not found</p>
      </div>
    )
  }

  // Parse steps and result
  const steps = Array.isArray(run.steps) ? run.steps : []
  const result = run.result && typeof run.result === "object" ? (run.result as any) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-2">
              {run.pipeline || "Unnamed Pipeline"}
            </h2>
            <div className="flex items-center gap-3">
              <span
                className={`text-xs px-3 py-1 rounded-full font-light ${
                  run.ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
              >
                {run.ok ? "SUCCESS" : "FAILED"}
              </span>
              <span className="text-sm text-stone-500 font-light">
                {formatDuration(run.duration_ms)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-stone-600">
          <div>
            <span className="font-light">Started:</span>{" "}
            <span className="font-mono">{formatDate(run.started_at)}</span>
          </div>
          <div>
            <span className="font-light">Ended:</span>{" "}
            <span className="font-mono">{formatDate(run.ended_at)}</span>
          </div>
          <div>
            <span className="font-light">Run ID:</span>{" "}
            <span className="font-mono text-xs">{run.id}</span>
          </div>
        </div>
      </div>

      {/* Failure Reason */}
      {!run.ok && result && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="font-serif text-lg font-extralight tracking-[0.15em] uppercase text-red-900 mb-2">
            Failure Reason
          </h3>
          {result.error && (
            <div className="text-sm text-red-700 font-mono">{String(result.error)}</div>
          )}
          {result.failedAt && (
            <div className="text-sm text-red-600 mt-2">
              Failed at step: <span className="font-mono">{String(result.failedAt)}</span>
            </div>
          )}
        </div>
      )}

      {/* Steps Breakdown */}
      {steps.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h3 className="font-serif text-xl font-extralight tracking-[0.15em] uppercase text-stone-950 mb-4">
            Steps ({steps.length})
          </h3>
          <div className="space-y-4">
            {steps.map((step: any, index: number) => (
              <div key={index} className="border border-stone-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-serif text-lg font-extralight tracking-widest uppercase text-stone-950">
                    Step {index + 1}
                  </h4>
                  {step.ok !== undefined && (
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-light ${
                        step.ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {step.ok ? "SUCCESS" : "FAILED"}
                    </span>
                  )}
                </div>

                {step.agent && (
                  <div className="mb-3">
                    <span className="text-xs text-stone-500 font-light">Agent:</span>{" "}
                    <span className="text-sm text-stone-950 font-light">{step.agent}</span>
                  </div>
                )}

                {step.data && (
                  <details className="mt-3">
                    <summary className="text-sm text-stone-600 font-light cursor-pointer mb-2">
                      View Output
                    </summary>
                    <pre className="bg-stone-50 border border-stone-200 rounded-lg p-4 text-xs font-mono text-stone-950 overflow-auto max-h-64 mt-2">
                      {formatJson(step.data)}
                    </pre>
                  </details>
                )}

                {step.error && (
                  <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="text-xs text-red-700 font-mono">{String(step.error)}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Result */}
      {result && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h3 className="font-serif text-xl font-extralight tracking-[0.15em] uppercase text-stone-950 mb-4">
            Full Result
          </h3>
          <pre className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs font-mono text-stone-950 overflow-auto max-h-96">
            {formatJson(result)}
          </pre>
        </div>
      )}

      {/* Steps Data (if available) */}
      {run.steps && !Array.isArray(run.steps) && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h3 className="font-serif text-xl font-extralight tracking-[0.15em] uppercase text-stone-950 mb-4">
            Steps Data
          </h3>
          <pre className="bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs font-mono text-stone-950 overflow-auto max-h-96">
            {formatJson(run.steps)}
          </pre>
        </div>
      )}
    </div>
  )
}

