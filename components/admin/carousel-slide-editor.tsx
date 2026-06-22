"use client"

import { useState } from "react"
import type { CarouselSlide, CarouselSlideKind } from "@/lib/content-kit/types"

const KINDS: Array<{ value: CarouselSlideKind; label: string }> = [
  { value: "hook", label: "Hook" },
  { value: "list", label: "List" },
  { value: "step", label: "Step" },
  { value: "quote", label: "Quote" },
  { value: "cta", label: "CTA" },
  { value: "photo", label: "Photo" },
  { value: "before-after", label: "Before / After" },
]

type Props = {
  slide: CarouselSlide
  index: number
  total: number
  previewSrc: string
  swapOptions: string[]
  saving: boolean
  onSave: (slide: CarouselSlide) => void
  onCancel: () => void
}

export function CarouselSlideEditor({
  slide,
  index,
  total,
  previewSrc,
  swapOptions,
  saving,
  onSave,
  onCancel,
}: Props) {
  const [draft, setDraft] = useState<CarouselSlide>({ ...slide })

  function set<K extends keyof CarouselSlide>(key: K, value: CarouselSlide[K]) {
    setDraft(current => ({ ...current, [key]: value }))
  }
  function setItem(i: number, value: string) {
    setDraft(current => ({
      ...current,
      items: (current.items || []).map((item, li) => (li === i ? value : item)),
    }))
  }
  function addItem() {
    setDraft(current => ({ ...current, items: [...(current.items || []), "New point"] }))
  }
  function removeItem(i: number) {
    setDraft(current => ({ ...current, items: (current.items || []).filter((_, li) => li !== i) }))
  }

  const isList = draft.kind === "list"
  const isStep = draft.kind === "step"

  return (
    <div className="mt-3 grid gap-4 rounded-2xl border border-stone-300 bg-stone-50 p-4 lg:grid-cols-[300px_1fr]">
      {/* Preview = the real rendered PNG (updates after Save). */}
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewSrc}
          alt={`Slide ${index + 1} of ${total}`}
          className="w-full rounded-xl border border-stone-300"
        />
        <p className="mt-2 text-[11px] text-stone-500">Preview updates after you save.</p>
      </div>

      {/* Controls */}
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-stone-500">Slide type</span>
            <select
              value={draft.kind}
              onChange={e => set("kind", e.target.value as CarouselSlideKind)}
              className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-sm"
            >
              {KINDS.map(k => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wide text-stone-500">Eyebrow</span>
            <input
              value={draft.eyebrow ?? ""}
              onChange={e => set("eyebrow", e.target.value || undefined)}
              placeholder="SSELFIE"
              className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-sm focus:border-stone-950 focus:outline-none"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-stone-500">Headline</span>
          <textarea
            value={draft.title ?? ""}
            onChange={e => set("title", e.target.value)}
            rows={2}
            className="mt-1 w-full resize-none rounded border border-stone-200 p-2 text-sm focus:border-stone-950 focus:outline-none"
          />
          <span className="mt-1 block text-[11px] text-stone-400">
            Wrap a word in *stars* for italic, or [brackets] for a highlight box. (Editable mode)
          </span>
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-wide text-stone-500">Body</span>
          <textarea
            value={draft.body ?? ""}
            onChange={e => set("body", e.target.value || undefined)}
            rows={2}
            className="mt-1 w-full resize-none rounded border border-stone-200 p-2 text-sm focus:border-stone-950 focus:outline-none"
          />
        </label>

        {isStep && (
          <label className="block w-32">
            <span className="text-xs uppercase tracking-wide text-stone-500">Step number</span>
            <input
              type="number"
              value={draft.stepNumber ?? ""}
              onChange={e =>
                set("stepNumber", e.target.value ? Number(e.target.value) : undefined)
              }
              className="mt-1 w-full rounded border border-stone-200 px-2 py-1.5 text-sm"
            />
          </label>
        )}

        {isList && (
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wide text-stone-500">List items</span>
            {(draft.items || []).map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={item}
                  onChange={e => setItem(i, e.target.value)}
                  className="w-full rounded border border-stone-200 px-2 py-1.5 text-sm focus:border-stone-950 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="text-xs text-stone-400 hover:text-red-700"
                >
                  remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addItem}
              className="text-xs uppercase tracking-wide text-stone-600 underline underline-offset-4 hover:text-stone-950"
            >
              Add item
            </button>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-stone-500">Background photo</span>
            {draft.imageUrl && (
              <button
                type="button"
                onClick={() => set("imageUrl", undefined)}
                className="text-[11px] uppercase tracking-wide text-stone-400 underline underline-offset-4 hover:text-stone-950"
              >
                Remove (text-only)
              </button>
            )}
          </div>
          {swapOptions.length > 0 ? (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {swapOptions.map(url => (
                <button
                  key={url}
                  type="button"
                  onClick={() => set("imageUrl", url)}
                  className={`shrink-0 overflow-hidden rounded-lg border-2 ${
                    draft.imageUrl === url ? "border-stone-950" : "border-transparent hover:border-stone-300"
                  }`}
                  title="Use this photo"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-16 w-12 object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-xs text-stone-400">No photos available to swap.</p>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => onSave(draft)}
            disabled={saving}
            className="rounded-full bg-stone-950 px-5 py-1.5 text-xs uppercase tracking-wide text-white disabled:opacity-50"
          >
            {saving ? "Saving" : "Save slide"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-stone-300 px-5 py-1.5 text-xs uppercase tracking-wide text-stone-700 hover:border-stone-950"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
