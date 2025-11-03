"use client"

import type React from "react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import Image from "next/image"

export function FreebieGuideCapture() {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/freebie/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          source: "selfie-guide",
          utm_source: new URLSearchParams(window.location.search).get("utm_source"),
          utm_medium: new URLSearchParams(window.location.search).get("utm_medium"),
          utm_campaign: new URLSearchParams(window.location.search).get("utm_campaign"),
          referrer: document.referrer,
          user_agent: navigator.userAgent,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong")
      }

      window.location.href = `/freebie/selfie-guide/access/${data.accessToken}`
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to subscribe. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-stone-950">
      <div className="absolute inset-0">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/380-iihCcjIPJSnT0XFvpT7urKD4bZHtyR-Eq59f64ApxEsAZdyPsutbM1Z9WhTt3.png"
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

          <p className="text-xs font-light tracking-[0.3em] uppercase text-white/70 mb-4">FREE GUIDE</p>

          <h1
            className="mb-6 text-4xl sm:text-5xl md:text-6xl font-extralight leading-tight tracking-tight text-white"
            style={{ fontFamily: "'Times New Roman', serif" }}
          >
            Become a Selfie Queen
          </h1>

          <p className="mb-12 text-base sm:text-lg font-light leading-relaxed text-white/80 max-w-xl mx-auto px-4">
            Learn how to take selfies that make you feel amazing. Simple tips for lighting, angles, and camera tricks
            that actually work—no fancy equipment needed.
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
                  <span>LOADING...</span>
                </>
              ) : (
                "GET INSTANT ACCESS"
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
