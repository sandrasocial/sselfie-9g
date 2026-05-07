"use client"

import { useState } from "react"
import { ArrowRight, Check } from "lucide-react"

const STYLE_PRESETS = [
  {
    label: "The Parisian Editorial",
    note: "Warm film-grain · soft afternoon light · editorial",
  },
  {
    label: "Studio Headshot",
    note: "Clean white background · sharp · professional",
  },
  {
    label: "Golden Hour Lifestyle",
    note: "Backlit · glowing skin · relaxed and real",
  },
  {
    label: "Dark Editorial",
    note: "Moody · high contrast · high-fashion",
  },
  {
    label: "Coffee Shop Story",
    note: "Bright · airy · candid lifestyle",
  },
  {
    label: "Scandinavian Minimalist",
    note: "White interior · natural light · quiet and considered",
  },
  {
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
            Professional photo editing.
            <br />
            <em>From one selfie.</em>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-[#C4B5A0]">
            Upload your photo. Choose an aesthetic. Get a polished, editorial-quality result
            you can use on your website, Instagram, or press kit — in under a minute.
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

      {/* How it works */}
      <section className="border-t border-[#EDE9E2]/10 bg-[#1E1A15] px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-[#C4B5A0]">
            How it works
          </p>
          <h2
            className="mt-4 text-center text-3xl font-light text-[#EDE9E2]"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Three steps to a finished photo
          </h2>

          <div className="mt-14 grid gap-px bg-[#EDE9E2]/10 md:grid-cols-3">
            {[
              {
                step: "01",
                label: "Upload your photo",
                body: "Any photo from your phone works. You don't need professional lighting or a camera.",
              },
              {
                step: "02",
                label: "Choose your aesthetic",
                body: "Pick from a library of curated editing styles — editorial, studio, lifestyle, and more.",
              },
              {
                step: "03",
                label: "Download your result",
                body: "Your edited photo is ready in under a minute. Save it and use it anywhere.",
              },
            ].map((item) => (
              <div key={item.step} className="bg-[#1E1A15] p-8">
                <p className="text-3xl font-light text-[#EDE9E2]/15" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                  {item.step}
                </p>
                <h3 className="mt-4 text-base font-semibold">{item.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#C4B5A0]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Style presets */}
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
            Each style is a specific editing direction — lighting, mood, colour grade, and composition.
            You paste the one you want and the tool applies it to your photo.
          </p>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {STYLE_PRESETS.map((preset) => (
              <div
                key={preset.label}
                className="border border-[#EDE9E2]/10 bg-[#1E1A15] px-5 py-4"
              >
                <p className="text-sm font-semibold">{preset.label}</p>
                <p className="mt-1 text-xs text-[#C4B5A0]">{preset.note}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <a
              href="/checkout/transform"
              className="inline-flex items-center gap-2 bg-[#EDE9E2] px-8 py-4 text-sm font-semibold text-[#0F0D0B] transition-colors hover:bg-[#EDE9E2]/90"
            >
              Start editing — $17
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Who it is for */}
      <section className="border-t border-[#EDE9E2]/10 bg-[#1E1A15] px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C4B5A0]">
            Who this is for
          </p>
          <h2
            className="mt-4 text-3xl font-light text-[#EDE9E2]"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            You want great photos.<br />You don't want to hire a photographer for every post.
          </h2>
          <p className="mt-5 text-sm leading-7 text-[#C4B5A0]">
            SSELFIE Transform is for founders, coaches, and creatives who need consistent,
            polished personal brand photos without a photoshoot budget or editing skills.
            You take the photo. The tool handles the edit.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              "Website about page and press photos",
              "Instagram content without a photographer",
              "LinkedIn and speaker headshots",
              "Brand founder portraits for pitches and media",
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
            Sandra adds new editing styles to the library as she creates content.
            Drop your email and we will let you know when new presets are available.
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

      {/* What is included */}
      <section className="border-t border-[#EDE9E2]/10 bg-[#1E1A15] px-6 py-16">
        <div className="mx-auto max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C4B5A0]">
            What $17 gets you
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "5 photo edits included (15 credits)",
              "Access to the full style preset library",
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
        <p className="mt-4 text-xs text-[#C4B5A0]">
          One-time purchase. No subscription required.
        </p>
      </section>
    </div>
  )
}
