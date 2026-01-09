"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import { trackEmailSignup } from "@/lib/analytics"

interface BlueprintEmailCaptureProps {
  onSuccess: (email: string, name: string, accessToken: string) => void
  formData?: any
  currentStep?: number
}

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Friendly error message mapping
const getErrorMessage = (error: string): string => {
  const errorLower = error.toLowerCase()
  
  if (errorLower.includes("already exists") || errorLower.includes("duplicate")) {
    return "This email is already registered. Try logging in or use a different email."
  }
  
  if (errorLower.includes("network") || errorLower.includes("fetch") || errorLower.includes("failed to fetch")) {
    return "Connection error. Please check your internet connection and try again."
  }
  
  if (errorLower.includes("invalid email") || errorLower.includes("email format")) {
    return "Please enter a valid email address."
  }
  
  if (errorLower.includes("required") || errorLower.includes("missing")) {
    return "Please fill in all required fields."
  }
  
  if (errorLower.includes("timeout") || errorLower.includes("timed out")) {
    return "Request timed out. Please try again."
  }
  
  // Default friendly message
  return "Something went wrong. Please try again or contact support if the problem persists."
}

export function BlueprintEmailCapture({ onSuccess, formData, currentStep }: BlueprintEmailCaptureProps) {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Client-side email validation
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.")
      return
    }

    // Name validation (at least 2 characters)
    if (name.trim().length < 2) {
      setError("Please enter your full name.")
      return
    }

    setIsSubmitting(true)

    // Track email signup
    trackEmailSignup("brand_blueprint", currentStep === 2 ? "blueprint_results" : "blueprint_progress")

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
        const errorMessage = data.error || "Something went wrong"
        throw new Error(errorMessage)
      }

      console.log("[v0] Successfully saved blueprint progress")
      onSuccess(email, name, data.accessToken)
    } catch (err) {
      console.error("[v0] Blueprint subscribe error:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to save. Please try again."
      setError(getErrorMessage(errorMessage))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-stone-950 flex items-end justify-center">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/images/380-iihccjipjsnt0xfvpt7urkd4bzhtyr.png"
          alt="SSELFIE Brand"
          fill
          className="object-cover"
          style={{ objectPosition: "50% 25%" }}
          priority
        />
      </div>
      {/* Dark Overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.4)",
        }}
      />
      {/* Gradient Overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.3) 100%)",
        }}
      />

      {/* Full-screen loading overlay */}
      {isSubmitting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center space-y-4">
            <div className="flex gap-2 justify-center">
              <div className="w-3 h-3 rounded-full bg-white animate-bounce"></div>
              <div
                className="w-3 h-3 rounded-full bg-white animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-3 h-3 rounded-full bg-white animate-bounce"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>
            <p className="text-sm font-light text-white">Saving your progress...</p>
          </div>
        </div>
      )}

      {/* Hero Content - positioned at bottom (matching Paid Blueprint) */}
      <div className="relative z-10 max-w-4xl mx-auto text-center px-4 sm:px-6 pb-8 sm:pb-20 pt-8 sm:pt-20">
        <span
          className="block mb-2 sm:mb-4 text-xs sm:text-base font-light tracking-[0.2em] uppercase text-white"
          style={{ textShadow: "0 2px 10px rgba(0,0,0,0.3)" }}
        >
          {currentStep === 2 ? "UNLOCK YOUR RESULTS" : "GET STARTED"}
        </span>

        <h1
          style={{
            fontFamily: "'Times New Roman', serif",
            fontStyle: "normal",
            fontWeight: 300,
            textShadow: "0 2px 20px rgba(0,0,0,0.3)",
          }}
          className="text-2xl sm:text-5xl md:text-6xl lg:text-7xl font-light mb-2 sm:mb-6 text-white leading-[1.1] tracking-tight"
        >
          {currentStep === 2 ? "See Your Personalized Feed Strategy" : "Get Your Brand Blueprint"}
        </h1>

        <p
          className="text-sm sm:text-lg md:text-xl leading-relaxed mb-4 sm:mb-8 max-w-xl mx-auto text-white"
          style={{ textShadow: "0 1px 5px rgba(0,0,0,0.3)" }}
        >
          {currentStep === 2
            ? "We'll send your personalized content plan straight to your inbox."
            : "Get your free 30-day content calendar, caption templates, brand strategy guide, and generate your free Instagram grid with your selfies."}
        </p>

        {/* Email Capture Form - matching Paid Blueprint style */}
        <form onSubmit={handleSubmit} className="max-w-md mx-auto mb-4 sm:mb-6 w-full">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isSubmitting}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/50 placeholder:text-xs sm:placeholder:text-sm text-xs sm:text-sm focus:outline-none focus:border-white/40 focus:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder:text-white/50 placeholder:text-xs sm:placeholder:text-sm text-xs sm:text-sm focus:outline-none focus:border-white/40 focus:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-white text-black px-4 sm:px-8 py-2.5 sm:py-3.5 rounded-lg text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px] sm:min-h-[44px] flex items-center justify-center whitespace-nowrap mt-2 sm:mt-3"
          >
            {isSubmitting ? "Loading..." : "SAVE & CONTINUE"}
          </button>
          {error && <p className="text-xs sm:text-sm text-red-400 mt-2 text-left">{error}</p>}
        </form>

        <p className="text-xs font-light text-white/60">
          Instant access • No spam • Unsubscribe anytime
        </p>
      </div>
    </div>
  )
}
