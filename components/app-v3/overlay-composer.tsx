"use client"

// SSELFIE Studio 3.0 — Overlay Composer (MAYA-REBUILD-10, Mode C).
// "I already have the photo, just add my text." The user brings their own image (an upload or a
// Library photo) and gets a single-pass, preserve-and-overlay edit (gpt-image-2 renders the text).
// No selfie, no generation of a new person — the photo is kept exactly, the overlay is added.

import { startTransition, useRef, useState } from "react"
import { OVERLAY_STYLES } from "@/lib/app-v3/maya/overlay-styles"

const FORMATS: { id: string; label: string }[] = [
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
  const [format, setFormat] = useState("reel-cover")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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

  async function generate() {
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
      const res = await fetch("/api/app-v3/maya/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseImageUrl: imageUrl,
          format,
          overlay: { headline: headline.trim(), subline: subline.trim() || undefined, overlayStyle: styleId, role: "hook" },
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.imageUrl) {
        setError(data?.error || "Couldn't add the text. Try again.")
        return
      }
      startTransition(() => setResult(data.imageUrl))
    } catch {
      setError("Something went wrong. Try again.")
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
          <button type="button" onClick={onClose} className="text-[11px] uppercase tracking-[0.18em] text-[#818283] hover:text-[#0D0E10]">
            Close
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-0 sm:grid-cols-2">
          {/* Image side */}
          <div className="flex flex-col items-center justify-center border-b border-[#E5E5E5] bg-[#F1F2F2] p-5 sm:border-b-0 sm:border-r">
            {(result || imageUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={result || imageUrl || ""}
                alt={result ? "Your image with text" : "Your photo"}
                className="max-h-[46vh] w-auto rounded-[6px] object-contain"
              />
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex aspect-[4/5] w-full max-w-[260px] flex-col items-center justify-center rounded-[8px] border border-dashed border-[#C5C6C8] bg-white text-center"
              >
                <span className="font-serif text-[18px] font-light text-[#0D0E10]">Add a photo</span>
                <span className="mt-1 px-6 text-[12px] text-[#818283]">Upload one, or open this from a Library image.</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
            {(imageUrl || result) && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[#4F5052] underline underline-offset-2 hover:text-[#0D0E10]"
              >
                {result ? "Use a different photo" : "Change photo"}
              </button>
            )}
          </div>

          {/* Controls side */}
          <div className="flex flex-col gap-4 p-5">
            {result ? (
              <div className="flex flex-1 flex-col">
                <p className="text-[15px] text-[#0D0E10]">Done. Here it is.</p>
                <p className="mt-1 text-[13px] text-[#818283]">It's saved to your Library too.</p>
                <div className="mt-4 flex gap-4">
                  <a
                    href={result}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-[6px] bg-[#0D0E10] px-4 py-2.5 text-[12px] uppercase tracking-[0.16em] text-white hover:bg-[#282728]"
                  >
                    Download
                  </a>
                  <button
                    type="button"
                    onClick={() => startTransition(() => setResult(null))}
                    className="text-[12px] uppercase tracking-[0.16em] text-[#4F5052] underline underline-offset-2 hover:text-[#0D0E10]"
                  >
                    Make another
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className={label}>Headline</label>
                  <input
                    className={field}
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="The words that go on top"
                    maxLength={120}
                  />
                </div>
                <div>
                  <label className={label}>Smaller line (optional)</label>
                  <input
                    className={field}
                    value={subline}
                    onChange={(e) => setSubline(e.target.value)}
                    placeholder="A supporting line"
                    maxLength={120}
                  />
                </div>
                <div>
                  <label className={label}>Style</label>
                  <select className={field} value={styleId} onChange={(e) => setStyleId(e.target.value)}>
                    {OVERLAY_STYLES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label}>Format</label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {FORMATS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFormat(f.id)}
                        className={`rounded-full border px-3 py-1.5 text-[12px] transition-colors ${
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
                  onClick={generate}
                  disabled={busy || !imageUrl}
                  className="mt-1 rounded-[6px] bg-[#0D0E10] px-4 py-3 text-[12px] uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#282728] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? "Adding your text…" : "Add the text"}
                </button>
                <p className="text-[11px] text-[#818283]">
                  Your photo stays exactly as it is. Maya only adds the text overlay. Uses 1 credit.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
