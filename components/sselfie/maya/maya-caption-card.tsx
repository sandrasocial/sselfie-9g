"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"

interface MayaCaptionCardProps {
  caption?: string
  hashtags?: string[]
  loading?: boolean
}

export default function MayaCaptionCard({ caption, hashtags = [], loading = false }: MayaCaptionCardProps) {
  const [copied, setCopied] = useState(false)

  const fullText = hashtags.length > 0 ? `${caption}\n\n${hashtags.map((t) => `#${t}`).join(" ")}` : (caption ?? "")

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard requires user gesture + secure context — silently ignore
    }
  }

  if (loading) {
    return (
      <div className="my-3 rounded-xl border border-[#e5e5e5] bg-[#f5f5f5] p-5 animate-pulse">
        <div className="mb-3 h-3 w-20 rounded bg-[#e5e5e5]" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-[#e5e5e5]" />
          <div className="h-3 w-[90%] rounded bg-[#e5e5e5]" />
          <div className="h-3 w-[75%] rounded bg-[#e5e5e5]" />
          <div className="h-3 w-[85%] rounded bg-[#e5e5e5]" />
        </div>
        <div className="mt-4 h-3 w-40 rounded bg-[#e5e5e5]" />
      </div>
    )
  }

  if (!caption) return null

  return (
    <div className="my-3 rounded-xl border border-[#e5e5e5] bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e5e5e5] px-5 py-3">
        <span
          className="text-xs font-medium uppercase tracking-widest text-[#666666]"
          style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
        >
          Caption
        </span>
        <div className="h-1 w-1 rounded-full bg-[#0a0a0a]" />
      </div>

      {/* Caption body */}
      <div className="px-5 py-4">
        <p
          className="whitespace-pre-line text-[15px] leading-relaxed text-[#0a0a0a]"
          style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
        >
          {caption}
        </p>

        {hashtags.length > 0 && (
          <p
            className="mt-4 text-sm text-[#666666] leading-relaxed"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            {hashtags.map((t) => `#${t}`).join(" ")}
          </p>
        )}
      </div>

      {/* Copy button */}
      <div className="border-t border-[#e5e5e5] px-5 py-3">
        <button
          type="button"
          onClick={handleCopy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0a0a0a] px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#333333] active:scale-[0.98]"
          style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy Caption
            </>
          )}
        </button>
      </div>
    </div>
  )
}
