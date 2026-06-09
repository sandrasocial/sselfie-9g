"use client"

// SSELFIE Studio 3.0 — true Edit Mode (MAYA-REBUILD-05 Phase 4, layout fix in 4.1).
// "Ask Maya to tweak it" opens THIS, not a chat. The image is attached and shown; one change
// is applied at a time via /api/app-v3/maya/edit; edits are iterative.
//
// Layout: controls are ALWAYS reachable. The image lives in a flex region with min-h-0 so it
// shrinks instead of pushing the controls off-screen (the earlier below-the-fold bug). On
// desktop it's a split view (image left, edit panel right); on mobile the panel pins below and
// scrolls. Presets are SSELFIE looks first, then quick mechanical edits.

import { useState } from "react"
import type { OutputFormat } from "./types"
import { Spinner } from "./loading"

interface EditModeProps {
  imageUrl: string
  format: OutputFormat
  onClose: () => void
  onResult: (newUrl: string) => void
}

// Branded look presets (re-grade the whole image to a SSELFIE aesthetic).
const LOOK_PRESETS: { label: string; instruction: string }[] = [
  { label: "Dark & Moody", instruction: "Regrade to dark and moody: low-key cinematic lighting, rich deep shadows, refined contrast" },
  { label: "Light & Dreamy", instruction: "Regrade to light and dreamy: soft airy high-key light, gentle warm pastels, clean and fresh" },
  { label: "Vogue Editorial", instruction: "Regrade to high-fashion Vogue editorial: dramatic directional light, magazine-cover polish" },
  { label: "Quiet Luxury", instruction: "Regrade to quiet luxury: neutral muted palette, refined understated styling, The Row energy" },
  { label: "Clean Girl Founder", instruction: "Regrade to clean-girl founder morning: bright natural window light, minimal, dewy, effortless" },
  { label: "Coffee & Confidence", instruction: "Regrade to a warm café mood: golden interior light, confident relaxed energy" },
]

// Quick mechanical edits.
const QUICK_EDITS: { label: string; instruction: string }[] = [
  { label: "Brighter", instruction: "make it a little brighter and cleaner" },
  { label: "Crop closer", instruction: "crop closer for a tighter, more intimate framing" },
  { label: "New background", instruction: "change the background to something complementary and on-brand" },
  { label: "Black & white", instruction: "convert to a rich editorial black and white" },
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
      <header className="flex shrink-0 items-center justify-between px-5 py-3.5">
        <p className="text-[11px] uppercase tracking-[0.22em] text-white/80">Edit with Maya</p>
        <button type="button" onClick={onClose} className="text-[11px] uppercase tracking-[0.18em] text-white/80 hover:text-white">
          Done
        </button>
      </header>

      {/* Split region: min-h-0 on the flex children is what keeps the controls on screen. */}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Image */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current} alt="Editing" decoding="async" className="max-h-full max-w-full rounded-[6px] object-contain" />
          {busy && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0D0E10]/40">
              <Spinner className="h-8 w-8 border-white/40 border-t-white" />
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/80">Making your change…</p>
            </div>
          )}
        </div>

        {/* Edit panel — pinned right on desktop, below (scrollable) on mobile. Always reachable. */}
        <div className="max-h-[55vh] shrink-0 space-y-4 overflow-y-auto border-t border-white/10 bg-[#0D0E10]/85 p-5 md:max-h-none md:w-[340px] md:border-l md:border-t-0">
          {error && <p className="text-[12px] text-white/80">{error}</p>}

          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-white/50">SSELFIE looks</p>
            <div className="flex flex-wrap gap-2">
              {LOOK_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  disabled={busy}
                  onClick={() => void runEdit(p.instruction)}
                  className="rounded-full border border-white/25 bg-white/5 px-3 py-1.5 text-[12px] text-white/85 transition-colors hover:border-white/60 hover:text-white disabled:opacity-40"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] uppercase tracking-[0.22em] text-white/50">Quick edits</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_EDITS.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  disabled={busy}
                  onClick={() => void runEdit(q.instruction)}
                  className="rounded-full border border-white/25 bg-white/5 px-3 py-1.5 text-[12px] text-white/85 transition-colors hover:border-white/60 hover:text-white disabled:opacity-40"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
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
              placeholder="Or describe the change…"
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
    </div>
  )
}
