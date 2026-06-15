"use client"

// SSELFIE Studio 3.0 - Overlay Composer (MAYA-REBUILD-10, Mode C / MAYA-FIX-03).
// "I already have the photo, just add my text." The user brings their own image (an upload or a
// Library photo) and gets an editable local text layer. Download flattens it into a final PNG.

import { startTransition, useRef, useState } from "react"
import { OVERLAY_STYLES } from "@/lib/app-v3/maya/overlay-styles"
import { fallbackTextLayerSpec } from "@/lib/app-v3/overlay-layer"
import type { OutputFormat } from "./types"
import { LayeredImage, downloadLayeredImage } from "./layered-image"

const FORMATS: { id: OutputFormat; label: string }[] = [
  { id: "reel-cover", label: "Reel cover · 9:16" },
  { id: "story-slide", label: "Story · 9:16" },
  { id: "carousel", label: "Post · 4:5" },
]

const MAX_UPLOAD_BYTES = 11 * 1024 * 1024

export function OverlayComposer({
  initialImageUrl,
  onClose,
}: {
  /** A Library image to start from. Omit to start in upload mode. */
  initialImageUrl?: string | null
  onClose: () => void
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl ?? null)
  const [headline, setHeadline] = useState("")
  const [subline, setSubline] = useState("")
  const [styleId, setStyleId] = useState(OVERLAY_STYLES[0].id)
  const [format, setFormat] = useState<OutputFormat>("reel-cover")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const overlay = fallbackTextLayerSpec(format, {
    headline: headline.trim(),
    subline: subline.trim() || undefined,
    styleId,
    role: "hook",
  })

  function pickFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.")
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("That image is a little big. Try one under 11MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setError(null)
      startTransition(() => setImageUrl(typeof reader.result === "string" ? reader.result : null))
    }
    reader.readAsDataURL(file)
  }

  async function download() {
    if (!imageUrl) {
      setError("Add a photo first.")
      return
    }
    if (!headline.trim()) {
      setError("Add the text you want on it.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      await downloadLayeredImage({
        imageUrl,
        overlay,
        format,
        fileName: `sselfie-${format}-text.png`,
      })
    } catch {
      setError("Couldn't export the image. Try another photo or open the original.")
    } finally {
      setBusy(false)
    }
  }

  const label = "text-[10px] uppercase tracking-[0.2em] text-[#818283]"
  const field =
    "mt-1 w-full rounded-[6px] border border-[#C5C6C8] bg-white px-3 py-2.5 text-[15px] text-[#0D0E10] focus:border-[#0D0E10] focus:outline-none"

  return (
    <div className="fixed inset-0 z-[70] flex items-stretch justify-center overflow-y-auto bg-[#0D0E10]/95 p-0 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none sm:items-center sm:p-6">
      <div className="flex min-h-full w-full max-w-4xl flex-col bg-[#F8FAFA] sm:min-h-0 sm:rounded-[10px]">
        <div className="flex items-center justify-between border-b border-[#E5E5E5] px-5 py-4">
          <div>
            <p className={label}>Add text to a photo</p>
            <h2 className="mt-0.5 font-serif text-[22px] font-light leading-tight text-[#0D0E10]">
              Your photo, your words
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.18em] text-[#818283] hover:text-[#0D0E10]"
          >
            Close
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-0 sm:grid-cols-2">
          {/* Image side */}
          <div className="flex flex-col items-center justify-center border-b border-[#E5E5E5] bg-[#F1F2F2] p-5 sm:border-b-0 sm:border-r">
            {imageUrl ? (
              <LayeredImage
                imageUrl={imageUrl}
                overlay={headline.trim() ? overlay : null}
                alt="Your photo with editable text"
                format={format}
                className="max-h-[52vh] w-full max-w-[320px] rounded-[6px]"
              />
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex min-h-[220px] w-full max-w-[260px] flex-col items-center justify-center rounded-[8px] border border-dashed border-[#C5C6C8] bg-white text-center sm:aspect-[4/5]"
              >
                <span className="font-serif text-[18px] font-light text-[#0D0E10]">
                  Add a photo
                </span>
                <span className="mt-1 px-6 text-[12px] text-[#818283]">
                  Upload one, or open this from a Library image.
                </span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => pickFile(e.target.files?.[0])}
            />
            {imageUrl && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-3 inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.16em] text-[#4F5052] underline underline-offset-2 hover:text-[#0D0E10]"
              >
                Change photo
              </button>
            )}
          </div>

          {/* Controls side */}
          <div className="flex flex-col gap-4 p-5">
            <div>
              <label className={label}>Headline</label>
              <input
                className={field}
                value={headline}
                onChange={e => setHeadline(e.target.value)}
                placeholder="A short cover line"
                maxLength={48}
              />
              <p className="mt-1 text-[11px] text-[#818283]">
                Keep it short, like a magazine cover line.
              </p>
            </div>
            <div>
              <label className={label}>Smaller line (optional)</label>
              <input
                className={field}
                value={subline}
                onChange={e => setSubline(e.target.value)}
                placeholder="A supporting line"
                maxLength={80}
              />
            </div>
            <div>
              <label className={label}>Style</label>
              <select className={field} value={styleId} onChange={e => setStyleId(e.target.value)}>
                {OVERLAY_STYLES.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Format</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {FORMATS.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFormat(f.id)}
                    className={`min-h-10 rounded-full border px-3.5 py-2 text-[12px] transition-colors ${
                      format === f.id
                        ? "border-[#0D0E10] bg-[#0D0E10] text-white"
                        : "border-[#C5C6C8] text-[#4F5052] hover:border-[#0D0E10]/40"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-[13px] text-[#282728]">{error}</p>}

            <button
              type="button"
              onClick={download}
              disabled={busy || !imageUrl}
              className="mt-1 min-h-12 rounded-[6px] bg-[#0D0E10] px-4 py-3 text-[12px] uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#282728] disabled:cursor-not-allowed disabled:opacity-40 sm:tracking-[0.18em]"
            >
              {busy ? "Preparing..." : "Download with text"}
            </button>
            <p className="text-[11px] text-[#818283]">
              Your photo stays clean. Text is editable here, then flattened when you download.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
