"use client"

import { useState } from "react"

interface MayaV3ScreenProps {
  userId: string
  userName?: string | null
  userEmail: string
}

// Helper function to dedupe repeated phrases in prompt
function dedupePrompt(text: string): string {
  if (!text) return ""
  const parts = text.split(/[,;]/).map((p) => p.trim())
  const unique = [...new Set(parts)]
  return unique.join("; ")
}

// Helper function to format creative direction
function formatCreativeDirection(cd: any): string {
  if (!cd) return ""
  return `
Mood: ${cd.mood || "N/A"}
Scene: ${cd.scene || "N/A"}
Composition: ${cd.composition || "N/A"}
Lighting: ${cd.lighting || "N/A"}
  `.trim()
}

export default function MayaV3Screen({ userId, userName, userEmail }: MayaV3ScreenProps) {
  const [inputValue, setInputValue] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!inputValue.trim()) return

    setIsGenerating(true)
    setError(null)
    setResult(null)

    try {
      // Call the API endpoint
      const response = await fetch("/api/maya-v3/generate-prompt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conceptText: inputValue,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`)
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      console.error("[v0] Error generating prompt:", err)
      setError(err instanceof Error ? err.message : "Failed to generate prompt")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-extralight tracking-[0.3em] text-stone-950 uppercase mb-3">
          Maya 3.0 – Prompt Engine Test Lab
        </h1>
        <p className="text-sm text-stone-600 tracking-wide leading-relaxed">
          Test the new Maya 3.0 creative direction engine. Enter a concept and see how the mood, lighting, composition,
          and scenario engines work together to create optimized FLUX prompts.
        </p>
        <div className="mt-4 text-xs opacity-60 font-mono text-stone-500">Maya Engine Version: 3.0 (Test Mode)</div>
      </div>

      {/* Input Section */}
      <div className="mb-8">
        <label htmlFor="concept-input" className="block text-xs tracking-wider uppercase text-stone-600 mb-2">
          Concept Description
        </label>
        <textarea
          id="concept-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Example: Professional photo in a modern cafe, natural lighting, relaxed confidence..."
          className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm text-stone-950 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-950 focus:border-transparent resize-none"
          rows={4}
        />
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !inputValue.trim()}
        className="w-full px-6 py-3 bg-stone-950 text-white rounded-xl text-sm font-medium tracking-wide hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating ? "Generating..." : "Generate Maya 3.0 Prompt"}
      </button>

      {/* Error Display */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="mt-8 space-y-6">
          {result.finalPrompt && (
            <div className="p-6 bg-white border border-stone-200 rounded-xl">
              <h3 className="text-xs tracking-wider uppercase text-stone-600 mb-3">Final FLUX Prompt</h3>
              <p className="text-sm text-stone-950 leading-relaxed font-mono whitespace-pre-wrap">
                {dedupePrompt(result.finalPrompt)}
              </p>
            </div>
          )}

          {result.negativePrompt && (
            <div className="p-6 bg-white border border-stone-200 rounded-xl">
              <h3 className="text-xs tracking-wider uppercase text-stone-600 mb-3">Negative Prompt</h3>
              <p className="text-sm text-stone-700 leading-relaxed font-mono whitespace-pre-wrap">
                {result.negativePrompt}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {result.moodBlock && (
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl">
                <h4 className="text-xs tracking-wider uppercase text-stone-500 mb-2">Mood Block</h4>
                <p className="text-sm text-stone-950 font-medium">{result.moodBlock.name}</p>
                <p className="text-xs text-stone-600 mt-1">{result.moodBlock.description}</p>
              </div>
            )}
            {result.lightingBlock && (
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl">
                <h4 className="text-xs tracking-wider uppercase text-stone-500 mb-2">Lighting Block</h4>
                <p className="text-sm text-stone-950 font-medium">{result.lightingBlock.name}</p>
                <p className="text-xs text-stone-600 mt-1">{result.lightingBlock.description}</p>
              </div>
            )}
            {result.compositionBlock && (
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl">
                <h4 className="text-xs tracking-wider uppercase text-stone-500 mb-2">Composition Block</h4>
                <p className="text-sm text-stone-950 font-medium">{result.compositionBlock.name}</p>
                <p className="text-xs text-stone-600 mt-1">{result.compositionBlock.description}</p>
              </div>
            )}
            {result.scenarioBlock && (
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl">
                <h4 className="text-xs tracking-wider uppercase text-stone-500 mb-2">Scenario Block</h4>
                <p className="text-sm text-stone-950 font-medium">{result.scenarioBlock.name}</p>
                <p className="text-xs text-stone-600 mt-1">{result.scenarioBlock.description}</p>
              </div>
            )}
          </div>

          {result.creativeDirection && (
            <div className="p-6 bg-stone-50 border border-stone-200 rounded-xl">
              <h3 className="text-xs tracking-wider uppercase text-stone-600 mb-3">Creative Direction Explanation</h3>
              <pre className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap font-sans">
                {formatCreativeDirection(result.creativeDirection)}
              </pre>
            </div>
          )}

          {/* Style Blend Output */}
          {result.styleBlend?.output && (
            <div className="p-6 bg-white border border-stone-200 rounded-xl">
              <h3 className="text-xs tracking-wider uppercase text-stone-600 mb-3">Style Blend</h3>
              <p className="text-sm text-stone-700 leading-relaxed">{result.styleBlend.output}</p>
            </div>
          )}

          {/* Explanation */}
          {result.explanation && (
            <div className="p-6 bg-stone-50 border border-stone-200 rounded-xl">
              <h3 className="text-xs tracking-wider uppercase text-stone-600 mb-3">Full Explanation</h3>
              <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">{result.explanation}</p>
            </div>
          )}

          {result.raw && (
            <details className="p-6 bg-stone-100 border border-stone-300 rounded-xl">
              <summary className="text-xs tracking-wider uppercase text-stone-600 cursor-pointer hover:text-stone-950">
                View Raw JSON Debug Data
              </summary>
              <pre className="mt-4 text-xs text-stone-700 overflow-x-auto font-mono">
                {JSON.stringify(result.raw, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  )
}
