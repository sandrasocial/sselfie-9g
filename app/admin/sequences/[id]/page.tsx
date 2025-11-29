"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Loader2, ChevronDown, ChevronUp } from "lucide-react"

interface Sequence {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

interface Step {
  id: string
  step_number: number
  subject: string | null
  preview: string | null
  body: string | null
  delay_hours: number
  ai_generated: boolean
}

export default function SequenceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sequenceId = params.id as string

  const [sequence, setSequence] = useState<Sequence | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedStep, setExpandedStep] = useState<string | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)

  useEffect(() => {
    fetchSequence()
  }, [sequenceId])

  const fetchSequence = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/sequences/detail?sequenceId=${sequenceId}`)
      const data = await response.json()

      if (data.sequence) {
        setSequence(data.sequence)
        setSteps(data.steps || [])
      }
    } catch (error) {
      console.error("Error fetching sequence:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateStep = async (stepNumber: number) => {
    const stepKey = `step-${stepNumber}`
    try {
      setGenerating(stepKey)

      const response = await fetch("/api/sequences/generate-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sequenceName: sequence?.name,
          sequenceDescription: sequence?.description,
          stepNumber,
          goal: "Engage and nurture subscriber",
          tone: "warm, direct, story-driven",
          subscriberPersona: null,
        }),
      })

      const data = await response.json()

      if (data.success && data.step) {
        // Save the generated step
        await saveStep(stepNumber, data.step)
        await fetchSequence()
      }
    } catch (error) {
      console.error("Error generating step:", error)
    } finally {
      setGenerating(null)
    }
  }

  const saveStep = async (stepNumber: number, stepData: any) => {
    await fetch("/api/sequences/save-step", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sequenceId,
        stepNumber,
        ...stepData,
      }),
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    )
  }

  if (!sequence) {
    return (
      <div className="min-h-screen bg-stone-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl p-12 border border-stone-200 text-center">
            <p className="text-stone-500">Sequence not found</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push("/admin/sequences")}
            className="text-sm text-stone-600 hover:text-stone-950 mb-4"
          >
            ← Back to Sequences
          </button>
          <h1 className="font-['Times_New_Roman'] text-4xl font-extralight tracking-[0.3em] uppercase text-stone-950">
            {sequence.name}
          </h1>
          {sequence.description && <p className="text-sm text-stone-600 mt-2">{sequence.description}</p>}
          <div className="flex gap-4 mt-4 text-xs text-stone-500">
            <span>Created: {new Date(sequence.created_at).toLocaleDateString()}</span>
            <span>Updated: {new Date(sequence.updated_at).toLocaleDateString()}</span>
            <span>{steps.length} steps</span>
          </div>
        </div>

        <div className="space-y-6">
          {steps.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 border border-stone-200 text-center">
              <p className="text-stone-500 mb-6">No steps yet</p>
              <button
                onClick={() => handleGenerateStep(1)}
                disabled={generating === "step-1"}
                className="px-6 py-3 bg-stone-950 text-white rounded-xl text-sm tracking-wider uppercase hover:bg-stone-800 transition-colors disabled:opacity-50"
              >
                {generating === "step-1" ? <Loader2 className="w-4 h-4 animate-spin inline" /> : "Generate Step 1"}
              </button>
            </div>
          ) : (
            <>
              {steps.map((step) => {
                const stepKey = `step-${step.step_number}`
                const isExpanded = expandedStep === stepKey
                const isGenerating = generating === stepKey

                return (
                  <div key={step.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                    <button
                      onClick={() => setExpandedStep(isExpanded ? null : stepKey)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-stone-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-sm uppercase tracking-wider text-stone-600">Step {step.step_number}</span>
                        {step.subject && <span className="text-sm text-stone-950">{step.subject}</span>}
                        {step.ai_generated && (
                          <span className="px-2 py-1 bg-stone-100 text-stone-600 rounded text-xs uppercase tracking-wider">
                            AI Generated
                          </span>
                        )}
                      </div>
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>

                    {isExpanded && (
                      <div className="px-6 py-6 border-t border-stone-100 space-y-4">
                        {step.preview && (
                          <div>
                            <label className="block text-xs uppercase tracking-wider text-stone-600 mb-2">
                              Preview Text
                            </label>
                            <p className="text-sm text-stone-700">{step.preview}</p>
                          </div>
                        )}

                        {step.body && (
                          <div>
                            <label className="block text-xs uppercase tracking-wider text-stone-600 mb-2">
                              Email Body
                            </label>
                            <div
                              className="prose prose-sm max-w-none text-stone-700 bg-stone-50 p-4 rounded-lg"
                              dangerouslySetInnerHTML={{ __html: step.body }}
                            />
                          </div>
                        )}

                        <div>
                          <label className="block text-xs uppercase tracking-wider text-stone-600 mb-2">
                            Delay After Previous Step
                          </label>
                          <p className="text-sm text-stone-700">{step.delay_hours} hours</p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              <div className="bg-white rounded-2xl p-6 border border-stone-200 text-center">
                <button
                  onClick={() => handleGenerateStep(steps.length + 1)}
                  disabled={!!generating}
                  className="px-6 py-3 bg-stone-950 text-white rounded-xl text-sm tracking-wider uppercase hover:bg-stone-800 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {generating === `step-${steps.length + 1}` ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    `Add Step ${steps.length + 1}`
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
