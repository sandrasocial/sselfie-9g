"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { AlertCircle, ArrowRight, Check, Download, Loader2, RefreshCw, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

type Preset = {
  id: number
  title: string
  prompt_text: string
  style_notes: string | null
}

type Phase = "idle" | "uploading" | "generating" | "polling" | "slow" | "done" | "error"

type TransformStudioProps = {
  credits: number
  userId: string
  checkoutSuccess?: boolean
  initialStyleSlug?: string | null
}

const TOPUP_THRESHOLD = 6
const POLL_INTERVAL = 3000
const MAX_POLLS = 30

const SLUG_TO_TITLE: Record<string, string> = {
  "parisian-editorial": "The Parisian Editorial",
  "studio-headshot": "Studio Headshot",
  "golden-hour": "Golden Hour Lifestyle",
  "dark-editorial": "Dark Editorial",
  "coffee-shop": "Coffee Shop Story",
  scandinavian: "Scandinavian Minimalist",
  "brand-founder": "Brand Founder Portrait",
}

export function TransformStudio({ credits: initialCredits, checkoutSuccess, initialStyleSlug }: TransformStudioProps) {
  const [credits, setCredits] = useState(initialCredits)
  const [presets, setPresets] = useState<Preset[]>([])
  const [selectedPreset, setSelectedPreset] = useState<Preset | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [outputUrl, setOutputUrl] = useState<string | null>(null)
  const [lastPredictionId, setLastPredictionId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollCount = useRef(0)

  useEffect(() => {
    fetch("/api/transform/presets")
      .then((r) => r.json())
      .then((data: Preset[]) => {
        if (!Array.isArray(data)) return
        setPresets(data)

        if (initialStyleSlug) {
          const targetTitle = SLUG_TO_TITLE[initialStyleSlug]
          const match = data.find((p) => p.title === targetTitle)
          if (match) setSelectedPreset(match)
        }
      })
      .catch(() => null)
  }, [initialStyleSlug])

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please upload a photo: JPG, PNG, or WEBP.")
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
    if (!uploadedFile) {
      setErrorMsg("Upload a photo first.")
      return
    }
    if (!selectedPreset) {
      setErrorMsg("Choose an aesthetic first.")
      return
    }
    if (credits < 3) {
      setErrorMsg("You need at least 3 credits. Top up below.")
      return
    }

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
          promptText: selectedPreset.prompt_text,
          promptTitle: selectedPreset.title,
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

      if (data.status === "succeeded" && data.outputUrl) {
        setOutputUrl(data.outputUrl)
        setPhase("done")
        return
      }
      if (data.status === "failed") {
        setErrorMsg(data.error ?? "The edit failed. Your credits were returned if the model failed.")
        setPhase("error")
        return
      }
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

  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current) }, [])

  const isRunning = phase === "uploading" || phase === "generating" || phase === "polling"
  const lowCredits = credits < TOPUP_THRESHOLD
  const canApply = Boolean(uploadedFile && selectedPreset && credits >= 3 && !isRunning)

  return (
    <main className="min-h-screen bg-white text-[#0a0a0a]">
      <header className="border-b border-[#e5e5e5] bg-white px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a8780]">SSELFIE Transform</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">Aesthetic editor</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#8a8780]">Credits</p>
            <p className={`text-lg font-semibold ${lowCredits ? "text-amber-700" : "text-[#0a0a0a]"}`}>{credits}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-8 lg:py-10">
        {checkoutSuccess && (
          <div className="flex items-center gap-3 border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
            <Check className="h-4 w-4 shrink-0" />
            Credits added. Start with one photo.
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="space-y-6">
            <div>
              <p className="mb-3 text-sm font-semibold">1. Upload your photo</p>
              <div
                className="relative flex min-h-[260px] cursor-pointer flex-col items-center justify-center border border-dashed border-[#bdbdbd] bg-[#f5f5f5] transition-colors hover:border-[#0a0a0a]"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                {uploadedPreview ? (
                  <div className="relative h-full min-h-[260px] w-full">
                    <Image src={uploadedPreview} alt="Your uploaded photo" fill className="object-contain" unoptimized />
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white px-3 py-1 text-xs font-medium text-[#0a0a0a] shadow-sm">
                      Click to change photo
                    </div>
                  </div>
                ) : (
                  <div className="flex max-w-xs flex-col items-center gap-3 px-6 text-center">
                    <Upload className="h-8 w-8 text-[#8a8780]" />
                    <div>
                      <p className="text-sm font-semibold">Drop your photo here</p>
                      <p className="mt-1 text-xs leading-5 text-[#666666]">or click to browse. JPG, PNG, WEBP. Max 10 MB.</p>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                  }}
                />
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold">2. Choose your aesthetic</p>
              {presets.length === 0 ? (
                <div className="flex h-20 items-center justify-center border border-[#e5e5e5] text-xs text-[#8a8780]">
                  Loading styles...
                </div>
              ) : (
                <div className="grid gap-2">
                  {presets.map((preset) => {
                    const isSelected = selectedPreset?.id === preset.id
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        disabled={isRunning}
                        onClick={() => setSelectedPreset(isSelected ? null : preset)}
                        className={`w-full border px-4 py-3 text-left transition-colors disabled:opacity-50 ${
                          isSelected ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-[#e5e5e5] bg-white hover:border-[#0a0a0a]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold">{preset.title}</p>
                          {isSelected && <Check className="h-4 w-4 shrink-0" />}
                        </div>
                        {preset.style_notes && (
                          <p className={`mt-1 text-xs leading-5 ${isSelected ? "text-white/70" : "text-[#666666]"}`}>{preset.style_notes}</p>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {errorMsg && phase !== "slow" && (
              <div className="flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            <Button
              type="button"
              onClick={startGeneration}
              disabled={!canApply}
              className="min-h-12 w-full rounded-none bg-[#0a0a0a] font-semibold text-white hover:bg-[#2c2b29]"
              size="lg"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {phase === "uploading" && "Uploading photo..."}
                  {phase === "generating" && "Starting edit..."}
                  {phase === "polling" && "Applying aesthetic..."}
                </>
              ) : (
                "Apply style - 3 credits"
              )}
            </Button>

            {lowCredits && (
              <div className="border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-semibold text-amber-900">
                  {credits === 0 ? "No credits remaining" : `${credits} credits left`}
                </p>
                <p className="mt-1 text-xs text-amber-800">Get 5 more edits for $9.</p>
                <a
                  href="/checkout/transform?plan=topup"
                  className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 bg-[#0a0a0a] px-4 text-sm font-semibold text-white"
                >
                  Top up - $9
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <p className="text-sm font-semibold">3. Download your edit</p>

            {phase === "idle" && !outputUrl && (
              <div className="flex min-h-[440px] flex-col items-center justify-center border border-dashed border-[#d4d4d4] bg-[#f5f5f5] px-6 text-center">
                <p className="text-sm font-semibold text-[#0a0a0a]">Your edited photo appears here.</p>
                <p className="mt-1 text-xs leading-5 text-[#666666]">Most edits finish in 20-40 seconds.</p>
              </div>
            )}

            {isRunning && (
              <div className="flex min-h-[440px] flex-col items-center justify-center gap-4 border border-dashed border-[#d4d4d4] bg-[#f5f5f5] px-6 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#0a0a0a]" />
                <div>
                  <p className="text-sm font-semibold">Applying your aesthetic...</p>
                  <p className="mt-1 text-xs text-[#666666]">Keep this page open while the edit finishes.</p>
                </div>
              </div>
            )}

            {phase === "slow" && (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 border border-amber-200 bg-amber-50 px-6 text-center">
                <RefreshCw className="h-7 w-7 text-amber-800" />
                <div>
                  <p className="text-sm font-semibold text-amber-950">Still processing.</p>
                  <p className="mt-1 text-xs leading-5 text-amber-800">{errorMsg}</p>
                </div>
                <Button type="button" onClick={checkAgain} className="rounded-none bg-[#0a0a0a] text-white hover:bg-[#2c2b29]">
                  Check again
                </Button>
              </div>
            )}

            {phase === "error" && (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 border border-red-200 bg-red-50 px-6 text-center">
                <AlertCircle className="h-6 w-6 text-red-700" />
                <p className="text-sm text-red-800">{errorMsg ?? "The edit failed. Please try again."}</p>
              </div>
            )}

            {phase === "done" && outputUrl && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {uploadedPreview && (
                    <div className="relative aspect-square overflow-hidden bg-[#f5f5f5]">
                      <Image src={uploadedPreview} alt="Before" fill className="object-cover" unoptimized />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 py-1 text-center text-xs font-medium text-white">Before</div>
                    </div>
                  )}
                  <div className="relative aspect-square overflow-hidden bg-[#f5f5f5]">
                    <Image src={outputUrl} alt="After" fill className="object-cover" unoptimized />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 py-1 text-center text-xs font-medium text-white">After</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-emerald-800">
                  <Check className="h-4 w-4" />
                  Done. Download your photo below.
                </div>

                <a
                  href={outputUrl}
                  download="sselfie-edit.jpg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-12 w-full items-center justify-center gap-2 bg-[#0a0a0a] px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  <Download className="h-4 w-4" />
                  Download photo
                </a>

                <Button
                  type="button"
                  variant="outline"
                  onClick={resetEditor}
                  className="min-h-12 w-full rounded-none border-[#d4d4d4] text-[#0a0a0a] hover:bg-[#f5f5f5]"
                >
                  Edit another photo
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
