"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import { trackAnalyticsEvent } from "@/lib/analytics/client"
import { PublicFooter, PublicNav } from "@/components/sselfie/public-marketing"

const HERO_IMAGE = "/images/selfie-guide/window-lighting-setup.png"

const C = {
  ink: "var(--color-obsidian)",
  inkSoft: "var(--stone-dark)",
  cream: "var(--color-porcelain)",
  pearl: "var(--color-pearl)",
  whisper: "var(--color-whisper)",
  stone: "var(--stone)",
  onDark: "var(--color-porcelain)",
  onDarkSub: "var(--color-whisper)",
  onCream: "var(--color-obsidian)",
  onCreamSub: "var(--color-smoke)",
  divDark: "color-mix(in srgb, var(--color-whisper) 16%, transparent)",
  divCream: "color-mix(in srgb, var(--color-obsidian) 10%, transparent)",
}

const F = {
  serif: "'Cormorant Garamond', Georgia, serif",
  sans: "var(--font-inter, Inter, -apple-system, sans-serif)",
}

const LP_DARK =
  "0 2px 8px rgba(0,0,0,0.8), 0 -1px 0 rgba(255,255,255,0.06), 1px 1px 0 rgba(0,0,0,0.5)"
const LP_CREAM = "1px 2px 3px rgba(255,255,255,0.88), -1px -1px 2px rgba(10,10,10,0.08)"

const GUIDE_STEPS = [
  {
    step: "01",
    title: "Take the photo",
    body: "Use the phone settings, light, angle, and edit that make the first post feel easier.",
  },
  {
    step: "02",
    title: "Give it a job",
    body: "Decide if the post is for reach, trust, proof, buyer belief, or a simple invitation.",
  },
  {
    step: "03",
    title: "Write the caption",
    body: "Use the caption prompts to turn the photo into a story, lesson, or next step.",
  },
  {
    step: "04",
    title: "Turn it into a week",
    body: "Reuse one phone photo or clip as a Reel, Story sequence, carousel idea, and soft CTA.",
  },
]

const NEXT_STEPS = [
  {
    title: "Starter Kit",
    label: "$37",
    body: "Your first 7 days of phone-first content, with presets and a quick-start workflow.",
    href: "/starter-kit",
  },
  {
    title: "Visibility Suite",
    label: "Best next step",
    body: "What To Say, Show Up, Get Paid, and your Maya Visibility Plan in one guided path.",
    href: "/visibility-suite",
  },
  {
    title: "Studio",
    label: "Weekly execution",
    body: "Use Maya, visuals, planning, and captions when you want the system running with you.",
    href: "/join/studio",
  },
]

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
      properties: { source: "selfie_guide_free_landing" },
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
    <main style={{ minHeight: "100vh", background: C.ink, color: C.onDark, fontFamily: F.sans }}>
      <PublicNav loginHref="/auth/login" />

      <section className="relative grid min-h-screen overflow-hidden pt-[58px] lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.82fr)]">
        <div className="relative z-10 flex flex-col justify-center px-6 py-14 md:px-12 lg:px-20">
          <p className="text-[10px] uppercase tracking-[0.5em]" style={{ color: C.stone }}>
            Free Guide
          </p>
          <h1
            className="mt-6 max-w-[12ch] uppercase"
            style={{
              fontFamily: F.serif,
              fontSize: "clamp(44px, 7vw, 86px)",
              fontWeight: 300,
              lineHeight: 0.96,
              letterSpacing: "-0.02em",
              color: C.onDark,
              textShadow: LP_DARK,
            }}
          >
            Your first visible post.
          </h1>
          <p className="mt-6 max-w-xl text-[16px] leading-[1.75]" style={{ color: C.onDarkSub }}>
            Take one phone photo and turn it into a post that says something. Not just a better
            selfie. A first piece of content with a job.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-9 max-w-xl"
            style={{
              border: `1px solid ${C.divDark}`,
              background: "color-mix(in srgb, var(--stone-dark) 84%, transparent)",
              padding: "26px",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            <p
              className="text-[10px] uppercase tracking-[0.42em]"
              style={{ color: C.stone, fontWeight: 600 }}
            >
              Instant access
            </p>
            <h2
              className="mt-3 uppercase"
              style={{ fontFamily: F.serif, fontSize: 34, lineHeight: 1.02, fontWeight: 300 }}
            >
              Start with the guide.
            </h2>
            <p className="mt-3 text-sm leading-[1.7]" style={{ color: C.onDarkSub }}>
              You will get the guide, the 7-day practice plan, and the first caption prompt.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First name"
                required
                className="min-h-[50px] border px-4 text-sm outline-none"
                style={{
                  borderColor: C.divDark,
                  background: "rgba(240,237,232,0.04)",
                  color: C.onDark,
                }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="min-h-[50px] border px-4 text-sm outline-none"
                style={{
                  borderColor: C.divDark,
                  background: "rgba(240,237,232,0.04)",
                  color: C.onDark,
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-4 inline-flex min-h-[50px] w-full items-center justify-center px-6 text-[10px] font-semibold uppercase tracking-[0.24em] transition hover:opacity-90 disabled:opacity-60"
              style={{ background: C.cream, color: C.ink }}
            >
              {loading ? "Opening your guide..." : "Get the free guide"}
            </button>

            {error ? <p className="mt-3 text-sm text-red-200">{error}</p> : null}
            <p className="mt-4 text-[11px] leading-[1.6]" style={{ color: C.stone }}>
              No spam. Just the guide and the next useful step when you are ready.
            </p>
          </form>
        </div>

        <div className="relative min-h-[460px] border-t lg:min-h-full lg:border-l lg:border-t-0" style={{ borderColor: C.divDark }}>
          <img
            src={HERO_IMAGE}
            alt="Sandra taking a selfie with her phone"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: "50% 24%" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0c0b] via-transparent to-transparent lg:bg-gradient-to-l lg:from-transparent lg:to-[#0d0c0b]/30" />
          <div
            className="absolute bottom-6 left-6 right-6 max-w-md p-5 md:bottom-10 md:left-10"
            style={{
              border: `1px solid ${C.divDark}`,
              background: "rgba(13,12,11,0.68)",
              backdropFilter: "blur(18px)",
            }}
          >
            <p className="text-[10px] uppercase tracking-[0.36em]" style={{ color: C.stone }}>
              The shift
            </p>
            <p
              className="mt-3 text-[24px] leading-[1.18]"
              style={{ fontFamily: F.serif, fontWeight: 300, color: C.onDark }}
            >
              The photo is not the strategy. It is the first piece of the content system.
            </p>
          </div>
        </div>
      </section>

      <section style={{ background: C.pearl, color: C.onCream, padding: "72px 24px" }}>
        <div className="mx-auto max-w-6xl">
          <p className="text-[10px] uppercase tracking-[0.5em]" style={{ color: C.stone }}>
            Inside the guide
          </p>
          <h2
            className="mt-4 max-w-3xl uppercase"
            style={{
              fontFamily: F.serif,
              fontSize: "clamp(32px, 5vw, 58px)",
              fontWeight: 300,
              lineHeight: 1.02,
              textShadow: LP_CREAM,
            }}
          >
            One phone photo. Four simple jobs.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {GUIDE_STEPS.map((item) => (
              <article
                key={item.step}
                className="min-h-[210px] p-6"
                style={{
                  border: `1px solid ${C.divCream}`,
                  background: C.cream,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7), 0 2px 12px rgba(0,0,0,0.05)",
                }}
              >
                <span className="text-[10px] uppercase tracking-[0.4em]" style={{ color: C.stone }}>
                  {item.step}
                </span>
                <h3
                  className="mt-5"
                  style={{ fontFamily: F.serif, fontSize: 26, fontWeight: 300, lineHeight: 1.05 }}
                >
                  {item.title}
                </h3>
                <p className="mt-4 text-sm leading-[1.7]" style={{ color: C.onCreamSub }}>
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: C.ink, color: C.onDark, padding: "76px 24px" }}>
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.78fr_1fr] lg:items-center">
          <div>
            <p className="text-[10px] uppercase tracking-[0.5em]" style={{ color: C.stone }}>
              Why this exists
            </p>
            <h2
              className="mt-4 uppercase"
              style={{ fontFamily: F.serif, fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 300, lineHeight: 1.04 }}
            >
              Better selfies are useful. They are not the whole business.
            </h2>
          </div>
          <div className="space-y-4 text-[15px] leading-[1.78]" style={{ color: C.onDarkSub }}>
            <p>The photo helps people recognize you.</p>
            <p>The caption helps people understand you.</p>
            <p>The content rhythm helps people trust you.</p>
            <p>The offer gives them a next step.</p>
          </div>
        </div>
      </section>

      <section style={{ background: C.pearl, color: C.onCream, padding: "72px 24px" }}>
        <div className="mx-auto max-w-6xl">
          <p className="text-[10px] uppercase tracking-[0.5em]" style={{ color: C.stone }}>
            Where this leads
          </p>
          <h2
            className="mt-4 uppercase"
            style={{ fontFamily: F.serif, fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 300, lineHeight: 1.04 }}
          >
            Start free. Keep the path clear.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {NEXT_STEPS.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="block p-6 no-underline transition hover:opacity-80"
                style={{
                  minHeight: 210,
                  border: `1px solid ${C.divCream}`,
                  background: C.cream,
                  color: C.onCream,
                }}
              >
                <p className="text-[10px] uppercase tracking-[0.38em]" style={{ color: C.stone }}>
                  {item.label}
                </p>
                <h3 className="mt-5" style={{ fontFamily: F.serif, fontSize: 28, fontWeight: 300 }}>
                  {item.title}
                </h3>
                <p className="mt-4 text-sm leading-[1.7]" style={{ color: C.onCreamSub }}>
                  {item.body}
                </p>
                <p className="mt-6 text-[10px] uppercase tracking-[0.28em]" style={{ color: C.onCream }}>
                  See next step
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  )
}
