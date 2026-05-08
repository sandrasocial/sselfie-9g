"use client"

import Image from "next/image"
import { useState } from "react"
import { ArrowRight, Check } from "lucide-react"

const EDIT_FINISHES = [
  { slug: "natural-clean", label: "Natural Clean Edit", note: "Bright, clean, realistic everyday polish." },
  { slug: "soft-glow", label: "Soft Glow Edit", note: "Smooth light, soft skin, fresh creator finish." },
  { slug: "lightroom-warm", label: "Lightroom Warm Edit", note: "Warm tones, balanced contrast, polished iPhone-photo look." },
  { slug: "crisp-editorial", label: "Crisp Editorial Edit", note: "Sharper detail, clean contrast, professional finish." },
  { slug: "luxury-soft-contrast", label: "Luxury Soft Contrast", note: "Neutral tones, soft shadows, expensive editorial feel." },
  { slug: "face-brighten", label: "Face Brighten Edit", note: "Brightens the face while keeping the photo natural." },
  { slug: "skin-light-polish", label: "Skin + Light Polish", note: "Softens skin, improves light, keeps texture realistic." },
  { slug: "content-ready", label: "Content Ready Edit", note: "Balanced, clean, polished for Instagram and brand content." },
]

const EDITING_STEPS = [
  "Upload your photo",
  "Choose your edit finish",
  "Apply professional edit",
  "Compare before and after",
  "Download your photo",
]

export function TransformLanding({
  checkoutError = false,
  checkoutErrorReason = null,
}: {
  checkoutError?: boolean
  checkoutErrorReason?: string | null
}) {
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
      // never block the page
    }
    setCaptured(true)
  }

  return (
    <main className="min-h-screen bg-white text-[#0a0a0a]" style={{ fontFamily: "'Inter', sans-serif" }}>

      {checkoutError && (
        <div className="bg-[#0a0a0a] px-5 py-3 text-center text-sm text-white/75">
          Something went wrong starting checkout.
          {checkoutErrorReason ? ` (${checkoutErrorReason})` : ""}
          {" "}Please try again or{" "}
          <a href="mailto:support@sselfie.ai" className="underline underline-offset-2">
            contact support
          </a>.
        </div>
      )}

      {/* Hero */}
      <section className="relative min-h-[90vh] overflow-hidden bg-[#0a0a0a] text-white">
        <Image
          src="/images/selfie-guide/parisian-cafe-tranquility.png"
          alt="SSELFIE Edit Studio"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/80" />
        <div className="relative z-10 flex min-h-[90vh] items-end px-5 pb-12 pt-24 sm:px-8 lg:px-12">
          <div className="mx-auto w-full max-w-6xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/60">SSELFIE Edit Studio</p>
            <h1
              className="mt-4 max-w-2xl text-5xl font-light leading-[1.0] text-white sm:text-6xl lg:text-7xl"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Your photo, professionally finished.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/75 sm:text-lg">
              Upload a real photo. Choose an edit finish. Get a polished, professional result that still looks like you.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="/checkout/transform"
                className="inline-flex min-h-12 items-center gap-2 bg-white px-7 py-3 text-sm font-semibold text-[#0a0a0a] transition-opacity hover:opacity-90"
              >
                Get 5 edits · $17
                <ArrowRight className="h-4 w-4" />
              </a>
              <p className="text-xs text-white/55">No subscription. No AI generation. Real photo editing.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust statement */}
      <section className="border-b border-[#e5e5e5] px-5 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <p
            className="max-w-2xl text-2xl font-light text-[#0a0a0a] sm:text-3xl"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Your photo stays your photo. SSELFIE Edit Studio improves light, tone, skin, and polish — without changing who you are.
          </p>
          <p className="mt-4 text-sm text-[#8a8780]">
            No background swaps. No face changes. No AI generation. Just professional editing applied to your real photo.
          </p>
        </div>
      </section>

      {/* Before / After placeholder */}
      <section className="px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8a8780]">Before · After</p>
              <h2
                className="mt-4 text-4xl font-light leading-tight text-[#0a0a0a] sm:text-5xl"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Same photo. Better light, tone, and finish.
              </h2>
              <p className="mt-4 text-sm leading-6 text-[#666666]">
                Real examples coming soon. The edit preserves every detail — face, pose, background — and improves only the light and finish.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <div className="flex aspect-[3/4] items-center justify-center border border-[#e5e5e5] bg-[#f5f5f5] px-5 text-center text-xs text-[#8a8780]">
                  Before
                </div>
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a8780]">Original</p>
              </div>
              <div>
                <div className="flex aspect-[3/4] items-center justify-center border border-[#0a0a0a] bg-[#0a0a0a] px-5 text-center text-xs text-white/60">
                  After
                </div>
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0a0a0a]">Professional edit</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-[#e5e5e5] bg-[#f5f5f5] px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8a8780]">How it works</p>
            <h2
              className="mt-4 text-4xl font-light leading-tight text-[#0a0a0a] sm:text-5xl"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Upload. Choose. Download.
            </h2>
          </div>
          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {EDITING_STEPS.map((step, i) => (
              <div key={step} className="border border-[#e5e5e5] bg-white p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8a8780]">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-4 text-sm font-medium text-[#0a0a0a]">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Edit finishes */}
      <section className="px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8a8780]">Edit finishes</p>
              <h2
                className="mt-4 text-4xl font-light leading-tight text-[#0a0a0a] sm:text-5xl"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                Choose your edit finish.
              </h2>
            </div>
            <a
              href="/checkout/transform"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0a0a0a]"
            >
              Get 5 edits · $17
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {EDIT_FINISHES.map((finish) => (
              <a
                key={finish.slug}
                href={`/transform/studio?style=${finish.slug}`}
                className="group border border-[#e5e5e5] bg-white p-5 transition-colors hover:border-[#0a0a0a]"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#0a0a0a]">{finish.label}</p>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#8a8780] transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="mt-2.5 text-xs leading-5 text-[#666666]">{finish.note}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="bg-[#0a0a0a] px-5 py-20 text-white sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/50">What you get</p>
            <h2
              className="mt-4 text-4xl font-light leading-tight sm:text-5xl"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Five professional edits for one good photo.
            </h2>
            <p className="mt-5 text-sm leading-7 text-white/65">
              Use it when your photo is almost there, but the light, tone, or finish needs professional polish.
            </p>
          </div>
          <ul className="space-y-4">
            {[
              "15 credits included — enough for 5 edits",
              "All 8 edit finishes included",
              "Your face, identity, and background preserved",
              "Download-ready result in 20–40 seconds",
              "Top up with 5 more edits for $9 anytime",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm leading-6 text-white/70">
                <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-white" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-20 text-center sm:px-8 lg:px-12">
        <div className="mx-auto max-w-xl">
          <h2
            className="text-4xl font-light leading-tight text-[#0a0a0a] sm:text-5xl"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Ready for your edit?
          </h2>
          <p className="mt-4 text-sm leading-6 text-[#666666]">
            Upload one photo. Choose a finish. Keep the result if it looks like you — just better.
          </p>
          <a
            href="/checkout/transform"
            className="mt-8 inline-flex min-h-12 items-center gap-2 bg-[#0a0a0a] px-7 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-85"
          >
            Get 5 edits · $17
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
                placeholder="Email for updates"
                className="min-h-12 flex-1 border border-[#d4d1cc] bg-white px-4 text-sm text-[#0a0a0a] placeholder:text-[#8a8780] focus:border-[#0a0a0a] focus:outline-none"
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
