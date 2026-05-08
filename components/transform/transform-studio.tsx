"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { AlertCircle, ArrowRight, Check, Download, Loader2, RefreshCw, Upload } from "lucide-react"

type Phase = "idle" | "uploading" | "generating" | "polling" | "slow" | "done" | "error"

type EditFinish = {
  slug: string
  title: string
  subtext: string
  prompt: string
}

const PRESERVE_PREFIX =
  "Edit the uploaded photo only. Preserve the original person, face, identity, body shape, hairstyle, outfit, pose, background, objects, composition, camera angle, and environment. Do not generate a new scene. Do not replace the background. Do not alter facial features. Do not make the image look AI-generated. "

const EDIT_FINISHES: EditFinish[] = [
  {
    slug: "natural-clean",
    title: "Natural Clean Edit",
    subtext: "Bright, clean, realistic everyday polish.",
    prompt:
      PRESERVE_PREFIX +
      "Improve the photo with a natural clean professional edit. Slightly brighten the face, balance exposure, soften harsh shadows, improve skin tone naturally, add subtle sharpness, clean color balance, and make the photo look polished but realistic. Keep skin texture natural. The result should look like a professional Lightroom edit, not an AI transformation.",
  },
  {
    slug: "soft-glow",
    title: "Soft Glow Edit",
    subtext: "Smooth light, soft skin, fresh creator finish.",
    prompt:
      PRESERVE_PREFIX +
      "Apply a soft glow edit. Add a gentle diffused light quality to the photo. Smooth skin texture slightly while keeping it realistic. Brighten highlights softly. Reduce harsh shadows. Create a fresh, luminous, creator-ready finish. The result should look like a well-lit portrait, not an AI image.",
  },
  {
    slug: "lightroom-warm",
    title: "Lightroom Warm Edit",
    subtext: "Warm tones, balanced contrast, polished iPhone-photo look.",
    prompt:
      PRESERVE_PREFIX +
      "Apply a Lightroom-style warm edit. Add warmth to the color temperature, lift shadows slightly, reduce harsh highlights, add subtle golden tones to skin, balance contrast to make the photo look polished and professional. The result should look like a skilled Lightroom preset applied to a real iPhone photo.",
  },
  {
    slug: "crisp-editorial",
    title: "Crisp Editorial Edit",
    subtext: "Sharper detail, clean contrast, professional finish.",
    prompt:
      PRESERVE_PREFIX +
      "Apply a crisp editorial edit. Increase sharpness and clarity slightly. Add clean defined contrast. Reduce noise. Make colors slightly more vivid but realistic. Create a professional editorial-quality finish. The result should look like a retouched photo from a brand photoshoot, not an AI image.",
  },
  {
    slug: "luxury-soft-contrast",
    title: "Luxury Soft Contrast",
    subtext: "Neutral tones, soft shadows, expensive editorial feel.",
    prompt:
      PRESERVE_PREFIX +
      "Apply a luxury soft contrast edit. Desaturate slightly toward neutral muted tones. Add soft lifted shadows. Reduce highlights gently. Create an expensive editorial magazine feel while keeping skin tones natural and realistic. The result should look like a high-end editorial photo, not an AI transformation.",
  },
  {
    slug: "face-brighten",
    title: "Face Brighten Edit",
    subtext: "Brightens the face while keeping the photo natural.",
    prompt:
      PRESERVE_PREFIX +
      "Apply a targeted face brightening edit. Brighten the facial area naturally. Reduce under-eye darkness slightly. Balance the light on the face. Keep skin texture and pores realistic. The surrounding background and body should remain unchanged. The result should look like the face was professionally lit, not digitally altered.",
  },
  {
    slug: "skin-light-polish",
    title: "Skin + Light Polish",
    subtext: "Softens skin, improves light, keeps texture realistic.",
    prompt:
      PRESERVE_PREFIX +
      "Apply a skin and light polish edit. Smooth skin blemishes and minor imperfections naturally while keeping pores and texture visible. Improve the quality of light on the skin. Balance highlights and shadows on the face. The result should look like professional skin retouching done in Photoshop, not AI generation.",
  },
  {
    slug: "content-ready",
    title: "Content Ready Edit",
    subtext: "Balanced, clean, polished for Instagram and brand content.",
    prompt:
      PRESERVE_PREFIX +
      "Apply a content-ready edit optimised for Instagram and brand use. Balance exposure. Clean color grading. Slightly improve skin tone. Add subtle sharpness. Make the photo look polished, bright, and professional for social media posting. The result should look like a photo edited by a professional content creator, not an AI transformation.",
  },
]

const SLUG_TO_FINISH: Record<string, EditFinish> = Object.fromEntries(
  EDIT_FINISHES.map((f) => [f.slug, f]),
)

const TOPUP_THRESHOLD = 6
const POLL_INTERVAL = 3000
const MAX_POLLS = 30

type TransformStudioProps = {
  credits: number
  userId: string
  checkoutSuccess?: boolean
  initialStyleSlug?: string | null
}

export function TransformStudio({ credits: initialCredits, checkoutSuccess, initialStyleSlug }: TransformStudioProps) {
  const [credits, setCredits] = useState(initialCredits)
  const [selectedFinish, setSelectedFinish] = useState<EditFinish | null>(
    initialStyleSlug ? (SLUG_TO_FINISH[initialStyleSlug] ?? null) : null,
  )
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [outputUrl, setOutputUrl] = useState<string | null>(null)
  const [lastPredictionId, setLastPredictionId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollCount = useRef(0)

  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current) }, [])

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please upload a photo — JPG, PNG, or WEBP.")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("Photo must be under 10 MB.")
      return
    }
    setErrorMsg(null)
    setUploadedFile(file)
    setOutputUrl(null)
    setLastPredictionId(null)
    setPhase("idle")
    setUploadedPreview(URL.createObjectURL(file))
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect],
  )

  async function uploadPhoto(): Promise<string> {
    if (!uploadedFile) throw new Error("No file selected")
    const form = new FormData()
    form.append("file", uploadedFile)
    const res = await fetch("/api/upload", { method: "POST", body: form })
    if (!res.ok) throw new Error("Photo upload failed")
    const data = await res.json()
    return data.url
  }

  async function startGeneration() {
    if (!uploadedFile) { setErrorMsg("Upload a photo first."); return }
    if (!selectedFinish) { setErrorMsg("Choose an edit finish first."); return }
    if (credits < 3) { setErrorMsg("You need at least 3 credits. Top up below."); return }

    setPhase("uploading")
    setErrorMsg(null)
    setOutputUrl(null)
    setLastPredictionId(null)

    try {
      const imageUrl = await uploadPhoto()
      setPhase("generating")

      const res = await fetch("/api/transform/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl,
          promptText: selectedFinish.prompt,
          promptTitle: selectedFinish.title,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        if (res.status === 402) setCredits(data.creditsAvailable ?? 0)
        throw new Error(data.error ?? "The edit could not start.")
      }

      setCredits(data.creditsRemaining ?? credits - 3)
      setLastPredictionId(data.predictionId)
      pollCount.current = 0
      setPhase("polling")
      schedulePoll(data.predictionId)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.")
      setPhase("error")
    }
  }

  function schedulePoll(id: string) {
    if (pollRef.current) clearTimeout(pollRef.current)
    pollRef.current = setTimeout(() => poll(id), POLL_INTERVAL)
  }

  async function poll(id: string) {
    pollCount.current++
    if (pollCount.current > MAX_POLLS) {
      setErrorMsg("This edit is taking longer than usual. It may still finish.")
      setPhase("slow")
      return
    }
    try {
      const res = await fetch(`/api/transform/check?id=${encodeURIComponent(id)}`)
      const data = await res.json()
      if (data.creditsRemaining !== undefined) setCredits(data.creditsRemaining)
      if (data.status === "succeeded" && data.outputUrl) { setOutputUrl(data.outputUrl); setPhase("done"); return }
      if (data.status === "failed") { setErrorMsg(data.error ?? "The edit failed. Your credits were returned."); setPhase("error"); return }
      schedulePoll(id)
    } catch {
      schedulePoll(id)
    }
  }

  function checkAgain() {
    if (!lastPredictionId) return
    pollCount.current = 0
    setErrorMsg(null)
    setPhase("polling")
    void poll(lastPredictionId)
  }

  function resetEditor() {
    setOutputUrl(null)
    setPhase("idle")
    setUploadedFile(null)
    setUploadedPreview(null)
    setLastPredictionId(null)
    setErrorMsg(null)
  }

  const isRunning = phase === "uploading" || phase === "generating" || phase === "polling"
  const lowCredits = credits < TOPUP_THRESHOLD
  const canApply = Boolean(uploadedFile && selectedFinish && credits >= 3 && !isRunning)

  return (
    <main className="min-h-screen bg-white text-[#0a0a0a]" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <header className="border-b border-[#e5e5e5] bg-[#0a0a0a] px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/50">SSELFIE</p>
            <h1
              className="mt-0.5 text-2xl font-light text-white"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Edit Studio
            </h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Credits</p>
            <p className={`mt-0.5 text-xl font-light ${lowCredits ? "text-amber-400" : "text-white"}`}
               style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              {credits}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:py-12">

        {/* Checkout success banner */}
        {checkoutSuccess && (
          <div className="mb-8 flex items-center gap-3 border border-[#e5e5e5] bg-[#f5f5f5] px-5 py-4 text-sm text-[#0a0a0a]">
            <Check className="h-4 w-4 shrink-0 text-[#0a0a0a]" />
            <span>Credits added. Upload your first photo to get started.</span>
          </div>
        )}

        <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">

          {/* Left column — controls */}
          <div className="space-y-8">

            {/* Step 1 — Upload */}
            <div>
              <div className="mb-4 flex items-baseline gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8a8780]">01</span>
                <p className="text-sm font-medium text-[#0a0a0a]">Upload your photo</p>
              </div>
              <div
                className="relative flex min-h-[240px] cursor-pointer flex-col items-center justify-center border border-dashed border-[#d4d1cc] bg-[#f5f5f5] transition-colors hover:border-[#0a0a0a]"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                {uploadedPreview ? (
                  <div className="relative h-full min-h-[240px] w-full">
                    <Image src={uploadedPreview} alt="Your photo" fill className="object-contain" unoptimized />
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#0a0a0a] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-white">
                      Change photo
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 px-8 text-center">
                    <Upload className="h-7 w-7 text-[#8a8780]" />
                    <div>
                      <p className="text-sm font-medium text-[#0a0a0a]">Drop your photo here</p>
                      <p className="mt-1 text-xs leading-5 text-[#8a8780]">or click to browse · JPG, PNG, WEBP · max 10 MB</p>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
                />
              </div>
              <p className="mt-2 text-[11px] text-[#8a8780]">
                For best results, use a clear iPhone photo with natural light.
              </p>
            </div>

            {/* Step 2 — Choose edit finish */}
            <div>
              <div className="mb-4 flex items-baseline gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8a8780]">02</span>
                <p className="text-sm font-medium text-[#0a0a0a]">Choose your edit finish</p>
              </div>

              <div className="grid gap-2">
                {EDIT_FINISHES.map((finish) => {
                  const isSelected = selectedFinish?.slug === finish.slug
                  return (
                    <button
                      key={finish.slug}
                      type="button"
                      disabled={isRunning}
                      onClick={() => setSelectedFinish(isSelected ? null : finish)}
                      className={`w-full border px-4 py-3.5 text-left transition-colors disabled:opacity-50 ${
                        isSelected
                          ? "border-[#0a0a0a] bg-[#0a0a0a] text-white"
                          : "border-[#e5e5e5] bg-white hover:border-[#0a0a0a]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{finish.title}</p>
                        {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                      </div>
                      <p className={`mt-1 text-xs leading-5 ${isSelected ? "text-white/65" : "text-[#666666]"}`}>
                        {finish.subtext}
                      </p>
                    </button>
                  )
                })}
              </div>

              <p className="mt-4 text-[11px] leading-5 text-[#8a8780]">
                Your photo stays your photo. SSELFIE Edit Studio improves light, tone, skin, and polish
                without changing who you are.
              </p>
            </div>

            {/* Error */}
            {errorMsg && phase !== "slow" && (
              <div className="flex items-start gap-3 border border-[#e5e5e5] bg-[#f5f5f5] px-4 py-3 text-sm text-[#0a0a0a]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#666666]" />
                {errorMsg}
              </div>
            )}

            {/* Step 3 — Apply */}
            <div>
              <div className="mb-4 flex items-baseline gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8a8780]">03</span>
                <p className="text-sm font-medium text-[#0a0a0a]">Apply professional edit</p>
              </div>
              <button
                type="button"
                onClick={startGeneration}
                disabled={!canApply}
                className="flex min-h-13 w-full items-center justify-center gap-2 bg-[#0a0a0a] px-6 py-4 text-sm font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-35 disabled:cursor-not-allowed"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>
                      {phase === "uploading" && "Uploading photo..."}
                      {phase === "generating" && "Starting edit..."}
                      {phase === "polling" && "Applying your edit..."}
                    </span>
                  </>
                ) : (
                  <span>Apply edit · 3 credits</span>
                )}
              </button>
            </div>

            {/* Low credits */}
            {lowCredits && (
              <div className="border border-[#e5e5e5] bg-[#f5f5f5] p-5">
                <p className="text-sm font-semibold text-[#0a0a0a]">
                  {credits === 0 ? "No credits remaining" : `${credits} credits left`}
                </p>
                <p className="mt-1 text-xs text-[#666666]">Top up with 5 more edits for $9.</p>
                <a
                  href="/checkout/transform?plan=topup"
                  className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 bg-[#0a0a0a] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-85"
                >
                  Top up · $9
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            )}
          </div>

          {/* Right column — output */}
          <div className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8a8780]">04</span>
              <p className="text-sm font-medium text-[#0a0a0a]">Compare and download</p>
            </div>

            {phase === "idle" && !outputUrl && (
              <div className="flex min-h-[400px] flex-col items-center justify-center border border-dashed border-[#d4d1cc] bg-[#f5f5f5] px-6 text-center">
                <p className="text-sm font-medium text-[#0a0a0a]">Your edited photo appears here.</p>
                <p className="mt-2 text-xs leading-5 text-[#8a8780]">Most edits finish in 20–40 seconds.</p>
              </div>
            )}

            {isRunning && (
              <div className="flex min-h-[400px] flex-col items-center justify-center gap-5 border border-dashed border-[#d4d1cc] bg-[#f5f5f5] px-6 text-center">
                <Loader2 className="h-7 w-7 animate-spin text-[#0a0a0a]" />
                <div>
                  <p className="text-sm font-medium text-[#0a0a0a]">Applying your edit...</p>
                  <p className="mt-1.5 text-xs text-[#8a8780]">Keep this page open while the edit finishes.</p>
                </div>
              </div>
            )}

            {phase === "slow" && (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-5 border border-[#e5e5e5] bg-[#f5f5f5] px-6 text-center">
                <RefreshCw className="h-6 w-6 text-[#8a8780]" />
                <div>
                  <p className="text-sm font-medium text-[#0a0a0a]">Still processing.</p>
                  <p className="mt-1.5 text-xs leading-5 text-[#666666]">{errorMsg}</p>
                </div>
                <button
                  type="button"
                  onClick={checkAgain}
                  className="border border-[#0a0a0a] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a] hover:text-white"
                >
                  Check again
                </button>
              </div>
            )}

            {phase === "error" && (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 border border-[#e5e5e5] bg-[#f5f5f5] px-6 text-center">
                <AlertCircle className="h-5 w-5 text-[#666666]" />
                <p className="text-sm text-[#0a0a0a]">{errorMsg ?? "The edit failed. Please try again."}</p>
              </div>
            )}

            {phase === "done" && outputUrl && (
              <div className="space-y-5">
                {/* Before / After */}
                <div className="grid grid-cols-2 gap-3">
                  {uploadedPreview && (
                    <div>
                      <div className="relative aspect-[4/5] overflow-hidden bg-[#f5f5f5]">
                        <Image src={uploadedPreview} alt="Before" fill className="object-cover" unoptimized />
                      </div>
                      <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a8780]">Before</p>
                    </div>
                  )}
                  <div>
                    <div className="relative aspect-[4/5] overflow-hidden bg-[#f5f5f5]">
                      <Image src={outputUrl} alt="After" fill className="object-cover" unoptimized />
                    </div>
                    <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0a0a0a]">Edited</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#0a0a0a]">
                  <Check className="h-3.5 w-3.5 shrink-0" />
                  Edit complete. Download your photo below.
                </div>

                <a
                  href={outputUrl}
                  download="sselfie-edit.jpg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-12 w-full items-center justify-center gap-2 bg-[#0a0a0a] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-85"
                >
                  <Download className="h-4 w-4" />
                  Download photo
                </a>

                <button
                  type="button"
                  onClick={resetEditor}
                  className="flex min-h-12 w-full items-center justify-center border border-[#e5e5e5] px-4 text-sm font-medium text-[#666666] transition-colors hover:border-[#0a0a0a] hover:text-[#0a0a0a]"
                >
                  Edit another photo
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
