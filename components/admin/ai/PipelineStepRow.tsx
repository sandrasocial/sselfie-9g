"use client"

import AgentSelect from "./AgentSelect"
import JsonEditor from "./JsonEditor"

interface PipelineStep {
  agent: string
  input: string
}

interface PipelineStepRowProps {
  step: PipelineStep
  index: number
  onChange: (step: PipelineStep) => void
  onRemove: () => void
  agents?: Array<{ name: string; metadata: any }>
}

export default function PipelineStepRow({
  step,
  index,
  onChange,
  onRemove,
  agents,
}: PipelineStepRowProps) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-extralight tracking-[0.15em] uppercase text-stone-950">
          Step {index + 1}
        </h3>
        <button
          onClick={onRemove}
          className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-xs hover:bg-red-100 transition-colors font-light uppercase tracking-wider border border-red-200"
        >
          Remove
        </button>
      </div>

      <div>
        <label className="block text-sm text-stone-600 font-light mb-2">Agent</label>
        <AgentSelect
          value={step.agent}
          onChange={(agent) => onChange({ ...step, agent })}
          agents={agents}
        />
      </div>

      <div>
        <label className="block text-sm text-stone-600 font-light mb-2">Input (JSON)</label>
        <JsonEditor
          value={step.input}
          onChange={(input) => onChange({ ...step, input })}
          rows={6}
          placeholder='{\n  "key": "value"\n}'
        />
      </div>
    </div>
  )
}

