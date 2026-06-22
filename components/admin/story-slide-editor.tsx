"use client"

import { type PointerEvent as ReactPointerEvent, type ReactNode, useRef, useState } from "react"
import type { StoryLine, StorySlide } from "@/lib/content-kit/types"

// Editor preview is the 1080x1920 canvas scaled down. PS maps render px -> preview px. The preview
// is an HTML approximation for fast dragging/editing; the downloadable PNG (the Satori route) is
// the source of truth, re-rendered on save.
const PS = 0.25
const SIDE = 80
const TEXT_BOTTOM = 380
const TEXT_TOP = 320

const SERIF = '"Cormorant Garamond", Georgia, serif'
const SANS = 'Inter, system-ui, sans-serif'
const HAND = '"Caveat", "Segoe Script", cursive'

type Props = {
  slide: StorySlide
  index: number
  total: number
  swapOptions: string[]
  saving: boolean
  onSave: (slide: StorySlide) => void
  onCancel: () => void
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function StorySlideEditor({ slide, index, total, swapOptions, saving, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<StorySlide>({
    ...slide,
    textScale: slide.textScale ?? 1,
    textOffsetX: slide.textOffsetX ?? 0,
    textOffsetY: slide.textOffsetY ?? 0,
    textZone: slide.textZone ?? "bottom",
    textAlign: slide.textAlign ?? "left",
    scrimStrength: slide.scrimStrength ?? "medium",
  })
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  const isCta = draft.role === "cta"
  const scale = draft.textScale ?? 1
  const offsetX = draft.textOffsetX ?? 0
  const offsetY = draft.textOffsetY ?? 0
  const light = Boolean(draft.imageUrl)
  const leadColor = light ? "#FFFFFF" : "#0A0A0A"
  const supportColor = light ? "rgba(255,255,255,0.88)" : "#666666"
  const noteColor = light ? "rgba(255,255,255,0.92)" : "#8A8780"

  function set<K extends keyof StorySlide>(key: K, value: StorySlide[K]) {
    setDraft(current => ({ ...current, [key]: value }))
  }
  function setLine(i: number, patch: Partial<StoryLine>) {
    setDraft(current => ({
      ...current,
      lines: current.lines.map((line, li) => (li === i ? { ...line, ...patch } : line)),
    }))
  }
  function addLine() {
    setDraft(current => ({
      ...current,
      lines: [...current.lines, { text: "New line", size: "support", emphasis: false }],
    }))
  }
  function removeLine(i: number) {
    setDraft(current => ({ ...current, lines: current.lines.filter((_, li) => li !== i) }))
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, y: event.clientY, ox: offsetX, oy: offsetY }
    setDragging(true)
  }
  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    const dx = (event.clientX - drag.current.x) / PS
    const dy = (event.clientY - drag.current.y) / PS
    set("textOffsetX", Math.round(clamp(drag.current.ox + dx, -480, 480)))
    set("textOffsetY", Math.round(clamp(drag.current.oy + dy, -900, 900)))
  }
  function onPointerUp() {
    drag.current = null
    setDragging(false)
  }

  const scrimAlpha =
    draft.scrimStrength === "light" ? 0.5 : draft.scrimStrength === "strong" ? 0.9 : 0.74
  const scrim =
    draft.textZone === "top"
      ? `linear-gradient(0deg, rgba(10,10,10,0) 0%, rgba(10,10,10,0) 46%, rgba(10,10,10,${scrimAlpha}) 100%)`
      : `linear-gradient(180deg, rgba(10,10,10,0) 0%, rgba(10,10,10,0) 46%, rgba(10,10,10,${scrimAlpha}) 100%)`

  const blockAlign = isCta ? "center" : draft.textAlign === "center" ? "center" : draft.textAlign === "right" ? "flex-end" : "flex-start"

  return (
    <div className="mt-3 grid gap-4 rounded-2xl border border-stone-300 bg-stone-50 p-4 lg:grid-cols-[270px_1fr]">
      {/* ── Live preview (drag the text) ── */}
      <div>
        <div
          className="relative overflow-hidden rounded-xl border border-stone-300 bg-stone-900"
          style={{ width: 270, height: 480 }}
        >
          {draft.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={draft.imageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: draft.objectPosition || "50% 50%" }}
            />
          )}
          <div className="absolute inset-0" style={{ background: scrim }} />
          {/* header */}
          <div
            className="absolute flex items-center justify-between"
            style={{ top: 150 * PS, left: SIDE * PS, width: (1080 - SIDE * 2) * PS }}
          >
            <span style={{ fontFamily: SANS, fontSize: 7, letterSpacing: 2, color: light ? "rgba(255,255,255,0.9)" : "#8A8780" }}>
              SSELFIE
            </span>
            <span style={{ fontFamily: SANS, fontSize: 7, color: light ? "rgba(255,255,255,0.8)" : "#8A8780" }}>
              {index + 1} / {total}
            </span>
          </div>
          {/* draggable text block */}
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className={`absolute cursor-grab ${dragging ? "cursor-grabbing" : ""}`}
            style={{
              left: SIDE * PS,
              width: (1080 - SIDE * 2) * PS,
              ...(draft.textZone === "top" ? { top: TEXT_TOP * PS } : { bottom: TEXT_BOTTOM * PS }),
              transform: `translate(${offsetX * PS}px, ${offsetY * PS}px)`,
              display: "flex",
              flexDirection: "column",
              alignItems: blockAlign,
              touchAction: "none",
            }}
          >
            {!isCta && (
              <div style={{ width: 110 * PS, height: 2, background: leadColor, marginBottom: 18 * PS }} />
            )}
            {draft.lines.map((line, i) => {
              if (line.size === "keyword") {
                return (
                  <div key={i} style={{ position: "relative", padding: `${18 * PS}px ${56 * PS}px`, marginTop: 20 * PS }}>
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        border: `1.5px solid ${leadColor}`,
                        borderRadius: "50%",
                        transform: "rotate(-3deg)",
                      }}
                    />
                    <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 40 * scale * PS, letterSpacing: 2 * PS, color: leadColor }}>
                      {line.text}
                    </span>
                  </div>
                )
              }
              if (line.size === "support") {
                return (
                  <div key={i} style={{ fontFamily: SANS, fontSize: 48 * scale * PS, lineHeight: 1.42, color: supportColor, marginTop: 20 * PS, maxWidth: 880 * PS }}>
                    {line.text}
                  </div>
                )
              }
              return (
                <div key={i} style={{ marginTop: 22 * PS }}>
                  <div style={{ fontFamily: SERIF, fontWeight: 600, fontSize: 100 * scale * PS, lineHeight: 1.06, color: leadColor, maxWidth: 920 * PS }}>
                    {line.text}
                  </div>
                  {line.emphasis && <div style={{ height: 2, width: 100 * PS, background: leadColor, marginTop: 8 * PS }} />}
                </div>
              )
            })}
            {draft.note && (
              <div style={{ fontFamily: HAND, fontSize: 58 * scale * PS, color: noteColor, marginTop: 26 * PS, transform: "rotate(-3deg)" }}>
                {draft.note}
              </div>
            )}
          </div>
        </div>
        <p className="mt-2 text-[11px] text-stone-500">Drag the text to move it. Preview is approximate; the PNG is exact.</p>
      </div>

      {/* ── Controls ── */}
      <div className="space-y-4 text-sm">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-stone-500">Text</p>
          {draft.lines.map((line, i) => (
            <div key={i} className="rounded-lg border border-stone-200 bg-white p-2">
              <textarea
                value={line.text}
                onChange={e => setLine(i, { text: e.target.value })}
                rows={2}
                className="w-full resize-none rounded border border-stone-200 p-2 text-sm focus:border-stone-950 focus:outline-none"
              />
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <select
                  value={line.size}
                  onChange={e => setLine(i, { size: e.target.value as StoryLine["size"] })}
                  className="rounded border border-stone-200 px-2 py-1 text-xs"
                >
                  <option value="lead">Lead (big serif)</option>
                  <option value="support">Support (small sans)</option>
                  <option value="keyword">Keyword (CTA)</option>
                </select>
                {line.size === "lead" && (
                  <label className="flex items-center gap-1 text-xs text-stone-600">
                    <input type="checkbox" checked={Boolean(line.emphasis)} onChange={e => setLine(i, { emphasis: e.target.checked })} />
                    underline
                  </label>
                )}
                <button type="button" onClick={() => removeLine(i)} className="ml-auto text-xs text-stone-400 hover:text-red-700">
                  remove
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={addLine} className="text-xs uppercase tracking-wide text-stone-600 underline underline-offset-4 hover:text-stone-950">
            Add line
          </button>
        </div>

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-stone-500">Handwritten note</span>
          <input
            value={draft.note ?? ""}
            onChange={e => set("note", e.target.value || undefined)}
            placeholder="e.g. this is the shift"
            className="mt-1 w-full rounded border border-stone-200 p-2 text-sm focus:border-stone-950 focus:outline-none"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <Control label="Position">
            <Segmented value={draft.textZone ?? "bottom"} onChange={v => set("textZone", v as "top" | "bottom")} options={[["top", "Top"], ["bottom", "Bottom"]]} />
          </Control>
          <Control label="Align">
            <Segmented value={draft.textAlign ?? "left"} onChange={v => set("textAlign", v as "left" | "center" | "right")} options={[["left", "Left"], ["center", "Center"], ["right", "Right"]]} />
          </Control>
          <Control label="Scrim">
            <Segmented value={draft.scrimStrength ?? "medium"} onChange={v => set("scrimStrength", v as "light" | "medium" | "strong")} options={[["light", "Light"], ["medium", "Med"], ["strong", "Strong"]]} />
          </Control>
          <Control label={`Size ${Math.round(scale * 100)}%`}>
            <input
              type="range"
              min={0.6}
              max={1.6}
              step={0.05}
              value={scale}
              onChange={e => set("textScale", Number(e.target.value))}
              className="w-full"
            />
          </Control>
        </div>

        <button type="button" onClick={() => { set("textOffsetX", 0); set("textOffsetY", 0) }} className="text-xs uppercase tracking-wide text-stone-600 underline underline-offset-4 hover:text-stone-950">
          Reset position
        </button>

        {swapOptions.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-500">Background photo</p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {swapOptions.map(url => (
                <button
                  key={url}
                  type="button"
                  onClick={() => set("imageUrl", url)}
                  className={`shrink-0 overflow-hidden rounded-lg border-2 ${draft.imageUrl === url ? "border-stone-950" : "border-transparent hover:border-stone-300"}`}
                  title="Use this photo"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-16 w-12 object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => onSave(draft)}
            disabled={saving}
            className="rounded-full bg-stone-950 px-5 py-1.5 text-xs uppercase tracking-wide text-white disabled:opacity-50"
          >
            {saving ? "Saving" : "Save slide"}
          </button>
          <button type="button" onClick={onCancel} className="rounded-full border border-stone-300 px-5 py-1.5 text-xs uppercase tracking-wide text-stone-700 hover:border-stone-950">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function Control({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="text-xs uppercase tracking-wide text-stone-500">{label}</span>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Array<[string, string]> }) {
  return (
    <div className="flex gap-1">
      {options.map(([val, label]) => (
        <button
          key={val}
          type="button"
          onClick={() => onChange(val)}
          className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-wide ${value === val ? "border-stone-950 bg-stone-950 text-white" : "border-stone-200 text-stone-500 hover:border-stone-400"}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
