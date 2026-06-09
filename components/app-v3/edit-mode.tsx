"use client"

// SSELFIE Studio 3.0 — true Edit Mode (MAYA-REBUILD-05 Phase 4).
// "Ask Maya to tweak it" opens THIS, not a new conversation. The image is attached and shown
// fullscreen; preset chips + a prompt box apply one change at a time via /api/app-v3/maya/edit.
// Edits are iterative: each result becomes the new working image.

import { useState } from "react"
import type { OutputFormat } from "./types"
import { Spinner } from "./loading"

interface EditModeProps {
  imageUrl: string
  format: OutputFormat
  onClose: () => void
  /** Each successful edit hands back the new image so the gallery/thread can update. */
  onResult: (newUrl: string) => void
}

const PRESETS = [
  "Brighter",
  "Softer, warmer light",
  "Closer crop",
  "Change the background",
  "Black and white",
  "More editorial",
  "Make my outfit black",
]

export function EditMode({ imageUrl, format, onClose, onResult }: EditModeProps) {
  const [current, setCurrent] = useState(imageUrl)
  const [instruction, setInstruction] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function runEdit(text: string) {
    const change = text.trim()
    if (!change || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/app-v3/maya/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: current, instruction: change, format }),
      })
      const data = (await res.json().catch(() => null)) as { imageUrl?: string; error?: string } | null
      if (!res.ok || !data?.imageUrl) throw new Error(data?.error || "Couldn't make that change.")
      setCurrent(data.imageUrl)
      setInstruction("")
      onResult(data.imageUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't make that change.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#0D0E10]/95 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none">
      <div className="flex items-center justify-between px-5 py-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/80">Edit with Maya</p>
        <button
          type="button"
          onClick={onClose}
          className="text-[11px] uppercase tracking-[0.18em] text-white/80 hover:text-white"
        >
          Done
        </button>
      </div>

      {/* The image being edited */}
      <div className="relative flex flex-1 items-center justify-center px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current} alt="Editing" className="max-h-full max-w-3xl rounded-[6px] object-contain" />
        {busy && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0D0E10]/40">
            <Spinner className="h-8 w-8 border-white/40 border-t-white" />
            <p className="text-[11px] uppercase tracking-[0.22em] text-white/80">Making your change…</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="space-y-3 border-t border-white/10 bg-[#0D0E10]/80 px-5 py-4">
        {error && <p className="text-[12px] text-white/80">{error}</p>}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              disabled={busy}
              onClick={() => void runEdit(p)}
              className="rounded-full border border-white/25 bg-white/5 px-3 py-1.5 text-[12px] text-white/85 transition-colors hover:border-white/60 hover:text-white disabled:opacity-40"
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                void runEdit(instruction)
              }
            }}
            placeholder="Or describe the change… e.g. add a soft window light"
            className="flex-1 rounded-[4px] border border-white/20 bg-white/10 px-4 py-3 text-[15px] text-white placeholder:text-white/40 outline-none focus:border-white/60"
          />
          <button
            type="button"
            onClick={() => void runEdit(instruction)}
            disabled={busy || instruction.trim().length === 0}
            className="rounded-[4px] bg-white px-5 text-[12px] uppercase tracking-[0.16em] text-[#0D0E10] disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
