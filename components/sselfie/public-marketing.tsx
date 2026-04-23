"use client"

import { useEffect, useState, useTransition, type ReactNode } from "react"
import Link from "next/link"
import { appendReferralParam, buildReferralLoginHref } from "@/lib/referrals/routing"

// ─── Vercel Blob images ────────────────────────────────────────────────────────
const BLOB = "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com"
const IMG = {
  hero:        `${BLOB}/sandra-portrait-after.jpg`,
  before:      `${BLOB}/sandra-portrait-before.jpg`,
  after:       `${BLOB}/sandra-portrait-after.jpg`,
  founder:     `${BLOB}/maya-pro-generations/c8cjbbd6ehrmt0cvhqasfj7q30-CVfFXH8JOv3NtYQFMbPU0opeNPo6De.png`,
  feed:        `${BLOB}/maya-pro-generations/6sb8n7v1g9rmr0cvhyjr95kg5g-5IoNZKlXP8Umw6U040gkJeTer43jLY.png`,
  dark:        `${BLOB}/maya-generations/8227-Y8Hi0TmnDBrZmgOGBbRXt1jk4eigZR.png`,
  pricingBg:   `${BLOB}/maya-pro-generations/xjn21cxbtdrmt0cvdxpsx38cnw-Z4oXOAZDQKa9g4KGDjiEYtRGQl5moM.png`,
  whoItsFor:   `${BLOB}/tmpbmq4nfg7.png`,
  presetBeige: `${BLOB}/Beige%20Aesthetic.png`,
  presetLight: `${BLOB}/Light%20%26%20Minimalistic.png`,
  presetDark:  `${BLOB}/darkandmoody.png`,
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:               "#0d0c0b",
  bgAlt:            "#1c1b19",
  text:             "#f0ede8",
  textSub:          "#c8c4bb",
  textMuted:        "#a8a49c",
  textFaint:        "#8a8780",
  navBg:            "rgba(175,170,162,0.08)",
  navBorder:        "rgba(195,190,182,0.15)",
  cardBg:           "rgba(175,170,162,0.08)",
  cardBorder:       "rgba(195,190,182,0.2)",
  cardBorderStrong: "rgba(200,196,187,0.45)",
  divider:          "rgba(175,170,162,0.12)",
  glassBg:          "rgba(13,12,11,0.6)",
  glassBorder:      "rgba(195,190,182,0.25)",
  heroGrad:         "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.75) 100%)",
}

const F = {
  serif: "'Cormorant Garamond', Georgia, serif",
  sans:  "var(--font-inter, Inter, -apple-system, sans-serif)",
}

// ─── Typography helpers ───────────────────────────────────────────────────────
const t = {
  eyebrow: {
    fontFamily:    F.sans,
    fontSize:      "10px",
    letterSpacing: "0.5em",
    textTransform: "uppercase" as const,
    color:         C.textFaint,
    display:       "block",
  },
  h1: {
    fontFamily:    F.serif,
    fontWeight:    300,
    fontSize:      "clamp(34px, 7vw, 62px)",
    lineHeight:    1.06,
    letterSpacing: "-0.02em",
    color:         C.text,
    textShadow:    "0 2px 20px rgba(0,0,0,0.5)",
  },
  h2: {
    fontFamily:    F.serif,
    fontWeight:    300,
    fontSize:      "clamp(26px, 4.5vw, 42px)",
    lineHeight:    1.1,
    letterSpacing: "-0.01em",
    color:         C.text,
  },
  h3: {
    fontFamily:    F.serif,
    fontWeight:    300,
    fontSize:      "clamp(20px, 3vw, 28px)",
    lineHeight:    1.15,
    color:         C.text,
  },
  body: {
    fontFamily: F.sans,
    fontSize:   "15px",
    lineHeight: 1.75,
    fontWeight: 300,
    color:      C.textMuted,
  },
}

// ─── Before / After drag slider ──────────────────────────────────────────────
function BeforeAfterSlider({ before, after, beforeLabel = "Before", afterLabel = "After" }: {
  before: string; after: string; beforeLabel?: string; afterLabel?: string
}) {
  const [pos, setPos] = useState(50)

  return (
    <div className="mf relative overflow-hidden select-none"
      style={{ aspectRatio: "3/4", borderRadius: "8px", cursor: "ew-resize", touchAction: "none" }}
    >
      {/* After (right side, full width beneath) */}
      <img src={after} alt={afterLabel} className="absolute inset-0 w-full h-full object-cover" draggable={false} />

      {/* Before (left side, clipped) */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <img src={before} alt={beforeLabel} className="absolute inset-0 h-full object-cover"
          style={{ width: `${10000 / pos}%`, maxWidth: "none" }} draggable={false} />
      </div>

      {/* Divider line + handle */}
      <div className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none"
        style={{ left: `${pos}%`, transform: "translateX(-50%)", zIndex: 10 }}
      >
        <div className="w-px h-full" style={{ background: "rgba(255,255,255,0.7)" }} />
        <div className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center"
          style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.95)", boxShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
        >
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
            <path d="M1 5h12M1 5L4 2M1 5l3 3M13 5l-3-3M13 5l-3 3" stroke="#0d0c0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Labels */}
      <span className="absolute top-4 left-4 pointer-events-none"
        style={{ ...t.eyebrow, color: "rgba(255,255,255,0.85)", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", padding: "4px 10px", borderRadius: "100px" }}
      >{beforeLabel}</span>
      <span className="absolute top-4 right-4 pointer-events-none"
        style={{ ...t.eyebrow, color: "rgba(255,255,255,0.85)", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", padding: "4px 10px", borderRadius: "100px" }}
      >{afterLabel}</span>

      {/* Invisible range input captures all drag/touch */}
      <input type="range" min={2} max={98} value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
        style={{ zIndex: 20 }}
      />
    </div>
  )
}

// ─── Card style ───────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background:     C.cardBg,
  border:         `1px solid ${C.cardBorder}`,
  backdropFilter: "blur(50px)",
  borderRadius:   "12px",
  padding:        "28px",
}

// ─── Pill badge ───────────────────────────────────────────────────────────────
function Pill({ children }: { children: ReactNode }) {
  return (
    <div
      className="inline-flex items-center gap-2 mb-5"
      style={{ background: C.glassBg, backdropFilter: "blur(20px)", border: `1px solid ${C.glassBorder}`, borderRadius: "100px", padding: "6px 16px" }}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: C.textSub }} />
      <span style={{ ...t.eyebrow, color: C.textSub }}>{children}</span>
    </div>
  )
}

// ─── Button ───────────────────────────────────────────────────────────────────
function Btn({ href, onClick, children, ghost = false, full = false, disabled = false }: {
  href?: string; onClick?: () => void; children: ReactNode; ghost?: boolean; full?: boolean; disabled?: boolean
}) {
  const base: React.CSSProperties = {
    display:         "inline-flex",
    alignItems:      "center",
    justifyContent:  "center",
    padding:         "14px 34px",
    minHeight:       "48px",
    background:      ghost ? "transparent" : C.textSub,
    color:           ghost ? C.textSub : C.bg,
    fontSize:        "11px",
    fontFamily:      F.sans,
    fontWeight:      600,
    letterSpacing:   "0.15em",
    textTransform:   "uppercase",
    textDecoration:  "none",
    borderRadius:    "100px",
    border:          `1px solid ${ghost ? C.cardBorder : C.textSub}`,
    cursor:          disabled ? "not-allowed" : "pointer",
    transition:      "all 0.25s ease",
    width:           full ? "100%" : "fit-content",
    opacity:         disabled ? 0.55 : 1,
    whiteSpace:      "nowrap",
  }
  const hover = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    if (disabled) return
    const el = e.currentTarget as HTMLElement
    el.style.background   = ghost ? C.cardBg : C.text
    el.style.borderColor  = ghost ? C.cardBorderStrong : C.text
    el.style.color        = ghost ? C.text : C.bg
  }
  const reset = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    const el = e.currentTarget as HTMLElement
    el.style.background   = ghost ? "transparent" : C.textSub
    el.style.borderColor  = ghost ? C.cardBorder : C.textSub
    el.style.color        = ghost ? C.textSub : C.bg
  }
  if (href) return <Link href={href} style={base} onMouseEnter={hover} onMouseLeave={reset}>{children}</Link>
  return <button onClick={onClick} style={base} onMouseEnter={hover} onMouseLeave={reset} disabled={disabled}>{children}</button>
}

// ─── Shell ────────────────────────────────────────────────────────────────────
export function PublicPageShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          const el = e.target as HTMLElement
          el.style.opacity   = "1"
          el.style.transform = "translateY(0)"
        }
      }),
      { threshold: 0.1 },
    )
    document.querySelectorAll(".mf").forEach((el) => {
      const h = el as HTMLElement
      h.style.opacity    = "0"
      h.style.transform  = "translateY(22px)"
      h.style.transition = "opacity 0.75s ease, transform 0.75s ease"
      io.observe(h)
    })
    return () => io.disconnect()
  }, [])

  return (
    <div style={{ minHeight: "100vh", background: C.bg, overflowX: "hidden", color: C.text, fontFamily: F.sans }}>
      {children}
    </div>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
export function PublicNav({ loginHref = "/login" }: { loginHref?: string }) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 md:px-8"
      style={{ height: "60px", background: C.navBg, backdropFilter: "blur(50px)", borderBottom: `1px solid ${C.navBorder}` }}
    >
      <Link href="/" style={{ fontFamily: F.serif, fontSize: "19px", color: C.text, letterSpacing: "0.3em", textTransform: "uppercase", fontWeight: 300, textDecoration: "none" }}>
        SSELFIE
      </Link>

      <nav className="hidden md:flex items-center gap-7">
        {[
          { href: "/starter-kit",  label: "Starter Kit" },
          { href: "/masterclass",  label: "Masterclass" },
          { href: "/join/studio",  label: "Studio" },
          { href: "/work-with-me", label: "Work With Me" },
        ].map((l) => (
          <Link key={l.href} href={l.href}
            style={{ ...t.eyebrow, textDecoration: "none", transition: "color 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = C.textSub }}
            onMouseLeave={(e) => { e.currentTarget.style.color = C.textFaint }}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        <Link href={loginHref}
          style={{ ...t.eyebrow, textDecoration: "none", transition: "color 0.2s" }}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.textSub }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.textFaint }}
        >
          Login
        </Link>
        <Btn href="/selfie-guide">Free guide</Btn>
      </div>
    </header>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
export function PublicFooter() {
  return (
    <footer style={{ background: C.bg, borderTop: `1px solid ${C.divider}`, padding: "56px 24px 40px" }}>
      <div className="max-w-5xl mx-auto flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <p style={{ fontFamily: F.serif, fontSize: "20px", color: C.text, letterSpacing: "0.3em", textTransform: "uppercase", fontWeight: 300 }}>
          SSELFIE
        </p>
        <div className="flex flex-wrap gap-5">
          {["/selfie-guide:Free Guide", "/starter-kit:Starter Kit", "/masterclass:Masterclass", "/join/studio:Studio", "/work-with-me:Work With Me"].map((s) => {
            const [href, label] = s.split(":")
            return (
              <Link key={href} href={href}
                style={{ ...t.eyebrow, textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = C.textSub }}
                onMouseLeave={(e) => { e.currentTarget.style.color = C.textFaint }}
              >
                {label}
              </Link>
            )
          })}
        </div>
      </div>
      <div className="max-w-5xl mx-auto mt-8 pt-5 flex gap-5" style={{ borderTop: `1px solid ${C.divider}` }}>
        <span style={{ ...t.eyebrow, color: C.textFaint }}>© 2026 SSELFIE Studio</span>
        {["/terms:Terms", "/privacy:Privacy"].map((s) => {
          const [href, label] = s.split(":")
          return <Link key={href} href={href} style={{ ...t.eyebrow, textDecoration: "none" }}>{label}</Link>
        })}
      </div>
    </footer>
  )
}

// ─── Hero (full viewport, image bg) ──────────────────────────────────────────
function Hero({
  eyebrow, title, body, primary, secondary, imageSrc,
}: {
  eyebrow:   string
  title:     ReactNode
  body:      ReactNode
  primary:   { href: string; label: string }
  secondary?: { href: string; label: string }
  imageSrc:  string
}) {
  return (
    <section className="relative" style={{ minHeight: "100dvh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <img src={imageSrc} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" style={{ objectPosition: "50% 25%" }} />
      <div className="absolute inset-0" style={{ background: C.heroGrad }} />
      <div className="relative z-10 flex flex-col items-center justify-end text-center flex-1"
        style={{ padding: "0 20px 64px", paddingTop: "80px" }}
      >
        <div className="max-w-2xl mx-auto w-full">
          <div className="mf"><Pill>{eyebrow}</Pill></div>
          <h1 className="mf mb-4" style={{ ...t.h1, transitionDelay: "0.05s" }}>{title}</h1>
          <div className="mf mb-8 mx-auto" style={{ ...t.body, color: C.textSub, maxWidth: "500px", transitionDelay: "0.1s" }}>{body}</div>
          <div className="mf flex flex-col sm:flex-row gap-3 items-center justify-center" style={{ transitionDelay: "0.15s" }}>
            <Btn href={primary.href}>{primary.label}</Btn>
            {secondary && <Btn href={secondary.href} ghost>{secondary.label}</Btn>}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Dark section ─────────────────────────────────────────────────────────────
function Section({
  eyebrow, title, children, alt = false, narrow = false,
}: {
  eyebrow?: string; title?: ReactNode; children: ReactNode; alt?: boolean; narrow?: boolean
}) {
  return (
    <section style={{ background: alt ? C.bgAlt : C.bg, padding: "80px 24px" }}>
      <div className={`mx-auto ${narrow ? "max-w-3xl" : "max-w-6xl"}`}>
        {eyebrow && <span className="mf block mb-3" style={t.eyebrow}>{eyebrow}</span>}
        {title   && <h2 className="mf mb-10" style={t.h2}>{title}</h2>}
        {children}
      </div>
    </section>
  )
}

// ─── Split section (text + image) ────────────────────────────────────────────
function Split({
  eyebrow, title, body, imgSrc, imgAlt = "", imgFirst = false, alt = false, cta,
}: {
  eyebrow?:  string; title?: ReactNode; body: ReactNode; imgSrc: string
  imgAlt?:   string; imgFirst?: boolean; alt?: boolean; cta?: ReactNode
}) {
  const img = (
    <div className="mf relative overflow-hidden" style={{ aspectRatio: "4/5", borderRadius: "4px" }}>
      <img src={imgSrc} alt={imgAlt} className="w-full h-full object-cover" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(13,12,11,0.04) 0%, rgba(13,12,11,0.28) 100%)" }} />
    </div>
  )
  const txt = (
    <div className="mf flex flex-col justify-center gap-4" style={{ transitionDelay: "0.05s" }}>
      {eyebrow && <span style={t.eyebrow}>{eyebrow}</span>}
      {title   && <h2 style={{ ...t.h2, marginBottom: "4px" }}>{title}</h2>}
      <div style={{ ...t.body, fontSize: "16px" }}>{body}</div>
      {cta && <div className="mt-2">{cta}</div>}
    </div>
  )
  return (
    <section style={{ background: alt ? C.bgAlt : C.bg, padding: "80px 24px" }}>
      <div className="max-w-6xl mx-auto grid gap-12 md:grid-cols-2 md:items-center">
        {imgFirst ? <>{img}{txt}</> : <>{txt}{img}</>}
      </div>
    </section>
  )
}

// ─── CTA close ────────────────────────────────────────────────────────────────
function CtaClose({ title, primary, secondary }: {
  title: ReactNode
  primary: { href: string; label: string }
  secondary?: { href: string; label: string }
}) {
  return (
    <section style={{ background: C.bg, padding: "96px 24px", borderTop: `1px solid ${C.divider}` }}>
      <div className="max-w-xl mx-auto text-center">
        <h2 className="mf" style={{ ...t.h2, marginBottom: "32px" }}>{title}</h2>
        <div className="mf flex flex-col sm:flex-row gap-3 items-center justify-center" style={{ transitionDelay: "0.05s" }}>
          <Btn href={primary.href}>{primary.label}</Btn>
          {secondary && <Btn href={secondary.href} ghost>{secondary.label}</Btn>}
        </div>
      </div>
    </section>
  )
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FCard({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  return (
    <article className="mf" style={card}>
      {eyebrow && <span style={{ ...t.eyebrow, marginBottom: "8px" }}>{eyebrow}</span>}
      <h3 style={{ ...t.h3, marginBottom: body ? "10px" : 0 }}>{title}</h3>
      {body && <p style={{ ...t.body, fontSize: "14px" }}>{body}</p>}
    </article>
  )
}

// ─── FAQ grid ─────────────────────────────────────────────────────────────────
function FaqGrid({ items }: { items: Array<{ question: string; answer: string }> }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((q) => (
        <article key={q.question} className="mf" style={card}>
          <h3 style={{ ...t.h3, fontSize: "clamp(17px,2.2vw,21px)", marginBottom: "10px" }}>{q.question}</h3>
          <p style={{ ...t.body, fontSize: "14px" }}>{q.answer}</p>
        </article>
      ))}
    </div>
  )
}

// ─── FAQ data ─────────────────────────────────────────────────────────────────
const FAQS = {
  starterKit: [
    { question: "Do I need Lightroom already?",        answer: "No. The masterclass walks you through downloading it and importing the presets step by step. Takes about five minutes." },
    { question: "Will this work on my iPhone?",        answer: "Yes. Every tutorial in the editing masterclass uses a phone. No camera, no desktop software." },
    { question: "What apps do I need?",                answer: "Lightroom Mobile, Hypic, and CapCut — all free. The masterclass shows you exactly how to use each one." },
    { question: "Is this just presets?",               answer: "No. The presets are included, but the main thing is the editing masterclass — six video walkthroughs showing you exactly how I edit." },
    { question: "What if I'm a complete beginner?",    answer: "Good. There's also a Canva crash course for beginners, a posing cheat sheet, and caption prompts. You don't need to know anything going in." },
  ],
  masterclass: [
    { question: "Do I need the Starter Kit first?",    answer: "No. The Starter Kit is about editing. The Masterclass is about building your brand and showing up. Different things." },
    { question: "Is this a photography course?",       answer: "No. There's one lesson on taking better selfies, but this is mostly about who you are online — your brand, your pillars, your content system." },
    { question: "How long does it take?",              answer: "Fourteen lessons. Most are under 10 minutes. You can go through it in a weekend or take one lesson a day — up to you." },
    { question: "How is this different from Studio?",  answer: "The Masterclass is the education — you do the work once and it's yours. Studio is the AI layer for when you want the tools to run it weekly." },
    { question: "What if I've never posted consistently?", answer: "That's exactly who this is for. The course is built around getting you from scattered to a system you can actually follow." },
  ],
  studio: [
    { question: "Who is Studio for?",                  answer: "For creators who already know the look they want and need speed, consistency, and memory inside the workflow." },
    { question: "What does Maya actually do?",         answer: "She generates brand photos, plans your feed, writes captions — and she remembers your style so you're not starting from zero every time." },
    { question: "Can I cancel?",                       answer: "Yes. Cancel any time from your account. No forms, no friction." },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGES
// ─────────────────────────────────────────────────────────────────────────────

export function HomePageContent({ referralCode }: { referralCode?: string | null } = {}) {
  const r      = (href: string) => appendReferralParam(href, referralCode)
  const login  = buildReferralLoginHref({ returnTo: "/studio", referralCode })

  return (
    <PublicPageShell>
      <PublicNav loginHref={login} />

      {/* HERO */}
      <Hero
        eyebrow="Selfie education by Sandra"
        title={<>Learn to take a selfie that actually looks like you.</>}
        body={<p>I've spent years figuring out the light, the angle, and the edit. The free guide is where I'd tell you to start.</p>}
        primary={{ href: r("/selfie-guide"),  label: "Get the free guide" }}
        secondary={{ href: r("/starter-kit"), label: "See the Starter Kit" }}
        imageSrc={IMG.hero}
      />

      {/* PROBLEM */}
      <Split
        eyebrow="Sound familiar?"
        title={<>I've deleted more photos than I've ever posted.</>}
        body={
          <div className="space-y-3">
            <p>Not because I looked bad. Because the light was wrong. The angle was off. The edit made me look like someone I don't recognise.</p>
            <p>That's not a confidence problem. It's a system problem.</p>
            <p>And it's fixable.</p>
          </div>
        }
        imgSrc={IMG.whoItsFor}
        alt
      />

      {/* BEFORE / AFTER — preset example */}
      <Section eyebrow="It works" title={<>Same photo. Two edits. Drag to compare.</>}>
        <div className="max-w-sm mx-auto">
          <BeforeAfterSlider before={IMG.before} after={IMG.after} beforeLabel="No edit" afterLabel="With preset" />
        </div>
      </Section>

      {/* PRESET STYLES */}
      <Section eyebrow="Starter Kit" title="Three styles. Sixteen presets." alt>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Beige & warm",      img: IMG.presetBeige, note: "Soft, golden, editorial" },
            { label: "Light & minimal",   img: IMG.presetLight, note: "Clean, airy, Scandinavian" },
            { label: "Dark & moody",      img: IMG.presetDark,  note: "Rich, dramatic, confident" },
          ].map((s) => (
            <div key={s.label} className="mf" style={{ ...card, padding: "16px" }}>
              <div className="relative overflow-hidden mb-3" style={{ aspectRatio: "1/1", borderRadius: "6px" }}>
                <img src={s.img} alt={s.label} className="w-full h-full object-cover" />
              </div>
              <p style={{ ...t.h3, fontSize: "16px", marginBottom: "4px" }}>{s.label}</p>
              <p style={{ ...t.body, fontSize: "13px" }}>{s.note}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 mf">
          <Btn href={r("/starter-kit")}>See the Starter Kit — $37</Btn>
        </div>
      </Section>

      {/* PRODUCT LADDER */}
      <Section eyebrow="How it works" title={<>Start small. Add layers when you're ready.</>}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            { title: "Free Guide",       price: "Free",         body: "Light, angles, and what to do first. Start here.", href: "/selfie-guide" },
            { title: "Starter Kit",      price: "$37",          body: "Sixteen presets and the guide. One time.", href: "/starter-kit" },
            { title: "Masterclass",      price: "$147",         body: "14 lessons on brand, content, and showing up consistently. The course that makes it click.", href: "/masterclass" },
            { title: "Studio",           price: "€97/mo",       body: "Maya, image generation, Feed Planner, and Academy.", href: "/join/studio" },
            { title: "1:1 with Sandra",  price: "From $2,000",  body: "Two or three people at a time. Direct eyes on your whole brand.", href: "/work-with-me" },
          ].map((p) => (
            <Link key={p.title} href={r(p.href)} className="mf block" style={{ ...card, minHeight: "200px", display: "flex", flexDirection: "column", justifyContent: "space-between", textDecoration: "none", transition: "border-color 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.cardBorderStrong }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.cardBorder }}
            >
              <div>
                <span style={{ ...t.eyebrow, marginBottom: "6px" }}>{p.price}</span>
                <h3 style={{ ...t.h3, fontSize: "clamp(17px,2vw,21px)", marginBottom: "8px" }}>{p.title}</h3>
                <p style={{ ...t.body, fontSize: "13px" }}>{p.body}</p>
              </div>
              <span style={{ ...t.eyebrow, marginTop: "16px" }}>See page →</span>
            </Link>
          ))}
        </div>
      </Section>

      {/* FOUNDER */}
      <Split
        eyebrow="From Sandra"
        title={<>I built this because I needed it myself.</>}
        body={
          <div className="space-y-3">
            <p>I was hiding behind my logo. Overthinking every photo. Posting less than I wanted to because nothing felt right.</p>
            <p>Once I figured out the system — light, angle, edit — posting became easy. Not perfect. Easy.</p>
            <p>That's what I'm teaching here.</p>
          </div>
        }
        imgSrc={IMG.founder}
        imgFirst
        alt
        cta={<Btn href={r("/selfie-guide")}>Start with the free guide</Btn>}
      />

      {/* FREE GUIDE CTA */}
      <CtaClose
        title={<>Your photos aren't the problem. Your system is.</>}
        primary={{ href: r("/selfie-guide"),  label: "Get the free guide" }}
        secondary={{ href: r("/starter-kit"), label: "See the Starter Kit" }}
      />

      <PublicFooter />
    </PublicPageShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function StarterKitPageContent() {
  return (
    <PublicPageShell>
      <PublicNav />

      <Hero
        eyebrow="Starter Kit — $37"
        title={<>The editing walkthrough. The presets. Everything.</>}
        body={<p>Six video tutorials showing exactly how I edit. My preset collection. The posing cheat sheet. Caption prompts. All in one kit, for $37.</p>}
        primary={{ href: "/checkout/starter-kit", label: "Get the Starter Kit — $37" }}
        secondary={{ href: "/selfie-guide",        label: "Start with the free guide" }}
        imageSrc={IMG.after}
      />

      {/* PROBLEM */}
      <Section eyebrow="The real issue" title="You know how to take a photo. You just don't know how to finish it." narrow alt>
        <div className="mf space-y-3" style={{ ...t.body, fontSize: "16px" }}>
          <p>The photo looks close. But something's off — the tone, the skin, the overall feel.</p>
          <p>That's an editing problem. Not a camera problem. Not a face problem.</p>
          <p>This kit fixes that. Step by step, on your phone, using apps that are free.</p>
        </div>
      </Section>

      {/* EDITING MASTERCLASS — HERO FEATURE */}
      <Section eyebrow="The main event" title="Six editing walkthroughs. My exact formulas.">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[
            { num: "01", title: "Lightroom with presets",    body: "How to import the preset collection, apply it, and adjust the strength for your specific photo and skin tone." },
            { num: "02", title: "iPhone native editing",     body: "My exact formula — exposure, brilliance, highlights, shadows, vignette. Copy and paste to every photo in seconds." },
            { num: "03", title: "Hypic for portraits",       body: "The app nobody's talking about. How I get that clean, glowing skin tone without looking over-edited." },
            { num: "04", title: "CapCut for video",          body: "My exact settings: contrast, sharpen, clarity, vignette. How I export at 4K every time." },
            { num: "05", title: "Save a custom preset",      body: "How to build your own preset from a photo you love, so every future edit starts from the right place." },
            { num: "06", title: "Apply edits in bulk",       body: "Copy one edit and paste it to every photo in your session. Your whole camera roll, done in 30 seconds." },
          ].map((m) => (
            <article key={m.num} className="mf" style={{ ...card, padding: "20px 24px" }}>
              <p style={{ ...t.eyebrow, marginBottom: "12px" }}>{m.num}</p>
              <p style={{ ...t.h3, fontSize: "17px", marginBottom: "8px" }}>{m.title}</p>
              <p style={{ ...t.body, fontSize: "13px" }}>{m.body}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* BEFORE / AFTER SLIDER */}
      <Section eyebrow="Before and after" title="Same photo. Drag to see the difference." alt>
        <div className="max-w-sm mx-auto">
          <BeforeAfterSlider before={IMG.before} after={IMG.after} beforeLabel="Original" afterLabel="Preset applied" />
        </div>
      </Section>

      {/* PRESET STYLES */}
      <Section eyebrow="The preset collection" title="Three styles. Pick the one that feels most like you.">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Beige & warm",    img: IMG.presetBeige, note: "Soft, golden, editorial" },
            { label: "Light & minimal", img: IMG.presetLight, note: "Clean, airy, Scandinavian" },
            { label: "Dark & moody",    img: IMG.presetDark,  note: "Rich, dramatic, confident" },
          ].map((s) => (
            <div key={s.label} className="mf" style={{ ...card, padding: "16px" }}>
              <div className="relative overflow-hidden mb-3" style={{ aspectRatio: "1/1", borderRadius: "6px" }}>
                <img src={s.img} alt={s.label} className="w-full h-full object-cover" />
              </div>
              <p style={{ ...t.h3, fontSize: "16px", marginBottom: "4px" }}>{s.label}</p>
              <p style={{ ...t.body, fontSize: "13px" }}>{s.note}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* EVERYTHING ELSE IN THE KIT */}
      <Section eyebrow="Also included" title="The rest of the kit." alt>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <FCard title="Selfie Posing Cheat Sheet"       body="Mirror poses, full body, profile. Never feel awkward in front of the camera again. Includes voice control setup." />
          <FCard title="Branding Planner Template"       body="Your brand colours, fonts, feed aesthetic, and visual direction — planned in one place." />
          <FCard title="Storytelling Captions + Hooks"   body="Caption formulas and scroll-stopping text overlays. Includes my ChatGPT prompts for writing captions that actually connect." />
          <FCard title="Canva Crash Course"              body="Never opened Canva? This walks you through the basics so you can create content without getting stuck on the tools." />
        </div>
      </Section>

      {/* FAQ */}
      <Section eyebrow="FAQ" title="A few things people ask.">
        <FaqGrid items={FAQS.starterKit} />
      </Section>

      <CtaClose
        title="Everything you need to go from camera roll to content you're proud of."
        primary={{ href: "/checkout/starter-kit", label: "Get the Starter Kit — $37" }}
        secondary={{ href: "/masterclass",          label: "See the Masterclass" }}
      />

      <PublicFooter />
    </PublicPageShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function MasterclassPageContent() {
  return (
    <PublicPageShell>
      <PublicNav />

      <Hero
        eyebrow="Masterclass — $147"
        title={<>Fourteen lessons. From invisible to showing up like you mean it.</>}
        body={<p>Not just how to look good in a photo. How to build the brand around it — your positioning, your pillars, your content system — and keep showing up.</p>}
        primary={{ href: "/checkout/masterclass", label: "Enroll — $147" }}
        secondary={{ href: "/starter-kit",        label: "Start with the Starter Kit" }}
        imageSrc={IMG.pricingBg}
      />

      {/* THE REAL PROBLEM */}
      <Section eyebrow="What's actually going on" title="It's not that you don't know what to post. It's that you don't know who you are online yet." narrow alt>
        <div className="mf space-y-3" style={{ ...t.body, fontSize: "16px" }}>
          <p>So you post something, it doesn't land, and you tell yourself you're not consistent enough.</p>
          <p>But consistency isn't the problem. Clarity is.</p>
          <p>When you know exactly who you are, what you stand for, and what you're building — showing up gets easier. This course gets you there.</p>
        </div>
      </Section>

      {/* COURSE MODULES */}
      <Section eyebrow="Inside the course" title="Five areas. Fourteen lessons. One clear direction.">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {[
            { title: "Who You Are",        body: "Brand positioning, mission, and how to explain what you do in a sentence that actually resonates." },
            { title: "How You Show Up",    body: "Camera confidence, presence, the energy that makes someone stop scrolling. This is a skill, not a trait." },
            { title: "Your Visual Brand",  body: "Colours, aesthetic, feed design, and the visual identity that makes your content recognisable before they see your name." },
            { title: "Your Content System",body: "Brand pillars, content planning, and how to batch content so you're never scrambling on a Sunday night." },
            { title: "Growth & Reels",     body: "What makes reels perform, how to structure a hook, and what consistency actually looks like in a real week." },
          ].map((m) => <FCard key={m.title} title={m.title} body={m.body} />)}
        </div>
      </Section>

      {/* LESSON LIST */}
      <Section eyebrow="All fourteen lessons" title="Here's exactly what's covered." alt>
        <div className="grid gap-2 md:grid-cols-2">
          {[
            { num: "01", title: "Welcome & What This Changes" },
            { num: "02", title: "Introduction to Personal Branding" },
            { num: "03", title: "Starting to Show Up" },
            { num: "04", title: "Your Energy on Camera" },
            { num: "05", title: "The Camera Hack" },
            { num: "06", title: "Personal Branding 101" },
            { num: "07", title: "Design Your Brand" },
            { num: "08", title: "Design Your Instagram Feed" },
            { num: "09", title: "Create Your Brand Pillars" },
            { num: "10", title: "Start Showing Up" },
            { num: "11", title: "The Content System" },
            { num: "12", title: "High Quality Selfies" },
            { num: "13", title: "Instagram Reels" },
            { num: "14", title: "Content Planning" },
          ].map((l) => (
            <div key={l.num} className="mf flex items-baseline gap-4 py-3"
              style={{ borderBottom: `1px solid ${C.divider}` }}>
              <span style={{ ...t.eyebrow, color: C.textFaint, minWidth: "28px", flexShrink: 0 }}>{l.num}</span>
              <span style={{ ...t.body, fontSize: "14px", color: C.textSub }}>{l.title}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* FOUNDER SPLIT */}
      <Split
        title={<>I built 180K followers without a photographer, a studio, or a clue about what I was doing at the start.</>}
        body={
          <div className="space-y-3">
            <p>I figured it out over years. The positioning. The pillars. The content system that actually holds up when life gets messy.</p>
            <p>This course is everything I wish someone had put in front of me in the first six months.</p>
            <p>One time. Then it's yours.</p>
          </div>
        }
        imgSrc={IMG.dark}
        imgFirst
      />

      {/* WHO IT'S FOR */}
      <Section eyebrow="Who this is for" title="You want to build something. You just haven't had a clear starting point." alt>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            "You show up when inspiration strikes — and disappear for weeks when it doesn't. You need a system.",
            "You know what you want to build but every time you sit down to post, it feels like starting from zero.",
            "You want to be known for something specific. You just haven't figured out exactly what that is yet.",
          ].map((line) => (
            <article key={line} className="mf" style={card}>
              <p style={{ ...t.body, fontSize: "15px" }}>{line}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* WHAT YOU LEAVE WITH */}
      <Section eyebrow="After the course" title="What you'll have that you don't have now.">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <FCard title="Your brand positioning" body="One clear sentence that explains who you are and who you're for. No more trailing off when someone asks what you do." />
          <FCard title="Your brand pillars"     body="The three topics you always come back to. Every content idea filters through these." />
          <FCard title="Your content system"    body="How many times you post, in what format, on what days. Built around your actual life." />
          <FCard title="A complete first week"  body="You won't finish this course with notes. You'll finish it with content already made." />
        </div>
      </Section>

      {/* FAQ */}
      <Section eyebrow="FAQ" title="A few things before you enroll." alt>
        <FaqGrid items={FAQS.masterclass} />
      </Section>

      <CtaClose
        title="Do this once. Then you'll know exactly what you're building."
        primary={{ href: "/checkout/masterclass", label: "Enroll — $147" }}
        secondary={{ href: "/join/studio",          label: "See Studio" }}
      />

      <PublicFooter />
    </PublicPageShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function StudioPageContent() {
  return (
    <PublicPageShell>
      <PublicNav />

      <Hero
        eyebrow="Studio — €97/mo"
        title={<>An AI that already knows your brand. And gets smarter every week.</>}
        body={<p>Maya, image generation, Feed Planner, and Academy. For when you know what you want and need the speed.</p>}
        primary={{ href: "/checkout/membership", label: "Join Studio" }}
        secondary={{ href: "/masterclass",       label: "Start with the Masterclass" }}
        imageSrc={IMG.feed}
      />

      {/* INSIDE STUDIO */}
      <Section eyebrow="Inside Studio" title="Everything in one place." alt>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <FCard title="Maya" body="Your AI. She learns your face, your brand, your style. She remembers what you told her last week." />
          <FCard title="Image Generation" body="Brand photos without a photoshoot. You upload selfies. Maya creates the rest." />
          <FCard title="Feed Planner" body="Your next nine posts, planned and captioned. No more Sunday-night stress." />
          <FCard title="Academy" body="The full method and courses in the same place as your tools. No switching apps." />
        </div>
      </Section>

      {/* POSITIONING */}
      <Split
        title={<>Studio comes after the basics. Not before.</>}
        body={
          <div className="space-y-3">
            <p>The old homepage led with AI. That was wrong.</p>
            <p>The education comes first. Then the speed. Studio is for the person who already knows the look she's building — and wants the time back.</p>
          </div>
        }
        imgSrc={IMG.dark}
        imgFirst
        alt
      />

      {/* FAQ */}
      <Section eyebrow="FAQ" title="A few things before you join.">
        <FaqGrid items={FAQS.studio} />
      </Section>

      <CtaClose
        title="When you want the advanced layer, this is it."
        primary={{ href: "/checkout/membership", label: "Join Studio — €97/mo" }}
        secondary={{ href: "/starter-kit",       label: "Start smaller" }}
      />

      <PublicFooter />
    </PublicPageShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function WorkWithMePageContent() {
  return (
    <PublicPageShell>
      <PublicNav />

      <Hero
        eyebrow="1:1 with Sandra"
        title={<>Two or three people at a time. That's it.</>}
        body={<p>If what's not working is bigger than one preset or one lesson, this is where we look at the full picture.</p>}
        primary={{ href: "#inquiry",   label: "Send an inquiry" }}
        secondary={{ href: "/join/studio", label: "See Studio" }}
        imageSrc={IMG.founder}
      />

      {/* WHAT IT IS */}
      <Section title="This is for the person who wants direct eyes on the problem." narrow alt>
        <div className="mf space-y-3" style={{ ...t.body, fontSize: "16px" }}>
          <p>Maybe the issue is the photos.</p>
          <p>Maybe it's the offer. Or the posting. Or the way none of it feels like you yet.</p>
          <p>That's what this is for.</p>
        </div>
      </Section>

      {/* INQUIRY FORM */}
      <section id="inquiry" style={{ background: C.bg, padding: "80px 24px", scrollMarginTop: "60px" }}>
        <div className="max-w-5xl mx-auto grid gap-12 md:grid-cols-2 md:items-start">
          <div className="mf">
            <span style={{ ...t.eyebrow, marginBottom: "12px" }}>Inquiry</span>
            <h2 style={{ ...t.h2, marginBottom: "16px" }}>Tell me what's not working right now.</h2>
            <p style={{ ...t.body, fontSize: "16px" }}>Keep it simple. I just need enough to know whether this is the right fit.</p>
            <div className="mt-8" style={{ ...card, padding: "20px" }}>
              <p style={{ ...t.body, fontSize: "13px", color: C.textFaint }}>
                <span style={{ color: C.textSub }}>Limited spots.</span> Sandra reads every inquiry herself and replies within 48 hours.
              </p>
            </div>
          </div>
          <div className="mf" style={{ transitionDelay: "0.05s" }}>
            <InquiryForm />
          </div>
        </div>
      </section>

      <PublicFooter />
    </PublicPageShell>
  )
}

// ─── Inline inquiry form (dark-themed) ───────────────────────────────────────
function InquiryForm() {
  const [name,         setName]         = useState("")
  const [email,        setEmail]        = useState("")
  const [instagram,    setInstagram]    = useState("")
  const [currentBlock, setCurrentBlock] = useState("")
  const [goal,         setGoal]         = useState("")
  const [error,        setError]        = useState("")
  const [success,      setSuccess]      = useState(false)
  const [pending,      startTransition] = useTransition()

  const inputStyle: React.CSSProperties = {
    width:       "100%",
    border:      `1px solid ${C.cardBorder}`,
    background:  "rgba(13,12,11,0.6)",
    color:       C.text,
    padding:     "12px 16px",
    fontSize:    "14px",
    fontFamily:  F.sans,
    borderRadius:"8px",
    outline:     "none",
    transition:  "border-color 0.2s",
  }
  const onFocus  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.target.style.borderColor = C.cardBorderStrong }
  const onBlur   = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => { e.target.style.borderColor = C.cardBorder }

  const handleSubmit = (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
    setError("")
    setSuccess(false)
    startTransition(async () => {
      try {
        const res = await fetch("/api/inquiry/submit", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, instagramHandle: instagram, currentChallenge: currentBlock, desiredOutcome: goal }),
        })
        const payload = (await res.json().catch(() => null)) as { error?: string } | null
        if (!res.ok) { setError(payload?.error ?? "Something went wrong. Please try again."); return }
        setSuccess(true)
        setName(""); setEmail(""); setInstagram(""); setCurrentBlock(""); setGoal("")
      } catch {
        setError("Something went wrong. Please try again.")
      }
    })
  }

  if (success) {
    return (
      <div style={{ ...card, textAlign: "center", padding: "40px 28px" }}>
        <p style={{ ...t.h3, marginBottom: "12px" }}>Got it.</p>
        <p style={{ ...t.body }}>Sandra reads every inquiry herself and will reply within 48 hours.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ ...card, display: "grid", gap: "18px" }}>
      {[
        { label: "Name",                                   value: name,         set: setName,         type: "text",  required: true  },
        { label: "Email",                                  value: email,        set: setEmail,        type: "email", required: true  },
        { label: "Instagram handle",                       value: instagram,    set: setInstagram,    type: "text",  required: false },
      ].map(({ label, value, set, type, required }) => (
        <label key={label} style={{ display: "grid", gap: "7px", fontSize: "13px", color: C.textMuted, fontFamily: F.sans }}>
          <span>{label}</span>
          <input
            type={type} value={value} required={required}
            onChange={(e) => set(e.target.value)}
            style={inputStyle} onFocus={onFocus} onBlur={onBlur}
          />
        </label>
      ))}
      <label style={{ display: "grid", gap: "7px", fontSize: "13px", color: C.textMuted, fontFamily: F.sans }}>
        <span>What&apos;s not working right now?</span>
        <textarea value={currentBlock} onChange={(e) => setCurrentBlock(e.target.value)} rows={4} required
          style={{ ...inputStyle, minHeight: "110px", resize: "vertical" }} onFocus={onFocus} onBlur={onBlur} />
      </label>
      <label style={{ display: "grid", gap: "7px", fontSize: "13px", color: C.textMuted, fontFamily: F.sans }}>
        <span>What do you want in the next 6 months?</span>
        <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={4} required
          style={{ ...inputStyle, minHeight: "110px", resize: "vertical" }} onFocus={onFocus} onBlur={onBlur} />
      </label>
      <button type="submit" disabled={pending}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "14px 34px", minHeight: "48px", background: pending ? "rgba(200,196,187,0.4)" : C.textSub, color: C.bg, fontSize: "11px", fontFamily: F.sans, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", borderRadius: "100px", border: `1px solid ${C.textSub}`, cursor: pending ? "not-allowed" : "pointer", width: "100%" }}
      >
        {pending ? "Sending…" : "Send inquiry"}
      </button>
      {error && <p style={{ fontSize: "13px", color: "#f87171" }}>{error}</p>}
    </form>
  )
}
