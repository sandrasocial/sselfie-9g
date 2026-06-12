"use client"

// SUITE-UX-02 slice 6 — admin manager for the member style picker examples.
// Each text-overlay style / carousel design system gets one example image: upload your own
// or let Maya generate a typography demo (no people). Members see these as tappable cards
// when they ask Maya about text styles. Replacing is just uploading/generating again.

import { useRef, useState } from "react"
import type { StyleOption } from "@/lib/app-v3/maya/style-example-store"

export function StyleExamplesClient({ initialOptions }: { initialOptions: StyleOption[] }) {
  const [options, setOptions] = useState<StyleOption[]>(initialOptions)
  const [busy, setBusy] = useState<string | null>(null) // styleId currently saving
  const [error, setError] = useState<string | null>(null)
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})

  function applyUpdate(styleId: string, imageUrl: string | null) {
    setOptions((prev) => prev.map((o) => (o.id === styleId ? { ...o, exampleImageUrl: imageUrl } : o)))
  }

  async function upload(styleId: string, file: File) {
    setBusy(styleId)
    setError(null)
    try {
      const form = new FormData()
      form.append("styleId", styleId)
      form.append("file", file)
      const res = await fetch("/api/admin/style-examples", { method: "POST", body: form })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.imageUrl) throw new Error(data?.error || "Upload failed")
      applyUpdate(styleId, data.imageUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setBusy(null)
    }
  }

  async function generate(styleId: string) {
    setBusy(styleId)
    setError(null)
    try {
      const res = await fetch("/api/admin/style-examples", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ styleId }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.imageUrl) throw new Error(data?.error || "Generation failed")
      applyUpdate(styleId, data.imageUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed")
    } finally {
      setBusy(null)
    }
  }

  async function remove(styleId: string) {
    setBusy(styleId)
    setError(null)
    try {
      const res = await fetch(`/api/admin/style-examples?styleId=${encodeURIComponent(styleId)}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Delete failed")
      applyUpdate(styleId, null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed")
    } finally {
      setBusy(null)
    }
  }

  function Group({ title, kind }: { title: string; kind: "overlay" | "carousel" }) {
    const group = options.filter((o) => o.kind === kind)
    return (
      <div>
        <p className="text-[11px] uppercase tracking-wide text-stone-400">{title}</p>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {group.map((o) => (
            <div key={o.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
              {o.exampleImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={o.exampleImageUrl}
                  alt={`${o.name} example`}
                  className="aspect-[4/5] w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex aspect-[4/5] w-full items-center justify-center bg-stone-100 px-3">
                  <span className="text-center font-serif text-base font-light leading-snug text-stone-700">
                    {o.name}
                  </span>
                </div>
              )}
              <div className="space-y-2 p-3">
                <p className="text-xs font-medium text-stone-950">{o.name}</p>
                <p className="line-clamp-2 text-[11px] leading-snug text-stone-500">{o.when}</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => fileInputs.current[o.id]?.click()}
                    className="rounded-md border border-stone-300 px-2 py-1 text-[11px] text-stone-700 hover:border-stone-950 disabled:opacity-50"
                  >
                    {busy === o.id ? "Saving…" : "Upload"}
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void generate(o.id)}
                    className="rounded-md border border-stone-300 px-2 py-1 text-[11px] text-stone-700 hover:border-stone-950 disabled:opacity-50"
                  >
                    {busy === o.id ? "Working…" : "Maya example"}
                  </button>
                  {o.exampleImageUrl && (
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void remove(o.id)}
                      className="rounded-md px-2 py-1 text-[11px] text-stone-400 hover:text-stone-950 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  ref={(el) => {
                    fileInputs.current[o.id] = el
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void upload(o.id, f)
                    e.target.value = ""
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-stone-400">
        Source: app_v3_style_examples. These cards are what members see when they ask Maya to pick a
        text style. One image per style; uploading or generating again replaces it. Maya examples are
        typography demos with no people in them.
      </p>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <Group title="Cover and story text styles" kind="overlay" />
      <Group title="Carousel design systems" kind="carousel" />
    </div>
  )
}
