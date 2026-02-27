"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Check, Copy } from "lucide-react"
import UnifiedLoading from "@/components/sselfie/unified-loading"

interface StrategyPillar {
  name: string
  description?: string
  postIdeas?: string[]
}

interface StrategyVoice {
  tone?: string
  do?: string
  avoid?: string
  phrases?: string[]
}

interface StrategyExamplePost {
  hook?: string
  body?: string
  cta?: string
}

interface StrategyPack {
  positioning?: string[]
  pillars?: StrategyPillar[]
  voice?: StrategyVoice
  captionStarters?: string[]
  examplePosts?: StrategyExamplePost[]
  cached?: boolean
}

const sectionCardClass =
  "border border-stone-200 bg-white/90 shadow-sm p-6 sm:p-8 space-y-4"

function joinLines(lines: string[]) {
  return lines.filter(Boolean).join("\n")
}

export default function BrandStrategyPage() {
  const [pack, setPack] = useState<StrategyPack | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const fetchPack = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/maya/brand-strategy", { cache: "no-store" })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const message = data?.error || "Failed to load brand strategy"
        setError(message)
        setPack(null)
        return
      }
      const data = (await response.json()) as StrategyPack
      setPack(data)
    } catch (err) {
      console.error("[BrandStrategy] Failed to fetch pack:", err)
      setError("Failed to load brand strategy")
      setPack(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPack()
  }, [fetchPack])

  const positioningCopy = useMemo(() => {
    if (!pack?.positioning?.length) return ""
    return pack.positioning.map((line, idx) => `${idx + 1}. ${line}`).join("\n")
  }, [pack?.positioning])

  const pillarsCopy = useMemo(() => {
    if (!pack?.pillars?.length) return ""
    return pack.pillars
      .map((pillar) => {
        const ideas = pillar.postIdeas?.length
          ? `Ideas: ${pillar.postIdeas.join(" | ")}`
          : ""
        return joinLines([
          `Pillar: ${pillar.name}`,
          pillar.description ? `Description: ${pillar.description}` : "",
          ideas,
        ])
      })
      .join("\n\n")
  }, [pack?.pillars])

  const voiceCopy = useMemo(() => {
    if (!pack?.voice) return ""
    const phrases = pack.voice.phrases?.length ? pack.voice.phrases.join(" | ") : ""
    return joinLines([
      pack.voice.tone ? `Tone: ${pack.voice.tone}` : "",
      pack.voice.do ? `Do: ${pack.voice.do}` : "",
      pack.voice.avoid ? `Avoid: ${pack.voice.avoid}` : "",
      phrases ? `Signature phrases: ${phrases}` : "",
    ])
  }, [pack?.voice])

  const captionCopy = useMemo(() => {
    if (!pack?.captionStarters?.length) return ""
    return pack.captionStarters.map((line, idx) => `${idx + 1}. ${line}`).join("\n")
  }, [pack?.captionStarters])

  const exampleCopy = useMemo(() => {
    if (!pack?.examplePosts?.length) return ""
    return pack.examplePosts
      .map((post, idx) =>
        joinLines([
          `Example ${idx + 1}`,
          post.hook ? `Hook: ${post.hook}` : "",
          post.body ? `Body: ${post.body}` : "",
          post.cta ? `CTA: ${post.cta}` : "",
        ]),
      )
      .join("\n\n")
  }, [pack?.examplePosts])

  const handleCopy = async (key: string, text: string) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      window.setTimeout(() => setCopiedKey(null), 1200)
    } catch (err) {
      console.error("[BrandStrategy] Copy failed:", err)
    }
  }

  if (isLoading) {
    return <UnifiedLoading message="Loading your brand strategy..." />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
            Brand Strategy Pack
          </h1>
          <p className="text-stone-600 font-light mb-6">{error}</p>
          <Link
            href="/studio?tab=profile"
            className="inline-flex items-center justify-center px-6 py-3 border border-stone-900 text-sm tracking-[0.2em] uppercase font-medium text-stone-950 hover:bg-stone-900 hover:text-white transition-colors"
          >
            Complete Brand Profile
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="border-b border-stone-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-xs tracking-[0.4em] uppercase text-stone-500">Maya</p>
          <h1 className="mt-3 font-serif text-3xl sm:text-4xl md:text-5xl font-extralight tracking-[0.25em] uppercase text-stone-950">
            Brand Strategy Pack
          </h1>
          <p className="mt-4 text-stone-600 font-light">
            Your positioning, voice, and content direction — distilled into a plan you can actually use.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        <section className={sectionCardClass}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
              Positioning
            </h2>
            <button
              onClick={() => handleCopy("positioning", positioningCopy)}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-stone-500 hover:text-stone-900"
            >
              {copiedKey === "positioning" ? <Check size={14} /> : <Copy size={14} />}
              {copiedKey === "positioning" ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="space-y-3 text-sm sm:text-base text-stone-700 font-light">
            {pack?.positioning?.map((line, idx) => (
              <p key={idx}>{line}</p>
            ))}
          </div>
        </section>

        <section className={sectionCardClass}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
              Content Pillars
            </h2>
            <button
              onClick={() => handleCopy("pillars", pillarsCopy)}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-stone-500 hover:text-stone-900"
            >
              {copiedKey === "pillars" ? <Check size={14} /> : <Copy size={14} />}
              {copiedKey === "pillars" ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="space-y-5">
            {pack?.pillars?.map((pillar, idx) => (
              <div key={`${pillar.name}-${idx}`} className="space-y-2">
                <h3 className="text-sm font-semibold tracking-[0.2em] uppercase text-stone-700">
                  {pillar.name}
                </h3>
                {pillar.description && <p className="text-sm text-stone-600 font-light">{pillar.description}</p>}
                {pillar.postIdeas?.length ? (
                  <ul className="grid gap-1 text-sm text-stone-600 font-light">
                    {pillar.postIdeas.map((idea, ideaIdx) => (
                      <li key={ideaIdx}>• {idea}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className={sectionCardClass}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
              Voice Guide
            </h2>
            <button
              onClick={() => handleCopy("voice", voiceCopy)}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-stone-500 hover:text-stone-900"
            >
              {copiedKey === "voice" ? <Check size={14} /> : <Copy size={14} />}
              {copiedKey === "voice" ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="grid gap-4 text-sm text-stone-600 font-light">
            {pack?.voice?.tone && (
              <p>
                <span className="text-stone-900 uppercase tracking-[0.2em] text-xs">Tone</span>
                <br />
                {pack.voice.tone}
              </p>
            )}
            {pack?.voice?.do && (
              <p>
                <span className="text-stone-900 uppercase tracking-[0.2em] text-xs">Do</span>
                <br />
                {pack.voice.do}
              </p>
            )}
            {pack?.voice?.avoid && (
              <p>
                <span className="text-stone-900 uppercase tracking-[0.2em] text-xs">Avoid</span>
                <br />
                {pack.voice.avoid}
              </p>
            )}
            {pack?.voice?.phrases?.length ? (
              <div>
                <span className="text-stone-900 uppercase tracking-[0.2em] text-xs">Signature phrases</span>
                <div className="mt-2 flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-stone-500">
                  {pack.voice.phrases.map((phrase, idx) => (
                    <span key={idx} className="border border-stone-200 px-3 py-1">
                      {phrase}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className={sectionCardClass}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
              Caption Starters
            </h2>
            <button
              onClick={() => handleCopy("captions", captionCopy)}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-stone-500 hover:text-stone-900"
            >
              {copiedKey === "captions" ? <Check size={14} /> : <Copy size={14} />}
              {copiedKey === "captions" ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="grid gap-2 text-sm text-stone-600 font-light">
            {pack?.captionStarters?.map((starter, idx) => (
              <p key={idx}>• {starter}</p>
            ))}
          </div>
        </section>

        <section className={sectionCardClass}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-serif text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
              Example Posts
            </h2>
            <button
              onClick={() => handleCopy("examples", exampleCopy)}
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-stone-500 hover:text-stone-900"
            >
              {copiedKey === "examples" ? <Check size={14} /> : <Copy size={14} />}
              {copiedKey === "examples" ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="space-y-4">
            {pack?.examplePosts?.map((post, idx) => (
              <div key={idx} className="border border-stone-100 bg-stone-50/60 p-4">
                {post.hook && (
                  <p className="text-sm text-stone-900 font-medium">{post.hook}</p>
                )}
                {post.body && <p className="mt-2 text-sm text-stone-600 font-light">{post.body}</p>}
                {post.cta && (
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-stone-500">{post.cta}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="border border-stone-900 bg-stone-900 text-white px-6 py-8 text-center">
          <h3 className="text-xl sm:text-2xl font-serif font-extralight tracking-[0.2em] uppercase">
            Ready for your first brand photos?
          </h3>
          <p className="mt-3 text-sm text-stone-200 font-light">
            Open Maya and generate your first set with this strategy in mind.
          </p>
          <Link
            href="/studio?tab=maya&source=brand_strategy"
            className="mt-6 inline-flex items-center justify-center px-6 py-3 border border-white text-xs tracking-[0.2em] uppercase font-medium text-white hover:bg-white hover:text-stone-900 transition-colors"
          >
            Generate my first brand photo
          </Link>
        </div>
      </div>
    </div>
  )
}
