"use client"

import { createPortal } from "react-dom"
import { useMemo, useState } from "react"
import Image from "next/image"
import { Check, Loader2, X } from "lucide-react"

import { TextOverlayLayer } from "@/components/app-v3/text-overlay-layer"
import { useAccessibleModal } from "@/components/app-v3/use-accessible-modal"
import {
  OVERLAY_STYLE_PRESETS,
  resolveOverlayStyle,
  type OverlayPosition,
  type OverlayStyleId,
  type TextOverlaySpec,
} from "@/lib/app-v3/text-overlay"

type CalendarTextStudioProps = {
  open: boolean
  feedId: number
  postId: number
  position: number
  cleanImageUrl: string
  initialHeadline?: string | null
  onClose: () => void
  onApplied: (updatedPost?: unknown) => void | Promise<void>
}

export function CalendarTextStudio({
  open,
  feedId,
  postId,
  position,
  cleanImageUrl,
  initialHeadline,
  onClose,
  onApplied,
}: CalendarTextStudioProps) {
  const [headline, setHeadline] = useState(() => (initialHeadline || "").trim().slice(0, 60))
  const [subline, setSubline] = useState("")
  const [style, setStyle] = useState<OverlayStyleId>("editorial-serif-center")
  const [positionChoice, setPositionChoice] = useState<OverlayPosition>("bottom")
  const [bakedUrl, setBakedUrl] = useState<string | null>(null)
  const [bakedImageId, setBakedImageId] = useState<number | null>(null)
  const [status, setStatus] = useState<"idle" | "baking" | "applying" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const { dialogRef, initialFocusRef } = useAccessibleModal(open, onClose)
  const preset = resolveOverlayStyle(style)
  const effectivePosition = preset.lockedPosition ?? positionChoice
  const spec = useMemo<TextOverlaySpec | null>(() => {
    const cleanHeadline = headline.replace(/\s+/g, " ").trim()
    if (!cleanHeadline) return null
    return {
      headline: cleanHeadline,
      subline: subline.replace(/\s+/g, " ").trim() || undefined,
      style,
      position: effectivePosition,
      format: "carousel",
      size: "m",
    }
  }, [effectivePosition, headline, style, subline])

  if (!open || typeof document === "undefined") return null

  async function bakeText() {
    if (!spec || status === "baking") return
    setStatus("baking")
    setError(null)
    setBakedUrl(null)
    try {
      const response = await fetch("/api/app-v3/maya/bake-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cleanImageUrl,
          conceptTitle: `Calendar post ${position}`,
          spec,
          feedId,
          postId,
        }),
      })
      const data = (await response.json().catch(() => null)) as {
        bakedUrl?: string
        aiImageId?: number | null
        error?: string
      } | null
      if (!response.ok || !data?.bakedUrl) {
        throw new Error(data?.error || "Maya could not add the text this time.")
      }
      setBakedUrl(data.bakedUrl)
      setBakedImageId(data.aiImageId ?? null)
      setStatus("idle")
    } catch (requestError) {
      setStatus("error")
      setError(requestError instanceof Error ? requestError.message : "The text did not go through.")
    }
  }

  async function applyToGrid() {
    if (!bakedUrl || status === "applying") return
    setStatus("applying")
    setError(null)
    try {
      const response = await fetch(`/api/feed/${feedId}/replace-post-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, imageUrl: bakedUrl, aiImageId: bakedImageId }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "The grid could not be updated.")
      await onApplied(data?.post)
      onClose()
    } catch (requestError) {
      setStatus("error")
      setError(requestError instanceof Error ? requestError.message : "The grid could not be updated.")
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-[color:var(--ss-night)]/55 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-text-title"
        className="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[16px] bg-[color:var(--ss-seasalt)] shadow-2xl sm:rounded-[12px]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[color:var(--ss-silver)]/55 px-5 py-4 sm:px-7">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ss-gray)]">Post {position}</p>
            <h2 id="calendar-text-title" className="mt-1 font-serif text-[28px] font-light text-[color:var(--ss-night)] sm:text-[36px]">Add text with Maya.</h2>
            <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-[color:var(--ss-davy)]">Your clean photo stays safe. Maya makes a separate text version, and nothing changes in the grid until you approve it.</p>
          </div>
          <button ref={initialFocusRef} type="button" onClick={onClose} aria-label="Close text studio" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[color:var(--ss-davy)] hover:bg-white"><X size={18} aria-hidden /></button>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.1fr)] lg:overflow-hidden">
          <div className="flex items-center justify-center bg-[color:var(--ss-silver)]/28 p-4 sm:p-7 lg:min-h-0">
            <div className="relative aspect-[4/5] w-full max-w-[420px] overflow-hidden rounded-[8px] bg-white shadow-sm">
              <Image
                src={bakedUrl ?? cleanImageUrl}
                alt="Calendar post preview"
                fill
                sizes="420px"
                className="object-cover object-top"
              />
              {!bakedUrl && spec ? <TextOverlayLayer spec={spec} /> : null}
              {bakedUrl ? <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] text-[color:var(--ss-night)]"><Check size={11} aria-hidden /> Maya render</span> : null}
            </div>
          </div>

          <div className="min-h-0 space-y-5 overflow-y-auto p-5 sm:p-7">
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--ss-gray)]">Headline</span>
              <input value={headline} onChange={event => { setHeadline(event.target.value.slice(0, 60)); setBakedUrl(null) }} placeholder="Write the exact words" className="mt-2 min-h-12 w-full rounded-[6px] border border-[color:var(--ss-silver)] bg-white px-4 text-[16px] text-[color:var(--ss-night)] outline-none focus:border-[color:var(--ss-night)]" />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--ss-gray)]">Supporting line <span className="normal-case tracking-normal">(optional)</span></span>
              <input value={subline} onChange={event => { setSubline(event.target.value.slice(0, 80)); setBakedUrl(null) }} placeholder="A smaller supporting line" className="mt-2 min-h-12 w-full rounded-[6px] border border-[color:var(--ss-silver)] bg-white px-4 text-[16px] text-[color:var(--ss-night)] outline-none focus:border-[color:var(--ss-night)]" />
            </label>

            <fieldset>
              <legend className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--ss-gray)]">Text style</legend>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {OVERLAY_STYLE_PRESETS.map(option => (
                  <button key={option.id} type="button" onClick={() => { setStyle(option.id); setPositionChoice(option.defaultPosition ?? positionChoice); setBakedUrl(null) }} aria-pressed={style === option.id} className={`min-h-14 rounded-[6px] border px-3 py-2 text-left text-[11px] leading-tight ${style === option.id ? "border-[color:var(--ss-night)] bg-[color:var(--ss-night)] text-white" : "border-[color:var(--ss-silver)] bg-white text-[color:var(--ss-davy)]"}`}>{option.name}</button>
                ))}
              </div>
            </fieldset>

            {!preset.lockedPosition ? (
              <fieldset>
                <legend className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--ss-gray)]">Position</legend>
                <div className="mt-2 flex gap-2">
                  {(["top", "center", "bottom"] as OverlayPosition[]).map(option => (
                    <button key={option} type="button" onClick={() => { setPositionChoice(option); setBakedUrl(null) }} aria-pressed={effectivePosition === option} className={`min-h-11 flex-1 rounded-[6px] border text-[11px] capitalize ${effectivePosition === option ? "border-[color:var(--ss-night)] bg-[color:var(--ss-night)] text-white" : "border-[color:var(--ss-silver)] bg-white text-[color:var(--ss-davy)]"}`}>{option}</button>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {error ? <p role="alert" className="rounded-[6px] bg-[color:var(--ss-silver)]/35 px-3 py-2 text-[12px] leading-relaxed text-[color:var(--ss-davy)]">{error}</p> : null}

            <div className="flex flex-col-reverse gap-2 border-t border-[color:var(--ss-silver)]/55 pt-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={onClose} className="min-h-12 rounded-[6px] px-5 text-[11px] uppercase tracking-[0.15em] text-[color:var(--ss-davy)]">Cancel</button>
              {bakedUrl ? (
                <button type="button" onClick={() => void applyToGrid()} disabled={status === "applying"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[6px] bg-[color:var(--ss-night)] px-5 text-[11px] uppercase tracking-[0.15em] text-white disabled:opacity-50">{status === "applying" ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Check size={15} aria-hidden />}{status === "applying" ? "Updating grid…" : "Use in grid"}</button>
              ) : (
                <button type="button" onClick={() => void bakeText()} disabled={!spec || status === "baking"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[6px] bg-[color:var(--ss-night)] px-5 text-[11px] uppercase tracking-[0.15em] text-white disabled:opacity-50">{status === "baking" ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}{status === "baking" ? "Maya is adding text…" : "Create text version · 1 credit"}</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
