"use client"

import { useEffect, useState, useTransition, type ReactNode } from "react"
import Link from "next/link"
import { appendReferralParam, buildReferralLoginHref } from "@/lib/referrals/routing"

// ─── Vercel Blob images ───────────────────────────────────────────────────────
const BLOB = "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com"
const IMG = {
  hero:        `${BLOB}/sandra-portrait-after.jpg`,
  homeHero:    "/academy/visibility-suite/sandra-hero.png",
  homeFounder: "/academy/visibility-suite/sandra-founder.webp",
  homeStudio:  "/academy/visibility-suite/hero.png",
  homeSelfie:  "/images/selfie-guide/img-editorial-dark.png",
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
  // Starter Kit local assets
  skHero:          "/images/starter-kit/hero.png",
  skMockup:        "/images/starter-kit/mockup-2.png",
  skPresetColl:    "/images/starter-kit/preset-collection.png",
  skLifestyle:     "/images/starter-kit/lifestyle.png",
  skBaLightDreamy: "/images/starter-kit/ba-light-dreamy.png",
  skBaNordicDeep:  "/images/starter-kit/ba-nordic-deep.png",
  skBaDarkMoody:   "/images/starter-kit/ba-dark-moody.png",
}

// SUITE landing assets — Sandra-approved vault collection images (BRIDGE-01 Phase B)
const SUITE_IMG = {
  monday:      "/images/ai-prompts/clean-girl-morning-shot-3.jpg",
  photoshoots: "/images/ai-prompts/coastal-white-shot-2.jpg",
  carousels:   "/images/ai-prompts/quiet-luxury-london-shot-1.jpg",
  reelCovers:  "/images/ai-prompts/denim-street-shot-2.jpg",
  captions:    "/images/ai-prompts/marble-wine-shot-1.jpg",
  plan:        "/images/ai-prompts/dark-feminine-cafe-shot-1.jpg",
  honest:      "/images/ai-prompts/clean-girl-morning-shot-1.jpg",
}

// ─── Design tokens — SSELFIE workbook system ─────────────────────────────────
const C = {
  // Core surfaces
  ink:          "var(--color-obsidian)",
  inkSoft:      "var(--stone-dark)",
  inkLift:      "var(--stone-dark)",
  cream:        "var(--color-porcelain)",
  creamWarm:    "var(--color-pearl)",
  creamDeep:    "var(--color-whisper)",
  stone:        "var(--stone)",
  // Text on dark
  onDark:       "var(--color-porcelain)",
  onDarkSub:    "var(--color-whisper)",
  onDarkMuted:  "var(--stone)",
  // Text on cream
  onCream:      "var(--color-obsidian)",
  onCreamSub:   "var(--color-smoke)",
  onCreamMuted: "var(--stone)",
  // Dividers
  divDark:      "color-mix(in srgb, var(--color-whisper) 16%, transparent)",
  divDarkSoft:  "color-mix(in srgb, var(--color-whisper) 9%, transparent)",
  divDarkStrong:"color-mix(in srgb, var(--color-whisper) 26%, transparent)",
  divCream:     "color-mix(in srgb, var(--color-obsidian) 10%, transparent)",
  // Hero overlay
  heroGrad:     "linear-gradient(to bottom, color-mix(in srgb, var(--color-obsidian) 34%, transparent) 0%, color-mix(in srgb, var(--color-obsidian) 10%, transparent) 38%, color-mix(in srgb, var(--color-obsidian) 90%, transparent) 100%)",
}

const F = {
  serif: "'Cormorant Garamond', Georgia, serif",
  sans:  "var(--font-inter, Inter, -apple-system, sans-serif)",
}

// ─── Letterpress text shadows ─────────────────────────────────────────────────
const LP = {
  dark:  "0 2px 8px rgba(0,0,0,0.8), 0 -1px 0 rgba(255,255,255,0.06), 1px 1px 0 rgba(0,0,0,0.5)",
  cream: "1px 2px 3px rgba(255,255,255,0.88), -1px -1px 2px rgba(10,10,10,0.08)",
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
      fontWeight: 400, color: d ? C.onDarkSub : C.onCreamSub,
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
    background: dark ? C.inkLift : C.creamWarm,
    border:     `1px solid ${dark ? C.divDark : C.divCream}`,
    padding:    padded ? "28px" : "16px",
    boxShadow:  dark
      ? "inset 0 1px 0 rgba(255,255,255,0.035)"
      : "inset 0 1px 0 rgba(255,255,255,0.7), 0 2px 12px rgba(0,0,0,0.05)",
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
        <div className="w-px h-full" style={{ background: "color-mix(in srgb, var(--color-porcelain) 65%, transparent)" }} />
        <div className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center"
          style={{
            width: "34px", height: "34px", borderRadius: "50%",
            background: "color-mix(in srgb, var(--color-porcelain) 95%, transparent)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.45)",
          }}>
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
            <path d="M1 5h12M1 5L4 2M1 5l3 3M13 5l-3-3M13 5l-3 3" stroke={C.ink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      {/* Labels */}
      <span className="absolute top-4 left-4 pointer-events-none"
        style={{ ...ty("eyebrow", true), color: "color-mix(in srgb, var(--color-porcelain) 85%, transparent)", background: "color-mix(in srgb, var(--color-obsidian) 50%, transparent)", padding: "4px 10px" }}>
        {beforeLabel}
      </span>
      <span className="absolute top-4 right-4 pointer-events-none"
        style={{ ...ty("eyebrow", true), color: "color-mix(in srgb, var(--color-porcelain) 85%, transparent)", background: "color-mix(in srgb, var(--color-obsidian) 50%, transparent)", padding: "4px 10px" }}>
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
  const ghostBorder = dark
    ? "color-mix(in srgb, var(--color-whisper) 22%, transparent)"
    : "color-mix(in srgb, var(--color-obsidian) 22%, transparent)"
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

const ATTRIBUTION_PARAMS_TO_PRESERVE = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "email_type",
  "campaign_id",
  "ref",
  "source",
  "guide_cta",
  "freebie_source",
  "checkout_source",
] as const

function usePreservedAttributionHref(href: string) {
  const [currentSearch, setCurrentSearch] = useState("")

  useEffect(() => {
    setCurrentSearch(window.location.search)
  }, [])

  const searchParams = new URLSearchParams(currentSearch)
  const [path, rawQuery = ""] = href.split("?")
  const nextParams = new URLSearchParams(rawQuery)

  ATTRIBUTION_PARAMS_TO_PRESERVE.forEach((key) => {
    const value = searchParams.get(key)
    if (value && !nextParams.has(key)) {
      nextParams.set(key, value)
    }
  })

  const query = nextParams.toString()
  return query ? `${path}?${query}` : path
}

// ─── Shell ────────────────────────────────────────────────────────────────────
export function PublicPageShell({ children }: { children: ReactNode }) {
  const [showIntro, setShowIntro] = useState(false)

  useEffect(() => {
    const introKey = "sselfie-public-intro-seen"
    const shouldShowIntro =
      typeof window !== "undefined" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      !window.sessionStorage.getItem(introKey)

    if (shouldShowIntro) {
      setShowIntro(true)
      window.sessionStorage.setItem(introKey, "1")
      const timer = window.setTimeout(() => setShowIntro(false), 3500)
      return () => window.clearTimeout(timer)
    }
  }, [])

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
      {showIntro ? <IntroScreen /> : null}
      {children}
    </div>
  )
}

function IntroScreen() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{
        background: C.ink,
        animation: "sselfie-intro-exit 3.5s cubic-bezier(0.22, 1, 0.36, 1) forwards",
      }}
    >
      <PaperTexture dark />
      <div
        className="relative text-center"
        style={{
          zIndex: 2,
          animation: "sselfie-intro-rise 2.4s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        }}
      >
        <p
          style={{
            fontFamily: F.serif,
            fontSize: "clamp(28px, 6vw, 64px)",
            fontWeight: 300,
            letterSpacing: "0.36em",
            color: C.onDark,
            textShadow: LP.dark,
            textTransform: "uppercase",
          }}
        >
          SSELFIE
        </p>
        <div
          className="mx-auto mt-4"
          style={{
            width: "min(220px, 54vw)",
            height: 1,
            background: "rgba(244,240,230,0.28)",
          }}
        />
        <p
          className="mt-4"
          style={{
            ...ty("eyebrow", true),
            color: "rgba(244,240,230,0.58)",
            letterSpacing: "0.42em",
          }}
        >
          SUITE
        </p>
      </div>
      <style>{`
        @keyframes sselfie-intro-rise {
          0% { opacity: 0; transform: translateY(18px); filter: blur(12px); }
          35% { opacity: 1; transform: translateY(0); filter: blur(0); }
          74% { opacity: 1; transform: translateY(0); filter: blur(0); }
          100% { opacity: 0; transform: translateY(-10px); filter: blur(8px); }
        }
        @keyframes sselfie-intro-exit {
          0%, 78% { opacity: 1; pointer-events: auto; }
          100% { opacity: 0; pointer-events: none; }
        }
      `}</style>
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
        background: "color-mix(in srgb, var(--color-obsidian) 88%, transparent)",
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
          { href: "/selfie-guide",  label: "Free Guide"     },
          { href: "/masterclass",   label: "Masterclass"    },
          { href: "/join/studio",   label: "SSELFIE SUITE"  },
          { href: "/work-with-me",  label: "Work With Me" },
        ].map((l) => (
          <Link key={l.href} href={l.href}
            style={{ ...ty("eyebrow", true), textDecoration: "none" }}>
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        <Link href={loginHref} style={{ ...ty("eyebrow", true), textDecoration: "none" }}>Login</Link>
        <Btn href="/selfie-guide" surface="dark">Start Free</Btn>
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
            "/selfie-guide:Free Selfie Guide",
            "/starter-kit:Starter Kit",
            "/masterclass:Masterclass",
            "/join/studio:SSELFIE SUITE",
            "/work-with-me:Work With Me",
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
    <section style={{ position: "relative", background: surface, padding: "clamp(60px, 8vw, 88px) clamp(18px, 4vw, 24px)", overflow: "hidden" }}>
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
          ? "linear-gradient(to bottom, color-mix(in srgb, var(--color-obsidian) 4%, transparent) 0%, color-mix(in srgb, var(--color-obsidian) 30%, transparent) 100%)"
          : "linear-gradient(to bottom, color-mix(in srgb, var(--color-porcelain) 4%, transparent) 0%, color-mix(in srgb, var(--color-whisper) 20%, transparent) 100%)" }} />
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
    <section style={{ position: "relative", background: surface, padding: "clamp(60px, 8vw, 88px) clamp(18px, 4vw, 24px)", overflow: "hidden" }}>
      <PaperTexture dark={dark} />
      <div className="max-w-6xl mx-auto grid gap-14 md:grid-cols-2 md:items-center relative" style={{ zIndex: 2 }}>
        {imgFirst ? <>{img}{txt}</> : <>{txt}{img}</>}
      </div>
    </section>
  )
}

// ─── CTA close ────────────────────────────────────────────────────────────────
function CtaClose({
  title, body, primary, secondary, dark = true,
}: {
  title:      ReactNode
  body?:      ReactNode
  primary:    { href: string; label: string }
  secondary?: { href: string; label: string }
  dark?:      boolean
}) {
  const surface = dark ? C.ink : C.cream
  return (
    <section style={{ position: "relative", background: surface, padding: "clamp(72px, 9vw, 100px) clamp(18px, 4vw, 24px)", borderTop: `1px solid ${dark ? C.divDark : C.divCream}`, overflow: "hidden" }}>
      <PaperTexture dark={dark} />
      <div className="max-w-xl mx-auto text-center relative" style={{ zIndex: 2 }}>
        <h2 className="mf" style={{ ...ty("h2", dark), marginBottom: body ? "16px" : "36px" }}>{title}</h2>
        {body && <div className="mf" style={{ ...ty("body", dark), marginBottom: "34px" }}>{body}</div>}
        <div className="mf flex flex-col sm:flex-row gap-3 items-center justify-center" style={{ transitionDelay: "0.05s" }}>
          <Btn href={primary.href} surface={dark ? "dark" : "cream"}>{primary.label}</Btn>
          {secondary && <Btn href={secondary.href} ghost surface={dark ? "dark" : "cream"}>{secondary.label}</Btn>}
        </div>
      </div>
    </section>
  )
}

// ─── Image feature card (BRIDGE-01) ──────────────────────────────────────────
function ImgCard({ src, title, body, dark = false }: { src: string; title: string; body: string; dark?: boolean }) {
  return (
    <article className="mf" style={{ ...cardSx(dark), padding: 0, overflow: "hidden" }}>
      <div className="relative overflow-hidden" style={{ aspectRatio: "4/5" }}>
        <img src={src} alt={title} loading="lazy" className="w-full h-full object-cover" />
      </div>
      <div style={{ padding: "20px 22px 24px" }}>
        <h3 style={{ ...ty("h3", dark), marginBottom: "8px" }}>{title}</h3>
        <p style={{ ...ty("body", dark), fontSize: "14px" }}>{body}</p>
      </div>
    </article>
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
      answer: "Yes. The kit is built for phone photos. No camera, no desktop software, no complicated setup." },
    { question: "Will this help my AI photos look less fake?",
      answer: "Yes. Better AI results start with a better original selfie. The kit helps you get cleaner light, stronger angles, better edits, and a more usable photo before you ask any AI tool to transform it." },
    { question: "What apps do I need?",
      answer: "Lightroom Mobile, Hypic, and CapCut. All free. The walkthrough shows you exactly how to use each one." },
    { question: "Is this just presets?",
      answer: "No. The presets are included, but the kit also gives you the selfie setup, posing guidance, editing walkthrough, caption templates, and a 7-day content starter." },
    { question: "What if I'm a complete beginner?",
      answer: "Good. Start with the selfie guide, then use the posing cheat sheet, camera settings guide, and caption formulas. You do not need to know anything going in." },
  ],
  masterclass: [
    { question: "Do I need the Starter Kit first?",
      answer: "No. Starter Kit is the first practical implementation step. Masterclass goes deeper so you build from a clearer offer and content direction." },
    { question: "Is this a photography course?",
      answer: "It starts with your camera confidence. Getting comfortable showing up and taking selfies that actually feel like you. Then it goes into your brand, your message, your content system, and your first real offer. The selfie is the door. This is what's behind it." },
    { question: "How long does it take?",
      answer: "Start with the strategy foundation, then move through the core lessons and the implementation modules at your own pace. Most pieces are designed to be short and usable right away." },
    { question: "How is this different from SSELFIE SUITE?",
      answer: "The Masterclass is the education. You do the work once and it's yours. SSELFIE SUITE is the AI layer for when you want the tools to keep running it weekly." },
    { question: "What if I've never posted consistently?",
      answer: "That's exactly who this is for. The course is built around getting you from scattered to a system you can actually follow." },
  ],
  studio: [
    { question: "Is this just another AI image generator?",
      answer: "No. Image tools hand you a picture and leave. Maya builds the whole visual layer of your brand: photoshoots, carousels, reel covers, captions, and a plan for what to post. And she remembers your brand, so it gets easier every week." },
    { question: "What makes this different from ChatGPT?",
      answer: "Same class of engine money can rent. What you can't rent is a creative director who already knows your brand. Maya remembers your style, your colors, what you said no to, and you're still you in every photo." },
    { question: "Will the photos actually look like me?",
      answer: "Yes. That's the whole product. Maya works from your reference selfies. If something doesn't feel like you, you tell her and she remembers." },
    { question: "Do I need to learn prompts?",
      answer: "No. You tap. Maya does the prompt work." },
    { question: "Can I cancel?",
      answer: "Anytime, from your account, no forms. Your gallery stays yours." },
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
          <p>You already have the phone. You already have the story. SSELFIE helps you turn both into a personal brand people understand, trust, and can buy from.</p>
        }
        primary={{ href: r("/ai-prompts"), label: "Get the Free AI Prompts" }}
        secondary={{ href: r("/join/studio"),   label: "Meet Maya · SSELFIE SUITE" }}
        imageSrc={IMG.homeHero}
      />

      {/* RECOGNITION — cream */}
      <Section
        eyebrow="Sound familiar?"
        title={<>You are not invisible because you are not good enough.</>}
        dark={false}
        narrow
      >
        <div className="mf space-y-4" style={{ ...ty("body", false), fontSize: "16px" }}>
          <p>You are stuck because your message, content, visuals, and offer are not connected yet.</p>
          <p>You might have the phone. You might have the story. You might even have something to sell.</p>
          <p>But if people do not understand what you do, what to remember you for, or what step to take next, your content will keep feeling random.</p>
        </div>
      </Section>

      {/* WHAT THIS ACTUALLY IS — dark */}
      <Split
        eyebrow="What this actually is"
        title={<>It starts with the selfie. Everything builds from there.</>}
        body={
          <div className="space-y-4">
            <p>Better iPhone selfies are how people find you. The car selfie, the mirror photo, the full-body shot that finally looks the way you wanted. That is where it begins.</p>
            <p>Then Sandra shows you what to do with it. The caption. The content rhythm. The first offer. One clear path from first photo to first sale.</p>
            <p>Phone-first personal branding for women who are ready to be known for something.</p>
          </div>
        }
        imgSrc={IMG.homeStudio}
        dark
      />

      {/* THE PATH — cream */}
      <Section eyebrow="The SSELFIE Path" title={<>Know what to say, post, show, sell, and do next.</>} dark={false}>
        <div className="grid gap-3 md:grid-cols-4">
          {[
            { step: "01", title: "Clarify", body: "Find the words." },
            { step: "02", title: "Create", body: "Plan the content." },
            { step: "03", title: "Convert", body: "Build the offer path." },
            { step: "04", title: "SSELFIE SUITE", body: "Create and execute." },
          ].map((item) => (
            <article key={item.step} className="mf" style={{ ...cardSx(false), minHeight: "170px" }}>
              <span style={{ ...ty("eyebrow", false), marginBottom: "14px" }}>{item.step}</span>
              <h3 style={{ ...ty("h3", false), marginBottom: "10px" }}>{item.title}</h3>
              <p style={{ ...ty("body", false), fontSize: "14px" }}>{item.body}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* WHY SELFIES STILL MATTER — dark */}
      <Split
        eyebrow="Start with the selfie"
        title={<>Your selfie is doing more than you think.</>}
        body={
          <div className="space-y-4">
            <p>People decide in seconds. A great iPhone selfie makes them stop. The caption makes them read. The content rhythm makes them come back.</p>
            <p>It starts with one photo from your phone. Sandra shows you the rest.</p>
          </div>
        }
        imgSrc={IMG.homeSelfie}
        imgFirst
        dark
        cta={<Btn href={r("/ai-prompts")} surface="dark" ghost>Start with the free AI prompts</Btn>}
      />

      {/* OFFER LADDER — cream */}
      <Section eyebrow="Start here" title={<>One clear next step.</>} dark={false}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            { title: "Free AI Prompts", price: "Free", body: "Editorial photoshoot prompts that turn one selfie into photos you'd actually post. Start here.", href: "/ai-prompts" },
            { title: "Prompt Vault", price: "$27", body: "Ten editorial collections, 88 prompts. Turn one selfie into unlimited photoshoots.", href: "/prompt-vault" },
            { title: "Starter Kit", price: "$37", body: "Presets, editing walkthroughs, posing guide, and 7 days of content from one session.", href: "/starter-kit" },
            { title: "SSELFIE SUITE", price: "€97/mo", body: "Maya builds your visual brand: photoshoots, carousels, reel covers, captions. Everything included.", href: "/join/studio" },
          ].map((p) => (
            <Link key={p.title} href={r(p.href)} className="mf block"
              style={{ ...cardSx(false), minHeight: "220px", display: "flex", flexDirection: "column", justifyContent: "space-between", textDecoration: "none", transition: "border-color 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "color-mix(in srgb, var(--color-obsidian) 24%, transparent)" }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.divCream }}
            >
              <div>
                <span style={{ ...ty("eyebrow", false), marginBottom: "8px" }}>{p.price}</span>
                <h3 style={{ ...ty("h3", false), fontSize: "clamp(16px, 2vw, 20px)", marginBottom: "8px" }}>{p.title}</h3>
                <p style={{ ...ty("body", false), fontSize: "13px" }}>{p.body}</p>
              </div>
              <span style={{ ...ty("eyebrow", false), marginTop: "18px" }}>See page →</span>
            </Link>
          ))}
        </div>
      </Section>

      {/* FROM SANDRA — cream */}
      <Split
        eyebrow="From Sandra"
        title={<>I built my visibility with my phone, my story, and a lot of figuring it out as I went.</>}
        body={
          <div className="space-y-4">
            <p>Not because everything was perfect. Because I needed a way back to myself, my voice, and my own income.</p>
            <p>Now SSELFIE is the system I wish I had when I was starting from scratch: what to say, what to post, what to show, what to sell, and what to do next.</p>
          </div>
        }
        imgSrc={IMG.homeFounder}
        imgFirst
        dark={false}
        cta={<Btn href={r("/join/studio")} surface="cream">See the SUITE</Btn>}
      />

      {/* CTA CLOSE — dark */}
      <CtaClose
        title={<>Your phone is enough. Your story is enough. Now give it a direction.</>}
        primary={{ href: r("/ai-prompts"), label: "Get the Free AI Prompts" }}
        secondary={{ href: r("/join/studio"), label: "See the SUITE" }}
        dark
      />

      <PublicFooter />
    </PublicPageShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function StarterKitPageContent({ checkoutFailed = false }: { checkoutFailed?: boolean }) {
  const starterKitCheckoutHref = usePreservedAttributionHref("/checkout/starter-kit")

  return (
    <PublicPageShell>
      <PublicNav />

      {checkoutFailed && (
        <section
          className="mf"
          style={{
            background: C.cream,
            borderBottom: `1px solid ${C.divCream}`,
            padding: "18px 22px",
          }}
        >
          <div
            style={{
              maxWidth: "1120px",
              margin: "0 auto",
              display: "flex",
              flexWrap: "wrap",
              gap: "14px",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ minWidth: "240px", flex: "1 1 420px" }}>
              <p style={{ ...ty("eyebrow", false), marginBottom: "6px" }}>Checkout</p>
              <p style={{ ...ty("body", false), margin: 0, fontSize: "14px" }}>
                Your payment form did not open cleanly. Try once more and keep this page open while Stripe loads.
              </p>
            </div>
            <Link
              href={starterKitCheckoutHref}
              style={{
                display: "inline-flex",
                minHeight: "42px",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid ${C.ink}`,
                color: C.cream,
                background: C.ink,
                padding: "0 16px",
                textDecoration: "none",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                fontSize: "10px",
              }}
            >
              Retry checkout
            </Link>
          </div>
        </section>
      )}

      {/* HERO — dark */}
      <Hero
        eyebrow="Starter Kit · $37"
        title={<>AI-ready selfies, clean edits, captions, and your first week of content.</>}
        body={<p>Before you ask ChatGPT, Gemini, or any AI tool to restyle your photo, you need a strong original image. This is where the Starter Kit helps.</p>}
        primary={{ href: starterKitCheckoutHref, label: "Get the Starter Kit · $37" }}
        secondary={{ href: "/selfie-guide",        label: "Start with the free guide" }}
        imageSrc={IMG.skHero}
      />

      {/* THE SYSTEM — cream */}
      <Section eyebrow="Why it works" title={<>Your AI photo is only as good as the selfie you start with.</>} dark={false} narrow>
        <div className="mf space-y-4" style={{ ...ty("body", false), fontSize: "16px" }}>
          <p>If the original photo is dark, awkward, blurry, or unfinished, the AI result usually looks random too.</p>
          <p>The Starter Kit shows you how to take, edit, pose, and post AI-ready selfies so your visuals stop looking fake, flat, or disconnected from you.</p>
          <p>One better photo. One cleaner edit. One week of content. No starting from zero.</p>
        </div>
      </Section>

      {/* WHAT IS INSIDE — dark, split with mockup */}
      <Split
        eyebrow="What is inside"
        title={<>The first step into cinematic personal branding.</>}
        body={
          <div>
            {[
              { label: "16 Lightroom Presets",         note: "A clean starting point for selfies, AI input photos, and everyday brand visuals." },
              { label: "Selfie Guide",                 note: "Light, angles, phone setup, and simple rules for photos that look stronger before editing." },
              { label: "Posing And Editing Guidance",  note: "Mirror poses, full body, profile, phone edits, Hypic, CapCut, and Lightroom Mobile." },
              { label: "Caption Templates",            note: "30 ready-to-edit captions for women who have the photo but do not know what to say." },
              { label: "Storytelling Guide",           note: "Five post types that turn one photo session into content people can understand." },
              { label: "7-Day Content Starter",        note: "One session. Seven posts. A full week of content planned and ready to use." },
            ].map((item, i) => (
              <div key={item.label} style={{
                borderTop: `1px solid ${C.divDark}`,
                padding: "13px 0",
                ...(i === 5 ? { borderBottom: `1px solid ${C.divDark}` } : {}),
              }}>
                <p style={{ ...ty("h3", true), fontSize: "15px", marginBottom: "3px" }}>{item.label}</p>
                <p style={{ ...ty("body", true), fontSize: "13px" }}>{item.note}</p>
              </div>
            ))}
          </div>
        }
        imgSrc={IMG.skMockup}
        imgFirst
        dark
        cta={<Btn href={starterKitCheckoutHref} surface="dark">Get the Starter Kit · $37</Btn>}
      />

      {/* BEFORE AND AFTER — cream */}
      <Section eyebrow="Preset results" title={<>Three styles. See them in use.</>} dark={false}>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { img: IMG.skBaLightDreamy, alt: "Scandinavian Light and Dreamy preset before and after" },
            { img: IMG.skBaNordicDeep,  alt: "Nordic Deep Urban preset before and after" },
            { img: IMG.skBaDarkMoody,   alt: "Scandinavian Dark and Moody preset before and after" },
          ].map((s) => (
            <div key={s.alt} className="mf">
              <img src={s.img} alt={s.alt} style={{ width: "100%", height: "auto", display: "block" }} />
            </div>
          ))}
        </div>
      </Section>

      {/* EDITING WALKTHROUGHS — dark */}
      <Section eyebrow="The editing walkthrough" title={<>Make the original photo stronger first.</>} dark>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[
            { num: "01", title: "Lightroom with presets",   body: "Import the collection, apply it, and adjust the strength for your specific photo and skin tone." },
            { num: "02", title: "iPhone native editing",    body: "Exposure, brilliance, highlights, shadows, and vignette. Clean up the photo before you use it anywhere." },
            { num: "03", title: "Hypic for portraits",      body: "Get a polished portrait feel without smoothing your face into someone else." },
            { num: "04", title: "CapCut for video",         body: "Use the same clean visual direction on simple video clips and reels." },
            { num: "05", title: "Save a custom preset",     body: "Create your own repeatable edit so future selfies start from the right look." },
            { num: "06", title: "Apply edits in bulk",      body: "Copy one edit and paste it to every photo in your session. Your camera roll gets cleaner fast." },
          ].map((m) => (
            <article key={m.num} className="mf" style={{ ...cardSx(true), padding: "22px 26px" }}>
              <p style={{ ...ty("eyebrow", true), marginBottom: "12px" }}>{m.num}</p>
              <p style={{ ...ty("h3", true), fontSize: "16px", marginBottom: "8px" }}>{m.title}</p>
              <p style={{ ...ty("body", true), fontSize: "13px" }}>{m.body}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* PRESET COLLECTION — cream, split */}
      <Split
        eyebrow="The preset collection"
        title={<>Sixteen presets for cleaner phone photos and better AI inputs.</>}
        body={
          <div className="space-y-4">
            <p>Presets do not replace a good photo. They help you make the photo cleaner, more consistent, and easier to use as personal brand content.</p>
            <p>Use them before posting, before building a carousel, or before sending the image into an AI tool for a transformation.</p>
            <div className="grid gap-2 mt-2">
              {[
                { name: "Scandinavian Light and Dreamy", desc: "Bright, airy, soft tones. Timeless natural light." },
                { name: "Nordic Deep Urban",             desc: "Cool, desaturated, cinematic. Urban edge." },
                { name: "Scandinavian Dark and Moody",   desc: "Deep, warm, dramatic. Moody and timeless." },
              ].map((p) => (
                <div key={p.name} style={{ borderBottom: `1px solid ${C.divCream}`, paddingBottom: "10px" }}>
                  <p style={{ ...ty("h3", false), fontSize: "14px", marginBottom: "2px" }}>{p.name}</p>
                  <p style={{ ...ty("body", false), fontSize: "13px" }}>{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        }
        imgSrc={IMG.skPresetColl}
        imgFirst
        dark={false}
      />

      {/* ALSO INCLUDED — dark */}
      <Section eyebrow="Also included" title={<>The rest of the kit.</>} dark>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <FCard dark title="Selfie Posing Guide" body="Mirror poses, full body, profile, and simple direction so your input photo looks intentional before AI touches it." />
          <FCard dark title="Caption Templates" body="30 ready-to-edit captions for the moment when the photo is ready but your brain goes blank." />
          <FCard dark title="Storytelling Guide" body="Five post types that turn one photo session into a full content arc: proof, story, teaching, behind the scenes, and invitation." />
          <FCard dark title="7-Day Content Starter" body="Turn one session into seven posts. A full week of content from a single afternoon." />
          <FCard dark title="Camera Settings Cheat Sheet" body="The exact iPhone settings for every shoot. Grid, mirroring, HDR, Live Photos. One page. Keep it on your phone." />
          <FCard dark title="Instant Access" body="Start right after checkout with the presets, guides, caption templates, and your 7-day starter." />
        </div>
      </Section>

      {/* FAQ — cream */}
      <Section eyebrow="FAQ" title={<>A few things people ask.</>} dark={false}>
        <FaqAccordion items={FAQS.starterKit} dark={false} />
      </Section>

      {/* CTA — dark */}
      <CtaClose
        title={<>Everything you need to turn one AI-ready selfie into your first brand-ready week.</>}
        primary={{ href: starterKitCheckoutHref, label: "Get the Starter Kit · $37" }}
        secondary={{ href: "/masterclass",          label: "See the Masterclass" }}
        dark
      />

      <PublicFooter />
    </PublicPageShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function MasterclassPageContent() {
  const masterclassCheckoutHref = usePreservedAttributionHref("/checkout/masterclass")

  return (
    <PublicPageShell>
      <PublicNav />

      {/* HERO — dark */}
      <Hero
        eyebrow="Masterclass · $147"
        title={<>You showed up. You took the selfie. Now build what comes next.</>}
        body={<p>Content direction, captions, offer clarity, and a 30-day plan so your photos have somewhere to lead. Sandra&apos;s full method, one time.</p>}
        primary={{ href: masterclassCheckoutHref, label: "Enroll · $147" }}
        secondary={{ href: "/starter-kit",        label: "Start with the Starter Kit" }}
        imageSrc={IMG.pricingBg}
      />

      {/* CLARITY — cream */}
      <Section eyebrow="What's actually happening" title={<>It&apos;s not that you need more motivation. You need positioning before content.</>} dark={false} narrow>
        <div className="mf space-y-4" style={{ ...ty("body", false), fontSize: "16px" }}>
          <p>So you post something, it doesn&apos;t land, and you tell yourself you&apos;re not consistent enough.</p>
          <p>But consistency isn&apos;t the problem. Clarity is.</p>
          <p>That is why Masterclass now starts with your foundation. Know what you sell, who it helps, and what you want to be known for before you build the content rhythm.</p>
        </div>
      </Section>

      {/* MODULES — dark */}
      <Section eyebrow="Inside the course" title="Start with clarity. Then content, confidence, and execution." dark>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {[
            { title: "Your Foundation", body: "Your positioning, audience, core themes, and next content ideas before the lessons begin." },
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
            { num: "01", title: "Start Here: Welcome to Branded By SSELFIE" },
            { num: "02", title: "Building Unshakable Selfie Confidence"    },
            { num: "03", title: "Start Showing Up"                         },
            { num: "04", title: "The Power Selfies Challenge"              },
            { num: "05", title: "The Confidence Camera Hack"               },
            { num: "06", title: "Brand Energy 101"                         },
            { num: "07", title: "Design Your Brand"                        },
            { num: "08", title: "Glow Up Your Bio + First Impressions"     },
            { num: "09", title: "Creating Your Brand Pillars"              },
            { num: "10", title: "Post Before You Feel Ready"               },
            { num: "11", title: "Confidence Posting Formula"               },
            { num: "12", title: "The Selfie CEO Shooting System"           },
            { num: "13", title: "Real Reels Walkthrough"                   },
            { num: "14", title: "CEO Content Planning"                     },
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
          <FCard dark title="Your Foundation" body="A clearer positioning, audience, voice, and content direction before you move into the lessons." />
          <FCard dark title="Your core themes"     body="The three topics you always come back to. Every content idea filters through these." />
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
        primary={{ href: masterclassCheckoutHref, label: "Enroll · $147" }}
        secondary={{ href: "/join/studio",          label: "See SSELFIE SUITE" }}
        dark
      />

      <PublicFooter />
    </PublicPageShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function StudioPageContent({ checkoutSource }: { checkoutSource?: string } = {}) {
  // A door elsewhere (free prompts page, Vault access) may hand us its source so the
  // checkout attribution survives the landing-page hop. Defaults stay unchanged.
  const sourceTop = checkoutSource || "studio_page"
  const sourceBottom = checkoutSource ? `${checkoutSource}_bottom` : "studio_page_bottom"
  return (
    <PublicPageShell>
      <PublicNav />

      {/* HERO — dark */}
      <Hero
        eyebrow="SSELFIE SUITE · €97/mo"
        title={<>Your visual brand, built for you.</>}
        body={<p>Maya is the creative director in your pocket. She turns one selfie into full photoshoots, carousels, reel covers, and captions that sound like you. You show up every week. She does the heavy lifting.</p>}
        primary={{ href: `/checkout/membership?interval=month&source=${sourceTop}`, label: "Join SSELFIE SUITE" }}
        secondary={{ href: "#how-it-works", label: "See how it works" }}
        imageSrc={IMG.feed}
      />

      {/* THE PAIN — cream */}
      <Section
        eyebrow="Sound familiar?"
        title={<>You already know you should be posting. That&apos;s not the problem.</>}
        dark={false}
        narrow
      >
        <div className="mf space-y-4" style={{ ...ty("body", false), fontSize: "16px" }}>
          <p>The problem is everything behind one post. You need a photo that doesn&apos;t look like a phone selfie. Words that don&apos;t sound like everyone else. A feed that looks like a brand and not a camera roll.</p>
          <p>A photographer every month isn&apos;t realistic. And the AI tools you&apos;ve tried made you look like someone else, which is worse than not posting at all.</p>
          <p>Showing up shouldn&apos;t cost you a whole evening. Or your face.</p>
        </div>
      </Section>

      {/* YOUR NEW MONDAY — dark */}
      <div id="how-it-works">
        <Split
          eyebrow="How it works"
          title={<>Here&apos;s your new Monday.</>}
          body={
            <div className="space-y-4">
              <p>You open the app with your coffee. Maya already has three concepts pulled in your style: the photos, the reel cover, the caption.</p>
              <p>You tap the one that feels most like you. By the time your coffee&apos;s done, this week&apos;s content is too.</p>
              <p>You, looking like the brand you actually are. Every week.</p>
            </div>
          }
          imgSrc={SUITE_IMG.monday}
          imgAlt="Editorial morning photo made with Maya"
          imgFirst
          dark
        />
      </div>

      {/* WHAT MAYA MAKES — cream */}
      <Section eyebrow="What Maya makes" title={<>One selfie in. A visual brand out.</>} dark={false}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ImgCard src={SUITE_IMG.photoshoots} title="Photoshoots" body="Editorial photos from one selfie. Recognizably you, in every shot." />
          <ImgCard src={SUITE_IMG.carousels} title="Carousels" body="Designed to be saved. Your words, your colors, ready to post." />
          <ImgCard src={SUITE_IMG.reelCovers} title="Reel covers" body="Scroll-stopping covers with your hook line on them." />
          <ImgCard src={SUITE_IMG.captions} title="Captions" body="Sounds like you wrote it on a good day." />
          <ImgCard src={SUITE_IMG.plan} title="A plan" body="No more staring at a blank feed. She suggests, you tap." />
        </div>
      </Section>

      {/* EVERYTHING INCLUDED — dark */}
      <Section eyebrow="Everything included" title={<>The SUITE includes every product I&apos;ve ever made.</>}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <FCard title="Maya" body="Your creative director, plus 200 photos a month." />
          <FCard title="The Prompt Vault" eyebrow="$27 value" body="Every prompt collection, included." />
          <FCard title="The Starter Kit" eyebrow="$37 value" body="Presets, posing, captions. Included." />
          <FCard title="The Masterclass" eyebrow="$147 value" body="The full brand education. Included." />
          <FCard title="Every new drop" body="New collections and products land in your library every week." />
        </div>
        <p className="mf" style={{ ...ty("body", true), fontSize: "16px", marginTop: "32px" }}>
          Buy nothing twice. Members get all of it.
        </p>
      </Section>

      {/* HONEST AI — dark */}
      <Split
        eyebrow="The honest part"
        title={<>These photos will look like you. That&apos;s the point.</>}
        body={
          <div className="space-y-4">
            <p>No filtered stranger. No &quot;perfect&quot; face that isn&apos;t yours. Maya works from your real selfies and keeps what makes you recognizable.</p>
            <p>AI should not erase you. It should frame you.</p>
          </div>
        }
        imgSrc={SUITE_IMG.honest}
        imgAlt="Realistic AI-assisted brand photo that still looks like you"
        dark
      />

      {/* PRICING — cream */}
      <Section eyebrow="Pricing" title={<>€97 a month. Everything included.</>} dark={false} narrow>
        <div className="mf space-y-4" style={{ ...ty("body", false), fontSize: "16px" }}>
          <p>200 photos a month. Every product I&apos;ve made. Cancel anytime, no forms.</p>
        </div>
        <div className="mf" style={{ marginTop: "32px" }}>
          <Btn href={`/checkout/membership?interval=month&source=${checkoutSource ? `${checkoutSource}_pricing` : "studio_page_pricing"}`} surface="cream">
            Join SSELFIE SUITE · €97/mo
          </Btn>
        </div>
      </Section>

      {/* FAQ — cream */}
      <Section eyebrow="FAQ" title="A few things before you join." dark={false}>
        <FaqAccordion items={FAQS.studio} dark={false} />
      </Section>

      {/* CTA — dark */}
      <CtaClose
        title="Stop producing your brand alone."
        body={<p>Maya&apos;s ready. Your first photoshoot is minutes away.</p>}
        primary={{ href: `/checkout/membership?interval=month&source=${sourceBottom}`, label: "Join SSELFIE SUITE · €97/mo" }}
        dark
      />

      <PublicFooter />
    </PublicPageShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export function WorkWithMePageContent() {
  const buildItems = [
    "Your clear message",
    "Your first simple offer",
    "Your homepage or landing page direction",
    "Your content direction",
    "Your first sales post",
    "Warm DM scripts",
    "Your 30-day content plan",
    "Your next best move",
  ]
  const fitItems = [
    "You are tired of posting without a clear direction",
    "You have ideas, but no clear offer",
    "You know you need to show up, but you do not know what to say",
    "You want to start selling, but it feels awkward or unclear",
    "You need someone to look at the full picture",
    "You want clear, direct, personal guidance instead of another course",
  ]
  const processSteps = [
    "Apply",
    "Sandra reviews your application",
    "If it is a fit, you receive a payment link",
    "We work together for 4 weeks",
    "You leave with your message, offer, content direction, sales path, and next steps",
  ]

  return (
    <PublicPageShell>
      <PublicNav />

      {/* HERO — dark */}
      <Hero
        eyebrow="Work With Me"
        title={<>Four weeks to build your message, offer, content direction, and first sales path with me.</>}
        body={<p>For women who do not want another course, but want Sandra&apos;s eyes on the full picture: what to say, what to post, what to sell, and what to do next.</p>}
        primary={{ href: "#inquiry",       label: "Apply to Work With Me" }}
        secondary={{ href: "/masterclass", label: "Start with the Masterclass" }}
        imageSrc={IMG.founder}
      />

      {/* WHAT WE BUILD — cream */}
      <Section eyebrow="Four weeks, private" title="What we build together" dark={false}>
        <div className="mf max-w-3xl mb-10 space-y-4" style={{ ...ty("body", false), fontSize: "16px" }}>
          <p>This is not another content course. Four weeks, private. Sandra looks at the full picture and builds the pieces you actually need to move forward.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {buildItems.map((item) => (
            <FCard key={item} dark={false} title={item} body="" />
          ))}
        </div>
      </Section>

      {/* WHO IT IS FOR — dark */}
      <Section eyebrow="Who it is for" title="This is for you if" dark>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {fitItems.map((item) => (
            <FCard key={item} dark title={item} body="" />
          ))}
        </div>
        <div className="mt-10">
          <Btn href="#inquiry" surface="dark">Apply to Work With Me</Btn>
        </div>
      </Section>

      {/* HOW IT WORKS — cream */}
      <Section eyebrow="How it works" title="A private application first. Then the sprint." dark={false}>
        <div className="grid gap-4 md:grid-cols-5">
          {processSteps.map((step, index) => (
            <FCard key={step} dark={false} title={`${index + 1}. ${step}`} body="" />
          ))}
        </div>
        <div className="mf max-w-3xl mt-10" style={{ ...ty("body", false), fontSize: "16px" }}>
          <p>Applications are reviewed personally. This is not an instant checkout because Sandra only takes a small number of private clients at a time.</p>
        </div>
      </Section>

      {/* INVESTMENT — dark */}
      <Section eyebrow="Investment" title="Founding private sprint: €2,000" dark narrow>
        <div className="mf space-y-5" style={{ ...ty("body", true), fontSize: "16px" }}>
          <p><span style={{ color: C.onDarkSub }}>Payment plan:</span> 2 x €1,100</p>
          <p>Payment is not taken when you apply. If your application is accepted, Sandra will send you a private payment link.</p>
          <p style={{ color: C.onDarkMuted }}>This is not a promise of instant income. It is a focused 4-week sprint to build the foundation: message, offer, content direction, and first sales path.</p>
          <div className="flex flex-wrap gap-3 pt-3">
            <Btn href="#inquiry" surface="dark">Apply to Work With Me</Btn>
            <Btn href="/masterclass" surface="dark" ghost>Start with the Masterclass</Btn>
          </div>
        </div>
      </Section>

      {/* INQUIRY FORM — dark */}
      <section id="inquiry" style={{ position: "relative", background: C.ink, padding: "clamp(60px, 8vw, 88px) clamp(18px, 4vw, 24px)", overflow: "hidden", scrollMarginTop: "60px" }}>
        <PaperTexture dark />
        <div className="max-w-5xl mx-auto grid gap-14 md:grid-cols-2 md:items-start relative" style={{ zIndex: 2 }}>
          <div className="mf">
            <span style={{ ...ty("eyebrow", true), marginBottom: "14px" }}>Application</span>
            <h2 style={{ ...ty("h2", true), marginBottom: "16px" }}>Apply to Work With Me</h2>
            <p style={{ ...ty("body", true), fontSize: "16px" }}>Keep it simple. I only need enough to understand where you are, what you are trying to build, and whether this is the right fit.</p>
            <div className="mt-8" style={{ ...cardSx(true), padding: "20px" }}>
              <p style={{ ...ty("body", true), fontSize: "13px", color: C.onDarkMuted }}>
                <span style={{ color: C.onDarkSub }}>No payment is taken here.</span> If your application is accepted, Sandra will reply with the next step and a private payment link.
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
  const [currentOffer, setCurrentOffer] = useState("")
  const [helpFocus,    setHelpFocus]    = useState("")
  const [investmentReadiness, setInvestmentReadiness] = useState("")
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
    // Keep this form flat for its editorial section while product UI stays rounded elsewhere.
  }
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.target.style.borderColor = "color-mix(in srgb, var(--color-whisper) 28%, transparent)"
  }
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
          body: JSON.stringify({
            name,
            email,
            instagramHandle: instagram,
            currentChallenge: currentBlock,
            desiredOutcome: goal,
            currentOffer,
            helpFocus,
            investmentReadiness,
          }),
        })
        const payload = (await res.json().catch(() => null)) as { error?: string } | null
        if (!res.ok) { setError(payload?.error ?? "Something went wrong. Please try again."); return }
        setSuccess(true)
        setName(""); setEmail(""); setInstagram(""); setCurrentBlock(""); setGoal(""); setCurrentOffer(""); setHelpFocus(""); setInvestmentReadiness("")
      } catch {
        setError("Something went wrong. Please try again.")
      }
    })
  }

  if (success) {
    return (
      <div style={{ ...cardSx(true), textAlign: "center", padding: "40px 28px" }}>
        <p style={{ ...ty("h3", true), marginBottom: "12px" }}>Your application has been sent.</p>
        <p style={ty("body", true)}>Sandra reads every application herself. If it looks like the right fit, you&apos;ll hear back with the next step and a private payment link.</p>
        <p className="mt-4" style={{ ...ty("body", true), color: C.onDarkMuted }}>No payment has been taken.</p>
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
      <label style={{ display: "grid", gap: "7px", fontSize: "13px", color: C.onDarkMuted, fontFamily: F.sans }}>
        <span>What are you currently selling, if anything?</span>
        <textarea value={currentOffer} onChange={(e) => setCurrentOffer(e.target.value)} rows={3}
          style={{ ...inputStyle, minHeight: "86px", resize: "vertical" }} onFocus={onFocus} onBlur={onBlur} />
      </label>
      <label style={{ display: "grid", gap: "7px", fontSize: "13px", color: C.onDarkMuted, fontFamily: F.sans }}>
        <span>What do you want help with most?</span>
        <select value={helpFocus} onChange={(e) => setHelpFocus(e.target.value)} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
          <option value="">Choose one</option>
          <option value="Message">Message</option>
          <option value="Content">Content</option>
          <option value="Offer">Offer</option>
          <option value="Homepage / landing page direction">Homepage / landing page direction</option>
          <option value="Sales path">Sales path</option>
          <option value="All of it">All of it</option>
        </select>
      </label>
      <label style={{ display: "grid", gap: "7px", fontSize: "13px", color: C.onDarkMuted, fontFamily: F.sans }}>
        <span>Are you ready to invest €2,000 if it is the right fit?</span>
        <select value={investmentReadiness} onChange={(e) => setInvestmentReadiness(e.target.value)} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
          <option value="">Choose one</option>
          <option value="Yes">Yes</option>
          <option value="Maybe, I have questions">Maybe, I have questions</option>
          <option value="Not right now">Not right now</option>
        </select>
      </label>
      <button
        type="submit" disabled={pending}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          padding: "13px 32px", minHeight: "46px",
          background: pending ? "color-mix(in srgb, var(--color-whisper) 35%, transparent)" : C.cream,
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
        {pending ? "Sending…" : "Apply to Work With Me"}
      </button>
      {error && <p style={{ fontSize: "13px", color: "#f87171", fontFamily: F.sans }}>{error}</p>}
    </form>
  )
}
