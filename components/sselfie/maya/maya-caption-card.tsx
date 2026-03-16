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
      <div className="my-3 rounded-xl border border-[rgba(195,190,182,0.20)] bg-[rgba(175,170,162,0.10)] p-5 animate-pulse">
        <div className="mb-3 h-2.5 w-16 rounded bg-[rgba(175,170,162,0.25)]" />
        <div className="space-y-2">
          <div className="h-2.5 w-full rounded bg-[rgba(175,170,162,0.20)]" />
          <div className="h-2.5 w-[90%] rounded bg-[rgba(175,170,162,0.20)]" />
          <div className="h-2.5 w-[75%] rounded bg-[rgba(175,170,162,0.20)]" />
          <div className="h-2.5 w-[85%] rounded bg-[rgba(175,170,162,0.20)]" />
        </div>
        <div className="mt-4 h-2.5 w-36 rounded bg-[rgba(175,170,162,0.15)]" />
      </div>
    )
  }

  if (!caption) return null

  return (
    <div className="my-3 rounded-xl border border-[rgba(195,190,182,0.20)] bg-[rgba(175,170,162,0.10)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(195,190,182,0.15)] px-5 py-3">
        <span
          className="text-[10px] font-medium uppercase tracking-[0.15em] text-[#8a8780]"
          style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
        >
          Caption
        </span>
        <div className="h-1 w-1 rounded-full bg-[#a8a49c]" />
      </div>

      {/* Caption body */}
      <div className="px-5 py-4">
        <p
          className="whitespace-pre-line text-[15px] leading-relaxed text-[#f0ede8]"
          style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
        >
          {caption}
        </p>

        {hashtags.length > 0 && (
          <p
            className="mt-4 text-sm text-[#8a8780] leading-relaxed"
            style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
          >
            {hashtags.map((t) => `#${t}`).join(" ")}
          </p>
        )}
      </div>

      {/* Copy button */}
      <div className="border-t border-[rgba(195,190,182,0.15)] px-5 py-3">
        <button
          type="button"
          onClick={handleCopy}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.12)] px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] font-medium text-[#f0ede8] transition-all hover:bg-[rgba(175,170,162,0.22)] active:scale-[0.98]"
          style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy Caption
            </>
          )}
        </button>
      </div>
    </div>
  )
}
