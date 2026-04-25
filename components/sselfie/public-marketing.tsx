"use client"

import { useEffect, useState, useTransition, type ReactNode } from "react"
import Link from "next/link"
import { appendReferralParam, buildReferralLoginHref } from "@/lib/referrals/routing"

// ─── Vercel Blob images ───────────────────────────────────────────────────────
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

// ─── Design tokens — SSELFIE Agents system ───────────────────────────────────
const C = {
  // Core surfaces
  ink:          "#0F0D0B",
  inkSoft:      "#1E1A15",
  cream:        "#EDE9E2",
  creamWarm:    "#F4F0E6",
  creamDeep:    "#D9D3C8",
  stone:        "#C4B5A0",
  // Text on dark
  onDark:       "#EDE9E2",
  onDarkSub:    "#C4B5A0",
  onDarkMuted:  "#7A6F63",
  // Text on cream
  onCream:      "#0F0D0B",
  onCreamSub:   "#3D3830",
  onCreamMuted: "#7A6F63",
  // Dividers
  divDark:      "rgba(237,233,226,0.10)",
  divCream:     "rgba(15,13,11,0.10)",
  // Hero overlay
  heroGrad:     "linear-gradient(to bottom, rgba(15,13,11,0.22) 0%, rgba(15,13,11,0.04) 38%, rgba(15,13,11,0.88) 100%)",
}

const F = {
  serif: "'Cormorant Garamond', Georgia, serif",
  sans:  "var(--font-inter, Inter, -apple-system, sans-serif)",
}

// ─── Letterpress text shadows ─────────────────────────────────────────────────
const LP = {
  dark:  "0 2px 8px rgba(0,0,0,0.8), 0 -1px 0 rgba(255,255,255,0.06), 1px 1px 0 rgba(0,0,0,0.5)",
  cream: "1px 2px 3px rgba(255,255,255,0.88), -1px -1px 2px rgba(60,50,38,0.09)",
}

// ─── Typography ───────────────────────────────────────────────────────────────
function ty(
  variant: "eyebrow" | "h1" | "h2" | "h3" | "body",
  dark: boolean,
): React.CSSProperties {
  const d = dark
  switch (variant) {
    case "eyebrow": return {
      fontFamily: F.sans, fontSize: "10px", letterSpacing: "0.5em",
      textTransform: "uppercase", color: d ? C.onDarkMuted : C.onCreamMuted, display: "block",
    }
    case "h1": return {
      fontFamily: F.serif, fontWeight: 300, fontSize: "clamp(36px, 7vw, 70px)",
      lineHeight: 1.03, letterSpacing: "-0.02em",
      color: d ? C.onDark : C.onCream, textShadow: d ? LP.dark : LP.cream,
    }
    case "h2": return {
      fontFamily: F.serif, fontWeight: 300, fontSize: "clamp(28px, 4.5vw, 48px)",
      lineHeight: 1.07, letterSpacing: "-0.015em",
      color: d ? C.onDark : C.onCream, textShadow: d ? LP.dark : LP.cream,
    }
    case "h3": return {
      fontFamily: F.serif, fontWeight: 300, fontSize: "clamp(19px, 2.5vw, 26px)",
      lineHeight: 1.18, color: d ? C.onDark : C.onCream, textShadow: d ? LP.dark : LP.cream,
    }
    case "body": return {
      fontFamily: F.sans, fontSize: "15px", lineHeight: 1.78,
      fontWeight: 300, color: d ? C.onDarkSub : C.onCreamSub,
    }
  }
}

// ─── Paper texture SVG defs (mounted once in shell) ──────────────────────────
function SvgPaperDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }} aria-hidden>
      <defs>
        <filter id="sa-noise-dark" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <filter id="sa-noise-cream" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
    </svg>
  )
}

function PaperTexture({ dark }: { dark: boolean }) {
  return (
    <svg
      aria-hidden
      style={{
        position:       "absolute", inset: 0, width: "100%", height: "100%",
        pointerEvents:  "none",
        opacity:        dark ? 0.055 : 0.18,
        mixBlendMode:   (dark ? "screen" : "multiply") as React.CSSProperties["mixBlendMode"],
        zIndex:         1,
      }}
    >
      <rect width="100%" height="100%" filter={`url(#sa-noise-${dark ? "dark" : "cream"})`} />
    </svg>
  )
}

// ─── Card helpers ─────────────────────────────────────────────────────────────
function cardSx(dark: boolean, padded = true): React.CSSProperties {
  return {
    background: dark ? C.inkSoft : C.creamWarm,
    border:     `1px solid ${dark ? C.divDark : C.divCream}`,
    padding:    padded ? "28px" : "16px",
  }
}

// ─── Before / After drag slider ──────────────────────────────────────────────
function BeforeAfterSlider({
  before, after, beforeLabel = "Before", afterLabel = "After",
}: {
  before: string; after: string; beforeLabel?: string; afterLabel?: string
}) {
  const [pos, setPos] = useState(50)
  return (
    <div
      className="mf relative overflow-hidden select-none"
      style={{ aspectRatio: "3/4", cursor: "ew-resize", touchAction: "none" }}
    >
      <img src={after} alt={afterLabel} className="absolute inset-0 w-full h-full object-cover" draggable={false} />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <img src={before} alt={beforeLabel} className="absolute inset-0 h-full object-cover"
          style={{ width: `${10000 / pos}%`, maxWidth: "none" }} draggable={false} />
      </div>
      {/* Divider line + handle */}
      <div className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none"
        style={{ left: `${pos}%`, transform: "translateX(-50%)", zIndex: 10 }}>
        <div className="w-px h-full" style={{ background: "rgba(255,255,255,0.65)" }} />
        <div className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center"
          style={{
            width: "34px", height: "34px", borderRadius: "50%",
            background: "rgba(237,233,226,0.95)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.45)",
          }}>
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
            <path d="M1 5h12M1 5L4 2M1 5l3 3M13 5l-3-3M13 5l-3 3" stroke={C.ink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      {/* Labels */}
      <span className="absolute top-4 left-4 pointer-events-none"
        style={{ ...ty("eyebrow", true), color: "rgba(237,233,226,0.85)", background: "rgba(15,13,11,0.5)", padding: "4px 10px" }}>
        {beforeLabel}
      </span>
      <span className="absolute top-4 right-4 pointer-events-none"
        style={{ ...ty("eyebrow", true), color: "rgba(237,233,226,0.85)", background: "rgba(15,13,11,0.5)", padding: "4px 10px" }}>
        {afterLabel}
      </span>
      <input type="range" min={2} max={98} value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
        style={{ zIndex: 20 }} />
    </div>
  )
}

// ─── Button ───────────────────────────────────────────────────────────────────
function Btn({
  href, onClick, children, ghost = false, full = false, disabled = false, surface = "dark",
}: {
  href?:     string
  onClick?:  () => void
  children:  ReactNode
  ghost?:    boolean
  full?:     boolean
  disabled?: boolean
  surface?:  "dark" | "cream"
}) {
  const dark = surface === "dark"
  // Solid: cream button on dark bg; ink button on cream bg
  const solidBg     = dark ? C.cream    : C.ink
  const solidText   = dark ? C.ink      : C.cream
  const solidShadow = dark
    ? "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)"
    : "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -2px 0 rgba(0,0,0,0.45), 0 1px 5px rgba(0,0,0,0.25)"
  const ghostBorder = dark ? "rgba(237,233,226,0.22)" : "rgba(15,13,11,0.22)"
  const ghostText   = dark ? C.onDarkSub : C.onCreamSub

  const base: React.CSSProperties = {
    display:         "inline-flex",
    alignItems:      "center",
    justifyContent:  "center",
    padding:         "13px 32px",
    minHeight:       "46px",
    background:      ghost ? "transparent" : solidBg,
    color:           ghost ? ghostText : solidText,
    fontSize:        "10px",
    fontFamily:      F.sans,
    fontWeight:      600,
    letterSpacing:   "0.22em",
    textTransform:   "uppercase",
    textDecoration:  "none",
    border:          `1px solid ${ghost ? ghostBorder : "transparent"}`,
    boxShadow:       ghost ? "none" : solidShadow,
    cursor:          disabled ? "not-allowed" : "pointer",
    transition:      "opacity 0.2s, box-shadow 0.2s",
    width:           full ? "100%" : "fit-content",
    opacity:         disabled ? 0.5 : 1,
    whiteSpace:      "nowrap",
    // Zero border-radius — SSELFIE Agents system
  }

  if (href) return <Link href={href} style={base}>{children}</Link>
  return <button onClick={onClick} style={base} disabled={disabled}>{children}</button>
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
      { threshold: 0.08 },
    )
    document.querySelectorAll(".mf").forEach((el) => {
      const h = el as HTMLElement
      h.style.opacity    = "0"
      h.style.transform  = "translateY(20px)"
      h.style.transition = "opacity 0.7s ease, transform 0.7s ease"
      io.observe(h)
    })
    return () => io.disconnect()
  }, [])

  return (
    <div style={{ minHeight: "100vh", background: C.ink, overflowX: "hidden", color: C.onDark, fontFamily: F.sans }}>
      <SvgPaperDefs />
      {children}
    </div>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
export function PublicNav({ loginHref = "/login" }: { loginHref?: string }) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 md:px-8"
      style={{
        height:     "58px",
        background: "rgba(15,13,11,0.88)",
        backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${C.divDark}`,
      }}
    >
      <Link href="/"
        style={{ fontFamily: F.serif, fontSize: "18px", color: C.onDark, letterSpacing: "0.35em", textTransform: "uppercase", fontWeight: 300, textDecoration: "none" }}>
        SSELFIE
      </Link>

      <nav className="hidden md:flex items-center gap-7">
        {[
          { href: "/starter-kit",  label: "Starter Kit"  },
          { href: "/masterclass",  label: "Masterclass"  },
          { href: "/join/studio",  label: "Studio"       },
          { href: "/work-with-me", label: "Work With Me" },
        ].map((l) => (
          <Link key={l.href} href={l.href}
            style={{ ...ty("eyebrow", true), textDecoration: "none" }}>
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        <Link href={loginHref} style={{ ...ty("eyebrow", true), textDecoration: "none" }}>Login</Link>
        <Btn href="/selfie-guide" surface="dark">Free guide</Btn>
      </div>
    </header>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
export function PublicFooter() {
  return (
    <footer style={{ background: C.ink, borderTop: `1px solid ${C.divDark}`, padding: "56px 24px 40px" }}>
      <div className="max-w-5xl mx-auto flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <p style={{ fontFamily: F.serif, fontSize: "19px", color: C.onDark, letterSpacing: "0.35em", textTransform: "uppercase", fontWeight: 300 }}>
          SSELFIE
        </p>
        <div className="flex flex-wrap gap-6">
          {[
            "/selfie-guide:Free Guide", "/starter-kit:Starter Kit",
            "/masterclass:Masterclass", "/join/studio:Studio", "/work-with-me:Work With Me",
          ].map((s) => {
            const [href, label] = s.split(":")
            return (
              <Link key={href} href={href} style={{ ...ty("eyebrow", true), textDecoration: "none" }}>
                {label}
              </Link>
            )
          })}
        </div>
      </div>
      <div className="max-w-5xl mx-auto mt-8 pt-5 flex gap-6" style={{ borderTop: `1px solid ${C.divDark}` }}>
        <span style={ty("eyebrow", true)}>© 2026 SSELFIE Studio</span>
        {["/terms:Terms", "/privacy:Privacy"].map((s) => {
          const [href, label] = s.split(":")
          return <Link key={href} href={href} style={{ ...ty("eyebrow", true), textDecoration: "none" }}>{label}</Link>
        })}
      </div>
    </footer>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero({
  eyebrow, title, body, primary, secondary, imageSrc,
}: {
  eyebrow:    string
  title:      ReactNode
  body:       ReactNode
  primary:    { href: string; label: string }
  secondary?: { href: string; label: string }
  imageSrc:   string
}) {
  return (
    <section
      className="relative"
      style={{ minHeight: "100dvh", overflow: "hidden", display: "flex", flexDirection: "column" }}
    >
      <img src={imageSrc} alt="" aria-hidden
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: "50% 22%" }} />
      <div className="absolute inset-0" style={{ background: C.heroGrad }} />
      <PaperTexture dark />

      <div className="relative flex flex-col items-center justify-end text-center flex-1"
        style={{ padding: "0 20px 68px", paddingTop: "80px", zIndex: 2 }}>
        <div className="max-w-2xl mx-auto w-full">
          <span className="mf inline-block mb-5" style={ty("eyebrow", true)}>{eyebrow}</span>
          <h1 className="mf mb-5" style={{ ...ty("h1", true), transitionDelay: "0.05s" }}>{title}</h1>
          <div className="mf mb-8 mx-auto" style={{ ...ty("body", true), color: C.onDarkSub, maxWidth: "480px", transitionDelay: "0.1s" }}>
            {body}
          </div>
          <div className="mf flex flex-col sm:flex-row gap-3 items-center justify-center" style={{ transitionDelay: "0.15s" }}>
            <Btn href={primary.href} surface="dark">{primary.label}</Btn>
            {secondary && <Btn href={secondary.href} ghost surface="dark">{secondary.label}</Btn>}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({
  eyebrow, title, children, dark = true, narrow = false,
}: {
  eyebrow?: string
  title?:   ReactNode
  children: ReactNode
  dark?:    boolean
  narrow?:  boolean
}) {
  const surface = dark ? C.ink : C.cream
  return (
    <section style={{ position: "relative", background: surface, padding: "88px 24px", overflow: "hidden" }}>
      <PaperTexture dark={dark} />
      <div className={`mx-auto relative ${narrow ? "max-w-3xl" : "max-w-6xl"}`} style={{ zIndex: 2 }}>
        {eyebrow && <span className="mf block mb-4" style={ty("eyebrow", dark)}>{eyebrow}</span>}
        {title   && <h2 className="mf mb-10" style={ty("h2", dark)}>{title}</h2>}
        {children}
      </div>
    </section>
  )
}

// ─── Split (text + image) ────────────────────────────────────────────────────
function Split({
  eyebrow, title, body, imgSrc, imgAlt = "", imgFirst = false, dark = true, cta,
}: {
  eyebrow?:  string
  title?:    ReactNode
  body:      ReactNode
  imgSrc:    string
  imgAlt?:   string
  imgFirst?: boolean
  dark?:     boolean
  cta?:      ReactNode
}) {
  const surface = dark ? C.ink : C.cream
  const img = (
    <div className="mf relative overflow-hidden" style={{ aspectRatio: "4/5" }}>
      <img src={imgSrc} alt={imgAlt} className="w-full h-full object-cover" />
      <div className="absolute inset-0"
        style={{ background: dark
          ? "linear-gradient(to bottom, rgba(15,13,11,0.04) 0%, rgba(15,13,11,0.3) 100%)"
          : "linear-gradient(to bottom, rgba(237,233,226,0.04) 0%, rgba(237,233,226,0.2) 100%)" }} />
    </div>
  )
  const txt = (
    <div className="mf flex flex-col justify-center gap-5" style={{ transitionDelay: "0.05s" }}>
      {eyebrow && <span style={ty("eyebrow", dark)}>{eyebrow}</span>}
      {title   && <h2 style={{ ...ty("h2", dark), marginBottom: "4px" }}>{title}</h2>}
      <div style={{ ...ty("body", dark), fontSize: "16px" }}>{body}</div>
      {cta && <div className="mt-1">{cta}</div>}
    </div>
  )
  return (
    <section style={{ position: "relative", background: surface, padding: "88px 24px", overflow: "hidden" }}>
      <PaperTexture dark={dark} />
      <div className="max-w-6xl mx-auto grid gap-14 md:grid-cols-2 md:items-center relative" style={{ zIndex: 2 }}>
        {imgFirst ? <>{img}{txt}</> : <>{txt}{img}</>}
      </div>
    </section>
  )
}

// ─── CTA close ────────────────────────────────────────────────────────────────
function CtaClose({
  title, primary, secondary, dark = true,
}: {
  title:      ReactNode
  primary:    { href: string; label: string }
  secondary?: { href: string; label: string }
  dark?:      boolean
}) {
  const surface = dark ? C.ink : C.cream
  return (
    <section style={{ position: "relative", background: surface, padding: "100px 24px", borderTop: `1px solid ${dark ? C.divDark : C.divCream}`, overflow: "hidden" }}>
      <PaperTexture dark={dark} />
      <div className="max-w-xl mx-auto text-center relative" style={{ zIndex: 2 }}>
        <h2 className="mf" style={{ ...ty("h2", dark), marginBottom: "36px" }}>{title}</h2>
        <div className="mf flex flex-col sm:flex-row gap-3 items-center justify-center" style={{ transitionDelay: "0.05s" }}>
          <Btn href={primary.href} surface={dark ? "dark" : "cream"}>{primary.label}</Btn>
          {secondary && <Btn href={secondary.href} ghost surface={dark ? "dark" : "cream"}>{secondary.label}</Btn>}
        </div>
      </div>
    </section>
  )
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FCard({ eyebrow, title, body, dark = true }: { eyebrow?: string; title: string; body?: string; dark?: boolean }) {
  return (
    <article className="mf" style={cardSx(dark)}>
      {eyebrow && <span style={{ ...ty("eyebrow", dark), marginBottom: "10px" }}>{eyebrow}</span>}
      <h3 style={{ ...ty("h3", dark), marginBottom: body ? "10px" : 0 }}>{title}</h3>
      {body && <p style={{ ...ty("body", dark), fontSize: "14px" }}>{body}</p>}
    </article>
  )
}

// ─── FAQ accordion ────────────────────────────────────────────────────────────
function FaqAccordion({ items, dark }: { items: Array<{ question: string; answer: string }>; dark: boolean }) {
  const [open, setOpen] = useState<number | null>(null)
  const div = dark ? C.divDark : C.divCream
  return (
    <div style={{ borderTop: `1px solid ${div}` }}>
      {items.map((q, i) => (
        <div key={i} style={{ borderBottom: `1px solid ${div}` }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{
              width: "100%", display: "flex", justifyContent: "space-between",
              alignItems: "center", padding: "22px 0",
              background: "none", border: "none", cursor: "pointer", textAlign: "left", gap: "20px",
            }}
          >
            <span style={{ ...ty("h3", dark), fontSize: "17px", textShadow: "none", margin: 0 }}>
              {q.question}
            </span>
            <span style={{ color: dark ? C.onDarkMuted : C.onCreamMuted, flexShrink: 0, fontSize: "22px", lineHeight: 1, fontFamily: F.serif, fontWeight: 300 }}>
              {open === i ? "−" : "+"}
            </span>
          </button>
          {open === i && (
            <div style={{ ...ty("body", dark), paddingBottom: "22px", maxWidth: "680px" }}>
              {q.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── FAQ data ─────────────────────────────────────────────────────────────────
const FAQS = {
  starterKit: [
    { question: "Do I need Lightroom already?",
      answer: "No. The editing walkthrough takes you through downloading it and importing the presets step by step. Takes about five minutes." },
    { question: "Will this work on my iPhone?",
      answer: "Yes. Every tutorial in the editing walkthrough uses a phone. No camera, no desktop software." },
    { question: "What apps do I need?",
      answer: "Lightroom Mobile, Hypic, and CapCut. All free. The walkthrough shows you exactly how to use each one." },
    { question: "Is this just presets?",
      answer: "No. The presets are included, but the main thing is the editing walkthrough. Six video modules showing you exactly how I edit, step by step." },
    { question: "What if I'm a complete beginner?",
      answer: "Good. There's also a posing cheat sheet, a Canva crash course for beginners, and caption prompts. You don't need to know anything going in." },
  ],
  masterclass: [
    { question: "Do I need the Starter Kit first?",
      answer: "No. Starter Kit is the first practical implementation step. Masterclass goes deeper and now includes Brand Strategy Pack so you build from a clearer offer." },
    { question: "Is this a photography course?",
      answer: "No. There's one lesson on taking better selfies, but this is mostly about who you are online: your brand, your pillars, your content system." },
    { question: "How long does it take?",
      answer: "Start with Brand Strategy, then move through the core lessons and the implementation modules at your own pace. Most pieces are designed to be short and usable right away." },
    { question: "How is this different from Studio?",
      answer: "The Masterclass is the education. You do the work once and it's yours. Studio is the AI layer for when you want the tools to keep running it weekly." },
    { question: "What if I've never posted consistently?",
      answer: "That's exactly who this is for. The course is built around getting you from scattered to a system you can actually follow." },
  ],
  studio: [
    { question: "Who is Studio for?",
      answer: "For people who already know the look and direction they want, and need speed, consistency, and memory built into the workflow." },
    { question: "What does Maya actually do?",
      answer: "She generates brand photos, plans your feed, writes captions. And she remembers your style, so you're not starting from zero every time." },
    { question: "Can I cancel?",
      answer: "Yes. Cancel any time from your account. No forms, no friction." },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGES
// ─────────────────────────────────────────────────────────────────────────────

export function HomePageContent({ referralCode }: { referralCode?: string | null } = {}) {
  const r     = (href: string) => appendReferralParam(href, referralCode)
  const login = buildReferralLoginHref({ returnTo: "/studio", referralCode })

  return (
    <PublicPageShell>
      <PublicNav loginHref={login} />

      {/* HERO — dark */}
      <Hero
        eyebrow="Personal branding by Sandra"
        title={<>Your iPhone is already in your hand.</>}
        body={
          <p>The problem was never the camera. I teach women how to make income online. Through personal branding, storytelling, and photos you already know how to take.</p>
        }
        primary={{ href: r("/selfie-guide"),  label: "Get the free guide" }}
        secondary={{ href: r("/starter-kit"), label: "See the Starter Kit" }}
        imageSrc={IMG.hero}
      />

      {/* RECOGNITION — cream */}
      <Section
        eyebrow="Sound familiar?"
        title={<>You&apos;re good at what you do. Nobody knows it yet.</>}
        dark={false}
        narrow
      >
        <div className="mf space-y-4" style={{ ...ty("body", false), fontSize: "16px" }}>
          <p>You post something you&apos;re genuinely proud of. A handful of likes. Most of them from people who already know you. And you start wondering if any of this is worth it.</p>
          <p>It&apos;s not a content problem. It&apos;s a visibility problem. And visibility is a skill.</p>
          <p>One that&apos;s learnable. Starting with the phone you already have.</p>
        </div>
      </Section>

      {/* WHAT THIS ACTUALLY IS — dark */}
      <Split
        eyebrow="What this actually is"
        title={<>Personal branding that makes you money.</>}
        body={
          <div className="space-y-4">
            <p>Not just a course on taking better selfies. A system for turning your expertise, your story, and your phone into a brand people find, follow, and buy from.</p>
            <p>The photo is the cover. The brand is what sells.</p>
            <p>That&apos;s what I teach.</p>
          </div>
        }
        imgSrc={IMG.whoItsFor}
        dark
      />

      {/* BEFORE / AFTER — cream */}
      <Section
        eyebrow="The edit"
        title={<>Same phone. Different system.</>}
        dark={false}
      >
        <div className="max-w-sm mx-auto">
          <BeforeAfterSlider before={IMG.before} after={IMG.after} beforeLabel="No edit" afterLabel="With preset" />
        </div>
        <div className="mt-8 mf">
          <Btn href={r("/starter-kit")} surface="cream">Starter Kit · $37</Btn>
        </div>
      </Section>

      {/* PRODUCT LADDER — dark */}
      <Section eyebrow="How it works" title={<>Start here. Add layers when you&apos;re ready.</>} dark>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            { title: "Free Guide",       price: "Free",          body: "Light, angles, and what to do first. Start here.",                                       href: "/selfie-guide"  },
            { title: "Starter Kit",      price: "$37",           body: "Selfie Guide, presets, quick-start, and a 7-day content starter. One time.",             href: "/starter-kit"   },
            { title: "Masterclass",      price: "$147",          body: "Brand Strategy Pack included, plus visibility, content, and offer implementation.",      href: "/masterclass"   },
            { title: "Studio",           price: "€97/mo",        body: "AI brand photos, Feed Planner, Academy. For when you know what you want and need speed.", href: "/join/studio"   },
            { title: "1:1 with Sandra",  price: "From $2,000",   body: "Two or three people at a time. Direct eyes on your whole brand.",                        href: "/work-with-me"  },
          ].map((p) => (
            <Link key={p.title} href={r(p.href)} className="mf block"
              style={{ ...cardSx(true), minHeight: "200px", display: "flex", flexDirection: "column", justifyContent: "space-between", textDecoration: "none", transition: "border-color 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(237,233,226,0.25)" }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.divDark }}
            >
              <div>
                <span style={{ ...ty("eyebrow", true), marginBottom: "8px" }}>{p.price}</span>
                <h3 style={{ ...ty("h3", true), fontSize: "clamp(16px, 2vw, 20px)", marginBottom: "8px" }}>{p.title}</h3>
                <p style={{ ...ty("body", true), fontSize: "13px" }}>{p.body}</p>
              </div>
              <span style={{ ...ty("eyebrow", true), marginTop: "18px" }}>See page →</span>
            </Link>
          ))}
        </div>
      </Section>

      {/* FROM SANDRA — cream */}
      <Split
        eyebrow="From Sandra"
        title={<>I built 180K followers without a team. Just a system.</>}
        body={
          <div className="space-y-4">
            <p>I was hiding behind my logo. Overthinking every caption. Posting less than I wanted to because nothing felt ready.</p>
            <p>Once I figured out the brand. The positioning, the pillars, the photo that actually looks like me. Showing up became easy. Not perfect. Easy.</p>
            <p>That&apos;s what I&apos;m here to teach you.</p>
          </div>
        }
        imgSrc={IMG.founder}
        imgFirst
        dark={false}
        cta={<Btn href={r("/selfie-guide")} surface="cream">Start with the free guide</Btn>}
      />

      {/* CTA CLOSE — dark */}
      <CtaClose
        title={<>Your phone is enough. Your story is enough.</>}
        primary={{ href: r("/selfie-guide"),  label: "Get the free guide" }}
        secondary={{ href: r("/starter-kit"), label: "See the Starter Kit" }}
        dark
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

      {/* HERO — dark */}
      <Hero
        eyebrow="Starter Kit · $37"
        title={<>Your first better selfie. Your first week of content.</>}
        body={<p>The Selfie Guide, presets, quick-start, and a simple 7-day content starter so one photo becomes something you can actually post.</p>}
        primary={{ href: "/checkout/starter-kit", label: "Get the Starter Kit · $37" }}
        secondary={{ href: "/selfie-guide",        label: "Start with the free guide" }}
        imageSrc={IMG.after}
      />

      {/* THE REAL ISSUE — cream */}
      <Section eyebrow="The real issue" title={<>You do not need more files. You need one finished result.</>} dark={false} narrow>
        <div className="mf space-y-4" style={{ ...ty("body", false), fontSize: "16px" }}>
          <p>The photo looks close. But something&apos;s off. The tone, the skin, the overall feel.</p>
          <p>That&apos;s an editing problem. Not a camera problem. Not a face problem.</p>
          <p>This kit fixes that, then gives you a tiny content rhythm so the photo does not just sit in your camera roll.</p>
        </div>
      </Section>

      {/* EDITING MASTERCLASS — dark */}
      <Section eyebrow="The main event" title="Six editing walkthroughs. My exact formulas." dark>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[
            { num: "01", title: "Lightroom with presets",   body: "How to import the collection, apply it, and adjust the strength for your specific photo and skin tone." },
            { num: "02", title: "iPhone native editing",    body: "My exact formula: exposure, brilliance, highlights, shadows, vignette. Copy and paste to every photo in seconds." },
            { num: "03", title: "Hypic for portraits",      body: "The app nobody's talking about. How I get that clean, glowing skin tone without looking over-edited." },
            { num: "04", title: "CapCut for video",         body: "My exact settings: contrast, sharpen, clarity, vignette. How I export at 4K every time." },
            { num: "05", title: "Save a custom preset",     body: "Build your own preset from a photo you love, so every future edit starts from the right place." },
            { num: "06", title: "Apply edits in bulk",      body: "Copy one edit and paste it to every photo in your session. Your whole camera roll, done in 30 seconds." },
          ].map((m) => (
            <article key={m.num} className="mf" style={{ ...cardSx(true), padding: "22px 26px" }}>
              <p style={{ ...ty("eyebrow", true), marginBottom: "12px" }}>{m.num}</p>
              <p style={{ ...ty("h3", true), fontSize: "16px", marginBottom: "8px" }}>{m.title}</p>
              <p style={{ ...ty("body", true), fontSize: "13px" }}>{m.body}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* BEFORE / AFTER — cream */}
      <Section eyebrow="Before and after" title="Same photo. Drag to see the difference." dark={false}>
        <div className="max-w-sm mx-auto">
          <BeforeAfterSlider before={IMG.before} after={IMG.after} beforeLabel="Original" afterLabel="Preset applied" />
        </div>
      </Section>

      {/* PRESET STYLES — dark */}
      <Section eyebrow="The preset collection" title="Three styles. Pick the one that feels most like you." dark>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Beige & warm",    img: IMG.presetBeige, note: "Soft, golden, editorial" },
            { label: "Light & minimal", img: IMG.presetLight, note: "Clean, airy, Scandinavian" },
            { label: "Dark & moody",    img: IMG.presetDark,  note: "Rich, dramatic, confident" },
          ].map((s) => (
            <div key={s.label} className="mf" style={{ ...cardSx(true, false), padding: "16px" }}>
              <div className="relative overflow-hidden mb-3" style={{ aspectRatio: "1/1" }}>
                <img src={s.img} alt={s.label} className="w-full h-full object-cover" />
              </div>
              <p style={{ ...ty("h3", true), fontSize: "16px", marginBottom: "4px" }}>{s.label}</p>
              <p style={{ ...ty("body", true), fontSize: "13px" }}>{s.note}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ALSO INCLUDED — cream */}
      <Section eyebrow="Also included" title="The rest of the kit." dark={false}>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <FCard dark={false} title="Selfie Posing Cheat Sheet" body="Mirror poses, full body, profile. Never feel awkward in front of the camera again. Includes voice control setup." />
          <FCard dark={false} title="7-Day Content Starter" body="A tiny posting rhythm for your first better photo: proof, story, teaching, behind-the-scenes, and invitation." />
          <FCard dark={false} title="Storytelling Captions + Hooks" body="Caption formulas and scroll-stopping text overlays. My ChatGPT prompts for writing captions that actually connect." />
          <FCard dark={false} title="Canva Crash Course" body="Never opened Canva? This walks you through the basics so you can create content without getting stuck on the tools." />
        </div>
      </Section>

      {/* FAQ — dark */}
      <Section eyebrow="FAQ" title="A few things people ask." dark>
        <FaqAccordion items={FAQS.starterKit} dark />
      </Section>

      {/* CTA — cream */}
      <CtaClose
        title="Everything you need to turn one selfie into your first brand-ready week."
        primary={{ href: "/checkout/starter-kit", label: "Get the Starter Kit · $37" }}
        secondary={{ href: "/masterclass",          label: "See the Masterclass" }}
        dark={false}
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

      {/* HERO — dark */}
      <Hero
        eyebrow="Masterclass · $147"
        title={<>Build income-ready visibility with a clearer offer.</>}
        body={<p>Brand Strategy Pack included, then the full method for showing up, creating content, and building the assets you need to start selling online with more clarity.</p>}
        primary={{ href: "/checkout/masterclass", label: "Enroll · $147" }}
        secondary={{ href: "/starter-kit",        label: "Start with the Starter Kit" }}
        imageSrc={IMG.pricingBg}
      />

      {/* CLARITY — cream */}
      <Section eyebrow="What's actually happening" title={<>It&apos;s not that you need more motivation. You need positioning before content.</>} dark={false} narrow>
        <div className="mf space-y-4" style={{ ...ty("body", false), fontSize: "16px" }}>
          <p>So you post something, it doesn&apos;t land, and you tell yourself you&apos;re not consistent enough.</p>
          <p>But consistency isn&apos;t the problem. Clarity is.</p>
          <p>That is why Masterclass now starts with your Brand Strategy Pack. Know what you sell, who it helps, and what you want to be known for before you build the content system.</p>
        </div>
      </Section>

      {/* MODULES — dark */}
      <Section eyebrow="Inside the course" title="Strategy first. Then content, confidence, and execution." dark>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {[
            { title: "Brand Strategy Pack", body: "Your positioning, audience, pillars, and next content ideas before the lessons begin." },
            { title: "How You Show Up",     body: "Camera confidence, presence, the energy that makes someone stop scrolling. This is a skill, not a trait." },
            { title: "Your Visual Brand",   body: "Colours, aesthetic, feed design, and the visual identity that makes your content recognisable before they even see your name." },
            { title: "Content-To-Cash",     body: "Weekly rhythm, calls to action, DM follow-up, and simple sales conversations without income guarantees." },
            { title: "30-Day Sprint",       body: "A practical calendar and tracker so you can publish, invite, follow up, and measure conversations." },
          ].map((m) => <FCard key={m.title} title={m.title} body={m.body} dark />)}
        </div>
      </Section>

      {/* IMPLEMENTATION MAP — cream */}
      <Section eyebrow="Implementation map" title="Here's the path you move through." dark={false}>
        <div className="grid gap-0 md:grid-cols-2">
          {[
            { num: "01", title: "Start Here: Brand Strategy Pack"     },
            { num: "02", title: "Welcome & What This Changes"         },
            { num: "03", title: "Starting to Show Up"                 },
            { num: "04", title: "Your Energy on Camera"               },
            { num: "05", title: "The Camera Hack"                     },
            { num: "06", title: "Personal Branding 101"               },
            { num: "07", title: "Design Your Brand"                   },
            { num: "08", title: "Design Your Instagram Feed"          },
            { num: "09", title: "Create Your Brand Pillars"           },
            { num: "10", title: "Start Showing Up"                    },
            { num: "11", title: "The Content System"                  },
            { num: "12", title: "High Quality Selfies"                },
            { num: "13", title: "Instagram Reels"                     },
            { num: "14", title: "Content Planning"                    },
            { num: "15", title: "Offer Map & What I Sell Script"      },
            { num: "16", title: "Content-To-Cash Conversation System" },
            { num: "17", title: "30-Day Revenue Readiness Sprint"     },
          ].map((l) => (
            <div key={l.num} className="mf flex items-baseline gap-5 py-4"
              style={{ borderBottom: `1px solid ${C.divCream}` }}>
              <span style={{ ...ty("eyebrow", false), minWidth: "28px", flexShrink: 0 }}>{l.num}</span>
              <span style={{ ...ty("body", false), fontSize: "14px" }}>{l.title}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* FOUNDER SPLIT — dark */}
      <Split
        title={<>I built 180K followers without a photographer, a studio, or a clue about what I was doing at the start.</>}
        body={
          <div className="space-y-4">
            <p>I figured it out over years. The positioning. The pillars. The content system that actually holds up when life gets messy.</p>
            <p>This course is everything I wish someone had put in front of me in the first six months, including the part where you stop hiding behind content and clarify what you actually sell.</p>
            <p>One time. Then it&apos;s yours.</p>
          </div>
        }
        imgSrc={IMG.dark}
        imgFirst
        dark
      />

      {/* WHO IT'S FOR — cream */}
      <Section eyebrow="Who this is for" title="You want to build something. You just haven't had a clear starting point." dark={false}>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            "You show up when inspiration hits. And disappear for weeks when it doesn't. You need a system.",
            "You know what you want to build but every time you sit down to post, it feels like starting from zero.",
            "You want to be known for something specific. You just haven't figured out exactly what that is yet.",
          ].map((line) => (
            <article key={line} className="mf" style={cardSx(false)}>
              <p style={{ ...ty("body", false), fontSize: "15px" }}>{line}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* WHAT YOU LEAVE WITH — dark */}
      <Section eyebrow="After the course" title="What you'll have that you don't have now." dark>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <FCard dark title="Your Brand Strategy Pack" body="A clearer positioning, audience, voice, and content direction before you move into the lessons." />
          <FCard dark title="Your brand pillars"     body="The three topics you always come back to. Every content idea filters through these." />
          <FCard dark title="Your content-to-cash system" body="What you post, where it leads, and how to invite the right people into a simple conversation." />
          <FCard dark title="A 30-day action plan"  body="You won't finish this course with notes. You'll finish it with posts, scripts, and a tracking rhythm." />
        </div>
        <p className="mf mt-8 max-w-3xl" style={{ ...ty("body", true), fontSize: "13px", color: C.onDarkMuted }}>
          This training is educational and implementation-focused. Results depend on your offer, audience, consistency, pricing, market demand, effort, and timing. SSELFIE does not guarantee income or specific business results.
        </p>
      </Section>

      {/* FAQ — cream */}
      <Section eyebrow="FAQ" title="A few things before you enroll." dark={false}>
        <FaqAccordion items={FAQS.masterclass} dark={false} />
      </Section>

      {/* CTA — dark */}
      <CtaClose
        title="Do this once. Then you'll know exactly what you're building."
        primary={{ href: "/checkout/masterclass", label: "Enroll · $147" }}
        secondary={{ href: "/join/studio",          label: "See Studio" }}
        dark
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

      {/* HERO — dark */}
      <Hero
        eyebrow="Studio · €97/mo"
        title={<>An AI that already knows your brand. And gets smarter every week.</>}
        body={<p>Brand photos, Feed Planner, and Academy. For when you know what you want and need the speed.</p>}
        primary={{ href: "/checkout/membership", label: "Join Studio" }}
        secondary={{ href: "/masterclass",       label: "Start with the Masterclass" }}
        imageSrc={IMG.feed}
      />

      {/* INSIDE STUDIO — cream */}
      <Section eyebrow="Inside Studio" title="Everything in one place." dark={false}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <FCard dark={false} title="Maya" body="Your AI. She learns your face, your brand, your style. She remembers what you told her last week." />
          <FCard dark={false} title="Image Generation" body="Brand photos without a photoshoot. You upload selfies. Maya creates the rest." />
          <FCard dark={false} title="Feed Planner" body="Your next nine posts, planned and captioned. No more Sunday-night stress." />
          <FCard dark={false} title="Academy" body="The full method and courses in the same place as your tools. No switching apps." />
        </div>
      </Section>

      {/* POSITIONING — dark */}
      <Split
        eyebrow="The honest version"
        title={<>Studio comes after the basics. Not before.</>}
        body={
          <div className="space-y-4">
            <p>The education comes first. Then the speed.</p>
            <p>Studio is for the person who already knows the look she&apos;s building. She wants the time back.</p>
            <p>If you&apos;re still figuring out the brand, start with the Masterclass. Then come back here.</p>
          </div>
        }
        imgSrc={IMG.dark}
        imgFirst
        dark
        cta={<Btn href="/masterclass" surface="dark" ghost>See the Masterclass</Btn>}
      />

      {/* FAQ — cream */}
      <Section eyebrow="FAQ" title="A few things before you join." dark={false}>
        <FaqAccordion items={FAQS.studio} dark={false} />
      </Section>

      {/* CTA — dark */}
      <CtaClose
        title="When you want the advanced layer, this is it."
        primary={{ href: "/checkout/membership", label: "Join Studio · €97/mo" }}
        secondary={{ href: "/starter-kit",       label: "Start smaller" }}
        dark
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

      {/* HERO — dark */}
      <Hero
        eyebrow="1:1 with Sandra"
        title={<>Two or three people at a time. That&apos;s it.</>}
        body={<p>If what&apos;s not working is bigger than one preset or one lesson, this is where we look at the full picture.</p>}
        primary={{ href: "#inquiry",       label: "Send an inquiry" }}
        secondary={{ href: "/join/studio", label: "See Studio" }}
        imageSrc={IMG.founder}
      />

      {/* WHAT IT IS — cream */}
      <Section eyebrow="What it is" title="Direct eyes on the full picture." dark={false} narrow>
        <div className="mf space-y-4" style={{ ...ty("body", false), fontSize: "16px" }}>
          <p>Maybe the issue is the photos.</p>
          <p>Maybe it&apos;s the offer. Or the posting. Or the way none of it feels like you yet.</p>
          <p>That&apos;s what this is for.</p>
        </div>
      </Section>

      {/* INQUIRY FORM — dark */}
      <section id="inquiry" style={{ position: "relative", background: C.ink, padding: "88px 24px", overflow: "hidden", scrollMarginTop: "60px" }}>
        <PaperTexture dark />
        <div className="max-w-5xl mx-auto grid gap-14 md:grid-cols-2 md:items-start relative" style={{ zIndex: 2 }}>
          <div className="mf">
            <span style={{ ...ty("eyebrow", true), marginBottom: "14px" }}>Inquiry</span>
            <h2 style={{ ...ty("h2", true), marginBottom: "16px" }}>Tell me what&apos;s not working right now.</h2>
            <p style={{ ...ty("body", true), fontSize: "16px" }}>Keep it simple. I just need enough to know whether this is the right fit.</p>
            <div className="mt-8" style={{ ...cardSx(true), padding: "20px" }}>
              <p style={{ ...ty("body", true), fontSize: "13px", color: C.onDarkMuted }}>
                <span style={{ color: C.onDarkSub }}>Limited spots.</span> Sandra reads every inquiry herself and replies within 48 hours.
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

// ─── Inline inquiry form ──────────────────────────────────────────────────────
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
    width:      "100%",
    border:     `1px solid ${C.divDark}`,
    background: C.inkSoft,
    color:      C.onDark,
    padding:    "12px 16px",
    fontSize:   "14px",
    fontFamily: F.sans,
    outline:    "none",
    transition: "border-color 0.2s",
    // Zero border-radius — SSELFIE Agents system
  }
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = "rgba(237,233,226,0.28)"
  }
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = C.divDark
  }

  const handleSubmit = (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
    setError("")
    setSuccess(false)
    startTransition(async () => {
      try {
        const res     = await fetch("/api/inquiry/submit", {
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
      <div style={{ ...cardSx(true), textAlign: "center", padding: "40px 28px" }}>
        <p style={{ ...ty("h3", true), marginBottom: "12px" }}>Got it.</p>
        <p style={ty("body", true)}>Sandra reads every inquiry herself and will reply within 48 hours.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ ...cardSx(true), display: "grid", gap: "18px" }}>
      {[
        { label: "Name",             value: name,      set: setName,      type: "text",  required: true  },
        { label: "Email",            value: email,     set: setEmail,     type: "email", required: true  },
        { label: "Instagram handle", value: instagram, set: setInstagram, type: "text",  required: false },
      ].map(({ label, value, set, type, required }) => (
        <label key={label} style={{ display: "grid", gap: "7px", fontSize: "13px", color: C.onDarkMuted, fontFamily: F.sans }}>
          <span>{label}</span>
          <input type={type} value={value} required={required}
            onChange={(e) => set(e.target.value)}
            style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
        </label>
      ))}
      <label style={{ display: "grid", gap: "7px", fontSize: "13px", color: C.onDarkMuted, fontFamily: F.sans }}>
        <span>What&apos;s not working right now?</span>
        <textarea value={currentBlock} onChange={(e) => setCurrentBlock(e.target.value)} rows={4} required
          style={{ ...inputStyle, minHeight: "110px", resize: "vertical" }} onFocus={onFocus} onBlur={onBlur} />
      </label>
      <label style={{ display: "grid", gap: "7px", fontSize: "13px", color: C.onDarkMuted, fontFamily: F.sans }}>
        <span>What do you want in the next 6 months?</span>
        <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={4} required
          style={{ ...inputStyle, minHeight: "110px", resize: "vertical" }} onFocus={onFocus} onBlur={onBlur} />
      </label>
      <button
        type="submit" disabled={pending}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          padding: "13px 32px", minHeight: "46px",
          background: pending ? "rgba(237,233,226,0.35)" : C.cream,
          color: C.ink,
          fontSize: "10px", fontFamily: F.sans, fontWeight: 600, letterSpacing: "0.22em",
          textTransform: "uppercase",
          border: "1px solid transparent",
          boxShadow: pending ? "none" : "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)",
          cursor: pending ? "not-allowed" : "pointer",
          width: "100%",
          // Zero border-radius — SSELFIE Agents system
        }}
      >
        {pending ? "Sending…" : "Send inquiry"}
      </button>
      {error && <p style={{ fontSize: "13px", color: "#f87171", fontFamily: F.sans }}>{error}</p>}
    </form>
  )
}
