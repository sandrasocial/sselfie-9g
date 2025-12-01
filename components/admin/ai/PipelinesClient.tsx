"use client"

import { useState, useEffect } from "react"
import PipelineStepRow from "./PipelineStepRow"
import ResultPanel from "./ResultPanel"
import { Loader2 } from "lucide-react"

interface PipelineStep {
  agent: string
  input: string
}

interface AgentListItem {
  name: string
  metadata: any
}

export default function PipelinesClient() {
  const [steps, setSteps] = useState<PipelineStep[]>([{ agent: "", input: "{}" }])
  const [agents, setAgents] = useState<AgentListItem[]>([])
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
  }, [])

  const addStep = () => {
    setSteps([...steps, { agent: "", input: "{}" }])
  }

  const updateStep = (index: number, step: PipelineStep) => {
    const newSteps = [...steps]
    newSteps[index] = step
    setSteps(newSteps)
  }

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index))
    }
  }

  const handleRun = async () => {
    // Validate steps
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      if (!step.agent) {
        setError(`Step ${i + 1}: Please select an agent`)
        return
      }

      // Block Maya
      if (step.agent.toLowerCase().includes("maya")) {
        setError("Maya cannot be run via admin pipeline API")
        return
      }

      // Validate JSON
      try {
        JSON.parse(step.input)
      } catch {
        setError(`Step ${i + 1}: Invalid JSON input`)
        return
      }
    }

    setLoading(true)
    setError(null)
    setResult(null)
    const startTime = Date.now()

    try {
      const pipelineSteps = steps.map((step) => ({
        agent: step.agent,
        input: JSON.parse(step.input),
      }))

      const response = await fetch("/api/admin/pipelines/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps: pipelineSteps }),
      })

      const data = await response.json()
      const endTime = Date.now()
      setExecutionTime(endTime - startTime)

      if (!response.ok) {
        setError(data.error || "Failed to run pipeline")
        return
      }

      if (data.success) {
        setResult(data.output)
      } else {
        setError(data.error?.message || "Pipeline execution failed")
      }

      if (data.trace) {
        setTraces(data.trace)
      }
      if (data.metrics) {
        setMetrics(data.metrics)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl border border-stone-200 p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
            Pipeline Steps
          </h2>
          <button
            onClick={addStep}
            className="px-4 py-2 bg-stone-950 text-white rounded-lg text-xs hover:bg-stone-800 transition-colors font-light uppercase tracking-wider"
          >
            + Add Step
          </button>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <PipelineStepRow
              key={index}
              step={step}
              index={index}
              onChange={(updatedStep) => updateStep(index, updatedStep)}
              onRemove={() => removeStep(index)}
              agents={agents}
            />
          ))}
        </div>

        <button
          onClick={handleRun}
          disabled={loading || steps.length === 0}
          className="w-full px-6 py-3 bg-stone-950 text-white rounded-xl text-sm tracking-wider uppercase hover:bg-stone-800 transition-colors font-light disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running Pipeline...
            </>
          ) : (
            "Run Pipeline"
          )}
        </button>
      </div>

      <ResultPanel
        result={result}
        error={error}
        executionTime={executionTime}
        traces={traces as any}
        metrics={metrics as any}
      />
    </div>
  )
}

