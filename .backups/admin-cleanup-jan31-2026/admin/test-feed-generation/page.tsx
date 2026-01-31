"use client"

import { useEffect, useState } from "react"
import { AdminLoadingState } from "@/components/admin/shared/admin-loading-state"
import { AdminErrorState } from "@/components/admin/shared/admin-error-state"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface FeedStyleDefinition {
  visual_aesthetic: string
  feed_style: string
}

interface FashionStyleDefinition {
  fashion_style_name: string
}

interface TestResult {
  valid: boolean
  error?: string
  scenesCount?: number
  previewPrompt?: string
  singleScenePrompt?: string
  position?: number
  validations?: Array<{ label: string; status: "pass" | "fail" | "warn"; detail?: string }>
  warnings?: string[]
  wordCounts?: { preview?: number; single?: number }
}

export default function AdminFeedGenerationTestPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedStyles, setFeedStyles] = useState<FeedStyleDefinition[]>([])
  const [fashionStyles, setFashionStyles] = useState<FashionStyleDefinition[]>([])
  const [visualAesthetic, setVisualAesthetic] = useState("")
  const [feedStyle, setFeedStyle] = useState("")
  const [fashionStyle, setFashionStyle] = useState("")
  const [position, setPosition] = useState<string>("1")
  const [result, setResult] = useState<TestResult | null>(null)

  const loadLookups = async () => {
    try {
      setLoading(true)
      const [feedStylesRes, fashionStylesRes] = await Promise.all([
        fetch("/api/admin/feed-styles"),
        fetch("/api/admin/fashion-styles"),
      ])
      if (!feedStylesRes.ok || !fashionStylesRes.ok) {
        throw new Error("Failed to load lookup data")
      }
      const feedStylesData = await feedStylesRes.json()
      const fashionStylesData = await fashionStylesRes.json()
      setFeedStyles(feedStylesData.rows || [])
      setFashionStyles(fashionStylesData.rows || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLookups()
  }, [])

  const runTest = async () => {
    setResult(null)
    setError(null)
    try {
      const res = await fetch("/api/admin/feed-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visualAesthetic,
          feedStyle,
          fashionStyle,
          position: position === "all" ? "all" : Number(position),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ valid: false, error: data.error || "Validation failed" })
        return
      }
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    }
  }

  if (loading) return <AdminLoadingState message="Loading test tools..." />
  if (error) return <AdminErrorState message={error} onRetry={loadLookups} />

  const visualOptions = Array.from(new Set(feedStyles.map((item) => item.visual_aesthetic)))
  const feedStyleOptions = Array.from(new Set(feedStyles.map((item) => item.feed_style)))

  const handleCopy = async (value?: string) => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    toast.success("Prompt copied")
  }

  return (
    <div className="px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Feed Generation Test</h1>
        <p className="text-sm text-stone-500">
          Validate that a style combination resolves cleanly before sending prompts to Replicate.
        </p>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-5 gap-4">
        <select
          className="border border-stone-200 rounded-md px-3 py-2 text-sm"
          value={visualAesthetic}
          onChange={(event) => setVisualAesthetic(event.target.value)}
        >
          <option value="">Visual Aesthetic</option>
          {visualOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          className="border border-stone-200 rounded-md px-3 py-2 text-sm"
          value={feedStyle}
          onChange={(event) => setFeedStyle(event.target.value)}
        >
          <option value="">Feed Style</option>
          {feedStyleOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          className="border border-stone-200 rounded-md px-3 py-2 text-sm"
          value={fashionStyle}
          onChange={(event) => setFashionStyle(event.target.value)}
        >
          <option value="">Fashion Style</option>
          {fashionStyles.map((style) => (
            <option key={style.fashion_style_name} value={style.fashion_style_name}>
              {style.fashion_style_name}
            </option>
          ))}
        </select>

        <select
          className="border border-stone-200 rounded-md px-3 py-2 text-sm"
          value={position}
          onChange={(event) => setPosition(event.target.value)}
        >
          <option value="1">Position 1</option>
          <option value="2">Position 2</option>
          <option value="3">Position 3</option>
          <option value="4">Position 4</option>
          <option value="5">Position 5</option>
          <option value="6">Position 6</option>
          <option value="7">Position 7</option>
          <option value="8">Position 8</option>
          <option value="9">Position 9</option>
          <option value="all">All Positions (Full Feed)</option>
        </select>

        <Button
          onClick={runTest}
          disabled={!visualAesthetic || !feedStyle || !fashionStyle}
        >
          Run Test
        </Button>
      </div>

      {result && (
        <div className="bg-white border border-stone-200 rounded-lg p-4 space-y-4">
          <div className="text-sm">
            {result.valid ? (
              <span className="text-emerald-600 font-semibold">✅ Valid configuration</span>
            ) : (
              <span className="text-rose-500 font-semibold">❌ Invalid configuration</span>
            )}
          </div>

          {result.error && <p className="text-sm text-rose-500">{result.error}</p>}

          {result.validations && result.validations.length > 0 && (
            <div className="space-y-2 text-sm">
              <h3 className="text-xs uppercase tracking-wider text-stone-500">Validation Checks</h3>
              <div className="space-y-1">
                {result.validations.map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span>
                      {item.status === "pass" ? "✅" : item.status === "warn" ? "⚠️" : "❌"}
                    </span>
                    <span className="text-stone-700">{item.label}</span>
                    {item.detail && <span className="text-xs text-stone-400">({item.detail})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.warnings && result.warnings.length > 0 && (
            <div className="text-sm text-amber-600 space-y-1">
              {result.warnings.map((warning) => (
                <div key={warning}>⚠️ {warning}</div>
              ))}
            </div>
          )}

          {result.previewPrompt && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-wider text-stone-500">Preview Prompt</h3>
                <Button variant="outline" size="sm" onClick={() => handleCopy(result.previewPrompt)}>
                  Copy Prompt
                </Button>
              </div>
              {result.wordCounts?.preview && (
                <p className="text-xs text-stone-400">
                  Word count: {result.wordCounts.preview}
                </p>
              )}
              <textarea
                className="w-full border border-stone-200 rounded-md px-3 py-2 text-xs font-mono"
                rows={10}
                value={result.previewPrompt}
                readOnly
              />
            </div>
          )}

          {result.singleScenePrompt && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs uppercase tracking-wider text-stone-500">
                  Single Scene Prompt (Position {result.position})
                </h3>
                <Button variant="outline" size="sm" onClick={() => handleCopy(result.singleScenePrompt)}>
                  Copy Prompt
                </Button>
              </div>
              {result.wordCounts?.single && (
                <p className="text-xs text-stone-400">
                  Word count: {result.wordCounts.single}
                </p>
              )}
              <textarea
                className="w-full border border-stone-200 rounded-md px-3 py-2 text-xs font-mono"
                rows={8}
                value={result.singleScenePrompt}
                readOnly
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
