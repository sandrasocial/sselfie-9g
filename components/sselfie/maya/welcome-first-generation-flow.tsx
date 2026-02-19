"use client"

import { useMemo, useState } from "react"

import { trackAnalyticsEvent } from "@/lib/analytics/client"

type WelcomeFirstGenerationFlowProps = {
  onDone: () => void
  onGenerated?: () => void
}

type FlowStatus = "idle" | "uploading" | "generating" | "polling" | "done" | "error"

function buildPrompt(vibeWord: string): string {
  const vibe = vibeWord.trim() || "confident"
  return [
    `Create a premium personal brand portrait with a ${vibe} vibe.`,
    "The image should look Instagram-ready, clean, modern, and editorial.",
    "Keep it realistic, flattering, and aligned with a female entrepreneur brand.",
  ].join(" ")
}

export default function WelcomeFirstGenerationFlow({ onDone, onGenerated }: WelcomeFirstGenerationFlowProps) {
  const [vibeWord, setVibeWord] = useState("")
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [status, setStatus] = useState<FlowStatus>("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null)

  const canGenerate = useMemo(() => Boolean(selfieFile && vibeWord.trim().length > 0), [selfieFile, vibeWord])

  const uploadSelfie = async (): Promise<string> => {
    if (!selfieFile) throw new Error("Please upload one selfie first.")

    setStatus("uploading")
    const formData = new FormData()
    formData.append("file", selfieFile)

    const uploadResponse = await fetch("/api/upload-image", {
      method: "POST",
      body: formData,
    })

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload selfie. Please try again.")
    }

    const uploadData = await uploadResponse.json()
    if (!uploadData?.url) {
      throw new Error("Upload succeeded but no image URL was returned.")
    }

    await trackAnalyticsEvent({
      event: "activation_selfie_uploaded",
      properties: {
        source: "welcome_first_generation",
      },
    })

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
    if (!data?.predictionId) {
      throw new Error("Missing prediction ID.")
    }

    return data.predictionId as string
  }

  const pollStudioProPrediction = async (predictionId: string): Promise<string> => {
    setStatus("polling")
    const maxAttempts = 36

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const response = await fetch(`/api/maya/check-studio-pro?predictionId=${encodeURIComponent(predictionId)}`)
      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to check generation status.")
      }

      if (payload?.status === "succeeded" && payload?.output) {
        return payload.output as string
      }

      if (payload?.status === "failed" || payload?.status === "canceled") {
        throw new Error("Generation failed. Please try again.")
      }

      await new Promise((resolve) => setTimeout(resolve, 2500))
    }

    throw new Error("Generation is taking too long. Please try again.")
  }

  const handleGenerate = async () => {
    if (!canGenerate) return

    setErrorMessage(null)
    try {
      await trackAnalyticsEvent({
        event: "activation_continue_clicked",
        properties: { source: "welcome_first_generation" },
      })

      const uploadedUrl = await uploadSelfie()
      const predictionId = await generateFirstImage(uploadedUrl)
      const imageUrl = await pollStudioProPrediction(predictionId)

      setGeneratedImageUrl(imageUrl)
      setStatus("done")

      await trackAnalyticsEvent({
        event: "signup_to_first_gen",
        properties: {
          source: "welcome_first_generation",
          vibe_word: vibeWord.trim().toLowerCase(),
        },
      })

      if (onGenerated) onGenerated()
    } catch (error) {
      setStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Something went wrong.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-stone-950 text-stone-50">
      <div className="w-full max-w-xl border border-stone-800 bg-stone-900 rounded-2xl p-6 sm:p-8">
        {!generatedImageUrl ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl font-serif font-light tracking-[0.06em] uppercase">Maya</h1>
              <p className="text-sm sm:text-base leading-relaxed text-stone-200">
                Hey gorgeous 🤍 I&apos;m Maya — your personal AI brand director. Let&apos;s create something amazing right now.
                Upload one selfie and tell me one word that describes your brand vibe. That&apos;s all I need.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block text-xs uppercase tracking-[0.12em] text-stone-400">Upload one selfie</label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setSelfieFile(event.target.files?.[0] ?? null)}
                className="block w-full text-sm text-stone-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-stone-100 file:text-stone-900"
              />
            </div>

            <div className="space-y-3">
              <label className="block text-xs uppercase tracking-[0.12em] text-stone-400">Brand vibe (one word)</label>
              <input
                value={vibeWord}
                onChange={(event) => setVibeWord(event.target.value)}
                placeholder="bold, soft, luxury, playful, minimal"
                className="w-full rounded-lg bg-stone-800 border border-stone-700 px-4 py-3 text-sm text-stone-100 placeholder:text-stone-500"
              />
            </div>

            {status === "generating" || status === "polling" || status === "uploading" ? (
              <div className="rounded-lg border border-stone-700 bg-stone-800/70 px-4 py-3 text-sm text-stone-200">
                Creating your first brand photo... this is going to be good 🤍
              </div>
            ) : null}

            {errorMessage ? <p className="text-sm text-rose-300">{errorMessage}</p> : null}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate || status === "uploading" || status === "generating" || status === "polling"}
              className="w-full rounded-lg bg-white text-stone-900 py-3 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate my first brand photo
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <img src={generatedImageUrl} alt="Your first brand photo" className="w-full rounded-xl object-cover" />
            <p className="text-sm sm:text-base text-stone-100">
              This is what your brand can look like. Every week. On autopilot.
            </p>
            <a
              href="/checkout/membership"
              className="block w-full text-center rounded-lg bg-white text-stone-900 py-3 text-sm font-semibold"
            >
              Start your membership — unlock unlimited
            </a>
            <p className="text-center text-xs uppercase tracking-[0.12em] text-stone-400">1 credit used · 1 remaining</p>
            <button
              type="button"
              onClick={onDone}
              className="w-full rounded-lg border border-stone-700 py-3 text-sm text-stone-200"
            >
              Continue to app
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

