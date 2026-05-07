"use client"

import { useState } from "react"
import { ArrowRight, Check } from "lucide-react"

const STYLE_PRESETS = [
  {
    slug: "parisian-editorial",
    label: "The Parisian Editorial",
    note: "Warm film-grain · soft afternoon light · editorial",
  },
  {
    slug: "studio-headshot",
    label: "Studio Headshot",
    note: "Clean white background · sharp · professional",
  },
  {
    slug: "golden-hour",
    label: "Golden Hour Lifestyle",
    note: "Backlit · glowing skin · relaxed and real",
  },
  {
    slug: "dark-editorial",
    label: "Dark Editorial",
    note: "Moody · high contrast · high-fashion",
  },
  {
    slug: "coffee-shop",
    label: "Coffee Shop Story",
    note: "Bright · airy · candid lifestyle",
  },
  {
    slug: "scandinavian",
    label: "Scandinavian Minimalist",
    note: "White interior · natural light · quiet and considered",
  },
  {
    slug: "brand-founder",
    label: "Brand Founder Portrait",
    note: "Confident · natural light · website or press-ready",
  },
]

export function TransformLanding() {
  const [email, setEmail] = useState("")
  const [captured, setCaptured] = useState(false)
  const [capturing, setCapturing] = useState(false)

  async function captureEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || capturing) return
    setCapturing(true)
    try {
      await fetch("/api/transform/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
    } catch {
      // silent
    }
    setCaptured(true)
  }

  return (
    <div className="min-h-screen bg-[#0F0D0B] text-[#EDE9E2]">

      {/* Hero */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C4B5A0]">
            SSELFIE Transform
          </p>
          <h1
            className="mt-5 text-5xl font-light leading-[1.1] tracking-tight text-[#EDE9E2] md:text-6xl"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            You take the photo.
            <br />
            <em>Transform makes it editorial.</em>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-[#C4B5A0]">
            Upload your selfie, choose an aesthetic, get a polished result you can post today.
            No editing skills. No photographer. No studio.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4">
            <a
              href="/checkout/transform"
              className="flex items-center gap-2 bg-[#EDE9E2] px-8 py-4 text-sm font-semibold text-[#0F0D0B] transition-colors hover:bg-[#EDE9E2]/90"
            >
              Get started — $17
              <ArrowRight className="h-4 w-4" />
            </a>
            <p className="text-xs text-[#C4B5A0]">
              5 edits included · $9 top-ups anytime · no subscription
            </p>
          </div>
        </div>
      </section>

      {/* Before / after — Sandra: replace the two src="" values below with your real images */}
      {/* To get these: run Transform on your own photo using each style, screenshot the before/after */}
      <section className="border-t border-[#EDE9E2]/10 bg-[#1E1A15] px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-[#C4B5A0]">
            See the difference
          </p>
          <h2
            className="mt-4 text-center text-3xl font-light text-[#EDE9E2]"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Same photo. Different aesthetic.
          </h2>

          {/* Main before/after — swap src with real image URLs once Sandra provides them */}
          <div className="mt-12 grid grid-cols-2 gap-2 sm:gap-4">
            <div className="relative">
              <div className="aspect-[3/4] w-full bg-[#0F0D0B] flex items-center justify-center border border-[#EDE9E2]/10">
                {/* Replace with: <Image src="/images/transform/before-parisian.jpg" alt="Before" fill className="object-cover" /> */}
                <p className="text-center text-xs text-[#EDE9E2]/20 px-6 leading-5">
                  Before photo coming soon.<br />Sandra is generating examples.
                </p>
              </div>
              <div className="mt-2 text-center text-xs font-medium text-[#C4B5A0] uppercase tracking-[0.16em]">
                Original
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[3/4] w-full bg-[#0F0D0B] flex items-center justify-center border border-[#EDE9E2]/10">
                {/* Replace with: <Image src="/images/transform/after-parisian.jpg" alt="After — The Parisian Editorial" fill className="object-cover" /> */}
                <p className="text-center text-xs text-[#EDE9E2]/20 px-6 leading-5">
                  After photo coming soon.<br />The Parisian Editorial style.
                </p>
              </div>
              <div className="mt-2 text-center text-xs font-medium text-[#EDE9E2] uppercase tracking-[0.16em]">
                The Parisian Editorial
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-[#C4B5A0]">
            Your photo. One click. Under a minute.
          </p>
        </div>
      </section>

      {/* Style presets — clickable, links to studio with preset pre-loaded */}
      <section className="border-t border-[#EDE9E2]/10 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-[#C4B5A0]">
            Editing styles
          </p>
          <h2
            className="mt-4 text-center text-3xl font-light text-[#EDE9E2]"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Choose your aesthetic
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-sm leading-6 text-[#C4B5A0]">
            Click any style below to open the editor with that look already loaded.
          </p>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {STYLE_PRESETS.map((preset) => (
              <a
                key={preset.slug}
                href={`/transform/studio?style=${preset.slug}`}
                className="group block border border-[#EDE9E2]/10 bg-[#1E1A15] px-5 py-4 transition-colors hover:border-[#EDE9E2]/30 hover:bg-[#EDE9E2]/5"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{preset.label}</p>
                  <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 text-[#C4B5A0] opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <p className="mt-1 text-xs text-[#C4B5A0]">{preset.note}</p>
              </a>
            ))}
          </div>

          <div className="mt-10 text-center">
            <a
              href="/checkout/transform"
              className="inline-flex items-center gap-2 bg-[#EDE9E2] px-8 py-4 text-sm font-semibold text-[#0F0D0B] transition-colors hover:bg-[#EDE9E2]/90"
            >
              Get 5 edits — $17
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Positioning — method + tool */}
      <section className="border-t border-[#EDE9E2]/10 bg-[#1E1A15] px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C4B5A0]">
            The full picture
          </p>
          <h2
            className="mt-4 text-3xl font-light text-[#EDE9E2]"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            The method teaches you to take it.
            <br />
            <em>Transform makes it editorial.</em>
          </h2>
          <p className="mt-5 text-sm leading-7 text-[#C4B5A0]">
            SSELFIE teaches you how to photograph yourself well — the light, the angle,
            the confidence. Transform takes that photo and applies a professional editing
            style to it. You still took it. You still know how. The tool just finishes the job.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              "Website about page and press photos",
              "Instagram content without booking a photographer",
              "LinkedIn and speaker headshots",
              "Brand founder portraits for pitches and media kits",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-[#C4B5A0]">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#EDE9E2]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Email capture */}
      <section className="border-t border-[#EDE9E2]/10 px-6 py-20">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C4B5A0]">
            Stay in the loop
          </p>
          <h2
            className="mt-4 text-3xl font-light text-[#EDE9E2]"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            New styles added regularly
          </h2>
          <p className="mt-4 text-sm leading-6 text-[#C4B5A0]">
            Drop your email and we will let you know when new editing presets are available.
          </p>

          {captured ? (
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-[#EDE9E2]/70">
              <Check className="h-4 w-4" />
              You are on the list.
            </div>
          ) : (
            <form onSubmit={captureEmail} className="mt-8 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="flex-1 border border-[#EDE9E2]/20 bg-[#1E1A15] px-4 py-3 text-sm text-[#EDE9E2] placeholder:text-[#EDE9E2]/30 focus:border-[#EDE9E2]/40 focus:outline-none"
              />
              <button
                type="submit"
                disabled={capturing}
                className="border border-[#EDE9E2]/20 px-6 py-3 text-sm font-medium text-[#EDE9E2] transition-colors hover:bg-[#EDE9E2]/5"
              >
                Notify me
              </button>
            </form>
          )}
        </div>
      </section>

      {/* What $17 includes */}
      <section className="border-t border-[#EDE9E2]/10 bg-[#1E1A15] px-6 py-16">
        <div className="mx-auto max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C4B5A0]">
            What $17 gets you
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "5 photo edits included (15 credits)",
              "Access to all editing style presets",
              "Download-ready results in under a minute",
              "Top up with 5 more edits for $9 anytime",
              "Upgrade to Studio ($97/mo) for unlimited",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-[#C4B5A0]">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#EDE9E2]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="border-t border-[#EDE9E2]/10 px-6 py-16 text-center">
        <a
          href="/checkout/transform"
          className="inline-flex items-center gap-2 bg-[#EDE9E2] px-10 py-4 text-sm font-semibold text-[#0F0D0B] transition-colors hover:bg-[#EDE9E2]/90"
        >
          Get started — $17
          <ArrowRight className="h-4 w-4" />
        </a>
        <p className="mt-4 text-xs text-[#C4B5A0]">One-time purchase. No subscription required.</p>
      </section>
    </div>
  )
}
