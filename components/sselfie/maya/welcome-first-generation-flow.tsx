"use client"

import { useMemo, useState, useEffect } from "react"
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
  const shouldShowModeStep = userHasTrainedModel
  const totalSteps = shouldShowModeStep ? 3 : 2
  const visibleStep = shouldShowModeStep ? step : step === 3 ? 2 : 1

  useEffect(() => {
    if (!hasTrackedStart) {
      trackEvent("first_generation_guided_start", { source: "maya_welcome_flow" })
      trackAnalyticsEvent({ event: "first_generation_guided_start", properties: { source: "maya_welcome_flow" } })
      setHasTrackedStart(true)
    }
  }, [hasTrackedStart])

  useEffect(() => {
    trackAnalyticsEvent({
      event: "mode_selected",
      properties: {
        source: "maya_welcome_flow",
        mode: selectedMode,
      },
    }).catch(() => {})
  }, [selectedMode])

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

  const generateFirstImage = async (
    imageUrl: string,
  ): Promise<{ predictionId: string; creditsUsed: number }> => {
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
    return {
      predictionId: data.predictionId as string,
      creditsUsed: Number(data?.creditsDeducted ?? 0),
    }
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
      let creditsUsed = 0
      if (selectedMode === "pro") {
        const uploadedUrl = await uploadSelfie()
        const studioProGeneration = await generateFirstImage(uploadedUrl)
        creditsUsed = studioProGeneration.creditsUsed
        const imageUrl = await pollStudioProPrediction(studioProGeneration.predictionId)
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
        if (!response.ok) {
          if (response.status === 409 || data?.code === "training_required") {
            throw new Error(data?.message || "Train your custom model first, then try again.")
          }
          if (response.status === 402) {
            throw new Error(data?.message || "You need more credits to generate this image.")
          }
          throw new Error(data?.error || data?.details || "Failed to generate image.")
        }
        creditsUsed = Number(data?.creditsDeducted ?? 0)
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
      trackAnalyticsEvent({
        event: "first_image_generated",
        properties: {
          source: "maya_welcome_flow",
          mode: selectedMode,
          credits_used: creditsUsed,
        },
      })
      if (creditsUsed > 0) {
        trackAnalyticsEvent({
          event: "credits_used",
          properties: {
            source: "maya_welcome_flow",
            mode: selectedMode,
            amount: creditsUsed,
            action: "first_generation",
          },
        })
      }
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(10, 10, 10, 0.80)] backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-[color:var(--glass-bg)] backdrop-blur-[70px] border border-[color:var(--div-dark)] rounded-3xl p-8 sm:p-12">
          <p className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.5em] text-stone mb-2">
            MAYA
          </p>
          <p className="font-['Cormorant_Garamond'] font-light text-2xl sm:text-3xl text-brand-porcelain tracking-wide mb-3">Your first photo is ready.</p>
          <p className="text-sm text-stone leading-relaxed mb-6">
            Good. This is your quick win. Keep this chat open and let&apos;s build from here.
          </p>
          <img src={generatedImageUrl} alt="Your first brand photo" className="w-full aspect-square object-cover rounded-2xl mb-6 border border-[color:var(--div-dark)]" />
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => {
                onDone()
                if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("maya-first-gen-photoshoot", { detail: { imageUrl: generatedImageUrl } }))
              }}
              className="w-full inline-flex items-center justify-center bg-brand-whisper text-brand-obsidian font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-brand-porcelain transition-colors"
            >
              Make 6 more in this style
            </button>
            <button
              type="button"
              onClick={onDone}
              className="w-full py-3 text-stone hover:text-brand-porcelain text-xs font-medium tracking-[0.12em] uppercase transition-colors text-center"
            >
              Go to chat
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(10, 10, 10, 0.80)] backdrop-blur-sm p-4 min-h-screen">
      <div className="w-full max-w-md bg-[color:var(--glass-bg)] backdrop-blur-[70px] border border-[color:var(--div-dark)] rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[color:var(--div-dark)]">
          <p className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.5em] text-stone">
            MAYA
          </p>
          <button type="button" onClick={handleSkip} className="text-stone hover:text-brand-porcelain transition-colors" aria-label="Close">
            <span className="text-[11px] tracking-[0.12em] uppercase">Close</span>
          </button>
        </div>
        <div className="flex gap-1.5 justify-center py-4">
          {Array.from({ length: totalSteps }, (_, index) => index + 1).map((s) => (
            <div
              key={s}
              className={`h-1.5 w-8 rounded-full transition-colors ${visibleStep >= s ? "bg-brand-whisper" : "bg-[color:var(--glass-bg)]"}`}
              aria-hidden
            />
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {step === 1 && (
            <>
              <p className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.5em] text-stone mb-6">
                STEP 1: PICK THE VIBE
              </p>
              <p className="text-sm text-stone leading-relaxed mb-6">
                Start simple. Pick the direction that feels most like you.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {(styleOptions.length ? styleOptions : STYLE_OPTIONS).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedStyle(opt.id)}
                    className={`aspect-[3/4] rounded-2xl border-2 p-3 flex flex-col items-center justify-end text-center transition-all ${
                      selectedStyle === opt.id
                        ? "border-stone bg-[color:var(--glass-bg-mid)]"
                        : "border-[color:var(--div-dark)] bg-[color:var(--glass-bg)] hover:border-[color:var(--div-dark)]"
                    }`}
                  >
                    <span className="font-['Inter'] font-medium text-[10px] tracking-[0.3em] uppercase text-brand-porcelain">
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setStep(shouldShowModeStep ? 2 : 3)}
                className="w-full inline-flex items-center justify-center bg-brand-whisper text-brand-obsidian font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-brand-porcelain transition-colors"
              >
                This one
              </button>
              <button type="button" onClick={handleSkip} className="w-full mt-3 text-xs text-stone hover:text-brand-porcelain transition-colors text-center">
                Skip for now
              </button>
            </>
          )}

          {step === 2 && shouldShowModeStep && (
            <>
              <p className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.5em] text-stone mb-6">
                STEP 2: CHOOSE HOW YOU WANT TO CREATE
              </p>
              <div className="space-y-3 mb-8">
                {userHasTrainedModel && (
                  <button
                    type="button"
                    onClick={() => setSelectedMode("classic")}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedMode === "classic"
                        ? "border-stone bg-[color:var(--glass-bg-mid)]"
                        : "border-[color:var(--div-dark)] bg-[color:var(--glass-bg)] hover:border-[color:var(--div-dark)]"
                    }`}
                    >
                      <span className="font-['Inter'] font-medium text-[10px] tracking-[0.3em] uppercase text-brand-porcelain block mb-1">
                        MY MODEL
                      </span>
                    <span className="text-sm text-stone leading-relaxed">Fastest option. Maya uses the model that already knows your face.</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedMode("pro")}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    selectedMode === "pro"
                      ? "border-stone bg-[color:var(--glass-bg-mid)]"
                      : "border-[color:var(--div-dark)] bg-[color:var(--glass-bg)] hover:border-[color:var(--div-dark)]"
                  }`}
                >
                  <span className="font-['Inter'] font-medium text-[10px] tracking-[0.3em] uppercase text-brand-porcelain block mb-1">
                    SELFIE
                  </span>
                  <span className="text-sm text-stone leading-relaxed">Use one clear selfie. Maya will work from that and keep it simple.</span>
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-[color:var(--div-dark)] text-stone hover:text-brand-porcelain hover:border-[color:var(--div-dark)] text-xs uppercase tracking-[0.1em] rounded-full transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 py-3 bg-brand-whisper text-brand-obsidian text-xs font-medium uppercase tracking-[0.1em] rounded-full hover:bg-brand-porcelain transition-colors"
                >
                  Next
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.5em] text-stone mb-2">
                STEP 3: GENERATE
              </p>
              <p className="text-sm text-stone leading-relaxed mb-6">Let&apos;s make your first photo now. No stress. We just need one strong image.</p>
              {selectedMode === "pro" && (
                <div className="mb-6">
                  <label className="block font-['Inter'] font-medium text-[10px] uppercase tracking-[0.4em] text-stone mb-2">Upload one clear selfie</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelfieFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-stone file:mr-4 file:py-2 file:px-4 file:rounded-full file:border file:border-[color:var(--div-dark)] file:bg-[color:var(--glass-bg)] file:text-brand-porcelain file:text-xs"
                  />
                </div>
              )}
              {(status === "uploading" || status === "generating" || status === "polling") && (
                <div className="rounded-xl border border-[color:var(--div-dark)] bg-[color:var(--glass-bg)] px-4 py-3 text-sm text-stone mb-4 flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full border-2 border-[color:var(--div-dark)] border-t-brand-whisper animate-spin shrink-0" />
                  Maya is making your photo...
                </div>
              )}
              {errorMessage && <p className="text-sm text-red-300 mb-4">{errorMessage}</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(shouldShowModeStep ? 2 : 1)}
                  className="py-3 px-5 border border-[color:var(--div-dark)] text-stone hover:text-brand-porcelain hover:border-[color:var(--div-dark)] text-xs uppercase tracking-[0.1em] rounded-full transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!canGenerateStep3 || status === "uploading" || status === "generating" || status === "polling"}
                  className="flex-1 py-3 bg-brand-whisper text-brand-obsidian text-xs font-medium uppercase tracking-[0.1em] rounded-full hover:bg-brand-porcelain transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Make my photo
                </button>
              </div>
              <button type="button" onClick={handleSkip} className="w-full mt-3 text-xs text-stone hover:text-brand-porcelain transition-colors text-center">
                Skip for now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
