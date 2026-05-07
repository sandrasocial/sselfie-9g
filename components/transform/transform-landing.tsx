"use client"

import Image from "next/image"
import { useState } from "react"
import { ArrowRight, Check } from "lucide-react"

const STYLE_PRESETS = [
  {
    slug: "parisian-editorial",
    label: "Parisian Editorial",
    note: "Warm light, soft grain, magazine polish.",
  },
  {
    slug: "studio-headshot",
    label: "Clean Studio",
    note: "Bright, sharp, simple portrait finish.",
  },
  {
    slug: "golden-hour",
    label: "Golden Hour",
    note: "Glowy skin, warm light, relaxed mood.",
  },
  {
    slug: "dark-editorial",
    label: "Dark Editorial",
    note: "Moody contrast with a high-fashion feel.",
  },
  {
    slug: "coffee-shop",
    label: "Coffee Shop",
    note: "Airy lifestyle edit with natural color.",
  },
  {
    slug: "scandinavian",
    label: "Scandinavian Light",
    note: "Clean whites, soft shadows, calm finish.",
  },
]

const EDITING_STEPS = ["Upload your photo", "Choose an aesthetic", "Apply the edit", "Download your result"]

export function TransformLanding({ checkoutError = false, checkoutErrorReason = null }: { checkoutError?: boolean; checkoutErrorReason?: string | null }) {
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
      // Email capture should never block the page.
    }
    setCaptured(true)
  }

  return (
    <main className="min-h-screen bg-white text-[#0a0a0a]">
      {checkoutError && (
        <div className="bg-[#0a0a0a] px-5 py-3 text-center text-sm text-white/80">
          Something went wrong starting checkout.{checkoutErrorReason ? ` (${checkoutErrorReason})` : ""} Please try again or{" "}
          <a href="mailto:support@sselfie.ai" className="underline">
            contact support
          </a>
          .
        </div>
      )}
      <section className="relative min-h-[92vh] overflow-hidden bg-[#0a0a0a] text-white">
        <Image
          src="/images/selfie-guide/parisian-cafe-tranquility.png"
          alt="Editorial portrait used as a temporary SSELFIE Transform hero placeholder"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/82" />
        <div className="relative z-10 flex min-h-[92vh] items-end px-5 pb-10 pt-24 sm:px-8 lg:px-12">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">SSELFIE Transform</p>
              <h1
                className="mt-5 max-w-2xl text-5xl font-light leading-[0.98] text-white sm:text-6xl lg:text-7xl"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Make your selfie look editorial.
              </h1>
              <p className="mt-6 max-w-lg text-base leading-7 text-white/82 sm:text-lg">
                Upload a photo. Choose an aesthetic. Get a polished edit you can post today.
              </p>
              <a
                href="/checkout/transform"
                className="mt-8 inline-flex min-h-12 items-center gap-2 bg-white px-7 py-3 text-sm font-semibold text-[#0a0a0a] transition-opacity hover:opacity-90"
              >
                Get 5 edits - $17
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
            <div className="max-w-xs border border-white/20 bg-black/30 p-4 text-sm leading-6 text-white/78 backdrop-blur-md">
              Temporary hero placeholder. Final before/after proof images will replace this in the last launch step.
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a8780]">Proof slot</p>
              <h2
                className="mt-4 text-4xl font-light leading-tight text-[#0a0a0a] sm:text-5xl"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Same photo. Better finish.
              </h2>
              <p className="mt-4 text-sm leading-6 text-[#666666]">
                This section is ready for Sandra's real examples. Until then, the page keeps the layout polished
                without pretending placeholder proof is final proof.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <div className="flex aspect-[3/4] items-center justify-center border border-[#e5e5e5] bg-[#f5f5f5] px-5 text-center text-sm text-[#8a8780]">
                  Before image placeholder
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#8a8780]">Original</p>
              </div>
              <div>
                <div className="flex aspect-[3/4] items-center justify-center border border-[#0a0a0a] bg-[#0a0a0a] px-5 text-center text-sm text-white/70">
                  After image placeholder
                </div>
                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#0a0a0a]">Editorial edit</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#e5e5e5] bg-[#f5f5f5] px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a8780]">How it works</p>
            <h2
              className="mt-4 text-4xl font-light leading-tight text-[#0a0a0a] sm:text-5xl"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              No prompts. No editing overwhelm.
            </h2>
          </div>
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {EDITING_STEPS.map((step, index) => (
              <div key={step} className="border border-[#e5e5e5] bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8a8780]">
                  Step {index + 1}
                </p>
                <p className="mt-4 text-lg font-medium text-[#0a0a0a]">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8a8780]">Editing styles</p>
              <h2
                className="mt-4 text-4xl font-light leading-tight text-[#0a0a0a] sm:text-5xl"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Choose your aesthetic.
              </h2>
            </div>
            <a href="/checkout/transform" className="inline-flex items-center gap-2 text-sm font-semibold text-[#0a0a0a]">
              Get 5 edits - $17
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {STYLE_PRESETS.map((preset) => (
              <a
                key={preset.slug}
                href={`/transform/studio?style=${preset.slug}`}
                className="group border border-[#e5e5e5] bg-white p-5 transition-colors hover:border-[#0a0a0a]"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-[#0a0a0a]">{preset.label}</p>
                  <ArrowRight className="h-4 w-4 shrink-0 text-[#8a8780] transition-transform group-hover:translate-x-1" />
                </div>
                <p className="mt-3 text-sm leading-6 text-[#666666]">{preset.note}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0a0a0a] px-5 py-20 text-white sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">What you get</p>
            <h2
              className="mt-4 text-4xl font-light leading-tight sm:text-5xl"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Five polished edits for one good selfie.
            </h2>
            <p className="mt-5 text-sm leading-7 text-white/70">
              Use it when your photo is almost there, but the light, color, or finish needs Sandra-level taste.
            </p>
          </div>
          <ul className="space-y-4">
            {[
              "15 credits included, enough for 5 edits",
              "All current aesthetic presets included",
              "Download-ready result after the edit finishes",
              "Top up with 5 more edits for $9 anytime",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm leading-6 text-white/76">
                <Check className="mt-1 h-4 w-4 shrink-0 text-white" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-5 py-20 text-center sm:px-8 lg:px-12">
        <div className="mx-auto max-w-xl">
          <h2
            className="text-4xl font-light leading-tight text-[#0a0a0a] sm:text-5xl"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Ready for the edit?
          </h2>
          <p className="mt-4 text-sm leading-6 text-[#666666]">
            Start with one photo. Choose the aesthetic. Keep the result if it feels like you.
          </p>
          <a
            href="/checkout/transform"
            className="mt-8 inline-flex min-h-12 items-center gap-2 bg-[#0a0a0a] px-7 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Get 5 edits - $17
            <ArrowRight className="h-4 w-4" />
          </a>

          {captured ? (
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-[#666666]">
              <Check className="h-4 w-4" />
              You are on the list.
            </div>
          ) : (
            <form onSubmit={captureEmail} className="mx-auto mt-10 flex max-w-md flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email for new styles"
                className="min-h-12 flex-1 border border-[#d4d4d4] bg-white px-4 text-sm text-[#0a0a0a] placeholder:text-[#8a8780] focus:border-[#0a0a0a] focus:outline-none"
              />
              <button
                type="submit"
                disabled={capturing}
                className="min-h-12 border border-[#0a0a0a] px-5 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a] hover:text-white"
              >
                Notify me
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}
