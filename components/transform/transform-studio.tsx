"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { AlertCircle, ArrowRight, Check, Download, Loader2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type Prompt = {
  id: number
  title: string
  prompt_text: string
  style_notes: string | null
}

type Phase = "idle" | "uploading" | "generating" | "polling" | "done" | "error"

type TransformStudioProps = {
  credits: number
  userId: string
  checkoutSuccess?: boolean
}

const TOPUP_THRESHOLD = 6
const POLL_INTERVAL = 3000
const MAX_POLLS = 30

export function TransformStudio({ credits: initialCredits, userId, checkoutSuccess }: TransformStudioProps) {
  const [credits, setCredits] = useState(initialCredits)
  const [todayPrompt, setTodayPrompt] = useState<Prompt | null>(null)

  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  const [promptText, setPromptText] = useState("")
  const [phase, setPhase] = useState<Phase>("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [outputUrl, setOutputUrl] = useState<string | null>(null)
  const [predictionId, setPredictionId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pollCount = useRef(0)
  const dragRef = useRef(false)

  useEffect(() => {
    fetch("/api/transform/today-prompt")
      .then((r) => r.json())
      .then((data: Prompt) => {
        if (data.title) setTodayPrompt(data)
      })
      .catch(() => null)
  }, [])

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please upload a photo (JPG, PNG, WEBP).")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg("Photo must be under 10 MB.")
      return
    }
    setErrorMsg(null)
    setUploadedFile(file)
    setOutputUrl(null)
    setPhase("idle")
    const url = URL.createObjectURL(file)
    setUploadedPreview(url)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      dragRef.current = false
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
    if (!promptText.trim()) {
      setErrorMsg("Add a prompt before generating.")
      return
    }
    if (credits < 3) {
      setErrorMsg("You need at least 3 credits. Top up below.")
      return
    }

    setPhase("uploading")
    setErrorMsg(null)
    setOutputUrl(null)

    try {
      const url = await uploadPhoto()
      setImageUrl(url)

      setPhase("generating")
      const res = await fetch("/api/transform/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: url,
          promptText: promptText.trim(),
          promptTitle: todayPrompt?.title ?? "",
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 402) {
          setCredits(data.creditsAvailable ?? 0)
        }
        throw new Error(data.error ?? "Generation failed")
      }

      setCredits(data.creditsRemaining ?? credits - 3)
      setPredictionId(data.predictionId)
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
      setErrorMsg("This is taking longer than expected. Please try again.")
      setPhase("error")
      return
    }

    try {
      const res = await fetch(`/api/transform/check?id=${encodeURIComponent(id)}`)
      const data = await res.json()

      if (data.status === "succeeded" && data.outputUrl) {
        setOutputUrl(data.outputUrl)
        setPhase("done")
        return
      }

      if (data.status === "failed") {
        setErrorMsg(data.error ?? "Generation failed. Please try again.")
        setPhase("error")
        return
      }

      schedulePoll(id)
    } catch {
      schedulePoll(id)
    }
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current)
    }
  }, [])

  const isRunning = phase === "uploading" || phase === "generating" || phase === "polling"
  const lowCredits = credits < TOPUP_THRESHOLD

  return (
    <div className="min-h-screen bg-[#0F0D0B] text-[#EDE9E2]">
      {/* Header */}
      <div className="border-b border-[#EDE9E2]/10 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#C4B5A0]">SSELFIE Transform</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">Photo Editing Studio</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-[#C4B5A0]">Credits remaining</p>
              <p className={`text-lg font-semibold ${lowCredits ? "text-amber-400" : "text-[#EDE9E2]"}`}>{credits}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        {/* Post-checkout success banner */}
        {checkoutSuccess && (
          <div className="flex items-center gap-3 border border-green-500/30 bg-green-500/10 px-5 py-4 text-sm text-green-400">
            <Check className="h-4 w-4 flex-shrink-0" />
            Credits added. You are ready to start editing.
          </div>
        )}


        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left — upload + prompt + generate */}
          <div className="space-y-6">
            {/* Upload zone */}
            <section>
              <p className="mb-3 text-sm font-medium">1. Upload your photo</p>
              <div
                className={`relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center border-2 border-dashed transition-colors ${
                  dragRef.current
                    ? "border-[#EDE9E2]/60 bg-[#EDE9E2]/5"
                    : "border-[#EDE9E2]/20 hover:border-[#EDE9E2]/40"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  dragRef.current = true
                }}
                onDragLeave={() => {
                  dragRef.current = false
                }}
                onDrop={handleDrop}
              >
                {uploadedPreview ? (
                  <div className="relative h-full w-full">
                    <Image
                      src={uploadedPreview}
                      alt="Your uploaded photo"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                    <div className="absolute inset-0 flex items-end justify-center pb-4">
                      <span className="bg-[#0F0D0B]/80 px-3 py-1 text-xs text-[#C4B5A0]">
                        Click to change photo
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <Upload className="h-8 w-8 text-[#C4B5A0]" />
                    <div>
                      <p className="text-sm font-medium">Drop your selfie here</p>
                      <p className="mt-1 text-xs text-[#C4B5A0]">or click to browse · JPG, PNG · max 10 MB</p>
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
            </section>

            {/* Prompt */}
            <section>
              <p className="mb-3 text-sm font-medium">2. Paste your style prompt</p>
              <Textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={6}
                placeholder="Paste or write your prompt here. Describe the style, lighting, mood, and setting you want."
                disabled={isRunning}
                className="resize-none bg-[#1E1A15] border-[#EDE9E2]/15 text-[#EDE9E2] placeholder:text-[#EDE9E2]/30 focus:border-[#EDE9E2]/40 focus:ring-0"
              />
              <p className="mt-2 text-xs text-[#C4B5A0]">
                {promptText.length}/1200 characters
              </p>

              {/* Featured preset suggestion */}
              {todayPrompt && (
                <div className="mt-4 border border-[#EDE9E2]/10 bg-[#1E1A15]">
                  <div className="flex items-start justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C4B5A0]">
                        Featured preset
                      </p>
                      <p className="mt-1 text-sm font-semibold truncate">{todayPrompt.title}</p>
                      {todayPrompt.style_notes && (
                        <p className="mt-0.5 text-xs text-[#EDE9E2]/40">{todayPrompt.style_notes}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={isRunning}
                      onClick={() => setPromptText(todayPrompt.prompt_text)}
                      className="flex-shrink-0 border border-[#EDE9E2]/15 px-3 py-1.5 text-xs font-medium text-[#EDE9E2] hover:bg-[#EDE9E2]/5 transition-colors disabled:opacity-40"
                    >
                      Use this
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Error */}
            {errorMsg && (
              <div className="flex items-start gap-3 border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                {errorMsg}
              </div>
            )}

            {/* Generate button */}
            <Button
              type="button"
              onClick={startGeneration}
              disabled={isRunning || !uploadedFile || !promptText.trim() || credits < 3}
              className="w-full bg-[#EDE9E2] text-[#0F0D0B] hover:bg-[#EDE9E2]/90 rounded-none font-semibold py-5"
              size="lg"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {phase === "uploading" && "Uploading photo…"}
                  {phase === "generating" && "Applying style…"}
                  {phase === "polling" && "Editing your photo… this takes 20-40 seconds"}
                </>
              ) : (
                <>Apply style · 3 credits</>
              )}
            </Button>

            {/* Low credits nudge */}
            {lowCredits && (
              <div className="border border-amber-500/30 bg-amber-500/10 px-5 py-4">
                <p className="text-sm font-medium text-amber-400">
                  {credits === 0 ? "No credits remaining" : `${credits} credits left — almost out`}
                </p>
                <p className="mt-1 text-xs text-[#C4B5A0]">
                  Get 15 more credits (5 transformations) for $9
                </p>
                <a
                  href="/checkout/transform?plan=topup"
                  className="mt-3 flex w-full items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-semibold text-[#0F0D0B] hover:bg-amber-400 transition-colors"
                >
                  Top up — $9
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </div>

          {/* Right — before/after result */}
          <div className="space-y-4">
            <p className="text-sm font-medium">3. Your result</p>

            {phase === "idle" && !outputUrl && (
              <div className="flex min-h-[400px] flex-col items-center justify-center border border-dashed border-[#EDE9E2]/15 text-center">
                <p className="text-sm text-[#C4B5A0]">Upload a photo and apply a style.</p>
                <p className="mt-1 text-xs text-[#EDE9E2]/30">Your edited photo appears here in 20-40 seconds.</p>
              </div>
            )}

            {(phase === "generating" || phase === "polling") && (
              <div className="flex min-h-[400px] flex-col items-center justify-center border border-dashed border-[#EDE9E2]/15 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-[#C4B5A0]" />
                <div className="text-center">
                  <p className="text-sm font-medium">Applying your style…</p>
                  <p className="mt-1 text-xs text-[#C4B5A0]">Usually 20-40 seconds</p>
                </div>
                {/* Animated progress dots */}
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-[#C4B5A0] animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {phase === "error" && (
              <div className="flex min-h-[200px] flex-col items-center justify-center border border-dashed border-red-500/20 text-center gap-3">
                <AlertCircle className="h-6 w-6 text-red-400" />
                <p className="text-sm text-red-400">{errorMsg ?? "Generation failed. Please try again."}</p>
              </div>
            )}

            {phase === "done" && outputUrl && (
              <div className="space-y-4">
                {/* Before/after */}
                <div className="grid grid-cols-2 gap-2">
                  {uploadedPreview && (
                    <div className="relative aspect-square overflow-hidden">
                      <Image
                        src={uploadedPreview}
                        alt="Before"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-[#0F0D0B]/70 py-1 text-center text-xs font-medium">
                        Before
                      </div>
                    </div>
                  )}
                  <div className="relative aspect-square overflow-hidden">
                    <Image
                      src={outputUrl}
                      alt="After"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-[#0F0D0B]/70 py-1 text-center text-xs font-medium">
                      After
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-green-400">
                  <Check className="h-4 w-4" />
                  Done. Download your photo below.
                </div>

                <a
                  href={outputUrl}
                  download="sselfie-transform.jpg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 border border-[#EDE9E2]/20 bg-[#1E1A15] px-4 py-3 text-sm font-medium hover:bg-[#EDE9E2]/5 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Download photo
                </a>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setOutputUrl(null)
                    setPhase("idle")
                    setUploadedFile(null)
                    setUploadedPreview(null)
                    setImageUrl(null)
                  }}
                  className="w-full text-[#C4B5A0] hover:text-[#EDE9E2] hover:bg-[#EDE9E2]/5 rounded-none"
                >
                  Edit another photo
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
