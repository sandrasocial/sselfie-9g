"use client"

import { useMemo, useState, useEffect } from "react"
import { X, Loader2 } from "lucide-react"
import { trackEvent } from "@/lib/analytics"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

const STYLE_OPTIONS = [
  { id: "casual", label: "CASUAL", vibe: "casual" },
  { id: "editorial", label: "EDITORIAL", vibe: "editorial" },
  { id: "luxury", label: "LUXURY", vibe: "luxury" },
  { id: "lifestyle", label: "LIFESTYLE", vibe: "lifestyle" },
] as const

type WelcomeFirstGenerationFlowProps = {
  onDone: () => void
  onGenerated?: () => void
  userHasTrainedModel?: boolean
}

type Step = 1 | 2 | 3
type FlowStatus = "idle" | "uploading" | "generating" | "polling" | "done" | "error"

function buildPrompt(vibeWord: string): string {
  const vibe = vibeWord.trim() || "confident"
  return [
    `Create a premium personal brand portrait with a ${vibe} vibe.`,
    "The image should look Instagram-ready, clean, modern, and editorial.",
    "Keep it realistic, flattering, and aligned with a female entrepreneur brand.",
  ].join(" ")
}

export default function WelcomeFirstGenerationFlow({
  onDone,
  onGenerated,
  userHasTrainedModel = false,
}: WelcomeFirstGenerationFlowProps) {
  const [step, setStep] = useState<Step>(1)
  const [selectedStyle, setSelectedStyle] = useState<string>(STYLE_OPTIONS[0].id)
  const [selectedMode, setSelectedMode] = useState<"classic" | "pro">("pro")
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [status, setStatus] = useState<FlowStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)
  const [topPrompts, setTopPrompts] = useState<Array<{ id: number; concept_title: string | null; prompt_text: string }>>([])
  const [hasTrackedStart, setHasTrackedStart] = useState(false)

  const styleLabel = useMemo(() => {
    if (selectedStyle.startsWith("prompt-")) {
      const id = Number(selectedStyle.replace("prompt-", ""))
      return topPrompts.find((p) => p.id === id)?.concept_title?.toString().toUpperCase().slice(0, 12) ?? "STYLE"
    }
    return STYLE_OPTIONS.find((s) => s.id === selectedStyle)?.label ?? "CASUAL"
  }, [selectedStyle, topPrompts])
  const vibeWord = STYLE_OPTIONS.find((s) => s.id === selectedStyle)?.vibe ?? "confident"
  const selectedPromptText = useMemo(() => {
    if (selectedStyle.startsWith("prompt-")) {
      const id = Number(selectedStyle.replace("prompt-", ""))
      return topPrompts.find((p) => p.id === id)?.prompt_text
    }
    return null
  }, [selectedStyle, topPrompts])

  useEffect(() => {
    if (!hasTrackedStart) {
      trackEvent("first_generation_guided_start", { source: "maya_welcome_flow" })
      trackAnalyticsEvent({ event: "first_generation_guided_start", properties: { source: "maya_welcome_flow" } })
      setHasTrackedStart(true)
    }
  }, [hasTrackedStart])

  useEffect(() => {
    fetch("/api/prompt-guides/items")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load top prompts")
        return res.json()
      })
      .then((data) => {
        const items = data?.items ?? []
        setTopPrompts(Array.isArray(items) ? items.slice(0, 4) : [])
      })
      .catch(() => setTopPrompts([]))
  }, [])

  const styleOptions = useMemo(() => {
    if (topPrompts.length >= 4) {
      return topPrompts.slice(0, 4).map((p: { id: number; concept_title: string | null }, i: number) => ({
        id: `prompt-${p.id}`,
        label: (p.concept_title || STYLE_OPTIONS[i]?.label || "STYLE").toString().toUpperCase().slice(0, 12),
        vibe: vibeWord,
      }))
    }
    return STYLE_OPTIONS
  }, [topPrompts, vibeWord])

  const canGenerateStep3 = selectedMode === "pro" ? Boolean(selfieFile) : true

  const uploadSelfie = async (): Promise<string> => {
    if (!selfieFile) throw new Error("Please upload one selfie first.")
    setStatus("uploading")
    const formData = new FormData()
    formData.append("file", selfieFile)
    const uploadResponse = await fetch("/api/upload-image", { method: "POST", body: formData })
    if (!uploadResponse.ok) throw new Error("Failed to upload selfie. Please try again.")
    const uploadData = await uploadResponse.json()
    if (!uploadData?.url) throw new Error("Upload succeeded but no image URL was returned.")
    return uploadData.url as string
  }

  const generateFirstImage = async (imageUrl: string): Promise<string> => {
    setStatus("generating")
    const response = await fetch("/api/maya/generate-studio-pro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "welcome-first-generation",
        userRequest: buildPrompt(vibeWord),
        resolution: "1K",
        aspectRatio: "1:1",
        inputImages: {
          baseImages: [{ url: imageUrl }],
          productImages: [],
          people: [],
          styleRefs: [],
        },
      }),
    })
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload?.error || "Failed to start image generation.")
    }
    const data = await response.json()
    if (!data?.predictionId) throw new Error("Missing prediction ID.")
    return data.predictionId as string
  }

  const pollStudioProPrediction = async (predictionId: string): Promise<string> => {
    setStatus("polling")
    const maxAttempts = 36
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const response = await fetch(`/api/maya/check-studio-pro?predictionId=${encodeURIComponent(predictionId)}`)
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.error || "Failed to check generation status.")
      if (payload?.status === "succeeded" && payload?.output) return payload.output as string
      if (payload?.status === "failed" || payload?.status === "canceled") throw new Error("Generation failed. Please try again.")
      await new Promise((r) => setTimeout(r, 2500))
    }
    throw new Error("Generation is taking too long. Please try again.")
  }

  const handleGenerate = async () => {
    if (selectedMode === "pro" && !selfieFile) return
    setErrorMessage(null)
    try {
      if (selectedMode === "pro") {
        const uploadedUrl = await uploadSelfie()
        const predictionId = await generateFirstImage(uploadedUrl)
        const imageUrl = await pollStudioProPrediction(predictionId)
        setGeneratedImageUrl(imageUrl)
      } else {
        setStatus("generating")
        const promptText = selectedPromptText || topPrompts[0]?.prompt_text || buildPrompt(vibeWord)
        const response = await fetch("/api/maya/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            conceptTitle: styleLabel,
            conceptDescription: "",
            conceptPrompt: promptText,
            category: "portrait",
            chatId: null,
            referenceImageUrl: null,
            enhancedAuthenticity: false,
          }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data?.error || data?.details || "Failed to generate image.")
        if (data?.predictionId) {
          const checkUrl = `/api/maya/check-generation?predictionId=${data.predictionId}&generationId=${data.generationId ?? ""}`
          for (let i = 0; i < 40; i++) {
            await new Promise((r) => setTimeout(r, 3000))
            const check = await fetch(checkUrl).then((r) => r.json())
            if (check?.status === "succeeded" || check?.success === true) {
              const url = check?.imageUrl ?? check?.output
              if (url) {
                setGeneratedImageUrl(Array.isArray(url) ? url[0] : url)
                break
              }
            }
          }
        }
      }
      setStatus("done")
      trackEvent("first_generation_guided_complete", { source: "maya_welcome_flow", mode: selectedMode })
      trackAnalyticsEvent({ event: "first_generation_guided_complete", properties: { source: "maya_welcome_flow", mode: selectedMode } })
      if (onGenerated) onGenerated()
    } catch (error) {
      setStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.")
    }
  }

  const handleSkip = () => {
    onDone()
  }

  if (generatedImageUrl) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0a]/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-white border border-[#e5e5e5] rounded-sm p-8 sm:p-12 shadow-xl">
          <h2 className="font-serif text-sm font-extralight tracking-[0.2em] uppercase text-[#666] mb-2" style={{ letterSpacing: "0.2em" }}>
            YOUR FIRST PHOTO
          </h2>
          <p className="font-serif text-xl sm:text-2xl font-light text-[#0a0a0a] mb-6">Perfect! Your first photo is ready.</p>
          <img src={generatedImageUrl} alt="Your first brand photo" className="w-full aspect-square object-cover rounded-sm mb-6 border border-[#e5e5e5]" />
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                onDone()
                if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("maya-first-gen-photoshoot", { detail: { imageUrl: generatedImageUrl } }))
              }}
              className="w-full py-4 bg-[#0a0a0a] text-white text-xs font-medium tracking-[0.12em] uppercase hover:bg-[#1a1a1a] transition-colors rounded-sm"
            >
              Photoshoot — Create 6–9 photos in this style
            </button>
            <button
              type="button"
              onClick={onDone}
              className="w-full py-3 border border-[#e5e5e5] text-[#0a0a0a] text-xs font-light tracking-[0.1em] uppercase hover:bg-[#f5f5f5] transition-colors rounded-sm"
            >
              Go to chat
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0a]/80 backdrop-blur-sm p-4 min-h-screen">
      <div className="w-full max-w-md bg-white border border-[#e5e5e5] rounded-sm shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[#e5e5e5]">
          <h2 className="font-serif text-xs font-extralight tracking-[0.2em] uppercase text-[#666]" style={{ letterSpacing: "0.2em" }}>
            YOUR FIRST PHOTO IN 3 STEPS
          </h2>
          <button type="button" onClick={handleSkip} className="p-2 -m-2 text-[#666] hover:text-[#0a0a0a]" aria-label="Close">
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
        <div className="flex gap-1.5 justify-center py-4">
          {([1, 2, 3] as const).map((s) => (
            <div
              key={s}
              className={`h-1.5 w-8 rounded-full transition-colors ${step >= s ? "bg-[#0a0a0a]" : "bg-[#e5e5e5]"}`}
              aria-hidden
            />
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {step === 1 && (
            <>
              <p className="font-serif text-xs font-extralight tracking-[0.15em] uppercase text-[#666] mb-6" style={{ letterSpacing: "0.15em" }}>
                STEP 1: CHOOSE A STYLE
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {(styleOptions.length ? styleOptions : STYLE_OPTIONS).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedStyle(opt.id)}
                    className={`aspect-[3/4] rounded-sm border-2 p-3 flex flex-col items-center justify-end text-center transition-all ${
                      selectedStyle === opt.id ? "border-[#0a0a0a] bg-[#f5f5f5]" : "border-[#e5e5e5] bg-white hover:border-[#999]"
                    }`}
                  >
                    <span className="font-serif text-[10px] sm:text-xs font-extralight tracking-[0.2em] uppercase text-[#0a0a0a]">
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-3.5 bg-[#0a0a0a] text-white text-xs font-medium tracking-[0.1em] uppercase hover:bg-[#1a1a1a] transition-colors rounded-sm"
              >
                Next →
              </button>
              <button type="button" onClick={handleSkip} className="w-full mt-3 text-xs font-light text-[#666] hover:text-[#0a0a0a]">
                Skip for now
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <p className="font-serif text-xs font-extralight tracking-[0.15em] uppercase text-[#666] mb-6" style={{ letterSpacing: "0.15em" }}>
                STEP 2: PICK YOUR MODE
              </p>
              <div className="space-y-3 mb-8">
                {userHasTrainedModel && (
                  <button
                    type="button"
                    onClick={() => setSelectedMode("classic")}
                    className={`w-full text-left p-4 rounded-sm border-2 transition-all ${selectedMode === "classic" ? "border-[#0a0a0a] bg-[#f5f5f5]" : "border-[#e5e5e5] bg-white hover:border-[#999]"}`}
                  >
                    <span className="font-serif text-xs font-extralight tracking-[0.15em] uppercase text-[#0a0a0a] block mb-1">
                      CLASSIC
                    </span>
                    <span className="text-sm font-light text-[#666] leading-relaxed">Your trained style (Fast, simple)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedMode("pro")}
                  className={`w-full text-left p-4 rounded-sm border-2 transition-all ${selectedMode === "pro" ? "border-[#0a0a0a] bg-[#f5f5f5]" : "border-[#e5e5e5] bg-white hover:border-[#999]"}`}
                >
                  <span className="font-serif text-xs font-extralight tracking-[0.15em] uppercase text-[#0a0a0a] block mb-1">
                    PRO
                  </span>
                  <span className="text-sm font-light text-[#666] leading-relaxed">With reference images (More control)</span>
                </button>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 border border-[#e5e5e5] text-[#0a0a0a] text-xs font-light uppercase rounded-sm hover:bg-[#f5f5f5]">
                  ← Back
                </button>
                <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 bg-[#0a0a0a] text-white text-xs font-medium uppercase rounded-sm hover:bg-[#1a1a1a]">
                  Next →
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="font-serif text-xs font-extralight tracking-[0.15em] uppercase text-[#666] mb-2" style={{ letterSpacing: "0.15em" }}>
                STEP 3: GENERATE
              </p>
              <p className="text-sm font-light text-[#666] leading-relaxed mb-6">Let&apos;s create your first photo in this style.</p>
              {selectedMode === "pro" && (
                <div className="mb-6">
                  <label className="block text-[10px] uppercase tracking-[0.12em] text-[#666] mb-2">Upload one selfie</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-[#666] file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border file:border-[#e5e5e5] file:bg-white file:text-[#0a0a0a]"
                  />
                </div>
              )}
              {(status === "uploading" || status === "generating" || status === "polling") && (
                <div className="rounded-sm border border-[#e5e5e5] bg-[#f5f5f5] px-4 py-3 text-sm text-[#666] mb-4 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  Creating your photo…
                </div>
              )}
              {errorMessage && <p className="text-sm text-red-600 mb-4">{errorMessage}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className="py-3 border border-[#e5e5e5] text-[#0a0a0a] text-xs font-light uppercase rounded-sm hover:bg-[#f5f5f5]">
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!canGenerateStep3 || status === "uploading" || status === "generating" || status === "polling"}
                  className="flex-1 py-3.5 bg-[#0a0a0a] text-white text-xs font-medium uppercase rounded-sm hover:bg-[#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate Now →
                </button>
              </div>
              <button type="button" onClick={handleSkip} className="w-full mt-3 text-xs font-light text-[#666] hover:text-[#0a0a0a]">
                Skip for now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
