"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Check, Sparkles } from "lucide-react"

type Prompt = {
  id: number
  title: string
  prompt_text: string
  style_notes: string | null
}

const BEFORE_AFTER_EXAMPLES = [
  {
    label: "The Parisian Editorial",
    note: "Warm film-grain · editorial",
  },
  {
    label: "Studio Headshot",
    note: "Clean · professional · LinkedIn-ready",
  },
  {
    label: "Golden Hour Lifestyle",
    note: "Glowing · outdoor · authentic",
  },
]

export function TransformLanding() {
  const [todayPrompt, setTodayPrompt] = useState<Prompt | null>(null)
  const [email, setEmail] = useState("")
  const [captured, setCaptured] = useState(false)
  const [capturing, setCapturing] = useState(false)

  useEffect(() => {
    fetch("/api/transform/today-prompt")
      .then((r) => r.json())
      .then((data: Prompt) => {
        if (data.title) setTodayPrompt(data)
      })
      .catch(() => null)
  }, [])

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
            Your selfie.
            <br />
            <em>Any style. 30 seconds.</em>
          </h1>
          <p className="mt-6 text-base leading-7 text-[#C4B5A0] max-w-xl mx-auto">
            Upload one photo. Pick today's featured style. Watch yourself become a Parisian editorial,
            a studio headshot, or a golden-hour lifestyle shot — instantly.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4">
            <a
              href="/checkout/transform"
              className="flex items-center gap-2 bg-[#EDE9E2] px-8 py-4 text-sm font-semibold text-[#0F0D0B] hover:bg-[#EDE9E2]/90 transition-colors"
            >
              Get started — $17
              <ArrowRight className="h-4 w-4" />
            </a>
            <p className="text-xs text-[#C4B5A0]">
              15 credits included · 5 transformations · $9 top-ups anytime
            </p>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="border-t border-[#EDE9E2]/10 bg-[#1E1A15] px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-[#C4B5A0]">
            What you get
          </p>
          <h2
            className="mt-4 text-center text-3xl font-light text-[#EDE9E2]"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Professional photos from your phone
          </h2>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              {
                label: "Upload any selfie",
                body: "A photo from your phone is enough. No professional setup needed.",
              },
              {
                label: "One new style every day",
                body: "Sandra writes a fresh editorial prompt daily. Use it as is or make it yours.",
              },
              {
                label: "Download in 30 seconds",
                body: "AI transforms your photo and delivers a studio-quality result you can post today.",
              },
            ].map((item) => (
              <div key={item.label} className="border border-[#EDE9E2]/10 p-6">
                <div className="mb-3 flex h-8 w-8 items-center justify-center bg-[#EDE9E2]/8">
                  <Sparkles className="h-4 w-4 text-[#C4B5A0]" />
                </div>
                <h3 className="text-base font-semibold">{item.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#C4B5A0]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Today's featured prompt */}
      {todayPrompt && (
        <section className="border-t border-[#EDE9E2]/10 px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C4B5A0]">
              Today's featured style
            </p>
            <h2
              className="mt-4 text-3xl font-light text-[#EDE9E2]"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              {todayPrompt.title}
            </h2>
            {todayPrompt.style_notes && (
              <p className="mt-4 text-sm text-[#C4B5A0]">{todayPrompt.style_notes}</p>
            )}
            <p className="mt-6 mx-auto max-w-xl text-sm leading-7 text-[#EDE9E2]/60 italic">
              "{todayPrompt.prompt_text.slice(0, 200)}…"
            </p>
            <a
              href="/checkout/transform"
              className="mt-8 inline-flex items-center gap-2 bg-[#EDE9E2] px-6 py-3 text-sm font-semibold text-[#0F0D0B] hover:bg-[#EDE9E2]/90 transition-colors"
            >
              Try today's style — $17
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>
      )}

      {/* Example styles */}
      <section className="border-t border-[#EDE9E2]/10 bg-[#1E1A15] px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-[#C4B5A0]">
            Style examples
          </p>
          <h2
            className="mt-4 text-center text-3xl font-light text-[#EDE9E2]"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            A new look every day
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {BEFORE_AFTER_EXAMPLES.map((ex) => (
              <div key={ex.label} className="border border-[#EDE9E2]/10">
                <div className="flex aspect-square items-center justify-center bg-[#0F0D0B]">
                  <p className="text-center text-xs text-[#EDE9E2]/20 px-4">
                    Before/after example coming soon
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm font-semibold">{ex.label}</p>
                  <p className="mt-0.5 text-xs text-[#C4B5A0]">{ex.note}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-[#EDE9E2]/30">
            Sandra posts real results daily on her Instagram. Follow @sandra.social to see them.
          </p>
        </div>
      </section>

      {/* Email capture + CTA */}
      <section className="border-t border-[#EDE9E2]/10 px-6 py-20">
        <div className="mx-auto max-w-xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#C4B5A0]">
            Get tomorrow's prompt
          </p>
          <h2
            className="mt-4 text-3xl font-light text-[#EDE9E2]"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            New style delivered daily
          </h2>
          <p className="mt-4 text-sm leading-6 text-[#C4B5A0]">
            Sandra writes a new editorial prompt every day. Enter your email and get it straight to your inbox.
          </p>

          {captured ? (
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-green-400">
              <Check className="h-4 w-4" />
              You are on the list. Tomorrow's prompt lands in your inbox.
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
                className="flex items-center justify-center gap-2 border border-[#EDE9E2]/20 px-6 py-3 text-sm font-medium text-[#EDE9E2] hover:bg-[#EDE9E2]/5 transition-colors"
              >
                Send me tomorrow's style
              </button>
            </form>
          )}

          <div className="mt-12 border-t border-[#EDE9E2]/10 pt-12">
            <p className="text-sm font-medium">Ready to try it now?</p>
            <a
              href="/checkout/transform"
              className="mt-4 inline-flex items-center gap-2 bg-[#EDE9E2] px-8 py-4 text-sm font-semibold text-[#0F0D0B] hover:bg-[#EDE9E2]/90 transition-colors"
            >
              Get 15 credits — $17
              <ArrowRight className="h-4 w-4" />
            </a>
            <p className="mt-3 text-xs text-[#C4B5A0]">
              5 transformations · Top up anytime · No subscription
            </p>
          </div>
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
              "15 credits — enough for 5 photo transformations",
              "Access to every daily style prompt Sandra writes",
              "Downloadable results within 30 seconds",
              "Top up with 15 more credits for $9 anytime",
              "Upgrade to Studio ($97/mo) for unlimited generations",
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
          className="inline-flex items-center gap-2 bg-[#EDE9E2] px-10 py-4 text-sm font-semibold text-[#0F0D0B] hover:bg-[#EDE9E2]/90 transition-colors"
        >
          Start transforming — $17
          <ArrowRight className="h-4 w-4" />
        </a>
        <p className="mt-4 text-xs text-[#C4B5A0]">
          One-time purchase. No subscription required.
        </p>
      </section>
    </div>
  )
}
