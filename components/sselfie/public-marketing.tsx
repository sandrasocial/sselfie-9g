"use client"

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"
import { trackAnalyticsEvent } from "@/lib/analytics/client"
import { appendReferralParam, buildReferralLoginHref } from "@/lib/referrals/routing"
import { PromptVaultCheckoutLink } from "@/components/prompt-vault/prompt-vault-checkout-link"
import { VaultMayaCheckoutLink } from "@/components/vault-maya/vault-maya-checkout-link"
import { SuiteMultiFormatWalkthrough } from "@/components/sselfie/suite-multiformat-walkthrough"
import { SuiteProductWalkthrough } from "@/components/sselfie/suite-product-walkthrough"
import vaultMayaStyles from "@/components/vault-maya/vault-maya-landing.module.css"

// ─── Vercel Blob images ───────────────────────────────────────────────────────
const BLOB = "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com"
const IMG = {
  hero:        `${BLOB}/sandra-portrait-after.jpg`,
  homeHero:    "/academy/visibility-suite/sandra-hero.webp",
  homeFounder: "/academy/visibility-suite/sandra-founder.webp",
  homeStudio:  "/academy/visibility-suite/hero.webp",
  homeSelfie:  "/images/selfie-guide/img-editorial-dark.webp",
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
  skMockup:        "/images/starter-kit/starter-kit-product-mockup-v3.webp",
  skPresetColl:    "/images/starter-kit/preset-collection-vertical-v3.webp",
  skLifestyle:     "/images/starter-kit/lifestyle.png",
  skBaLightDreamy: "/images/starter-kit/ba-light-dreamy.png",
  skBaNordicDeep:  "/images/starter-kit/ba-nordic-deep.png",
  skBaDarkMoody:   "/images/starter-kit/ba-dark-moody.png",
  // Work With Me sprint assets
  wwmHero:        "/images/work-with-me/sprint-hero-new.webp",
  wwmFounder:     "/images/work-with-me/sandra-founder-new.webp",
  wwmHowIWork:    "/images/work-with-me/sandra-how-i-work-new.webp",
  wwmEditorial:   "/images/work-with-me/sprint-editorial-new.webp",
  wwmApplication: "/images/work-with-me/sprint-application-new.webp",
}

// SUITE landing assets - Sandra-approved vault collection images (BRIDGE-01 Phase B)
const SUITE_IMG = {
  honest:      "/images/ai-prompts/clean-girl-morning-shot-1.jpg",
}

// ─── Design tokens - SSELFIE workbook system ─────────────────────────────────
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
    // Zero border-radius - SSELFIE Agents system
  }

  if (href) return <Link href={href} style={base} onClick={onClick}>{children}</Link>
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
export function PublicNav({ loginHref = "/auth/login" }: { loginHref?: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const links = [
    { href: "/ai-prompts", label: "Free AI Prompts" },
    { href: "/prompt-vault", label: "Prompt Vault" },
    { href: "/join/studio", label: "SSELFIE SUITE" },
  ]

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

      <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-7">
        {links.map((l) => (
          <Link key={l.href} href={l.href}
            style={{ ...ty("eyebrow", true), textDecoration: "none" }}>
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        <Link href={loginHref} style={{ ...ty("eyebrow", true), textDecoration: "none" }}>Login</Link>
        <span className="hidden lg:block"><Btn href="/ai-prompts" surface="dark">Start Free</Btn></span>
        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-controls="sselfie-mobile-menu"
          aria-expanded={menuOpen}
          className="flex min-h-11 items-center border border-white/20 px-4 text-[10px] uppercase tracking-[0.22em] text-white lg:hidden"
          onClick={() => setMenuOpen(open => !open)}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </div>

      {menuOpen ? (
        <nav
          id="sselfie-mobile-menu"
          aria-label="SSELFIE menu"
          className="absolute inset-x-0 top-[58px] border-b border-white/15 bg-stone-950 px-5 py-5 shadow-2xl lg:hidden"
        >
          <div className="mx-auto flex max-w-lg flex-col">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="flex min-h-12 items-center justify-between border-b border-white/10 text-[11px] uppercase tracking-[0.22em] text-white"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
                <span aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
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
            "/ai-prompts:Free AI Prompts",
            "/prompt-vault:Prompt Vault",
            "/join/studio:SSELFIE SUITE",
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
  eyebrow, title, body, primary, primaryNode, secondary, imageSrc, imageAlt = "",
  minHeight = "100dvh", imagePosition = "50% 22%", contentPaddingBottom = "68px",
}: {
  eyebrow:    string
  title:      ReactNode
  body:       ReactNode
  primary?:   { href: string; label: string; onClick?: () => void }
  primaryNode?: ReactNode
  secondary?: { href: string; label: string }
  imageSrc:   string
  imageAlt?:  string
  minHeight?: string
  imagePosition?: string
  contentPaddingBottom?: string
}) {
  return (
    <section
      className="relative"
      style={{ minHeight, overflow: "hidden", display: "flex", flexDirection: "column" }}
    >
      <img src={imageSrc} alt={imageAlt} aria-hidden={imageAlt ? undefined : true}
        fetchPriority="high" decoding="async"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: imagePosition }} />
      <div className="absolute inset-0" style={{ background: C.heroGrad }} />
      <PaperTexture dark />

      <div className="relative flex flex-col items-center justify-end text-center flex-1"
        style={{ padding: `0 20px ${contentPaddingBottom}`, paddingTop: "80px", zIndex: 2 }}>
        <div className="max-w-2xl mx-auto w-full">
          <span className="mf inline-block mb-5" style={ty("eyebrow", true)}>{eyebrow}</span>
          <h1 className="mf mb-5" style={{ ...ty("h1", true), transitionDelay: "0.05s" }}>{title}</h1>
          <div className="mf mb-8 mx-auto" style={{ ...ty("body", true), color: C.onDarkSub, maxWidth: "480px", transitionDelay: "0.1s" }}>
            {body}
          </div>
          <div className="mf flex flex-col sm:flex-row gap-3 items-center justify-center" style={{ transitionDelay: "0.15s" }}>
            {primaryNode ?? (primary && <Btn href={primary.href} onClick={primary.onClick} surface="dark">{primary.label}</Btn>)}
            {secondary && <Btn href={secondary.href} ghost surface="dark">{secondary.label}</Btn>}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({
  eyebrow, title, children, dark = true, narrow = false, id,
}: {
  eyebrow?: string
  title?:   ReactNode
  children: ReactNode
  dark?:    boolean
  narrow?:  boolean
  id?:      string
}) {
  const surface = dark ? C.ink : C.cream
  return (
    <section id={id} style={{ position: "relative", background: surface, padding: "clamp(60px, 8vw, 88px) clamp(18px, 4vw, 24px)", overflow: "hidden", scrollMarginTop: "60px" }}>
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
      <img src={imgSrc} alt={imgAlt} loading="lazy" decoding="async" className="w-full h-full object-cover" />
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
  primary:    { href: string; label: string; onClick?: () => void }
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
          <Btn href={primary.href} onClick={primary.onClick} surface={dark ? "dark" : "cream"}>{primary.label}</Btn>
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
      answer: "No. Lightroom is included as a simple support tool for cleaning up the source selfie. You can still use the AI prompt path without becoming an editing person." },
    { question: "Will this work on my iPhone?",
      answer: "Yes. The kit is built for phone photos. No camera, no desktop software, no complicated setup." },
    { question: "Will this help my AI photos look less fake?",
      answer: "Yes. Better AI results start with a better original selfie. The kit helps you choose the right source photo, write a clearer prompt, and fix the result without changing your whole face." },
    { question: "What apps do I need?",
      answer: "You can use ChatGPT or your preferred AI image tool for the prompts. Lightroom Mobile, Hypic, and CapCut are optional support tools if you want to clean up the source photo or use the result in content." },
    { question: "Is this just presets?",
      answer: "No. The presets are included, but the main point is the selfie-to-AI-photo path: source selfie, starter prompts, still-you fix prompts, and a small 3-image shoot you can actually use." },
    { question: "What if I'm a complete beginner?",
      answer: "Good. Start with the source selfie checklist, then use the first prompt. You do not need to understand AI. You just need one clear photo and the next small step." },
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
    { question: "What do I get each month?",
      answer: "You get Maya, Create, Calendar, Learn, the SSELFIE library, and 100 credits that reset each month. Different creations can use different amounts of credits, so the exact number of finished images depends on what you make." },
    { question: "Do I need to learn prompts?",
      answer: "No. Tell Maya what you are trying to create in normal words. She helps with the direction and the prompt, and you decide what to use." },
    { question: "Will every photo look exactly like me?",
      answer: "That is the goal, but AI can still get things wrong. Start with clear reference selfies, review every result, and tell Maya what feels off so your next direction can get closer." },
    { question: "Is Maya just ChatGPT inside another app?",
      answer: "No. Maya works beside your SSELFIE tools, brand context, images, learning, and Calendar. The value is not another chat box. It is having one place that helps you create, decide what to say, and plan what goes out next." },
    { question: "Who is SUITE best for?",
      answer: "It is for a woman building a personal brand who wants ongoing help creating content around her own face, story, and work. If you only want one quick image or a done-for-you service, a monthly membership may not be the right fit." },
    { question: "Can I cancel?",
      answer: "Yes. You can cancel from your account. Your membership stays open until the end of the period you already paid for." },
  ],
  visibilityToPaid: [
    { question: "Who is this for?",
      answer: "This is for a woman who is already good at a real service and has experience helping clients, but her online presence does not show that value clearly yet. If you only have an idea and have never delivered the service, this is probably too early for you." },
    { question: "Is this business coaching?",
      answer: "No. This is a focused positioning, message, and visibility sprint. We are not fixing your finances, team, operations, or every offer. We are building one clear online path from your existing expertise to the right client reaching out." },
    { question: "Is this mainly about AI photos?",
      answer: "No. Your visuals matter because people need to recognize and trust you, but AI photos are not the product. AI helps me research and prepare faster. You are paying for personal judgment, positioning, writing, visual direction, and the work I build around your real service." },
    { question: "Will this get me clients?",
      answer: "I cannot promise clients or income. Your market, service, proof, follow-through, and sales conversations all matter. What I can do is remove the confusion that makes a good potential client leave: unclear positioning, disconnected content, a weak invitation, and no obvious next step." },
    { question: "What do I leave with?",
      answer: "You leave with one service positioned for one specific client, your core message, offer page copy, Instagram profile copy, a simple inquiry path, and four weeks of content drafts that teach, build trust, and lead to one clear invitation. You also have four private calls with me to refine the work and help you use it." },
    { question: "Why does it cost €2,000?",
      answer: "Because this is not a course, template pack, or one call. I spend two weeks researching your business, clients, market, message, and current online presence before our first session. I build the first version for you, then we spend four weekly calls refining it against your real business." },
    { question: "How does payment work?",
      answer: "The private sprint is €2,000 paid in full after a fit call. No payment is taken when you apply." },
    { question: "Why is there an application instead of instant checkout?",
      answer: "Because this is personal, hands-on work, and I read every application myself. I'd rather tell you honestly if I don't think it's a fit than take your money for something that isn't." },
    { question: "Why should I trust a new offer like this?",
      answer: "The offer is new, and I want to be honest about that. The experience behind it is not. I have spent years helping women see themselves differently, explaining visual and technical things simply, and building my own audience, message, products, and online business. The fit call is there so we can both decide whether that experience matches the problem you need solved." },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGES
// ─────────────────────────────────────────────────────────────────────────────

export function HomePageContent({ referralCode }: { referralCode?: string | null } = {}) {
  const r     = (href: string) => appendReferralParam(href, referralCode)
  const login = buildReferralLoginHref({ returnTo: "/app", referralCode })
  const freePrompts = r("/ai-prompts?utm_source=website&utm_medium=homepage&utm_campaign=vault_to_suite_path")
  const vault = r("/prompt-vault?source=homepage&utm_source=website&utm_medium=homepage&utm_campaign=vault_to_suite_path")
  const suite = r("/join/studio?source=homepage")

  return (
    <PublicPageShell>
      <PublicNav loginHref={login} />

      {/* HERO - dark */}
      <Hero
        eyebrow="Start with what you already have"
        title={<>Start with one selfie. See what you can build from there.</>}
        body={
          <p>Turn one normal selfie into photos that still feel like you, something useful to post, and one clear next step. Begin with the Prompt Vault. Keep building with Maya inside SSELFIE SUITE.</p>
        }
        primary={{ href: vault, label: "Explore the Prompt Vault" }}
        secondary={{ href: suite, label: "See SSELFIE SUITE" }}
        imageSrc={IMG.homeHero}
        imageAlt="Sandra Aamodt, founder of SSELFIE"
      />

      {/* RECOGNITION - cream */}
      <Section
        eyebrow="Sound familiar?"
        title={<>Maybe you do not need a bigger plan. Maybe you need one result you can use.</>}
        dark={false}
        narrow
      >
        <div className="mf space-y-4" style={{ ...ty("body", false), fontSize: "16px" }}>
          <p>You have the phone, the idea, and probably hundreds of things saved for later. But later keeps moving.</p>
          <p>SSELFIE starts smaller. One photo you like enough to use. Then help turning it into something real, without opening five more tools or starting another course.</p>
        </div>
      </Section>

      {/* CURRENT PRODUCT DEMO - cream */}
      <Section id="how-it-works" eyebrow="One small beginning" title={<>The photo is the door. What you do with it is the point.</>} dark={false}>
        <div className="mf mb-8 max-w-3xl">
          <p style={{ ...ty("body", false), fontSize: "16px" }}>Inside SUITE, Maya works beside your photos and Calendar. She helps you choose a direction, make the pieces, and keep the next step visible.</p>
        </div>
        <SuiteProductWalkthrough />
        <ol className="mt-14 grid gap-8 md:grid-cols-3">
          {[
            { step: "01", title: "See yourself", body: "Start with one clear selfie and a visual direction that still feels recognizable." },
            { step: "02", title: "Make something useful", body: "Create a photo or post you can actually use, instead of another idea sitting in a folder." },
            { step: "03", title: "Keep moving", body: "Bring the visual, the words, and the plan together so you can see what comes next." },
          ].map((item) => (
            <li key={item.step} className="mf border-t border-stone-300 pt-5">
              <span style={{ ...ty("eyebrow", false), marginBottom: "14px" }}>{item.step}</span>
              <h3 style={{ ...ty("h3", false), marginBottom: "10px" }}>{item.title}</h3>
              <p style={{ ...ty("body", false), fontSize: "14px" }}>{item.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* TWO CLEAR DOORS - cream */}
      <Section eyebrow="Start where you are" title={<>Choose the help that fits today.</>} dark={false}>
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="mf min-w-0 flex min-h-[310px] flex-col justify-between" style={cardSx(false)}>
            <div>
              <span style={{ ...ty("eyebrow", false), marginBottom: "14px" }}>One payment · yours to keep</span>
              <h3 style={{ ...ty("h2", false), fontSize: "clamp(28px, 4vw, 42px)", marginBottom: "14px" }}>
                Start with the Prompt Vault.
              </h3>
              <p style={{ ...ty("body", false), fontSize: "15px", maxWidth: "460px" }}>
                Pick a complete photoshoot, copy the prompts, and turn one clear selfie into a set of images that still feel like you.
              </p>
            </div>
            <div className="mt-8">
              <Btn href={vault} surface="cream">Explore the Prompt Vault</Btn>
            </div>
          </article>

          <article className="mf min-w-0 flex min-h-[310px] flex-col justify-between bg-stone-950 p-7 text-white sm:p-9">
            <div>
              <span style={{ ...ty("eyebrow", true), marginBottom: "14px" }}>Ongoing help · €97 a month</span>
              <h3 style={{ ...ty("h2", true), fontSize: "clamp(28px, 4vw, 42px)", marginBottom: "14px" }}>
                Maya helps you create, write, and plan what goes out next.
              </h3>
              <p style={{ ...ty("body", true), fontSize: "15px", maxWidth: "520px" }}>
                One membership. Maya, Create, Calendar, Learn, and the SSELFIE library together. €97 a month.
              </p>
            </div>
            <div className="mt-8">
              <Btn href={suite} surface="dark">See SSELFIE SUITE</Btn>
            </div>
          </article>
        </div>
        <p className="mf mt-6 text-sm leading-6 text-stone-500">
          Want to try one look first? <Link className="underline underline-offset-4" href={freePrompts}>Get the free AI prompt previews.</Link>
        </p>
      </Section>

      {/* FROM SANDRA - cream */}
      <Split
        eyebrow="From Sandra"
        title={<>I built my visibility with my phone, my story, and a lot of figuring it out as I went.</>}
        body={
          <div className="space-y-4">
            <p>Not because everything was perfect. Because I needed a way back to myself, my voice, and my own income.</p>
            <p>I am still building too. But I know how much changes when you can see the next version of yourself before the rest of your life has caught up.</p>
          </div>
        }
        imgSrc={IMG.homeFounder}
        imgAlt="Sandra Aamodt, founder of SSELFIE"
        imgFirst
        dark={false}
        cta={<Btn href={suite} surface="cream">See SSELFIE SUITE</Btn>}
      />

      {/* CTA CLOSE - dark */}
      <CtaClose
        title={<>Start with one photo. Build from there.</>}
        body={<p>You do not need everything figured out. You need one useful beginning and a next step you can see.</p>}
        primary={{ href: vault, label: "Explore the Prompt Vault" }}
        secondary={{ href: suite, label: "See SSELFIE SUITE" }}
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

      {/* HERO - dark */}
      <Hero
        eyebrow="Starter Kit · $37"
        title={<>Stop fighting with every photo of yourself.</>}
        body={<p>If the source photo feels off, everything after it feels harder too. The Starter Kit helps you take, edit, and use one clear selfie so your content has a better place to start.</p>}
        primary={{ href: starterKitCheckoutHref, label: "Get the Starter Kit · $37" }}
        secondary={{ href: "/selfie-guide",        label: "Start with the free guide" }}
        imageSrc={IMG.skHero}
      />

      {/* THE SYSTEM - cream */}
      <Section eyebrow="Why it works" title={<>The problem is not your face. It is the photo you are starting from.</>} dark={false} narrow>
        <div className="mf space-y-4" style={{ ...ty("body", false), fontSize: "16px" }}>
          <p>If the original photo is dark, awkward, blurry, or unfinished, the AI result usually feels random too.</p>
          <p>The Starter Kit shows you how to take, edit, pose, and post AI-ready selfies so your visuals stop feeling fake, flat, or disconnected from you.</p>
          <p>One clearer photo. One cleaner edit. One week of content. No starting from zero.</p>
        </div>
      </Section>

      {/* WHAT IS INSIDE - dark, split with mockup */}
      <Split
        eyebrow="What is inside"
        title={<>The first step before the AI brand shoot.</>}
        body={
          <div>
            {[
              { label: "SSELFIE Lightroom Presets",    note: "A clean starting point for selfies, AI input photos, and everyday brand visuals." },
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
        imgAlt="The Selfie Starter Kit with SSELFIE presets, selfie and posing guides, caption templates, storytelling guide, and seven-day content starter"
        imgFirst
        dark
        cta={<Btn href={starterKitCheckoutHref} surface="dark">Get the Starter Kit · $37</Btn>}
      />

      {/* BEFORE AND AFTER - cream */}
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

      {/* EDITING WALKTHROUGHS - dark */}
      <Section eyebrow="The editing walkthrough" title={<>Make the original photo easier to use.</>} dark>
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

      {/* PRESET COLLECTION - cream, split */}
      <Split
        eyebrow="The preset collection"
        title={<>Cleaner phone photos. Better starting points.</>}
        body={
          <div className="space-y-4">
            <p>Presets do not replace a good photo. They help you make the photo cleaner, more consistent, and easier to use as personal brand content.</p>
            <p>Use them before posting, before building a carousel, or before sending the image into an AI tool.</p>
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
        imgAlt="The three SSELFIE preset families with a before-and-after preview"
        imgFirst
        dark={false}
      />

      {/* ALSO INCLUDED - dark */}
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

      {/* FAQ - cream */}
      <Section eyebrow="FAQ" title={<>A few things people ask.</>} dark={false}>
        <FaqAccordion items={FAQS.starterKit} dark={false} />
      </Section>

      {/* CTA - dark */}
      <CtaClose
        title={<>Start with one photo you can actually use.</>}
        primary={{ href: starterKitCheckoutHref, label: "Get the Starter Kit · $37" }}
        secondary={{ href: "/ai-prompts",          label: "Try the free AI prompts" }}
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

      {/* HERO - dark */}
      <Hero
        eyebrow="Masterclass · $147"
        title={<>You showed up. You took the selfie. Now build what comes next.</>}
        body={<p>Content direction, captions, offer clarity, and a 30-day plan so your photos have somewhere to lead. Sandra&apos;s full method, one time.</p>}
        primary={{ href: masterclassCheckoutHref, label: "Enroll · $147" }}
        secondary={{ href: "/starter-kit",        label: "Start with the Starter Kit" }}
        imageSrc={IMG.pricingBg}
      />

      {/* CLARITY - cream */}
      <Section eyebrow="What's actually happening" title={<>It&apos;s not that you need more motivation. You need positioning before content.</>} dark={false} narrow>
        <div className="mf space-y-4" style={{ ...ty("body", false), fontSize: "16px" }}>
          <p>So you post something, it doesn&apos;t land, and you tell yourself you&apos;re not consistent enough.</p>
          <p>But consistency isn&apos;t the problem. Clarity is.</p>
          <p>That is why Masterclass now starts with your foundation. Know what you sell, who it helps, and what you want to be known for before you build the content rhythm.</p>
        </div>
      </Section>

      {/* MODULES - dark */}
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

      {/* IMPLEMENTATION MAP - cream */}
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

      {/* FOUNDER SPLIT - dark */}
      <Split
        title={<>I built a 100K+ personal brand without a photographer, a studio, or a clue about what I was doing at the start.</>}
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

      {/* WHO IT'S FOR - cream */}
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

      {/* WHAT YOU LEAVE WITH - dark */}
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

      {/* FAQ - cream */}
      <Section eyebrow="FAQ" title="A few things before you enroll." dark={false}>
        <FaqAccordion items={FAQS.masterclass} dark={false} />
      </Section>

      {/* CTA - dark */}
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
  const pageViewTrackedRef = useRef(false)
  const analyticsEnvironment =
    typeof window !== "undefined" && ["sselfie.ai", "www.sselfie.ai"].includes(window.location.hostname)
      ? "production"
      : "non_production"

  useEffect(() => {
    if (pageViewTrackedRef.current) return
    pageViewTrackedRef.current = true
    void trackAnalyticsEvent({
      event: "studio_membership_page_view",
      properties: {
        source: checkoutSource || "direct",
        path: "/join/studio",
        environment: analyticsEnvironment,
      },
    })
  }, [analyticsEnvironment, checkoutSource])

  const trackMembershipCheckoutClick = (placement: "hero" | "pricing" | "closing", destination: string) => {
    void trackAnalyticsEvent({
      event: "studio_membership_page_cta_click",
      properties: {
        source: checkoutSource || "direct",
        placement,
        destination,
        environment: analyticsEnvironment,
      },
    })
  }

  const heroCheckoutHref = `/checkout/membership?interval=month&source=${sourceTop}`
  const pricingCheckoutHref = `/checkout/membership?interval=month&source=${checkoutSource ? `${checkoutSource}_pricing` : "studio_page_pricing"}`
  const closingCheckoutHref = `/checkout/membership?interval=month&source=${sourceBottom}`
  return (
    <PublicPageShell>
      <PublicNav />

      {/* HERO - dark */}
      <Hero
        eyebrow="SSELFIE SUITE · €97/mo"
        title={<>Start with one selfie. Maya helps with the rest.</>}
        body={<p>Create photos that still feel like you. Know what to say. Plan what goes out next. Maya, Create, Calendar, and Learn work together in one monthly membership.</p>}
        primary={{
          href: heroCheckoutHref,
          label: "Join SSELFIE SUITE",
          onClick: () => trackMembershipCheckoutClick("hero", heroCheckoutHref),
        }}
        secondary={{ href: "#how-it-works", label: "See how it works" }}
        imageSrc={IMG.feed}
      />

      {/* THE PAIN - cream */}
      <Section
        eyebrow="Sound familiar?"
        title={<>The hard part is not posting. It is everything you need before you can post.</>}
        dark={false}
        narrow
      >
        <div className="mf space-y-4" style={{ ...ty("body", false), fontSize: "16px" }}>
          <p>You need a photo that feels like you. Words that sound like you. And a plan that does not disappear the second life gets busy.</p>
          <p>So you open five different tools, save more ideas, and still do not know what should go out first.</p>
          <p>SUITE brings the photo, the words, and the plan into one place.</p>
        </div>
      </Section>

      {/* PRODUCT WALKTHROUGH - cream */}
      <Section
        id="how-it-works"
        eyebrow="Maya + Calendar"
        title={<>See the photo, the words, and the week come together.</>}
        dark={false}
      >
        <p className="mf mb-10 max-w-3xl" style={{ ...ty("body", false), fontSize: "16px" }}>
          Maya works beside your content plan. She helps you choose a direction, create the pieces, and move them into a week you can actually see and change.
        </p>
        <SuiteProductWalkthrough />
        <SuiteMultiFormatWalkthrough />
      </Section>

      {/* THREE JOBS - dark */}
      <Section eyebrow="What SUITE helps you do" title={<>Create. Say it clearly. Plan what comes next.</>} dark>
        <div className="grid gap-4 md:grid-cols-3">
          <FCard dark eyebrow="01 · Create" title="Make the visual" body="Start with your own selfie. Build photos, covers, and content pieces around a direction that feels like you." />
          <FCard dark eyebrow="02 · Say" title="Find the words" body="Use Maya to shape captions, hooks, and ideas in plain language, then keep the parts that sound like you." />
          <FCard dark eyebrow="03 · Plan" title="See the week" body="Move your ideas into Calendar, change the order, and know what you are creating next." />
        </div>
        <p className="mf mt-8 max-w-3xl" style={{ ...ty("body", true), fontSize: "14px", color: C.onDarkMuted }}>
          Maya suggests. You review, change, and choose. Nothing has to go out just because AI made it.
        </p>
      </Section>

      {/* EVERYTHING INCLUDED - cream */}
      <Section eyebrow="One membership" title={<>The full working space. €97 a month.</>} dark={false}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FCard dark={false} title="Maya" body="Your AI creative director, working with your brand context and the tools inside SUITE." />
          <FCard dark={false} title="Create + 100 monthly credits" body="Create photos and visual content. Credits reset each month; different creations can use different amounts." />
          <FCard dark={false} title="Calendar" body="Plan your grid and your week, move posts around, and keep the next step visible." />
          <FCard dark={false} title="Learn" body="Personalized help and the deeper SSELFIE lessons when you need more than a quick answer." />
          <FCard dark={false} title="The SSELFIE library" body="Prompt collections, Starter Kit resources, the Masterclass, and current member drops in one place." />
          <FCard dark={false} title="Your account" body="Access after payment, monthly billing, and cancellation from your account when you need it." />
        </div>
        <p className="mf" style={{ ...ty("body", false), fontSize: "16px", marginTop: "32px" }}>
          One public plan. No feature maze. No three tiers to compare.
        </p>
      </Section>

      {/* HONEST AI - dark */}
      <Split
        eyebrow="The honest part"
        title={<>The goal is recognizable. Not a perfect AI stranger.</>}
        body={
          <div className="space-y-4">
            <p>Maya works from your reference selfies and the direction you give her. Clear selfies and clear feedback usually give AI a better chance of keeping you recognizable.</p>
            <p>AI can still get things wrong. Review every result. Change what feels off. You stay the decision-maker.</p>
          </div>
        }
        imgSrc={SUITE_IMG.honest}
        imgAlt="Realistic AI-assisted brand photo that still looks like you"
        dark
      />

      {/* FIT - cream */}
      <Section eyebrow="Is this for you?" title={<>A monthly tool should earn its place in your week.</>} dark={false}>
        <div className="grid gap-4 md:grid-cols-2">
          <article className="mf" style={cardSx(false)}>
            <span style={{ ...ty("eyebrow", false), marginBottom: "14px" }}>SUITE may fit if</span>
            <ul className="space-y-3" style={{ ...ty("body", false), fontSize: "15px" }}>
              <li>· You are building a personal brand around your own face, story, or work.</li>
              <li>· You create often enough to want help with photos, words, and planning.</li>
              <li>· You want one place to keep the direction, not another folder of ideas.</li>
            </ul>
          </article>
          <article className="mf" style={cardSx(false)}>
            <span style={{ ...ty("eyebrow", false), marginBottom: "14px" }}>It may not fit if</span>
            <ul className="space-y-3" style={{ ...ty("body", false), fontSize: "15px" }}>
              <li>· You only need one quick image and do not plan to create again next month.</li>
              <li>· You want someone to post everything for you without your input.</li>
              <li>· You need a promise that AI will make every image perfect on the first try.</li>
            </ul>
          </article>
        </div>
      </Section>

      {/* PROOF - cream (real customer words, before the price) */}
      <Section eyebrow="Real customer words" title={<>Still you. And they feel it.</>} dark={false}>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { quote: "Best one so far. I love that it looks real, and me.", who: "A SSELFIE member · 50 & fabulous" },
            { quote: "I asked Maya to make adjustments and WOW. It's so good.", who: "A SSELFIE member" },
            { quote: "I'm so picky it's not even funny. But this, my God, I'm blown away.", who: "A SSELFIE member" },
          ].map(t => (
            <article key={t.quote} className="mf" style={cardSx(false)}>
              <p style={{ ...ty("body", false), fontSize: "16px", marginBottom: "14px" }}>
                &ldquo;{t.quote}&rdquo;
              </p>
              <span style={ty("eyebrow", false)}>{t.who}</span>
            </article>
          ))}
        </div>
      </Section>

      {/* PRICING - cream */}
      <Section eyebrow="One simple plan" title={<>€97 a month. Everything works together.</>} dark={false} narrow>
        <div className="mf space-y-4" style={{ ...ty("body", false), fontSize: "16px" }}>
          <p>Maya, Create, Calendar, Learn, the SSELFIE library, and 100 credits that reset each month. Different creations can use different amounts of credits.</p>
          <p className="text-sm text-stone-500">Billed monthly in EUR. Access opens after payment. Cancel from your account.</p>
        </div>
        <div className="mf" style={{ marginTop: "32px" }}>
          <Btn
            href={pricingCheckoutHref}
            onClick={() => trackMembershipCheckoutClick("pricing", pricingCheckoutHref)}
            surface="cream"
          >
            Join SSELFIE SUITE · €97/mo
          </Btn>
        </div>
      </Section>

      {/* FAQ - cream */}
      <Section eyebrow="FAQ" title="A few things before you join." dark={false}>
        <FaqAccordion items={FAQS.studio} dark={false} />
      </Section>

      {/* CTA - dark */}
      <CtaClose
        title="Start with one selfie. Build from there."
        body={<p>Maya helps you create the visual, find the words, and see what goes out next.</p>}
        primary={{
          href: closingCheckoutHref,
          label: "Join SSELFIE SUITE · €97/mo",
          onClick: () => trackMembershipCheckoutClick("closing", closingCheckoutHref),
        }}
        dark
      />

      <PublicFooter />
    </PublicPageShell>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

// ─── Inline inquiry form ──────────────────────────────────────────────────────
export function InquiryForm() {
  const [name,         setName]         = useState("")
  const [email,        setEmail]        = useState("")
  const [instagram,    setInstagram]    = useState("")
  const [currentBlock, setCurrentBlock] = useState("")
  const [goal,         setGoal]         = useState("")
  const [currentOffer, setCurrentOffer] = useState("")
  const [investmentReadiness, setInvestmentReadiness] = useState("")
  const [error,        setError]        = useState("")
  const [success,      setSuccess]      = useState(false)
  const [pending,      startTransition] = useTransition()
  const applicationStartedRef = useRef(false)

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
  const trackApplicationStart = () => {
    if (applicationStartedRef.current) return
    applicationStartedRef.current = true
    void trackAnalyticsEvent({
      event: "work_with_me_application_started",
      properties: { source: "work_with_me_form" },
    })
  }
  const handleFormFocus = (event: React.FocusEvent<HTMLFormElement>) => {
    const tagName = (event.target as HTMLElement).tagName
    if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
      trackApplicationStart()
    }
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
            helpFocus: "Build one client-ready online path",
            investmentReadiness,
          }),
        })
        const payload = (await res.json().catch(() => null)) as { error?: string } | null
        if (!res.ok) {
          void trackAnalyticsEvent({
            event: "work_with_me_application_failed",
            properties: { source: "work_with_me_form" },
          })
          setError(payload?.error ?? "Something went wrong. Please try again.")
          return
        }
        void trackAnalyticsEvent({
          event: "work_with_me_application_submitted",
          properties: { source: "work_with_me_form" },
        })
        setSuccess(true)
        setName(""); setEmail(""); setInstagram(""); setCurrentBlock(""); setGoal(""); setCurrentOffer(""); setInvestmentReadiness("")
      } catch {
        void trackAnalyticsEvent({
          event: "work_with_me_application_failed",
          properties: { source: "work_with_me_form" },
        })
        setError("Something went wrong. Please try again.")
      }
    })
  }

  if (success) {
    return (
      <div style={{ ...cardSx(true), textAlign: "center", padding: "40px 28px" }}>
        <p style={{ ...ty("h3", true), marginBottom: "12px" }}>Your application has been sent.</p>
        <p style={ty("body", true)}>I read every application myself. If I believe I can help turn your existing expertise into a clearer path to the right clients, you&apos;ll hear back with the next step. Usually that means a short fit call first.</p>
        <p className="mt-4" style={{ ...ty("body", true), color: C.onDarkMuted }}>No payment has been taken.</p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      onFocusCapture={handleFormFocus}
      style={{ ...cardSx(true), display: "grid", gap: "18px" }}
    >
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
        <span>What is happening online right now that is not working?</span>
        <textarea value={currentBlock} onChange={(e) => setCurrentBlock(e.target.value)} rows={4} required
          style={{ ...inputStyle, minHeight: "110px", resize: "vertical" }} onFocus={onFocus} onBlur={onBlur} />
      </label>
      <label style={{ display: "grid", gap: "7px", fontSize: "13px", color: C.onDarkMuted, fontFamily: F.sans }}>
        <span>If the right clients understood and trusted your work online, what would you want to happen next?</span>
        <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={4} required
          style={{ ...inputStyle, minHeight: "110px", resize: "vertical" }} onFocus={onFocus} onBlur={onBlur} />
      </label>
      <label style={{ display: "grid", gap: "7px", fontSize: "13px", color: C.onDarkMuted, fontFamily: F.sans }}>
        <span>What service are you already selling, what result do you help clients achieve, and what does a good client currently pay?</span>
        <textarea value={currentOffer} onChange={(e) => setCurrentOffer(e.target.value)} rows={3} required
          style={{ ...inputStyle, minHeight: "86px", resize: "vertical" }} onFocus={onFocus} onBlur={onBlur} />
      </label>
      <label style={{ display: "grid", gap: "7px", fontSize: "13px", color: C.onDarkMuted, fontFamily: F.sans }}>
        <span>If it is a fit, are you ready to invest €2,000 paid in full?</span>
        <select required value={investmentReadiness} onChange={(e) => setInvestmentReadiness(e.target.value)} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
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
          // Zero border-radius - SSELFIE Agents system
        }}
      >
        {pending ? "Sending…" : "Apply to Work With Me"}
      </button>
      {error && <p style={{ fontSize: "13px", color: "#f87171", fontFamily: F.sans }}>{error}</p>}
    </form>
  )
}

// ─── Prompt Vault landing ────────────────────────────────────────────────────
export type VaultCollectionCard = {
  id: string
  title: string
  images: Array<{ src: string; alt: string }>
  shotCount: number
}

const VAULT_FAQ = [
  {
    question: "Do I need ChatGPT?",
    answer:
      "Yes. The Prompt Vault gives you ready-to-use prompts for ChatGPT. You upload your selfie, copy one prompt, and create the photo there. ChatGPT's image limits depend on the plan you use.",
  },
  {
    question: "Does every prompt create one photo?",
    answer:
      "Yes. Each prompt creates one photo. A collection gives you a set of prompts for different angles, crops and moments from the same photoshoot.",
  },
  {
    question: "Can I use the prompts more than once?",
    answer:
      "Yes. You can use a prompt again when you want another result, or try it with a different clear selfie.",
  },
  {
    question: "What if a result does not look like me?",
    answer:
      "AI can change small details. Try again with a clear selfie where your face is easy to see, then check every result before you use it. The prompt gives ChatGPT more specific direction, but it cannot promise a perfect result every time.",
  },
  {
    question: "Is it really one payment?",
    answer:
      "Yes. You pay once and receive your private access link by email. Every new Prompt Vault collection I add is included.",
  },
  {
    question: "How do I find the Vault again?",
    answer:
      "Your private access link is sent to the email address you use at checkout. Keep that email and use the same link whenever you want to come back.",
  },
]

function VaultRiskLine({ dark }: { dark: boolean }) {
  return (
    <p style={{ ...ty("body", dark), fontSize: "12px", color: dark ? C.onDarkMuted : C.onCreamMuted, margin: "12px 0 0", maxWidth: "420px" }}>
      One payment. No subscription. Your private access link arrives by email.
    </p>
  )
}

export function PromptVaultPageContent({
  collections,
  collectionCount,
  shotCount,
  priceLabel,
  ctaLabel,
  checkoutFailed = false,
}: {
  collections: VaultCollectionCard[]
  collectionCount: number
  shotCount: number
  priceLabel: string
  ctaLabel: string
  checkoutFailed?: boolean
}) {
  return (
    <PublicPageShell>
      <PublicNav />

      {checkoutFailed && (
        <section className="mf" style={{ background: C.cream, borderBottom: `1px solid ${C.divCream}`, padding: "18px 22px" }}>
          <div style={{ maxWidth: "1120px", margin: "0 auto", display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ minWidth: "240px", flex: "1 1 420px" }}>
              <p style={{ ...ty("eyebrow", false), marginBottom: "6px" }}>Checkout</p>
              <p style={{ ...ty("body", false), margin: 0, fontSize: "14px" }}>
                Your payment form did not open cleanly. Try once more and keep this page open while Stripe loads.
              </p>
            </div>
            <PromptVaultCheckoutLink label="Retry checkout" surface="cream" />
          </div>
        </section>
      )}

      {/* HERO - dark full-bleed */}
      <Hero
        eyebrow="The AI Photo Prompt Vault"
        title={<>Turn one selfie into a complete AI photoshoot.</>}
        body={
          <>
            <p style={{ marginBottom: "14px" }}>
              Choose a photoshoot you love, upload one clear selfie to ChatGPT and copy the prompts.
              Each collection gives you a set of matching photos with different angles, crops and moments.
            </p>
            <p style={{ fontSize: "12px", color: C.onDarkMuted, letterSpacing: "0.04em" }}>
              {collectionCount} collections · {shotCount} copy-and-paste prompts · New drops included · One payment
            </p>
          </>
        }
        primaryNode={<PromptVaultCheckoutLink label={`Get the complete Vault · ${priceLabel}`} placement="hero" />}
        secondary={{ href: "#inside", label: "See what is inside" }}
        imageSrc="/images/ai-prompts/dark-feminine-cafe-shot-3.jpg"
        imageAlt="Dark café editorial portrait from a Prompt Vault photoshoot"
        minHeight="min(860px, 92dvh)"
        imagePosition="50% 25%"
        contentPaddingBottom="52px"
      />

      {/* HOW IT WORKS - cream */}
      <Section eyebrow="How it works" title="Create your photoshoot in three simple steps." dark={false}>
        <div className="grid gap-4 md:grid-cols-3">
          <FCard dark={false} eyebrow="01" title="Choose a photoshoot" body="Start with the collection that gives you the photos you need right now." />
          <FCard dark={false} eyebrow="02" title="Upload one clear selfie" body="Open ChatGPT and add a photo where your face is easy to see." />
          <FCard dark={false} eyebrow="03" title="Copy and create" body="Use the prompts one by one to create a full set of matching photos." />
        </div>
      </Section>

      {/* OFFER SUMMARY - dark */}
      <Section id="inside" eyebrow="Everything inside" title="The complete Prompt Vault." dark>
        <div className="grid gap-px md:grid-cols-2" style={{ background: C.divDark, border: `1px solid ${C.divDark}` }}>
          {[
            [`${collectionCount} complete collections`, "Full photoshoots with matching angles, crops and moments."],
            [`${shotCount} ready-to-use prompts`, "Copy each prompt into ChatGPT with your own selfie."],
            ["A finished example for every prompt", "See the photo you are creating before you start."],
            ["Every new drop included", "New Prompt Vault collections are added to your access."],
          ].map(([title, body]) => (
            <div key={title} className="mf" style={{ background: C.ink, padding: "clamp(24px, 4vw, 38px)" }}>
              <h3 style={{ ...ty("h3", true), marginBottom: "8px" }}>{title}</h3>
              <p style={{ ...ty("body", true), fontSize: "14px", color: C.onDarkMuted }}>{body}</p>
            </div>
          ))}
        </div>
        <div className="mf" style={{ marginTop: "32px" }}>
          <PromptVaultCheckoutLink label={`Get the complete Vault · ${priceLabel}`} placement="offer-summary" />
          <VaultRiskLine dark />
        </div>
      </Section>

      {/* CURATED COLLECTION PREVIEW - cream */}
      <Section id="collections" eyebrow="A look inside the Vault" title="See how each photoshoot continues." dark={false}>
        <p className="mf max-w-3xl" style={{ ...ty("body", false), fontSize: "16px", marginBottom: "40px" }}>
          The free prompts show you the first photo. Here are three different photos from six of the complete collections inside the Vault.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          {collections.map((card) => (
            <article key={card.id} className="mf" style={{ ...cardSx(false), padding: 0, overflow: "hidden" }}>
              <div className="grid grid-cols-[1.35fr_1fr] grid-rows-2 gap-px" style={{ height: "clamp(320px, 55vw, 520px)", background: C.divCream }}>
                {card.images.map((image, index) => (
                  <div key={image.src} className={`relative overflow-hidden ${index === 0 ? "row-span-2" : ""}`}>
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes={index === 0 ? "(min-width: 768px) 28vw, 62vw" : "(min-width: 768px) 20vw, 34vw"}
                      className="object-cover"
                      style={{ objectPosition: "center top" }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ padding: "22px 24px 24px" }}>
                <span style={{ ...ty("eyebrow", false), marginBottom: "8px" }}>{card.shotCount}-photo collection</span>
                <h3 style={{ ...ty("h3", false), textShadow: "none" }}>{card.title}</h3>
              </div>
            </article>
          ))}
        </div>
        <div className="mf" style={{ marginTop: "36px" }}>
          <p style={{ ...ty("body", false), fontSize: "14px", marginBottom: "18px", maxWidth: "620px" }}>
            These are only six of the {collectionCount} collections. Your Vault access includes every current photoshoot and every new drop I add.
          </p>
          <PromptVaultCheckoutLink label={`Get all ${collectionCount} collections · ${priceLabel}`} surface="cream" placement="collection-preview" />
        </div>
      </Section>

      {/* TRUST - dark */}
      <Section eyebrow="Why the prompts help" title="The prompt makes a big difference." dark narrow>
        <div className="mf space-y-4" style={{ ...ty("body", true), fontSize: "16px" }}>
          <p>
            Every prompt already includes the outfit, setting, lighting, composition and mood, so ChatGPT has less to guess.
          </p>
          <p>
            You use your own selfie as the reference. AI can still change small details, so always check your result before you use it and try again with a clearer selfie when needed.
          </p>
        </div>
      </Section>

      {/* FAQ - cream */}
      <Section eyebrow="Quick answers" title="Before you get the Vault." dark={false} narrow>
        <FaqAccordion items={VAULT_FAQ} dark={false} />
      </Section>

      {/* FINAL CTA - dark */}
      <Section eyebrow="The complete Prompt Vault" title={`${priceLabel} once. No subscription.`} dark narrow>
        <ul className="mf" style={{ listStyle: "none", padding: 0, margin: "0 0 30px", display: "flex", flexDirection: "column", gap: "9px" }}>
          {[
            `${collectionCount} complete photoshoot collections`,
            `${shotCount} copy-and-paste prompts`,
            "A finished example for every prompt",
            "Every new Prompt Vault drop included",
            "Private access link sent by email",
          ].map((item) => (
            <li key={item} style={{ ...ty("body", true), fontSize: "15px" }}>
              <span style={{ color: C.onDarkMuted, marginRight: "10px" }}>·</span>
              {item}
            </li>
          ))}
        </ul>
        <PromptVaultCheckoutLink label={ctaLabel} placement="final" />
        <VaultRiskLine dark />
      </Section>

      <PublicFooter />
    </PublicPageShell>
  )
}

// ─── Vault Maya · the vault, made for you ────────────────────────────────────
const VAULT_MAYA_IMAGES = {
  hero: {
    src: `${BLOB}/content-kit/shoots/1785423447575-876892.png`,
    alt: "Golden-hour balcony portrait from the newest SSELFIE Vault collection",
  },
  gallery: [
    {
      src: `${BLOB}/content-kit/shoots/1785427595205-824538.png`,
      alt: "Editorial mirror portrait from Golden Hour Diary",
      label: "Mirror Check",
    },
    {
      src: `${BLOB}/content-kit/shoots/1785423567032-23571.png`,
      alt: "Seaside restaurant portrait from Golden Hour Diary",
      label: "Seaside Wine",
    },
    {
      src: `${BLOB}/content-kit/shoots/1785419724997-206601.png`,
      alt: "Balcony portrait at sunset from Golden Hour Escape",
      label: "Balcony View",
    },
    {
      src: `${BLOB}/content-kit/shoots/1785419807908-245517.png`,
      alt: "Rooftop full-body portrait from Golden Hour Escape",
      label: "Rooftop Arrival",
    },
    {
      src: `${BLOB}/content-kit/shoots/1785421185459-170116.png`,
      alt: "Golden-hour beach close-up from Golden Hour Escape",
      label: "Sunset Close-Up",
    },
    {
      src: `${BLOB}/content-kit/shoots/1784653615998-885482.png`,
      alt: "Rooftop wine portrait from Rooftop Evenings",
      label: "Sunset Wine",
    },
  ],
}

const VAULT_MAYA_FAQ = [
  {
    question: "Will the photos still look like me?",
    answer:
      "Maya is designed to keep you recognisable while changing the setting, outfit and light. AI can still change small details, so check every result before you use it and try again with a clearer selfie when needed.",
  },
  {
    question: "Do I need ChatGPT?",
    answer:
      "No. Everything happens inside Vault Maya. You choose the look and Maya creates it for you.",
  },
  {
    question: "I already own the Prompt Vault. Is Vault Maya included?",
    answer:
      "The Prompt Vault and Vault Maya are separate products. Your Prompt Vault gives you the prompts to use in ChatGPT. Vault Maya creates the photos for you without needing to copy or use the prompts yourself.",
  },
  {
    question: "How do the 30 monthly photos work?",
    answer:
      "Your membership includes 30 photo creations every month. They refresh on your billing date, and unused ones from the previous month expire when they refresh. Photo credits you buy as top-ups are different — they never expire with the monthly refresh.",
  },
  {
    question: "What if 30 photos aren't enough?",
    answer:
      "You can purchase extra photo credits whenever you need them. Your monthly membership will stay the same.",
  },
  {
    question: "What happens if a photo fails?",
    answer:
      "If the creation fails before your photo is made, your credit comes back automatically. If a photo doesn't feel like you, create the look again, and if something is really wrong, reply and I'll make it right.",
  },
  {
    question: "What happens to my selfie?",
    answer:
      "Your selfie is saved to your account and used to create your photos. You can replace it or delete it completely anytime in your studio. Photos you've already created are separate. They stay in your gallery until you remove them.",
  },
  {
    question: "How do I cancel?",
    answer:
      "Open Account & billing inside your Vault Maya studio. You can manage or cancel your membership there without contacting support.",
  },
  {
    question: "Is this the same as SSELFIE Suite?",
    answer:
      "No. Vault Maya is for choosing and creating photos from the Vault. SSELFIE Suite also gives you custom photo creation, content planning, feed design and captions.",
  },
]

export function VaultMayaPageContent({
  shotCount,
  collectionCount,
  founderActive,
}: {
  shotCount: number
  collectionCount: number
  founderActive: boolean
}) {
  useEffect(() => {
    void trackAnalyticsEvent({
      event: "vault_maya_landing_view",
      properties: { surface: "vault_maya_landing" },
    })
  }, [])

  const priceLabel = founderActive ? "$19/month" : "$29/month"

  return (
    <PublicPageShell>
      <PublicNav />

      <section className={vaultMayaStyles.hero}>
        <div className={vaultMayaStyles.heroCopy}>
          <span className={`mf ${vaultMayaStyles.eyebrow}`}>Vault Maya</span>
          <h1 className={`mf ${vaultMayaStyles.heroTitle}`}>
            Create beautiful AI photos without copying a single prompt.
          </h1>
          <p className={`mf ${vaultMayaStyles.heroBody}`}>
            Add one clear selfie, choose the photo you want, and Maya creates it for you inside
            SSELFIE. You do not need ChatGPT or any prompts.
          </p>
          <div className={`mf ${vaultMayaStyles.heroActions}`}>
            <VaultMayaCheckoutLink label={`Join Vault Maya · ${priceLabel}`} surface="cream" />
            <a href="#how-vault-maya-works" className={vaultMayaStyles.textLink}>
              See how it works
            </a>
          </div>
          <p className={`mf ${vaultMayaStyles.heroTerms}`}>
            {founderActive ? "Founder price · " : ""}30 photo creations each month. Cancel from your
            account anytime.
          </p>
        </div>
        <div className={vaultMayaStyles.heroImage}>
          <Image
            src={VAULT_MAYA_IMAGES.hero.src}
            alt={VAULT_MAYA_IMAGES.hero.alt}
            fill
            priority
            sizes="(max-width: 767px) 100vw, 54vw"
            className="object-cover"
          />
          <div className={vaultMayaStyles.heroImageCaption}>
            <span>NEW IN THE VAULT</span>
            <strong>Golden Hour Diary</strong>
          </div>
        </div>
      </section>

      <Section
        eyebrow="Inside Vault Maya"
        title="Choose the photo you wish you already had."
        dark={false}
      >
        <p className={`mf ${vaultMayaStyles.sectionIntro}`}>
          Every photo below is one of the ready-to-create looks inside Vault Maya. Choose the one
          you love, and Maya creates your version.
        </p>
        <div className={vaultMayaStyles.gallery}>
          {VAULT_MAYA_IMAGES.gallery.map((image, index) => (
            <figure
              key={image.src}
              className={`mf ${vaultMayaStyles.galleryCard} ${vaultMayaStyles[`galleryCard${index + 1}` as keyof typeof vaultMayaStyles]}`}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes={
                  index === 0 ? "(max-width: 767px) 100vw, 40vw" : "(max-width: 767px) 50vw, 24vw"
                }
                className="object-cover"
              />
              <figcaption>{image.label}</figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <section id="how-vault-maya-works" className={vaultMayaStyles.demoSection}>
        <PaperTexture dark={false} />
        <div className={vaultMayaStyles.demoInner}>
          <div className={`mf ${vaultMayaStyles.demoCopy}`}>
            <span className={vaultMayaStyles.eyebrow}>How it works</span>
            <h2>You choose the look. Maya handles the prompt.</h2>
            <p>
              Everything happens inside SSELFIE. Add your selfie once, tap any Vault look, and Maya
              creates the photo for you.
            </p>
            <ol className={vaultMayaStyles.steps}>
              <li>
                <span>01</span>
                <div>
                  <strong>Add your selfie</strong>
                  <p>Use one clear photo. You can replace or delete it whenever you want.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>Choose your photo</strong>
                  <p>Every current Vault collection is ready for you to tap.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Save the one you love</strong>
                  <p>Your finished photos stay together in your private gallery.</p>
                </div>
              </li>
            </ol>
            <VaultMayaCheckoutLink label={`Join Vault Maya · ${priceLabel}`} surface="cream" />
          </div>

          <div
            className={`mf ${vaultMayaStyles.studioPreview}`}
            aria-label="Preview of the Vault Maya studio"
          >
            <div className={vaultMayaStyles.studioBar}>
              <div>
                <span>Vault Maya</span>
                <strong>Choose a look</strong>
              </div>
              <span className={vaultMayaStyles.studioCredit}>30 photos</span>
            </div>
            <div className={vaultMayaStyles.studioFeature}>
              <Image
                src={VAULT_MAYA_IMAGES.gallery[4].src}
                alt="Golden Hour Escape look selected inside Vault Maya"
                fill
                sizes="(max-width: 767px) 86vw, 38vw"
                className="object-cover"
              />
              <div className={vaultMayaStyles.studioFeatureLabel}>
                <span>Golden Hour Escape</span>
                <strong>Sunset Close-Up</strong>
              </div>
            </div>
            <div className={vaultMayaStyles.studioThumbs} aria-hidden="true">
              {VAULT_MAYA_IMAGES.gallery.slice(1, 4).map(image => (
                <span key={image.src}>
                  <Image src={image.src} alt="" fill sizes="120px" className="object-cover" />
                </span>
              ))}
            </div>
            <div className={vaultMayaStyles.studioButton}>Create this photo</div>
          </div>
        </div>
      </section>

      <Split
        eyebrow="From Sandra"
        title={<>I made this for the days when you just want the photo.</>}
        dark={false}
        imgFirst
        imgSrc={VAULT_MAYA_IMAGES.gallery[2].src}
        imgAlt={VAULT_MAYA_IMAGES.gallery[2].alt}
        body={
          <div className="space-y-4">
            <p>
              I love the Prompt Vault because it gives you every detail behind the photos. But I
              know there are days when copying prompts into ChatGPT is simply one more thing to do.
            </p>
            <p>
              Vault Maya gives you another option. Choose the photo you want, and Maya creates it
              for you. The Prompt Vault stays exactly as it is. This is the easier way when you want
              the photo made for you.
            </p>
          </div>
        }
      />

      <Section eyebrow="Your membership" title="New photos to create every week." dark={false}>
        <p className={`mf ${vaultMayaStyles.sectionIntro}`}>
          I add new Vault looks every Monday, so there is always something new waiting when you
          need fresh photos.
        </p>
        <div className={vaultMayaStyles.membershipGrid}>
          {[
            [
              `${shotCount}+ photos ready to create`,
              `Choose from every look across all ${collectionCount} current collections.`,
            ],
            [
              "30 photo creations every month",
              "Create the ones you need now and buy more only when you want them.",
            ],
            ["New looks every Monday", "The newest SSELFIE shoot drops appear inside your studio."],
            [
              "Your own private gallery",
              "Keep your finished photos together and save them when you are ready.",
            ],
          ].map(([title, body]) => (
            <article key={title} className={`mf ${vaultMayaStyles.membershipItem}`}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Choose what suits you"
        title="The Prompt Vault and Vault Maya are two different ways to create."
        dark={false}
      >
        <div className={vaultMayaStyles.compareGrid}>
          <article className={`mf ${vaultMayaStyles.compareCard}`}>
            <span>Prompt Vault</span>
            <h3>You want the prompts.</h3>
            <p>Copy the complete prompts into ChatGPT and keep the Vault as a one-time purchase.</p>
          </article>
          <article
            className={`mf ${vaultMayaStyles.compareCard} ${vaultMayaStyles.compareCardSelected}`}
          >
            <span>Vault Maya</span>
            <h3>You want the photo created for you.</h3>
            <p>Choose a look inside SSELFIE and let Maya handle the prompt and creation.</p>
          </article>
        </div>
      </Section>

      <Section
        eyebrow={founderActive ? "Founder membership" : "Vault Maya membership"}
        title={priceLabel}
        dark
        narrow
      >
        <div className={`mf ${vaultMayaStyles.priceCopy}`}>
          {founderActive ? (
            <p>
              Founding members keep the $19 monthly price for as long as the membership stays
              active. The standard price for new members will be $29/month.
            </p>
          ) : (
            <p>Your membership includes 30 photo creations every month and every Vault look.</p>
          )}
          <ul>
            <li>30 monthly photo creations</li>
            <li>Every current collection and each new Monday drop</li>
            <li>Unused monthly photos expire when they refresh</li>
            <li>Purchased top-up credits do not expire</li>
            <li>Manage or cancel from your account anytime</li>
          </ul>
          <VaultMayaCheckoutLink label={`Join Vault Maya · ${priceLabel}`} />
          <p className={vaultMayaStyles.supportLine}>
            If you need help, reply to your email and you will reach a real person. Usually me.
          </p>
        </div>
      </Section>

      <Section eyebrow="Questions you might have" title="Before you join." dark={false} narrow>
        <FaqAccordion items={VAULT_MAYA_FAQ} dark={false} />
      </Section>

      <section className={vaultMayaStyles.final}>
        <div className={`mf ${vaultMayaStyles.finalInner}`}>
          <span className={vaultMayaStyles.eyebrow}>Vault Maya</span>
          <h2>Choose your first photo with Maya.</h2>
          <p>One selfie, every Vault collection, and 30 photo creations each month.</p>
          <VaultMayaCheckoutLink label={`Join Vault Maya · ${priceLabel}`} />
        </div>
      </section>

      <PublicFooter />
    </PublicPageShell>
  )
}

// ─── Work With Me · Private 4-Week Sprint ────────────────────────────────────
export function WorkWithMePageContent() {
  return (
    <PublicPageShell>
      <PublicNav />

      {/* HERO - dark, full-bleed */}
      <Hero
        eyebrow="Work With Me · Five Private Places"
        title={<>You are already good at what you do. Let&apos;s make that easier for the right clients to see, trust, and choose.</>}
        body={
          <div className="space-y-3">
            <p>In real life, people meet you and understand why your work matters. Online, that same experience can disappear inside a vague bio, inconsistent content, and too many ideas that never connect.</p>
            <p>I help you turn the service you already deliver into one client-ready online path. Together, we make it easier for the right clients to take the next step because they understand your value and trust your expertise.</p>
          </div>
        }
        primary={{ href: "#inquiry", label: "Apply to Work With Me" }}
        imageSrc={IMG.wwmHero}
      />

      {/* RECOGNITION - cream */}
      <Section
        eyebrow="Maybe this is where you are"
        title={<>You are not struggling because you are bad at your work. You are struggling to make that value clear online.</>}
        dark={false}
        narrow
      >
        <div className="mf space-y-4" style={{ ...ty("body", false), fontSize: "16px" }}>
          <p>You know how to help people. You may already get referrals, repeat clients, or the kind of results that are easy to explain in a real conversation.</p>
          <p>But open Instagram and suddenly the words disappear. What should you post? How do you explain everything you do? How do you invite someone to work with you without sounding pushy?</p>
          <p>So you rewrite your bio, save more ideas, post when you have time, and hope the right person understands. But when your message, visuals, service, and next step do not connect, she has to work too hard to see why you are right for her.</p>
          <p style={{ color: C.onCream }}>Most people will not do that work. They leave, even when you may have been exactly the person they needed.</p>
        </div>
      </Section>

      {/* THE STORY - dark */}
      <Split
        eyebrow="From Sandra"
        title={<>I know what it feels like to have real experience and still look invisible online.</>}
        body={
          <div className="space-y-4">
            <p>I spent years working closely with women. I knew how to see what was special in someone, make her feel comfortable, and turn an idea into something she could finally see for herself.</p>
            <p>But when I had to build online, I did not know how all those skills fit together. I had experience. I had a story. I had things I could teach. None of it looked clear from the outside.</p>
            <p>I started with my phone and one selfie. Then I learned how to connect the photo to a story, the story to trust, and that trust to something useful people could buy.</p>
            <p>Some of my selfies reached millions of people. But attention alone was never the real answer. It became valuable when women could understand what I knew, trust how I saw things, and see a clear next step.</p>
            <p>That is the gap I help you close. Not by turning you into a different person, but by making the value that is already there much easier to see.</p>
          </div>
        }
        imgSrc={IMG.wwmFounder}
        imgAlt="Sandra, founder of SSELFIE"
        imgFirst
        dark
        cta={<Btn href="#inquiry" surface="dark" ghost>Apply to Work With Me</Btn>}
      />

      {/* TRANSFORMATION - dark */}
      <Section
        eyebrow="The one problem we solve"
        title={<>We turn the gap between what you know and what people understand into one client-ready online path.</>}
        dark
      >
        <div className="mf space-y-4" style={{ ...ty("body", true), fontSize: "16px" }}>
          <p>We take one service that already works in real life and make it easier for the right client to understand online. Then we connect your positioning, profile, offer page, visuals, content, and invitation around one clear next step.</p>
          <p>Imagine the right woman finding your profile and quickly thinking: she understands my problem, I trust the way she talks about it, and I know exactly how to ask for help.</p>
          <p>This is not a promise of clients or income. It is the client-ready foundation that needs to exist before your visibility has a fair chance to become a real client inquiry.</p>
        </div>
      </Section>

      {/* HOW I WORK - cream */}
      <Split
        eyebrow="How I work"
        title={<>I build the first version before our first call.</>}
        body={
          <div className="space-y-4">
            <p>I do not want to spend our first call asking you to fill in another workbook. Before we talk, I spend two weeks inside your service, current clients, market, message, and online presence.</p>
            <p>I look for the strongest reason someone chooses you, the words your client already understands, and the places where your current message is losing her.</p>
            <p>Then I prepare the first version of your positioning, core message, offer page copy, Instagram profile copy, simple inquiry path, and four weeks of content drafts that teach, build trust, and lead to one clear invitation. AI helps me move faster. My judgment, experience, and eye decide what belongs.</p>
            <p>By the time we get on our first call, you are not staring at a blank page. You are reacting to thoughtful work built around your real business.</p>
          </div>
        }
        imgSrc={IMG.wwmHowIWork}
        imgAlt="Sandra researching and building inside a client's business"
        dark={false}
        cta={<Btn href="#inquiry" surface="cream">Apply to Work With Me</Btn>}
      />

      {/* WHY THIS IS DIFFERENT - dark */}
      <Split
        eyebrow="What we are not doing"
        title={<>We are not rebuilding your whole business.</>}
        body={
          <div className="space-y-4">
            <p>We focus on one existing service, one specific client, one problem she already wants solved, and one clear path to an inquiry. Your website, photos, profile, and content only change when they help that path.</p>
            <p>We are not fixing every part of your business. We are not chasing followers. And I am not giving you a pile of prompts you could ask ChatGPT for yourself.</p>
            <p style={{ color: C.onDark }}>You are paying for focused judgment, personal research, real preparation, visual direction, and a first version built for you. Anything that does not help the right client understand, trust, or contact you waits.</p>
          </div>
        }
        imgSrc={IMG.wwmEditorial}
        imgAlt="Editorial AI-assisted brand photo used in the SSELFIE visual system"
        imgFirst
        dark
        cta={<Btn href="#inquiry" surface="dark" ghost>Apply to Work With Me</Btn>}
      />

      {/* THE SPRINT / OFFER - cream */}
      <Split
        eyebrow="The sprint"
        title={<>Five private places. &euro;2,000 paid in full.</>}
        body={
          <div className="space-y-4">
            <p>No payment is taken when you apply. If I believe I can help, we do a short fit call first. The €2,000 payment is only sent after that conversation.</p>
            <p>Then I take two weeks to research and build the first version. We follow that with four weekly 45-minute calls where we refine the work against your real business, your real clients, and what you can realistically keep using.</p>
            <p>You leave with one service positioned for one specific client, your core message, offer page copy, Instagram profile copy, a simple inquiry path, and four weeks of content drafts that teach, build trust, and lead to one clear invitation.</p>
            <p style={{ color: C.onCreamMuted }}>This is best for an experienced service provider whose work already creates value. It is not for a brand-new idea, and it is not a promise of clients or income.</p>
          </div>
        }
        imgSrc={IMG.wwmApplication}
        imgAlt="Applying to work with Sandra"
        dark={false}
        cta={<Btn href="#inquiry" surface="cream">Apply to Work With Me</Btn>}
      />

      {/* FAQ - cream */}
      <Section eyebrow="Questions" title="Before you apply" dark={false} narrow>
        <FaqAccordion items={FAQS.visibilityToPaid} dark={false} />
      </Section>

      {/* INQUIRY FORM - dark */}
      <section id="inquiry" style={{ position: "relative", background: C.ink, padding: "clamp(60px, 8vw, 88px) clamp(18px, 4vw, 24px)", overflow: "hidden", scrollMarginTop: "60px" }}>
        <PaperTexture dark />
        <div className="max-w-5xl mx-auto grid gap-14 md:grid-cols-2 md:items-start relative" style={{ zIndex: 2 }}>
          <div className="mf">
            <span style={{ ...ty("eyebrow", true), marginBottom: "14px" }}>Application</span>
            <h2 style={{ ...ty("h2", true), marginBottom: "16px" }}>Apply to make your expertise easier to choose</h2>
            <p style={{ ...ty("body", true), fontSize: "16px" }}>Tell me about the service you already deliver, where your online presence feels disconnected from the quality of your work, and what you want the right client to do next.</p>
            <div className="mt-8" style={{ ...cardSx(true), padding: "20px" }}>
              <p style={{ ...ty("body", true), fontSize: "13px", color: C.onDarkMuted }}>
                <span style={{ color: C.onDarkSub }}>No payment is taken here.</span> If your application looks like the right fit, I&apos;ll reply with the next step. Usually that means a short fit call first.
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
