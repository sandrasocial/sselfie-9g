"use client"

import { useState } from "react"
import type { DemoPair } from "@/lib/content-kit/types"

// Sandra's editing-prompt topics: each preset is ChatGPT-ready and identity-safe.
// These double as content: the pair IS the post, the prompt IS the value.
const PRESET_PROMPTS: Array<{ label: string; prompt: string }> = [
  {
    label: "Cinematic grade",
    prompt:
      "Apply a cinematic color grade to this photo: deeper shadows, soft warm highlights, slightly desaturated tones, moody editorial feel.",
  },
  {
    label: "85mm lens look",
    prompt:
      "Make this photo look like it was shot on an 85mm portrait lens: shallow depth of field, creamy background blur, sharp focus on the face, professional photography feel.",
  },
  {
    label: "Warm film preset",
    prompt:
      "Edit this photo to look like warm 35mm film: soft grain, golden tones, gentle contrast, that nostalgic analog feel.",
  },
  {
    label: "Outfit: black blazer",
    prompt:
      "Change the outfit to a tailored black blazer over a simple white top. Keep the pose, the light and the background exactly the same.",
  },
  {
    label: "Location: Paris cafe",
    prompt:
      "Place this exact person at a Parisian sidewalk cafe in soft morning light, sitting with a coffee. Keep the outfit and pose natural.",
  },
]

export function ContentDemoClient({
  initialPairs,
  selfies,
}: {
  initialPairs: DemoPair[]
  selfies: string[]
}) {
  const [pairs, setPairs] = useState<DemoPair[]>(initialPairs)
  const [selfieUrl, setSelfieUrl] = useState<string>(selfies[0] || "")
  const [prompt, setPrompt] = useState("")
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setGenerating(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/content-kit/demos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selfieUrl, prompt }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Generation failed")
      setPairs([data.pair, ...pairs])
    } catch (err: any) {
      setError(err?.message || "Generation failed")
    } finally {
      setGenerating(false)
    }
  }

  async function remove(id: number) {
    setPairs((current) => current.filter((pair) => pair.id !== id))
    await fetch("/api/admin/content-kit/demos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
  }

  return (
    <section className="mt-12">
      <h2 className="font-serif text-2xl font-light tracking-tight text-stone-950">
        Before · after demos
      </h2>
      <p className="mt-1 text-sm text-stone-600">
        Your selfie + an editing prompt, through the same engine your members use. The pair is the
        post: before/after composite for reel covers and carousels, the prompt is what they comment for.
      </p>

      {selfies.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
          No reference selfies found. Upload one in the app first (Create → upload selfie).
        </p>
      ) : (
        <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-stone-500">1 · Pick your selfie</p>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
            {selfies.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => setSelfieUrl(url)}
                className={`shrink-0 overflow-hidden rounded-lg border-2 transition ${
                  selfieUrl === url ? "border-stone-950" : "border-transparent hover:border-stone-300"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Reference selfie" className="h-28 w-20 object-cover" loading="lazy" />
              </button>
            ))}
          </div>

          <p className="mt-4 text-xs uppercase tracking-wide text-stone-500">2 · The editing prompt</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRESET_PROMPTS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setPrompt(preset.prompt)}
                className="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs uppercase tracking-wide text-stone-700 transition hover:border-stone-950"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={3}
            placeholder="Or write your own: what should change, what should stay"
            className="mt-2 w-full rounded-xl border border-stone-300 bg-white p-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-950 focus:outline-none"
          />
          <p className="mt-1 text-xs text-stone-400">
            Face protection is automatic: every prompt keeps you recognizable and true to the original.
          </p>

          <button
            type="button"
            onClick={generate}
            disabled={generating || !prompt.trim() || !selfieUrl}
            className="mt-3 rounded-full bg-stone-950 px-5 py-2 text-xs uppercase tracking-wide text-white disabled:opacity-50"
          >
            {generating ? "Creating your demo (30-60s)" : "Create before/after"}
          </button>
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {pairs.map((pair) => (
          <div key={pair.id} className="rounded-2xl border border-stone-200 bg-white p-4">
            {pair.compositeUrl && (
              <a href={pair.compositeUrl} target="_blank" rel="noreferrer" title="Open composite full size">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pair.compositeUrl}
                  alt={pair.title}
                  className="w-full rounded-lg border border-stone-100"
                  loading="lazy"
                />
              </a>
            )}
            <p className="mt-2 text-sm font-medium text-stone-950">{pair.title}</p>
            <p className="mt-1 line-clamp-2 text-xs text-stone-500">{pair.editPrompt}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs uppercase tracking-wide">
              <a href={pair.afterUrl} target="_blank" rel="noreferrer" className="text-stone-950 underline underline-offset-4">
                After
              </a>
              {pair.compositeUrl && (
                <a href={pair.compositeUrl} target="_blank" rel="noreferrer" className="text-stone-950 underline underline-offset-4">
                  Before/after
                </a>
              )}
              <button type="button" onClick={() => remove(pair.id)} className="text-stone-400 underline underline-offset-4">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
