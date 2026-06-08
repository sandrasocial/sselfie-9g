"use client"

// SSELFIE Studio 3.0 — Maya Concierge (live engine).
// Opens with the chosen aesthetic preloaded, captures format + on-image text + a reference
// selfie, then generates via the synchronous OpenAI route. Supports photos and native
// graphics (Reel cover, Story slide, carousel) and conversational edits.

import { useRef, useState } from "react"
import Image from "next/image"
import { useConcierge } from "./concierge-context"
import { generateMayaImage, type ProgressEvent } from "./generate-image-client"
import type { GeneratedResult, OutputFormat } from "./types"

const FORMAT_OPTIONS: { id: OutputFormat; label: string; hint: string; needsText: boolean }[] = [
  { id: "photo", label: "A photo", hint: "A single editorial brand image.", needsText: false },
  { id: "reel-cover", label: "A Reel cover", hint: "Image plus a headline.", needsText: true },
  { id: "carousel", label: "A carousel", hint: "Up to 5 cohesive slides.", needsText: true },
  { id: "story-slide", label: "A Story slide", hint: "A vertical slide with text.", needsText: true },
]

const PROGRESS_LABEL: Record<ProgressEvent["state"], string> = {
  compiling: "Setting the scene...",
  generating: "Creating your images...",
  saving: "Saving to your gallery...",
  done: "Done.",
}

function parseSlides(text: string): { heading: string }[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((heading) => ({ heading }))
}

export function MayaConcierge() {
  const { session, isOpen, setOutputFormat, setReferenceSelfieUrl, setGraphicText, close } = useConcierge()
  const fileInput = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState<ProgressEvent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<GeneratedResult[]>([])
  const [headline, setHeadline] = useState("")
  const [slidesText, setSlidesText] = useState("")
  const [editText, setEditText] = useState("")

  if (!isOpen || !session) return null
  const { aesthetic, outputFormat, referenceSelfieUrl } = session
  const needsText = FORMAT_OPTIONS.find((o) => o.id === outputFormat)?.needsText ?? false
  const isCarousel = outputFormat === "carousel"

  async function handleUpload(file: File) {
    setError(null)
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/app-v3/upload-selfie", { method: "POST", body: form })
      const data = (await res.json().catch(() => null)) as { url?: string; error?: string } | null
      if (!res.ok || !data?.url) throw new Error(data?.error || "Upload failed")
      setReferenceSelfieUrl(data.url)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  async function runGenerate(refineFromImageUrl?: string) {
    if (!outputFormat) return
    setError(null)
    setGenerating(true)
    setProgress({ state: "compiling" })
    const graphicText = needsText ? (isCarousel ? { slides: parseSlides(slidesText) } : { headline }) : null
    if (graphicText) setGraphicText(graphicText)
    try {
      const { images } = await generateMayaImage(
        {
          aesthetic,
          outputFormat,
          referenceSelfieUrl,
          userText: refineFromImageUrl ? editText : undefined,
          graphicText,
          refineFromImageUrl: refineFromImageUrl ?? null,
        },
        { onProgress: setProgress },
      )
      setResults((prev) => [{ images, outputFormat, createdAt: Date.now() }, ...prev])
      setEditText("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed")
    } finally {
      setGenerating(false)
      setProgress(null)
    }
  }

  const canGenerate =
    !!outputFormat &&
    !!referenceSelfieUrl &&
    !generating &&
    (!needsText || (isCarousel ? slidesText.trim().length > 0 : headline.trim().length > 0))

  const latest = results[0]

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Close" onClick={close} className="absolute inset-0 bg-[#0D0E10]/30 backdrop-blur-[2px]" />
      <aside
        role="dialog"
        aria-label={`Maya — ${aesthetic.name}`}
        className="relative flex h-full w-full max-w-md flex-col bg-[#F8FAFA] shadow-xl"
      >
        <header className="border-b border-[#C5C6C8]/40 px-6 py-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#818283]">Maya</p>
          <h2 className="mt-2 font-serif text-[26px] font-light leading-tight text-[#0D0E10]">{aesthetic.name}</h2>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <div className="rounded-[4px] bg-white p-4 text-[15px] leading-relaxed text-[#282728]">
            <p>
              {aesthetic.name} is a beautiful choice. {aesthetic.blurb}
            </p>
            <p className="mt-3">What are we creating?</p>
          </div>

          {/* Format */}
          <div className="space-y-2">
            {FORMAT_OPTIONS.map((opt) => {
              const selected = outputFormat === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setOutputFormat(opt.id)}
                  className={`block w-full rounded-[4px] border px-4 py-3 text-left transition-colors ${
                    selected
                      ? "border-[#0D0E10] bg-[#0D0E10] text-white"
                      : "border-[#C5C6C8]/60 bg-white text-[#282728] hover:border-[#0D0E10]/40"
                  }`}
                >
                  <span className="block text-[15px]">{opt.label}</span>
                  <span className={`block text-[12px] ${selected ? "text-white/70" : "text-[#818283]"}`}>{opt.hint}</span>
                </button>
              )
            })}
          </div>

          {/* Text capture for graphic formats */}
          {needsText && !isCarousel && (
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="What should it say?"
              className="w-full rounded-[4px] border border-[#C5C6C8]/60 bg-white px-4 py-3 text-[15px] text-[#282728] outline-none focus:border-[#0D0E10]"
            />
          )}
          {needsText && isCarousel && (
            <textarea
              value={slidesText}
              onChange={(e) => setSlidesText(e.target.value)}
              placeholder={"One line per slide (up to 5):\nHook\nPoint one\nPoint two\nCall to action"}
              rows={5}
              className="w-full resize-none rounded-[4px] border border-[#C5C6C8]/60 bg-white px-4 py-3 text-[14px] text-[#282728] outline-none focus:border-[#0D0E10]"
            />
          )}

          {/* Reference selfie */}
          {outputFormat && (
            <div className="rounded-[4px] border border-dashed border-[#C5C6C8] bg-white p-5 text-center">
              {referenceSelfieUrl ? (
                <div className="space-y-2">
                  <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-full">
                    <Image src={referenceSelfieUrl} alt="Your selfie" fill className="object-cover" sizes="80px" />
                  </div>
                  <button type="button" onClick={() => fileInput.current?.click()} className="text-[12px] text-[#4F5052] underline">
                    Use a different selfie
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-[14px] text-[#282728]">Upload one clear selfie.</p>
                  <p className="mt-1 text-[12px] text-[#818283]">Good light, face easy to see.</p>
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    disabled={uploading}
                    className="mt-4 rounded-[4px] bg-[#0D0E10] px-5 py-2.5 text-[11px] uppercase tracking-[0.18em] text-white disabled:opacity-60"
                  >
                    {uploading ? "Uploading..." : "Upload selfie"}
                  </button>
                </>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleUpload(f)
                }}
              />
            </div>
          )}

          {/* Generate */}
          {outputFormat && (
            <button
              type="button"
              onClick={() => void runGenerate()}
              disabled={!canGenerate}
              className="w-full rounded-[4px] bg-[#0D0E10] px-5 py-3.5 text-[12px] uppercase tracking-[0.2em] text-white disabled:opacity-40"
            >
              {generating ? PROGRESS_LABEL[progress?.state ?? "generating"] : "Generate"}
            </button>
          )}

          {progress?.state === "generating" && progress.total && progress.total > 1 && (
            <p className="text-center text-[12px] text-[#818283]">
              Slide {progress.index} of {progress.total}
            </p>
          )}
          {error && <p className="rounded-[4px] bg-[#282728]/5 px-4 py-3 text-[13px] text-[#282728]">{error}</p>}

          {/* Results */}
          {latest && (
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.24em] text-[#818283]">Your result</p>
              <div className={latest.images.length > 1 ? "flex gap-3 overflow-x-auto pb-2" : ""}>
                {latest.images.map((url, i) => (
                  <div
                    key={url}
                    className={`relative overflow-hidden rounded-[4px] bg-white ${
                      latest.images.length > 1 ? "aspect-square w-44 shrink-0" : "aspect-[4/5]"
                    }`}
                  >
                    <Image src={url} alt={`Result ${i + 1}`} fill className="object-cover" sizes="(max-width:480px) 90vw, 400px" />
                  </div>
                ))}
              </div>
              {/* Conversational edit */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  placeholder="Ask for a tweak, e.g. make my blazer black"
                  className="flex-1 rounded-[4px] border border-[#C5C6C8]/60 bg-white px-3 py-2.5 text-[14px] text-[#282728] outline-none focus:border-[#0D0E10]"
                />
                <button
                  type="button"
                  onClick={() => latest.images[0] && void runGenerate(latest.images[0])}
                  disabled={generating || editText.trim().length === 0}
                  className="rounded-[4px] border border-[#0D0E10] px-4 text-[11px] uppercase tracking-[0.16em] text-[#0D0E10] disabled:opacity-40"
                >
                  Tweak
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className="border-t border-[#C5C6C8]/40 px-6 py-4">
          <button type="button" onClick={close} className="text-[12px] uppercase tracking-[0.16em] text-[#4F5052] hover:text-[#0D0E10]">
            Back to looks
          </button>
        </footer>
      </aside>
    </div>
  )
}
