"use client"

import type React from "react"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { track } from "@/lib/analytics"

interface BlueprintEmailCaptureProps {
  onSuccess: (email: string, name: string, accessToken: string) => void
  formData?: any
  currentStep?: number
}

export function BlueprintEmailCapture({ onSuccess, formData, currentStep }: BlueprintEmailCaptureProps) {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    console.log("[v0] Starting blueprint subscribe request")

    try {
      const response = await fetch("/api/blueprint/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          formData,
          step: currentStep,
          source: "brand-blueprint",
          utm_source: new URLSearchParams(window.location.search).get("utm_source"),
          utm_medium: new URLSearchParams(window.location.search).get("utm_medium"),
          utm_campaign: new URLSearchParams(window.location.search).get("utm_campaign"),
          referrer: document.referrer,
          user_agent: navigator.userAgent,
        }),
      })

      console.log("[v0] Response status:", response.status)
      const data = await response.json()
      console.log("[v0] Response data:", data)

      if (!response.ok) {
        if (data.details) {
          throw new Error(`${data.error}: ${data.details}`)
        }
        throw new Error(data.error || "Something went wrong")
      }

      console.log("[v0] Successfully saved blueprint progress")
      track("blueprint_submitted", { email })
      onSuccess(email, name, data.accessToken)
    } catch (err) {
      console.error("[v0] Blueprint subscribe error:", err)
      setError(err instanceof Error ? err.message : "Failed to save. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-stone-950">
      <div className="absolute inset-0">
        <Image
          src="/images/380-iihccjipjsnt0xfvpt7urkd4bzhtyr.png"
          alt="SSELFIE Brand"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-2xl text-center">
          <div className="mb-8 sm:mb-12">
            <Image
              src="https://i.postimg.cc/65NtYqMK/Black-transperent-logo.png"
              alt="SSELFIE"
              width={140}
              height={46}
              className="mx-auto brightness-0 invert"
              priority
            />
          </div>

          <p className="text-xs font-light tracking-[0.3em] uppercase text-white/70 mb-4">
            {currentStep === 2 ? "UNLOCK YOUR RESULTS" : "SAVE YOUR PROGRESS"}
          </p>

          <h1
            className="mb-6 text-4xl sm:text-5xl md:text-6xl font-extralight leading-tight tracking-tight text-white"
            style={{ fontFamily: "'Times New Roman', serif" }}
          >
            {currentStep === 2 ? "See Your Personalized Feed Strategy" : "Get Your Brand Blueprint"}
          </h1>

          <p className="mb-12 text-base sm:text-lg font-light leading-relaxed text-white/80 max-w-xl mx-auto px-4">
            {currentStep === 2
              ? "Enter your email to unlock your personalized feed aesthetic, selfie score, 30-day content calendar, and caption templates."
              : "Save your progress and get your personalized 30-day content calendar, caption templates, and brand strategy guide sent to your email."}
          </p>

          <form onSubmit={handleSubmit} className="mx-auto max-w-md space-y-4 px-4">
            <Input
              type="text"
              placeholder="YOUR NAME"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isSubmitting}
              className="h-14 rounded-lg border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder:text-white/50 placeholder:text-xs placeholder:tracking-wider placeholder:uppercase focus:outline-none focus:border-white/40 focus:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <Input
              type="email"
              placeholder="YOUR EMAIL"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
              className="h-14 rounded-lg border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder:text-white/50 placeholder:text-xs placeholder:tracking-wider placeholder:uppercase focus:outline-none focus:border-white/40 focus:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-white text-stone-950 px-8 py-3.5 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin"></span>
                  <span>SAVING...</span>
                </>
              ) : (
                "SAVE & CONTINUE"
              )}
            </button>

            {error && <p className="text-sm font-light text-red-400 mt-2">{error}</p>}
          </form>

          <p className="mt-8 text-xs sm:text-sm font-light text-white/60">
            Instant access • No spam • Unsubscribe anytime
          </p>
        </div>
      </div>
    </div>
  )
}
