"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500"] })

const HERO_IMAGE = "/images/selfie-guide/window-editorial-portrait.jpg"

export default function SelfieGuideFree() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) {
      setError("Please enter your name and email.")
      return
    }
    setError(null)
    setLoading(true)
    trackAnalyticsEvent({
      event: "selfie_guide_opt_in_submit",
      properties: {
        source: "selfie_guide_free_landing",
      },
    })
    try {
      const res = await fetch("/api/freebie/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          source: "selfie-guide-free",
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Something went wrong. Please try again.")
      }
      trackAnalyticsEvent({
        event: "selfie_guide_opt_in_success",
        properties: {
          source: "selfie_guide_free_landing",
          access_token_created: Boolean(data.accessToken),
        },
      })
      router.push(`/selfie-guide/access/${data.accessToken}`)
    } catch (err: any) {
      trackAnalyticsEvent({
        event: "selfie_guide_opt_in_failed",
        properties: {
          source: "selfie_guide_free_landing",
          reason: err.message || "unknown_error",
        },
      })
      setError(err.message || "Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  return (
    <main className={`min-h-screen bg-[#0d0c0b] text-[#f0ede8] ${inter.className}`}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-5 sm:px-10 lg:px-14">
        <Link
          href="https://sselfie.ai"
          className={`${cormorant.className} text-[26px] font-light uppercase tracking-[0.28em] text-[#f0ede8]`}
        >
          SSELFIE
        </Link>
        <span className="text-[10px] uppercase tracking-[0.4em] text-[#8a8780]">Free Guide</span>
      </header>

      {/* Hero grid */}
      <section className="relative mx-auto grid max-w-[1600px] min-h-[calc(100svh-68px)] lg:grid-cols-[1fr_1fr]">

        {/* Left — copy + form */}
        <div className="flex flex-col justify-center px-6 py-14 sm:px-10 lg:px-14 lg:py-20">
          <p className="text-[11px] uppercase tracking-[0.42em] text-[#a8a49c]">
            Free · Selfie Guide · 2026 Edition
          </p>

          <h1
            className={`${cormorant.className} mt-5 max-w-[14ch] text-[clamp(44px,6vw,88px)] font-light uppercase leading-[0.92] tracking-[0.04em] text-[#f0ede8]`}
          >
            One guide.<br />Better selfies.
          </h1>

          <p className="mt-6 max-w-[34ch] text-[17px] font-light leading-8 text-[rgba(240,237,232,0.74)] sm:text-[19px]">
            Eight parts. Phone settings, light, angles, editing, confidence, content
            rhythm, and a 7-day challenge. Free. Instant access.
          </p>

          {/* What's inside */}
          <ul className="mt-10 grid gap-2 sm:grid-cols-2">
            {[
              "iPhone camera settings",
              "Light that works for free",
              "Angles & poses that feel natural",
              "5-step Lightroom edit",
              "Building presence on camera",
              "7-day selfie challenge",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm font-light text-[rgba(240,237,232,0.68)]">
                <span className="h-px w-4 flex-shrink-0 bg-[#c9a96e]" />
                {item}
              </li>
            ))}
          </ul>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="mt-10 w-full max-w-[440px] rounded-[24px] border border-[rgba(195,190,182,0.18)] bg-[rgba(175,170,162,0.07)] p-6 backdrop-blur-sm"
          >
            <p className={`${cormorant.className} text-2xl font-light uppercase tracking-[0.08em] text-[#f0ede8]`}>
              Get free access
            </p>
            <p className="mt-2 text-sm font-light text-[rgba(240,237,232,0.6)]">
              Enter your details and we&apos;ll send you the guide instantly.
            </p>

            <div className="mt-5 grid gap-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your first name"
                required
                className="min-h-[48px] rounded-full border border-[rgba(240,237,232,0.14)] bg-[rgba(240,237,232,0.04)] px-5 text-sm font-light text-[#f0ede8] outline-none transition placeholder:text-[#6b6860] focus:border-[rgba(240,237,232,0.32)]"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                required
                className="min-h-[48px] rounded-full border border-[rgba(240,237,232,0.14)] bg-[rgba(240,237,232,0.04)] px-5 text-sm font-light text-[#f0ede8] outline-none transition placeholder:text-[#6b6860] focus:border-[rgba(240,237,232,0.32)]"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-[50px] items-center justify-center rounded-full bg-[#f0ede8] px-6 text-[11px] font-medium uppercase tracking-[0.26em] text-[#0d0c0b] transition hover:bg-white disabled:opacity-60"
              >
                {loading ? "Opening your guide…" : "Get the free guide →"}
              </button>
            </div>

            {error && <p className="mt-3 text-sm text-[#fca5a5]">{error}</p>}

            <p className="mt-4 text-[11px] font-light text-[rgba(240,237,232,0.38)]">
              No spam. Unsubscribe any time.
            </p>
          </form>
        </div>

        {/* Right — portrait */}
        <div className="relative min-h-[460px] border-t border-[rgba(195,190,182,0.12)] lg:min-h-full lg:border-l lg:border-t-0">
          <Image
            src={HERO_IMAGE}
            alt="Sandra in window light"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0c0b] via-transparent to-transparent lg:bg-gradient-to-l lg:from-transparent lg:to-[#0d0c0b]/20" />

          {/* Pull quote */}
          <div className="absolute bottom-8 left-6 right-6 sm:bottom-10 sm:left-10">
            <blockquote className="max-w-[360px] rounded-[20px] border border-[rgba(240,237,232,0.14)] bg-[rgba(13,12,11,0.6)] p-5 backdrop-blur-xl">
              <p className={`${cormorant.className} text-[22px] font-light italic leading-[1.45] text-[#f0ede8]`}>
                &ldquo;Your phone is enough. Your face is enough. One good selfie can fuel weeks of content.&rdquo;
              </p>
              <footer className="mt-3 text-[10px] uppercase tracking-[0.32em] text-[#a8a49c]">
                Sandra — sandra.social
              </footer>
            </blockquote>
          </div>
        </div>
      </section>
    </main>
  )
}
