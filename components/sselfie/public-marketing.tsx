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
  hero: `${BLOB}/sandra-portrait-after.jpg`,
  homeHero: "/academy/visibility-suite/sandra-hero.webp",
  homeFounder: "/academy/visibility-suite/sandra-founder.webp",
  homeStudio: "/academy/visibility-suite/hero.webp",
  homeSelfie: "/images/selfie-guide/img-editorial-dark.webp",
  before: `${BLOB}/sandra-portrait-before.jpg`,
  after: `${BLOB}/sandra-portrait-after.jpg`,
  founder: `${BLOB}/maya-pro-generations/c8cjbbd6ehrmt0cvhqasfj7q30-CVfFXH8JOv3NtYQFMbPU0opeNPo6De.png`,
  feed: `${BLOB}/maya-pro-generations/6sb8n7v1g9rmr0cvhyjr95kg5g-5IoNZKlXP8Umw6U040gkJeTer43jLY.png`,
  dark: `${BLOB}/maya-generations/8227-Y8Hi0TmnDBrZmgOGBbRXt1jk4eigZR.png`,
  pricingBg: `${BLOB}/maya-pro-generations/xjn21cxbtdrmt0cvdxpsx38cnw-Z4oXOAZDQKa9g4KGDjiEYtRGQl5moM.png`,
  whoItsFor: `${BLOB}/tmpbmq4nfg7.png`,
  presetBeige: `${BLOB}/Beige%20Aesthetic.png`,
  presetLight: `${BLOB}/Light%20%26%20Minimalistic.png`,
  presetDark: `${BLOB}/darkandmoody.png`,
  // Starter Kit local assets
  skHero: "/images/starter-kit/hero.png",
  skMockup: "/images/starter-kit/starter-kit-product-mockup-v3.webp",
  skPresetColl: "/images/starter-kit/preset-collection-vertical-v3.webp",
  skLifestyle: "/images/starter-kit/lifestyle.png",
  skBaLightDreamy: "/images/starter-kit/ba-light-dreamy.png",
  skBaNordicDeep: "/images/starter-kit/ba-nordic-deep.png",
  skBaDarkMoody: "/images/starter-kit/ba-dark-moody.png",
  // Work With Me sprint assets
  wwmHero: "/images/work-with-me/sprint-hero-new.webp",
  wwmFounder: "/images/work-with-me/sandra-founder-new.webp",
  wwmHowIWork: "/images/work-with-me/sandra-how-i-work-new.webp",
  wwmEditorial: "/images/work-with-me/sprint-editorial-new.webp",
  wwmApplication: "/images/work-with-me/sprint-application-new.webp",
}

// SUITE landing assets - Sandra-approved vault collection images (BRIDGE-01 Phase B)
const SUITE_IMG = {
  honest: "/images/ai-prompts/clean-girl-morning-shot-1.jpg",
}

// ─── SSELFIE Noir Glass channel tokens ───────────────────────────────────────
const C = {
  // Core surfaces
  obsidian: "var(--ss-brand-obsidian)",
  graphite: "var(--ss-brand-graphite)",
  pearl: "var(--ss-brand-pearl)",
  paper: "var(--ss-brand-paper)",
  coolMist: "var(--ss-brand-cool-mist)",
  steel: "var(--ss-brand-steel)",
  // Text on dark
  onDark: "var(--ss-brand-paper)",
  onDarkSub: "var(--ss-brand-silver)",
  onDarkMuted: "var(--ss-brand-steel)",
  // Text on Pearl or Paper
  onLight: "var(--ss-brand-obsidian)",
  onLightSub: "var(--ss-brand-slate)",
  onLightMuted: "var(--ss-brand-steel)",
  // Dividers
  divDark: "color-mix(in srgb, var(--ss-brand-silver) 16%, transparent)",
  divDarkSoft: "color-mix(in srgb, var(--ss-brand-silver) 9%, transparent)",
  divDarkStrong: "color-mix(in srgb, var(--ss-brand-silver) 26%, transparent)",
  divLight: "color-mix(in srgb, var(--ss-brand-obsidian) 10%, transparent)",
  // Hero overlay
  heroGrad:
    "linear-gradient(to bottom, color-mix(in srgb, var(--ss-brand-obsidian) 34%, transparent) 0%, color-mix(in srgb, var(--ss-brand-obsidian) 10%, transparent) 38%, color-mix(in srgb, var(--ss-brand-obsidian) 90%, transparent) 100%)",
}

const F = {
  serif: "'Cormorant Garamond', Georgia, serif",
  sans: "var(--ss-brand-sans, Manrope, Inter, -apple-system, sans-serif)",
}

// ─── Letterpress text shadows ─────────────────────────────────────────────────
const LP = {
  dark: "0 2px 8px rgba(0,0,0,0.8), 0 -1px 0 rgba(255,255,255,0.06), 1px 1px 0 rgba(0,0,0,0.5)",
  light: "1px 2px 3px rgba(255,255,255,0.88), -1px -1px 2px rgba(10,10,10,0.08)",
}

// ─── Typography ───────────────────────────────────────────────────────────────
function ty(variant: "eyebrow" | "h1" | "h2" | "h3" | "body", dark: boolean): React.CSSProperties {
  const d = dark
  switch (variant) {
    case "eyebrow":
      return {
        fontFamily: F.sans,
        fontSize: "10px",
        letterSpacing: "0.5em",
        textTransform: "uppercase",
        color: d ? C.onDarkMuted : C.onLightMuted,
        display: "block",
      }
    case "h1":
      return {
        fontFamily: F.serif,
        fontWeight: 300,
        fontSize: "clamp(36px, 7vw, 70px)",
        lineHeight: 1.03,
        letterSpacing: "-0.02em",
        color: d ? C.onDark : C.onLight,
        textShadow: d ? LP.dark : LP.light,
      }
    case "h2":
      return {
        fontFamily: F.serif,
        fontWeight: 300,
        fontSize: "clamp(28px, 4.5vw, 48px)",
        lineHeight: 1.07,
        letterSpacing: "-0.015em",
        color: d ? C.onDark : C.onLight,
        textShadow: d ? LP.dark : LP.light,
      }
    case "h3":
      return {
        fontFamily: F.serif,
        fontWeight: 300,
        fontSize: "clamp(19px, 2.5vw, 26px)",
        lineHeight: 1.18,
        color: d ? C.onDark : C.onLight,
        textShadow: d ? LP.dark : LP.light,
      }
    case "body":
      return {
        fontFamily: F.sans,
        fontSize: "15px",
        lineHeight: 1.78,
        fontWeight: 400,
        color: d ? C.onDarkSub : C.onLightSub,
      }
  }
}

// ─── Paper texture SVG defs (mounted once in shell) ──────────────────────────
function SvgPaperDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }} aria-hidden>
      <defs>
        <filter id="sa-noise-dark" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <filter id="sa-noise-light" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="4"
            stitchTiles="stitch"
          />
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
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        opacity: dark ? 0.055 : 0.18,
        mixBlendMode: (dark ? "screen" : "multiply") as React.CSSProperties["mixBlendMode"],
        zIndex: 1,
      }}
    >
      <rect width="100%" height="100%" filter={`url(#sa-noise-${dark ? "dark" : "light"})`} />
    </svg>
  )
}

// ─── Card helpers ─────────────────────────────────────────────────────────────
function cardSx(dark: boolean, padded = true): React.CSSProperties {
  return {
    background: dark ? C.graphite : C.paper,
    border: `1px solid ${dark ? C.divDark : C.divLight}`,
    padding: padded ? "28px" : "16px",
    boxShadow: dark
      ? "inset 0 1px 0 rgba(255,255,255,0.035)"
      : "inset 0 1px 0 rgba(255,255,255,0.7), 0 2px 12px rgba(0,0,0,0.05)",
  }
}

// ─── Before / After drag slider ──────────────────────────────────────────────
function BeforeAfterSlider({
  before,
  after,
  beforeLabel = "Before",
  afterLabel = "After",
}: {
  before: string
  after: string
  beforeLabel?: string
  afterLabel?: string
}) {
  const [pos, setPos] = useState(50)
  return (
    <div
      className="mf relative overflow-hidden select-none"
      style={{ aspectRatio: "3/4", cursor: "ew-resize", touchAction: "none" }}
    >
      <img
        src={after}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <img
          src={before}
          alt={beforeLabel}
          className="absolute inset-0 h-full object-cover"
          style={{ width: `${10000 / pos}%`, maxWidth: "none" }}
          draggable={false}
        />
      </div>
      {/* Divider line + handle */}
      <div
        className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none"
        style={{ left: `${pos}%`, transform: "translateX(-50%)", zIndex: 10 }}
      >
        <div
          className="w-px h-full"
          style={{ background: "color-mix(in srgb, var(--ss-brand-paper) 65%, transparent)" }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center"
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "50%",
            background: "color-mix(in srgb, var(--ss-brand-paper) 95%, transparent)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.45)",
          }}
        >
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
            <path
              d="M1 5h12M1 5L4 2M1 5l3 3M13 5l-3-3M13 5l-3 3"
              stroke={C.obsidian}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      {/* Labels */}
      <span
        className="absolute top-4 left-4 pointer-events-none"
        style={{
          ...ty("eyebrow", true),
          color: "color-mix(in srgb, var(--ss-brand-paper) 85%, transparent)",
          background: "color-mix(in srgb, var(--ss-brand-obsidian) 50%, transparent)",
          padding: "4px 10px",
        }}
      >
        {beforeLabel}
      </span>
      <span
        className="absolute top-4 right-4 pointer-events-none"
        style={{
          ...ty("eyebrow", true),
          color: "color-mix(in srgb, var(--ss-brand-paper) 85%, transparent)",
          background: "color-mix(in srgb, var(--ss-brand-obsidian) 50%, transparent)",
          padding: "4px 10px",
        }}
      >
        {afterLabel}
      </span>
      <input
        type="range"
        min={2}
        max={98}
        value={pos}
        onChange={e => setPos(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
        style={{ zIndex: 20 }}
      />
    </div>
  )
}

// ─── Button ───────────────────────────────────────────────────────────────────
function Btn({
  href,
  onClick,
  children,
  ghost = false,
  full = false,
  disabled = false,
  surface = "dark",
}: {
  href?: string
  onClick?: () => void
  children: ReactNode
  ghost?: boolean
  full?: boolean
  disabled?: boolean
  surface?: "dark" | "light"
}) {
  const dark = surface === "dark"
  // Solid: Pearl button on dark; Obsidian button on Pearl or Paper.
  const solidBg = dark ? C.pearl : "var(--ss-brand-obsidian)"
  const solidText = dark ? C.obsidian : C.pearl
  const solidShadow = dark
    ? "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)"
    : "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -2px 0 rgba(0,0,0,0.45), 0 1px 5px rgba(0,0,0,0.25)"
  const ghostBorder = dark
    ? "color-mix(in srgb, var(--ss-brand-silver) 22%, transparent)"
    : "color-mix(in srgb, var(--ss-brand-obsidian) 22%, transparent)"
  const ghostText = dark ? C.onDarkSub : C.onLightSub

  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "13px 32px",
    minHeight: "46px",
    background: ghost ? "transparent" : solidBg,
    color: ghost ? ghostText : solidText,
    fontSize: "10px",
    fontFamily: F.sans,
    fontWeight: 600,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    textDecoration: "none",
    border: `1px solid ${ghost ? ghostBorder : "transparent"}`,
    boxShadow: ghost ? "none" : solidShadow,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "opacity 0.2s, box-shadow 0.2s",
    width: full ? "100%" : "fit-content",
    opacity: disabled ? 0.5 : 1,
    whiteSpace: "nowrap",
    // Deliberate square editorial marketing CTA; not the default product-control radius.
  }

  if (href)
    return (
      <Link href={href} style={base} onClick={onClick}>
        {children}
      </Link>
    )
  return (
    <button onClick={onClick} style={base} disabled={disabled}>
      {children}
    </button>
  )
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

  ATTRIBUTION_PARAMS_TO_PRESERVE.forEach(key => {
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
      entries =>
        entries.forEach(e => {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement
            el.style.opacity = "1"
            el.style.transform = "translateY(0)"
          }
        }),
      { threshold: 0.08 }
    )
    document.querySelectorAll(".mf").forEach(el => {
      const h = el as HTMLElement
      h.style.opacity = "0"
      h.style.transform = "translateY(20px)"
      h.style.transition = "opacity 0.7s ease, transform 0.7s ease"
      io.observe(h)
    })
    return () => io.disconnect()
  }, [])

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.obsidian,
        overflowX: "hidden",
        color: C.onDark,
        fontFamily: F.sans,
      }}
    >
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
        background: C.obsidian,
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
        height: "58px",
        background: "color-mix(in srgb, var(--ss-brand-obsidian) 88%, transparent)",
        backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${C.divDark}`,
      }}
    >
      <div className="flex min-w-0 items-center gap-6">
        <Link
          href="/"
          style={{
            fontFamily: F.serif,
            fontSize: "18px",
            color: C.onDark,
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            fontWeight: 300,
            textDecoration: "none",
          }}
        >
          SSELFIE
        </Link>
        <PublicNeonSignature className="hidden lg:inline-block" />
      </div>

      <PublicNeonSignature
        centered
        className="pointer-events-none absolute left-1/2 top-1/2 lg:hidden"
      />

      <nav aria-label="Main navigation" className="hidden lg:flex items-center gap-7">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            style={{ ...ty("eyebrow", true), textDecoration: "none" }}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        <span className="hidden lg:block">
          <Link href={loginHref} style={{ ...ty("eyebrow", true), textDecoration: "none" }}>
            Login
          </Link>
        </span>
        <span className="hidden lg:block">
          <Btn href="/ai-prompts" surface="dark">
            Start Free
          </Btn>
        </span>
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
            <Link
              href={loginHref}
              className="flex min-h-12 items-center justify-between border-b border-white/10 text-[11px] uppercase tracking-[0.22em] text-white"
              onClick={() => setMenuOpen(false)}
            >
              Login
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  )
}

function PublicNeonSignature({
  centered = false,
  className = "",
}: {
  centered?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        color: "var(--ss-brand-pearl-neon)",
        fontFamily: "var(--ss-brand-signature)",
        fontSize: "clamp(0.95rem, 1.4vw, 1.35rem)",
        lineHeight: 0.9,
        position: centered ? "absolute" : "relative",
        textShadow:
          "0 0 2px rgba(255,246,224,0.96), 0 0 8px var(--ss-brand-pearl-neon-glow), 0 0 18px rgba(215,182,126,0.28)",
        transform: centered ? "translate(-50%, -50%) rotate(-3deg)" : "rotate(-3deg)",
        whiteSpace: "nowrap",
      }}
    >
      Worth posting.
      <i
        style={{
          background: "var(--ss-brand-pearl-neon)",
          borderRadius: "50%",
          boxShadow: "0 0 4px rgba(255,246,224,0.95), 0 0 10px var(--ss-brand-pearl-neon-glow)",
          height: 3,
          position: "absolute",
          right: -8,
          top: -2,
          width: 3,
        }}
      />
    </span>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
export function PublicFooter() {
  return (
    <footer
      style={{
        background: C.obsidian,
        borderTop: `1px solid ${C.divDark}`,
        padding: "56px 24px 40px",
      }}
    >
      <div className="max-w-5xl mx-auto flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <p
          style={{
            fontFamily: F.serif,
            fontSize: "19px",
            color: C.onDark,
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            fontWeight: 300,
          }}
        >
          SSELFIE
        </p>
        <div className="flex flex-wrap gap-6">
          {[
            "/ai-prompts:Free AI Prompts",
            "/prompt-vault:Prompt Vault",
            "/join/studio:SSELFIE SUITE",
          ].map(s => {
            const [href, label] = s.split(":")
            return (
              <Link
                key={href}
                href={href}
                style={{ ...ty("eyebrow", true), textDecoration: "none" }}
              >
                {label}
              </Link>
            )
          })}
        </div>
      </div>
      <div
        className="max-w-5xl mx-auto mt-8 pt-5 flex gap-6"
        style={{ borderTop: `1px solid ${C.divDark}` }}
      >
        <span style={ty("eyebrow", true)}>© 2026 SSELFIE Studio</span>
        {["/terms:Terms", "/privacy:Privacy"].map(s => {
          const [href, label] = s.split(":")
          return (
            <Link key={href} href={href} style={{ ...ty("eyebrow", true), textDecoration: "none" }}>
              {label}
            </Link>
          )
        })}
      </div>
    </footer>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero({
  eyebrow,
  title,
  body,
  primary,
  primaryNode,
  secondary,
  imageSrc,
  imageAlt = "",
  minHeight = "100dvh",
  imagePosition = "50% 22%",
  contentPaddingBottom = "68px",
}: {
  eyebrow: string
  title: ReactNode
  body: ReactNode
  primary?: { href: string; label: string; onClick?: () => void }
  primaryNode?: ReactNode
  secondary?: { href: string; label: string }
  imageSrc: string
  imageAlt?: string
  minHeight?: string
  imagePosition?: string
  contentPaddingBottom?: string
}) {
  return (
    <section
      className="relative"
      style={{ minHeight, overflow: "hidden", display: "flex", flexDirection: "column" }}
    >
      <img
        src={imageSrc}
        alt={imageAlt}
        aria-hidden={imageAlt ? undefined : true}
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: imagePosition }}
      />
      <div className="absolute inset-0" style={{ background: C.heroGrad }} />
      <PaperTexture dark />

      <div
        className="relative flex flex-col items-center justify-end text-center flex-1"
        style={{ padding: `0 20px ${contentPaddingBottom}`, paddingTop: "80px", zIndex: 2 }}
      >
        <div className="max-w-2xl mx-auto w-full">
          <span className="mf inline-block mb-5" style={ty("eyebrow", true)}>
            {eyebrow}
          </span>
          <h1 className="mf mb-5" style={{ ...ty("h1", true), transitionDelay: "0.05s" }}>
            {title}
          </h1>
          <div
            className="mf mb-8 mx-auto"
            style={{
              ...ty("body", true),
              color: C.onDarkSub,
              maxWidth: "480px",
              transitionDelay: "0.1s",
            }}
          >
            {body}
          </div>
          <div
            className="mf flex flex-col sm:flex-row gap-3 items-center justify-center"
            style={{ transitionDelay: "0.15s" }}
          >
            {primaryNode ??
              (primary && (
                <Btn href={primary.href} onClick={primary.onClick} surface="dark">
                  {primary.label}
                </Btn>
              ))}
            {secondary && (
              <Btn href={secondary.href} ghost surface="dark">
                {secondary.label}
              </Btn>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({
  eyebrow,
  title,
  children,
  dark = true,
  narrow = false,
  id,
}: {
  eyebrow?: string
  title?: ReactNode
  children: ReactNode
  dark?: boolean
  narrow?: boolean
  id?: string
}) {
  const surface = dark ? C.obsidian : C.pearl
  return (
    <section
      id={id}
      style={{
        position: "relative",
        background: surface,
        padding: "clamp(60px, 8vw, 88px) clamp(18px, 4vw, 24px)",
        overflow: "hidden",
        scrollMarginTop: "60px",
      }}
    >
      <PaperTexture dark={dark} />
      <div
        className={`mx-auto relative ${narrow ? "max-w-3xl" : "max-w-6xl"}`}
        style={{ zIndex: 2 }}
      >
        {eyebrow && (
          <span className="mf block mb-4" style={ty("eyebrow", dark)}>
            {eyebrow}
          </span>
        )}
        {title && (
          <h2 className="mf mb-10" style={ty("h2", dark)}>
            {title}
          </h2>
        )}
        {children}
      </div>
    </section>
  )
}

// ─── Split (text + image) ────────────────────────────────────────────────────
function Split({
  eyebrow,
  title,
  body,
  imgSrc,
  imgAlt = "",
  imgFirst = false,
  dark = true,
  cta,
}: {
  eyebrow?: string
  title?: ReactNode
  body: ReactNode
  imgSrc: string
  imgAlt?: string
  imgFirst?: boolean
  dark?: boolean
  cta?: ReactNode
}) {
  const surface = dark ? C.obsidian : C.pearl
  const img = (
    <div className="mf relative overflow-hidden" style={{ aspectRatio: "4/5" }}>
      <img
        src={imgSrc}
        alt={imgAlt}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background: dark
            ? "linear-gradient(to bottom, color-mix(in srgb, var(--ss-brand-obsidian) 4%, transparent) 0%, color-mix(in srgb, var(--ss-brand-obsidian) 30%, transparent) 100%)"
            : "linear-gradient(to bottom, color-mix(in srgb, var(--ss-brand-paper) 4%, transparent) 0%, color-mix(in srgb, var(--ss-brand-silver) 20%, transparent) 100%)",
        }}
      />
    </div>
  )
  const txt = (
    <div className="mf flex flex-col justify-center gap-5" style={{ transitionDelay: "0.05s" }}>
      {eyebrow && <span style={ty("eyebrow", dark)}>{eyebrow}</span>}
      {title && <h2 style={{ ...ty("h2", dark), marginBottom: "4px" }}>{title}</h2>}
      <div style={{ ...ty("body", dark), fontSize: "16px" }}>{body}</div>
      {cta && <div className="mt-1">{cta}</div>}
    </div>
  )
  return (
    <section
      style={{
        position: "relative",
        background: surface,
        padding: "clamp(60px, 8vw, 88px) clamp(18px, 4vw, 24px)",
        overflow: "hidden",
      }}
    >
      <PaperTexture dark={dark} />
      <div
        className="max-w-6xl mx-auto grid gap-14 md:grid-cols-2 md:items-center relative"
        style={{ zIndex: 2 }}
      >
        {imgFirst ? (
          <>
            {img}
            {txt}
          </>
        ) : (
          <>
            {txt}
            {img}
          </>
        )}
      </div>
    </section>
  )
}

// ─── CTA close ────────────────────────────────────────────────────────────────
function CtaClose({
  title,
  body,
  primary,
  secondary,
  dark = true,
}: {
  title: ReactNode
  body?: ReactNode
  primary: { href: string; label: string; onClick?: () => void }
  secondary?: { href: string; label: string }
  dark?: boolean
}) {
  const surface = dark ? C.obsidian : C.pearl
  return (
    <section
      style={{
        position: "relative",
        background: surface,
        padding: "clamp(72px, 9vw, 100px) clamp(18px, 4vw, 24px)",
        borderTop: `1px solid ${dark ? C.divDark : C.divLight}`,
        overflow: "hidden",
      }}
    >
      <PaperTexture dark={dark} />
      <div className="max-w-xl mx-auto text-center relative" style={{ zIndex: 2 }}>
        <h2 className="mf" style={{ ...ty("h2", dark), marginBottom: body ? "16px" : "36px" }}>
          {title}
        </h2>
        {body && (
          <div className="mf" style={{ ...ty("body", dark), marginBottom: "34px" }}>
            {body}
          </div>
        )}
        <div
          className="mf flex flex-col sm:flex-row gap-3 items-center justify-center"
          style={{ transitionDelay: "0.05s" }}
        >
          <Btn href={primary.href} onClick={primary.onClick} surface={dark ? "dark" : "light"}>
            {primary.label}
          </Btn>
          {secondary && (
            <Btn href={secondary.href} ghost surface={dark ? "dark" : "light"}>
              {secondary.label}
            </Btn>
          )}
        </div>
      </div>
    </section>
  )
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FCard({
  eyebrow,
  title,
  body,
  dark = true,
}: {
  eyebrow?: string
  title: string
  body?: string
  dark?: boolean
}) {
  return (
    <article className="mf" style={cardSx(dark)}>
      {eyebrow && <span style={{ ...ty("eyebrow", dark), marginBottom: "10px" }}>{eyebrow}</span>}
      <h3 style={{ ...ty("h3", dark), marginBottom: body ? "10px" : 0 }}>{title}</h3>
      {body && <p style={{ ...ty("body", dark), fontSize: "14px" }}>{body}</p>}
    </article>
  )
}

// ─── FAQ accordion ────────────────────────────────────────────────────────────
function FaqAccordion({
  items,
  dark,
}: {
  items: Array<{ question: string; answer: string }>
  dark: boolean
}) {
  const [open, setOpen] = useState<number | null>(null)
  const div = dark ? C.divDark : C.divLight
  return (
    <div style={{ borderTop: `1px solid ${div}` }}>
      {items.map((q, i) => (
        <div key={i} style={{ borderBottom: `1px solid ${div}` }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "22px 0",
              background: "none",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              gap: "20px",
            }}
          >
            <span style={{ ...ty("h3", dark), fontSize: "17px", textShadow: "none", margin: 0 }}>
              {q.question}
            </span>
            <span
              style={{
                color: dark ? C.onDarkMuted : C.onLightMuted,
                flexShrink: 0,
                fontSize: "22px",
                lineHeight: 1,
                fontFamily: F.serif,
                fontWeight: 300,
              }}
            >
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
    {
      question: "Do I need Lightroom already?",
      answer:
        "No. Lightroom is included as a simple support tool for cleaning up the source selfie. You can still use the AI prompt path without becoming an editing person.",
    },
    {
      question: "Will this work on my iPhone?",
      answer:
        "Yes. The kit is built for phone photos. No camera, no desktop software, no complicated setup.",
    },
    {
      question: "Will this help my AI photos look less fake?",
      answer:
        "Yes. Better AI results start with a better original selfie. The kit helps you choose the right source photo, write a clearer prompt, and fix the result without changing your whole face.",
    },
    {
      question: "What apps do I need?",
      answer:
        "You can use ChatGPT or your preferred AI image tool for the prompts. Lightroom Mobile, Hypic, and CapCut are optional support tools if you want to clean up the source photo or use the result in content.",
    },
    {
      question: "Is this just presets?",
      answer:
        "No. The presets are included, but the main point is the selfie-to-AI-photo path: source selfie, starter prompts, still-you fix prompts, and a small 3-image shoot you can actually use.",
    },
    {
      question: "What if I'm a complete beginner?",
      answer:
        "Good. Start with the source selfie checklist, then use the first prompt. You do not need to understand AI. You just need one clear photo and the next small step.",
    },
  ],
  masterclass: [
    {
      question: "Do I need the Starter Kit first?",
      answer:
        "No. Starter Kit is the first practical implementation step. Masterclass goes deeper so you build from a clearer offer and content direction.",
    },
    {
      question: "Is this a photography course?",
      answer:
        "It starts with your camera confidence. Getting comfortable showing up and taking selfies that actually feel like you. Then it goes into your brand, your message, your content system, and your first real offer. The selfie is the door. This is what's behind it.",
    },
    {
      question: "How long does it take?",
      answer:
        "Start with the strategy foundation, then move through the core lessons and the implementation modules at your own pace. Most pieces are designed to be short and usable right away.",
    },
    {
      question: "How is this different from SSELFIE SUITE?",
      answer:
        "The Masterclass is the education. You do the work once and it's yours. SSELFIE SUITE is the AI layer for when you want the tools to keep running it weekly.",
    },
    {
      question: "What if I've never posted consistently?",
      answer:
        "That's exactly who this is for. The course is built around getting you from scattered to a system you can actually follow.",
    },
  ],
  studio: [
    {
      question: "What do I get each month?",
      answer:
        "You get Maya, Create, Calendar, Learn, the SSELFIE library, and 100 credits that reset each month. Different creations can use different amounts of credits, so the exact number of finished images depends on what you make.",
    },
    {
      question: "Do I need to learn prompts?",
      answer:
        "No. Tell Maya what you are trying to create in normal words. She helps with the direction and the prompt, and you decide what to use.",
    },
    {
      question: "Will every photo look exactly like me?",
      answer:
        "That is the goal, but AI can still get things wrong. Start with clear reference selfies, review every result, and tell Maya what feels off so your next direction can get closer.",
    },
    {
      question: "Is Maya just ChatGPT inside another app?",
      answer:
        "No. Maya works beside your SSELFIE tools, brand context, images, learning, and Calendar. The value is not another chat box. It is having one place that helps you create, decide what to say, and plan what goes out next.",
    },
    {
      question: "Who is SUITE best for?",
      answer:
        "It is for a woman building a personal brand who wants ongoing help creating content around her own face, story, and work. If you only want one quick image or a done-for-you service, a monthly membership may not be the right fit.",
    },
    {
      question: "Can I cancel?",
      answer:
        "Yes. You can cancel from your account. Your membership stays open until the end of the period you already paid for.",
    },
  ],
  visibilityToPaid: [
    {
      question: "Who is this for?",
      answer:
        "This is for a woman with a real business, a service people already buy, and clients she understands. Too much of the work still depends on her, and the AI tools she has tried have not become reliable help she can actually use.",
    },
    {
      question: "What exactly will we build?",
      answer:
        "One Business Brain, three personal AI roles, and three repeatable workflows built around the work that takes too much of your time. The roles are chosen for your business, so we are not giving every woman the same setup.",
    },
    {
      question: "Do I need to be technical?",
      answer:
        "No. I am not a technical person either. I build the first version with you, show you what to say, and keep the setup as simple as possible around tools you can continue using.",
    },
    {
      question: "Will the team run my business for me?",
      answer:
        "You stay in control of your clients and every final decision. Your team prepares the research, plans, drafts, and repeatable work we train it to handle, so more is ready before it reaches you.",
    },
    {
      question: "How is this different from using ChatGPT?",
      answer:
        "You are not starting with a blank chat every time. We build one Business Brain around your real offers, customers, voice, decisions, and way of working. Your team works from that shared knowledge, so you do not have to explain the business again and again.",
    },
    {
      question: "What happens after I apply?",
      answer:
        "I read every application myself. If I believe I can genuinely help, I invite you to a short fit call. No payment is taken when you apply. The €2,000 private payment link is only shared after that conversation.",
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGES
// ─────────────────────────────────────────────────────────────────────────────

export function HomePageContent({ referralCode }: { referralCode?: string | null } = {}) {
  const r = (href: string) => appendReferralParam(href, referralCode)
  const login = buildReferralLoginHref({ returnTo: "/app", referralCode })
  const freePrompts = r(
    "/ai-prompts?utm_source=website&utm_medium=homepage&utm_campaign=vault_to_suite_path"
  )
  const vault = r(
    "/prompt-vault?source=homepage&utm_source=website&utm_medium=homepage&utm_campaign=vault_to_suite_path"
  )
  const suite = r("/join/studio?source=homepage")

  return (
    <PublicPageShell>
      <PublicNav loginHref={login} />

      {/* HERO - dark */}
      <Hero
        eyebrow="Start with what you already have"
        title={<>Start with one selfie. See what you can build from there.</>}
        body={
          <p>
            Turn one normal selfie into photos that still feel like you, something useful to post,
            and one clear next step. Begin with the Prompt Vault. Keep building with Maya inside
            SSELFIE SUITE.
          </p>
        }
        primary={{ href: vault, label: "Explore the Prompt Vault" }}
        secondary={{ href: suite, label: "See SSELFIE SUITE" }}
        imageSrc={IMG.homeHero}
        imageAlt="Sandra Aamodt, founder of SSELFIE"
      />

      {/* RECOGNITION - Pearl */}
      <Section
        eyebrow="Sound familiar?"
        title={<>Maybe you do not need a bigger plan. Maybe you need one result you can use.</>}
        dark={false}
        narrow
      >
        <div className="mf space-y-4" style={{ ...ty("body", false), fontSize: "16px" }}>
          <p>
            You have the phone, the idea, and probably hundreds of things saved for later. But later
            keeps moving.
          </p>
          <p>
            SSELFIE starts smaller. One photo you like enough to use. Then help turning it into
            something real, without opening five more tools or starting another course.
          </p>
        </div>
      </Section>

      {/* CURRENT PRODUCT DEMO - Pearl */}
      <Section
        id="how-it-works"
        eyebrow="One small beginning"
        title={<>The photo is the door. What you do with it is the point.</>}
        dark={false}
      >
        <div className="mf mb-8 max-w-3xl">
          <p style={{ ...ty("body", false), fontSize: "16px" }}>
            Inside SUITE, Maya works beside your photos and Calendar. She helps you choose a
            direction, make the pieces, and keep the next step visible.
          </p>
        </div>
        <SuiteProductWalkthrough />
        <ol className="mt-14 grid gap-8 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "See yourself",
              body: "Start with one clear selfie and a visual direction that still feels recognizable.",
            },
            {
              step: "02",
              title: "Make something useful",
              body: "Create a photo or post you can actually use, instead of another idea sitting in a folder.",
            },
            {
              step: "03",
              title: "Keep moving",
              body: "Bring the visual, the words, and the plan together so you can see what comes next.",
            },
          ].map(item => (
            <li key={item.step} className="mf border-t border-stone-300 pt-5">
              <span style={{ ...ty("eyebrow", false), marginBottom: "14px" }}>{item.step}</span>
              <h3 style={{ ...ty("h3", false), marginBottom: "10px" }}>{item.title}</h3>
              <p style={{ ...ty("body", false), fontSize: "14px" }}>{item.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* TWO CLEAR DOORS - Pearl */}
      <Section
        eyebrow="Start where you are"
        title={<>Choose the help that fits today.</>}
        dark={false}
      >
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <article
            className="mf min-w-0 flex min-h-[310px] flex-col justify-between"
            style={cardSx(false)}
          >
            <div>
              <span style={{ ...ty("eyebrow", false), marginBottom: "14px" }}>
                One payment · yours to keep
              </span>
              <h3
                style={{
                  ...ty("h2", false),
                  fontSize: "clamp(28px, 4vw, 42px)",
                  marginBottom: "14px",
                }}
              >
                Start with the Prompt Vault.
              </h3>
              <p style={{ ...ty("body", false), fontSize: "15px", maxWidth: "460px" }}>
                Pick a complete photoshoot, copy the prompts, and turn one clear selfie into a set
                of images that still feel like you.
              </p>
            </div>
            <div className="mt-8">
              <Btn href={vault} surface="light">
                Explore the Prompt Vault
              </Btn>
            </div>
          </article>

          <article className="mf min-w-0 flex min-h-[310px] flex-col justify-between bg-stone-950 p-7 text-white sm:p-9">
            <div>
              <span style={{ ...ty("eyebrow", true), marginBottom: "14px" }}>
                Ongoing help · €97 a month
              </span>
              <h3
                style={{
                  ...ty("h2", true),
                  fontSize: "clamp(28px, 4vw, 42px)",
                  marginBottom: "14px",
                }}
              >
                Maya helps you create, write, and plan what goes out next.
              </h3>
              <p style={{ ...ty("body", true), fontSize: "15px", maxWidth: "520px" }}>
                One membership. Maya, Create, Calendar, Learn, and the SSELFIE library together. €97
                a month.
              </p>
            </div>
            <div className="mt-8">
              <Btn href={suite} surface="dark">
                See SSELFIE SUITE
              </Btn>
            </div>
          </article>
        </div>
        <p className="mf mt-6 text-sm leading-6 text-stone-500">
          Want to try one look first?{" "}
          <Link className="underline underline-offset-4" href={freePrompts}>
            Get the free AI prompt previews.
          </Link>
        </p>
      </Section>

      {/* FROM SANDRA - Pearl */}
      <Split
        eyebrow="From Sandra"
        title={
          <>
            I built my visibility with my phone, my story, and a lot of figuring it out as I went.
          </>
        }
        body={
          <div className="space-y-4">
            <p>
              Not because everything was perfect. Because I needed a way back to myself, my voice,
              and my own income.
            </p>
            <p>
              I am still building too. But I know how much changes when you can see the next version
              of yourself before the rest of your life has caught up.
            </p>
          </div>
        }
        imgSrc={IMG.homeFounder}
        imgAlt="Sandra Aamodt, founder of SSELFIE"
        imgFirst
        dark={false}
        cta={
          <Btn href={suite} surface="light">
            See SSELFIE SUITE
          </Btn>
        }
      />

      {/* CTA CLOSE - dark */}
      <CtaClose
        title={<>Start with one photo. Build from there.</>}
        body={
          <p>
            You do not need everything figured out. You need one useful beginning and a next step
            you can see.
          </p>
        }
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
            background: C.pearl,
            borderBottom: `1px solid ${C.divLight}`,
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
                Your payment form did not open cleanly. Try once more and keep this page open while
                Stripe loads.
              </p>
            </div>
            <Link
              href={starterKitCheckoutHref}
              style={{
                display: "inline-flex",
                minHeight: "42px",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid ${C.obsidian}`,
                color: C.pearl,
                background: C.obsidian,
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
        body={
          <p>
            If the source photo feels off, everything after it feels harder too. The Starter Kit
            helps you take, edit, and use one clear selfie so your content has a better place to
            start.
          </p>
        }
        primary={{ href: starterKitCheckoutHref, label: "Get the Starter Kit · $37" }}
        secondary={{ href: "/selfie-guide", label: "Start with the free guide" }}
        imageSrc={IMG.skHero}
      />

      {/* THE SYSTEM - Pearl */}
      <Section
        eyebrow="Why it works"
        title={<>The problem is not your face. It is the photo you are starting from.</>}
        dark={false}
        narrow
      >
        <div className="mf space-y-4" style={{ ...ty("body", false), fontSize: "16px" }}>
          <p>
            If the original photo is dark, awkward, blurry, or unfinished, the AI result usually
            feels random too.
          </p>
          <p>
            The Starter Kit shows you how to take, edit, pose, and post AI-ready selfies so your
            visuals stop feeling fake, flat, or disconnected from you.
          </p>
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
              {
                label: "SSELFIE Lightroom Presets",
                note: "A clean starting point for selfies, AI input photos, and everyday brand visuals.",
              },
              {
                label: "Selfie Guide",
                note: "Light, angles, phone setup, and simple rules for photos that look stronger before editing.",
              },
              {
                label: "Posing And Editing Guidance",
                note: "Mirror poses, full body, profile, phone edits, Hypic, CapCut, and Lightroom Mobile.",
              },
              {
                label: "Caption Templates",
                note: "30 ready-to-edit captions for women who have the photo but do not know what to say.",
              },
              {
                label: "Storytelling Guide",
                note: "Five post types that turn one photo session into content people can understand.",
              },
              {
                label: "7-Day Content Starter",
                note: "One session. Seven posts. A full week of content planned and ready to use.",
              },
            ].map((item, i) => (
              <div
                key={item.label}
                style={{
                  borderTop: `1px solid ${C.divDark}`,
                  padding: "13px 0",
                  ...(i === 5 ? { borderBottom: `1px solid ${C.divDark}` } : {}),
                }}
              >
                <p style={{ ...ty("h3", true), fontSize: "15px", marginBottom: "3px" }}>
                  {item.label}
                </p>
                <p style={{ ...ty("body", true), fontSize: "13px" }}>{item.note}</p>
              </div>
            ))}
          </div>
        }
        imgSrc={IMG.skMockup}
        imgAlt="The Selfie Starter Kit with SSELFIE presets, selfie and posing guides, caption templates, storytelling guide, and seven-day content starter"
        imgFirst
        dark
        cta={
          <Btn href={starterKitCheckoutHref} surface="dark">
            Get the Starter Kit · $37
          </Btn>
        }
      />

      {/* BEFORE AND AFTER - Pearl */}
      <Section eyebrow="Preset results" title={<>Three styles. See them in use.</>} dark={false}>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              img: IMG.skBaLightDreamy,
              alt: "Scandinavian Light and Dreamy preset before and after",
            },
            { img: IMG.skBaNordicDeep, alt: "Nordic Deep Urban preset before and after" },
            { img: IMG.skBaDarkMoody, alt: "Scandinavian Dark and Moody preset before and after" },
          ].map(s => (
            <div key={s.alt} className="mf">
              <img
                src={s.img}
                alt={s.alt}
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* EDITING WALKTHROUGHS - dark */}
      <Section
        eyebrow="The editing walkthrough"
        title={<>Make the original photo easier to use.</>}
        dark
      >
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              num: "01",
              title: "Lightroom with presets",
              body: "Import the collection, apply it, and adjust the strength for your specific photo and skin tone.",
            },
            {
              num: "02",
              title: "iPhone native editing",
              body: "Exposure, brilliance, highlights, shadows, and vignette. Clean up the photo before you use it anywhere.",
            },
            {
              num: "03",
              title: "Hypic for portraits",
              body: "Get a polished portrait feel without smoothing your face into someone else.",
            },
            {
              num: "04",
              title: "CapCut for video",
              body: "Use the same clean visual direction on simple video clips and reels.",
            },
            {
              num: "05",
              title: "Save a custom preset",
              body: "Create your own repeatable edit so future selfies start from the right look.",
            },
            {
              num: "06",
              title: "Apply edits in bulk",
              body: "Copy one edit and paste it to every photo in your session. Your camera roll gets cleaner fast.",
            },
          ].map(m => (
            <article key={m.num} className="mf" style={{ ...cardSx(true), padding: "22px 26px" }}>
              <p style={{ ...ty("eyebrow", true), marginBottom: "12px" }}>{m.num}</p>
              <p style={{ ...ty("h3", true), fontSize: "16px", marginBottom: "8px" }}>{m.title}</p>
              <p style={{ ...ty("body", true), fontSize: "13px" }}>{m.body}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* PRESET COLLECTION - Pearl, split */}
      <Split
        eyebrow="The preset collection"
        title={<>Cleaner phone photos. Better starting points.</>}
        body={
          <div className="space-y-4">
            <p>
              Presets do not replace a good photo. They help you make the photo cleaner, more
              consistent, and easier to use as personal brand content.
            </p>
            <p>
              Use them before posting, before building a carousel, or before sending the image into
              an AI tool.
            </p>
            <div className="grid gap-2 mt-2">
              {[
                {
                  name: "Scandinavian Light and Dreamy",
                  desc: "Bright, airy, soft tones. Timeless natural light.",
                },
                { name: "Nordic Deep Urban", desc: "Cool, desaturated, cinematic. Urban edge." },
                {
                  name: "Scandinavian Dark and Moody",
                  desc: "Deep, warm, dramatic. Moody and timeless.",
                },
              ].map(p => (
                <div
                  key={p.name}
                  style={{ borderBottom: `1px solid ${C.divLight}`, paddingBottom: "10px" }}
                >
                  <p style={{ ...ty("h3", false), fontSize: "14px", marginBottom: "2px" }}>
                    {p.name}
                  </p>
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
          <FCard
            dark
            title="Selfie Posing Guide"
            body="Mirror poses, full body, profile, and simple direction so your input photo looks intentional before AI touches it."
          />
          <FCard
            dark
            title="Caption Templates"
            body="30 ready-to-edit captions for the moment when the photo is ready but your brain goes blank."
          />
          <FCard
            dark
            title="Storytelling Guide"
            body="Five post types that turn one photo session into a full content arc: proof, story, teaching, behind the scenes, and invitation."
          />
          <FCard
            dark
            title="7-Day Content Starter"
            body="Turn one session into seven posts. A full week of content from a single afternoon."
          />
          <FCard
            dark
            title="Camera Settings Cheat Sheet"
            body="The exact iPhone settings for every shoot. Grid, mirroring, HDR, Live Photos. One page. Keep it on your phone."
          />
          <FCard
            dark
            title="Instant Access"
            body="Start right after checkout with the presets, guides, caption templates, and your 7-day starter."
          />
        </div>
      </Section>

      {/* FAQ - Pearl */}
      <Section eyebrow="FAQ" title={<>A few things people ask.</>} dark={false}>
        <FaqAccordion items={FAQS.starterKit} dark={false} />
      </Section>

      {/* CTA - dark */}
      <CtaClose
        title={<>Start with one photo you can actually use.</>}
        primary={{ href: starterKitCheckoutHref, label: "Get the Starter Kit · $37" }}
        secondary={{ href: "/ai-prompts", label: "Try the free AI prompts" }}
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
        body={
          <p>
            Content direction, captions, offer clarity, and a 30-day plan so your photos have
            somewhere to lead. Sandra&apos;s full method, one time.
          </p>
        }
        primary={{ href: masterclassCheckoutHref, label: "Enroll · $147" }}
        secondary={{ href: "/starter-kit", label: "Start with the Starter Kit" }}
        imageSrc={IMG.pricingBg}
      />

      {/* CLARITY - Pearl */}
      <Section
        eyebrow="What's actually happening"
        title={
          <>It&apos;s not that you need more motivation. You need positioning before content.</>
        }
        dark={false}
        narrow
      >
        <div className="mf space-y-4" style={{ ...ty("body", false), fontSize: "16px" }}>
          <p>
            So you post something, it doesn&apos;t land, and you tell yourself you&apos;re not
            consistent enough.
          </p>
          <p>But consistency isn&apos;t the problem. Clarity is.</p>
          <p>
            That is why Masterclass now starts with your foundation. Know what you sell, who it
            helps, and what you want to be known for before you build the content rhythm.
          </p>
        </div>
      </Section>

      {/* MODULES - dark */}
      <Section
        eyebrow="Inside the course"
        title="Start with clarity. Then content, confidence, and execution."
        dark
      >
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {[
            {
              title: "Your Foundation",
              body: "Your positioning, audience, core themes, and next content ideas before the lessons begin.",
            },
            {
              title: "How You Show Up",
              body: "Camera confidence, presence, the energy that makes someone stop scrolling. This is a skill, not a trait.",
            },
            {
              title: "Your Visual Brand",
              body: "Colours, aesthetic, feed design, and the visual identity that makes your content recognisable before they even see your name.",
            },
            {
              title: "Content-To-Cash",
              body: "Weekly rhythm, calls to action, DM follow-up, and simple sales conversations without income guarantees.",
            },
            {
              title: "30-Day Sprint",
              body: "A practical calendar and tracker so you can publish, invite, follow up, and measure conversations.",
            },
          ].map(m => (
            <FCard key={m.title} title={m.title} body={m.body} dark />
          ))}
        </div>
      </Section>

      {/* IMPLEMENTATION MAP - Pearl */}
      <Section eyebrow="Implementation map" title="Here's the path you move through." dark={false}>
        <div className="grid gap-0 md:grid-cols-2">
          {[
            { num: "01", title: "Start Here: Welcome to Branded By SSELFIE" },
            { num: "02", title: "Building Unshakable Selfie Confidence" },
            { num: "03", title: "Start Showing Up" },
            { num: "04", title: "The Power Selfies Challenge" },
            { num: "05", title: "The Confidence Camera Hack" },
            { num: "06", title: "Brand Energy 101" },
            { num: "07", title: "Design Your Brand" },
            { num: "08", title: "Glow Up Your Bio + First Impressions" },
            { num: "09", title: "Creating Your Brand Pillars" },
            { num: "10", title: "Post Before You Feel Ready" },
            { num: "11", title: "Confidence Posting Formula" },
            { num: "12", title: "The Selfie CEO Shooting System" },
            { num: "13", title: "Real Reels Walkthrough" },
            { num: "14", title: "CEO Content Planning" },
          ].map(l => (
            <div
              key={l.num}
              className="mf flex items-baseline gap-5 py-4"
              style={{ borderBottom: `1px solid ${C.divLight}` }}
            >
              <span style={{ ...ty("eyebrow", false), minWidth: "28px", flexShrink: 0 }}>
                {l.num}
              </span>
              <span style={{ ...ty("body", false), fontSize: "14px" }}>{l.title}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* FOUNDER SPLIT - dark */}
      <Split
        title={
          <>
            I built a 100K+ personal brand without a photographer, a studio, or a clue about what I
            was doing at the start.
          </>
        }
        body={
          <div className="space-y-4">
            <p>
              I figured it out over years. The positioning. The pillars. The content system that
              actually holds up when life gets messy.
            </p>
            <p>
              This course is everything I wish someone had put in front of me in the first six
              months, including the part where you stop hiding behind content and clarify what you
              actually sell.
            </p>
            <p>One time. Then it&apos;s yours.</p>
          </div>
        }
        imgSrc={IMG.dark}
        imgFirst
        dark
      />

      {/* WHO IT'S FOR - Pearl */}
      <Section
        eyebrow="Who this is for"
        title="You want to build something. You just haven't had a clear starting point."
        dark={false}
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            "You show up when inspiration hits. And disappear for weeks when it doesn't. You need a system.",
            "You know what you want to build but every time you sit down to post, it feels like starting from zero.",
            "You want to be known for something specific. You just haven't figured out exactly what that is yet.",
          ].map(line => (
            <article key={line} className="mf" style={cardSx(false)}>
              <p style={{ ...ty("body", false), fontSize: "15px" }}>{line}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* WHAT YOU LEAVE WITH - dark */}
      <Section eyebrow="After the course" title="What you'll have that you don't have now." dark>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <FCard
            dark
            title="Your Foundation"
            body="A clearer positioning, audience, voice, and content direction before you move into the lessons."
          />
          <FCard
            dark
            title="Your core themes"
            body="The three topics you always come back to. Every content idea filters through these."
          />
          <FCard
            dark
            title="Your content-to-cash system"
            body="What you post, where it leads, and how to invite the right people into a simple conversation."
          />
          <FCard
            dark
            title="A 30-day action plan"
            body="You won't finish this course with notes. You'll finish it with posts, scripts, and a tracking rhythm."
          />
        </div>
        <p
          className="mf mt-8 max-w-3xl"
          style={{ ...ty("body", true), fontSize: "13px", color: C.onDarkMuted }}
        >
          This training is educational and implementation-focused. Results depend on your offer,
          audience, consistency, pricing, market demand, effort, and timing. SSELFIE does not
          guarantee income or specific business results.
        </p>
      </Section>

      {/* FAQ - Pearl */}
      <Section eyebrow="FAQ" title="A few things before you enroll." dark={false}>
        <FaqAccordion items={FAQS.masterclass} dark={false} />
      </Section>

      {/* CTA - dark */}
      <CtaClose
        title="Do this once. Then you'll know exactly what you're building."
        primary={{ href: masterclassCheckoutHref, label: "Enroll · $147" }}
        secondary={{ href: "/join/studio", label: "See SSELFIE SUITE" }}
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
    typeof window !== "undefined" &&
    ["sselfie.ai", "www.sselfie.ai"].includes(window.location.hostname)
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

  const trackMembershipCheckoutClick = (
    placement: "hero" | "pricing" | "closing",
    destination: string
  ) => {
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
        body={
          <p>
            Create photos that still feel like you. Know what to say. Plan what goes out next. Maya,
            Create, Calendar, and Learn work together in one monthly membership.
          </p>
        }
        primary={{
          href: heroCheckoutHref,
          label: "Join SSELFIE SUITE",
          onClick: () => trackMembershipCheckoutClick("hero", heroCheckoutHref),
        }}
        secondary={{ href: "#how-it-works", label: "See how it works" }}
        imageSrc={IMG.feed}
      />

      {/* THE PAIN - Pearl */}
      <Section
        eyebrow="Sound familiar?"
        title={<>The hard part is not posting. It is everything you need before you can post.</>}
        dark={false}
        narrow
      >
        <div className="mf space-y-4" style={{ ...ty("body", false), fontSize: "16px" }}>
          <p>
            You need a photo that feels like you. Words that sound like you. And a plan that does
            not disappear the second life gets busy.
          </p>
          <p>
            So you open five different tools, save more ideas, and still do not know what should go
            out first.
          </p>
          <p>SUITE brings the photo, the words, and the plan into one place.</p>
        </div>
      </Section>

      {/* PRODUCT WALKTHROUGH - Pearl */}
      <Section
        id="how-it-works"
        eyebrow="Maya + Calendar"
        title={<>See the photo, the words, and the week come together.</>}
        dark={false}
      >
        <p className="mf mb-10 max-w-3xl" style={{ ...ty("body", false), fontSize: "16px" }}>
          Maya works beside your content plan. She helps you choose a direction, create the pieces,
          and move them into a week you can actually see and change.
        </p>
        <SuiteProductWalkthrough />
        <SuiteMultiFormatWalkthrough />
      </Section>

      {/* THREE JOBS - dark */}
      <Section
        eyebrow="What SUITE helps you do"
        title={<>Create. Say it clearly. Plan what comes next.</>}
        dark
      >
        <div className="grid gap-4 md:grid-cols-3">
          <FCard
            dark
            eyebrow="01 · Create"
            title="Make the visual"
            body="Start with your own selfie. Build photos, covers, and content pieces around a direction that feels like you."
          />
          <FCard
            dark
            eyebrow="02 · Say"
            title="Find the words"
            body="Use Maya to shape captions, hooks, and ideas in plain language, then keep the parts that sound like you."
          />
          <FCard
            dark
            eyebrow="03 · Plan"
            title="See the week"
            body="Move your ideas into Calendar, change the order, and know what you are creating next."
          />
        </div>
        <p
          className="mf mt-8 max-w-3xl"
          style={{ ...ty("body", true), fontSize: "14px", color: C.onDarkMuted }}
        >
          Maya suggests. You review, change, and choose. Nothing has to go out just because AI made
          it.
        </p>
      </Section>

      {/* EVERYTHING INCLUDED - Pearl */}
      <Section
        eyebrow="One membership"
        title={<>The full working space. €97 a month.</>}
        dark={false}
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FCard
            dark={false}
            title="Maya"
            body="Your AI creative director, working with your brand context and the tools inside SUITE."
          />
          <FCard
            dark={false}
            title="Create + 100 monthly credits"
            body="Create photos and visual content. Credits reset each month; different creations can use different amounts."
          />
          <FCard
            dark={false}
            title="Calendar"
            body="Plan your grid and your week, move posts around, and keep the next step visible."
          />
          <FCard
            dark={false}
            title="Learn"
            body="Personalized help and the deeper SSELFIE lessons when you need more than a quick answer."
          />
          <FCard
            dark={false}
            title="The SSELFIE library"
            body="Prompt collections, Starter Kit resources, the Masterclass, and current member drops in one place."
          />
          <FCard
            dark={false}
            title="Your account"
            body="Access after payment, monthly billing, and cancellation from your account when you need it."
          />
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
            <p>
              Maya works from your reference selfies and the direction you give her. Clear selfies
              and clear feedback usually give AI a better chance of keeping you recognizable.
            </p>
            <p>
              AI can still get things wrong. Review every result. Change what feels off. You stay
              the decision-maker.
            </p>
          </div>
        }
        imgSrc={SUITE_IMG.honest}
        imgAlt="Realistic AI-assisted brand photo that still looks like you"
        dark
      />

      {/* FIT - Pearl */}
      <Section
        eyebrow="Is this for you?"
        title={<>A monthly tool should earn its place in your week.</>}
        dark={false}
      >
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

      {/* PROOF - Pearl (real customer words, before the price) */}
      <Section eyebrow="Real customer words" title={<>Still you. And they feel it.</>} dark={false}>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              quote: "Best one so far. I love that it looks real, and me.",
              who: "A SSELFIE member · 50 & fabulous",
            },
            {
              quote: "I asked Maya to make adjustments and WOW. It's so good.",
              who: "A SSELFIE member",
            },
            {
              quote: "I'm so picky it's not even funny. But this, my God, I'm blown away.",
              who: "A SSELFIE member",
            },
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

      {/* PRICING - Pearl */}
      <Section
        eyebrow="One simple plan"
        title={<>€97 a month. Everything works together.</>}
        dark={false}
        narrow
      >
        <div className="mf space-y-4" style={{ ...ty("body", false), fontSize: "16px" }}>
          <p>
            Maya, Create, Calendar, Learn, the SSELFIE library, and 100 credits that reset each
            month. Different creations can use different amounts of credits.
          </p>
          <p className="text-sm text-stone-500">
            Billed monthly in EUR. Access opens after payment. Cancel from your account.
          </p>
        </div>
        <div className="mf" style={{ marginTop: "32px" }}>
          <Btn
            href={pricingCheckoutHref}
            onClick={() => trackMembershipCheckoutClick("pricing", pricingCheckoutHref)}
            surface="light"
          >
            Join SSELFIE SUITE · €97/mo
          </Btn>
        </div>
      </Section>

      {/* FAQ - Pearl */}
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
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [instagram, setInstagram] = useState("")
  const [currentBlock, setCurrentBlock] = useState("")
  const [goal, setGoal] = useState("")
  const [currentOffer, setCurrentOffer] = useState("")
  const [aiAttempts, setAiAttempts] = useState("")
  const [investmentReadiness, setInvestmentReadiness] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [pending, startTransition] = useTransition()
  const applicationStartedRef = useRef(false)

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: `1px solid ${C.divDark}`,
    background: C.graphite,
    color: C.onDark,
    padding: "12px 16px",
    fontSize: "14px",
    fontFamily: F.sans,
    outline: "none",
    transition: "border-color 0.2s",
    // Keep this form flat for its editorial section while product UI stays rounded elsewhere.
  }
  const onFocus = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    e.target.style.borderColor = "color-mix(in srgb, var(--ss-brand-silver) 28%, transparent)"
  }
  const onBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
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
        const res = await fetch("/api/inquiry/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            instagramHandle: instagram,
            currentChallenge: currentBlock,
            desiredOutcome: goal,
            currentOffer,
            aiAttempts,
            helpFocus: "Build my personal AI team",
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
        setName("")
        setEmail("")
        setInstagram("")
        setCurrentBlock("")
        setGoal("")
        setCurrentOffer("")
        setAiAttempts("")
        setInvestmentReadiness("")
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
        <p style={ty("body", true)}>
          I read every application myself. If I believe I can help build the right personal AI team
          around your business, you&apos;ll hear back with an invitation to a short fit call.
        </p>
        <p className="mt-4" style={{ ...ty("body", true), color: C.onDarkMuted }}>
          No payment has been taken.
        </p>
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
        { label: "Name", value: name, set: setName, type: "text", required: true },
        { label: "Email", value: email, set: setEmail, type: "email", required: true },
        {
          label: "Instagram handle",
          value: instagram,
          set: setInstagram,
          type: "text",
          required: false,
        },
      ].map(({ label, value, set, type, required }) => (
        <label
          key={label}
          style={{
            display: "grid",
            gap: "7px",
            fontSize: "13px",
            color: C.onDarkMuted,
            fontFamily: F.sans,
          }}
        >
          <span>{label}</span>
          <input
            type={type}
            value={value}
            required={required}
            onChange={e => set(e.target.value)}
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </label>
      ))}
      <label
        style={{
          display: "grid",
          gap: "7px",
          fontSize: "13px",
          color: C.onDarkMuted,
          fontFamily: F.sans,
        }}
      >
        <span>What work in your business keeps coming back to you?</span>
        <textarea
          value={currentBlock}
          onChange={e => setCurrentBlock(e.target.value)}
          rows={4}
          required
          style={{ ...inputStyle, minHeight: "110px", resize: "vertical" }}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </label>
      <label
        style={{
          display: "grid",
          gap: "7px",
          fontSize: "13px",
          color: C.onDarkMuted,
          fontFamily: F.sans,
        }}
      >
        <span>If you had reliable help every week, what would you hand over first?</span>
        <textarea
          value={goal}
          onChange={e => setGoal(e.target.value)}
          rows={4}
          required
          style={{ ...inputStyle, minHeight: "110px", resize: "vertical" }}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </label>
      <label
        style={{
          display: "grid",
          gap: "7px",
          fontSize: "13px",
          color: C.onDarkMuted,
          fontFamily: F.sans,
        }}
      >
        <span>
          What service are you already selling? What result does it create, and what does a client
          usually pay?
        </span>
        <textarea
          value={currentOffer}
          onChange={e => setCurrentOffer(e.target.value)}
          rows={3}
          required
          style={{ ...inputStyle, minHeight: "86px", resize: "vertical" }}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </label>
      <label
        style={{
          display: "grid",
          gap: "7px",
          fontSize: "13px",
          color: C.onDarkMuted,
          fontFamily: F.sans,
        }}
      >
        <span>What have you tried with ChatGPT or AI, and where did you get stuck?</span>
        <textarea
          value={aiAttempts}
          onChange={e => setAiAttempts(e.target.value)}
          rows={3}
          required
          style={{ ...inputStyle, minHeight: "86px", resize: "vertical" }}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </label>
      <label
        style={{
          display: "grid",
          gap: "7px",
          fontSize: "13px",
          color: C.onDarkMuted,
          fontFamily: F.sans,
        }}
      >
        <span>Are you ready to invest €2,000 if it is a fit?</span>
        <select
          required
          value={investmentReadiness}
          onChange={e => setInvestmentReadiness(e.target.value)}
          style={inputStyle}
          onFocus={onFocus}
          onBlur={onBlur}
        >
          <option value="">Choose one</option>
          <option value="Yes">Yes</option>
          <option value="Maybe, I have questions">Maybe, I have questions</option>
          <option value="Not right now">Not right now</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "13px 32px",
          minHeight: "46px",
          background: pending
            ? "color-mix(in srgb, var(--ss-brand-silver) 35%, transparent)"
            : C.pearl,
          color: C.obsidian,
          fontSize: "10px",
          fontFamily: F.sans,
          fontWeight: 600,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          border: "1px solid transparent",
          boxShadow: pending
            ? "none"
            : "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)",
          cursor: pending ? "not-allowed" : "pointer",
          width: "100%",
          // Deliberate square editorial marketing CTA; not the default product-control radius.
        }}
      >
        {pending ? "Sending…" : "Apply to Work With Me"}
      </button>
      {error && (
        <p style={{ fontSize: "13px", color: "var(--ss-brand-error)", fontFamily: F.sans }}>
          {error}
        </p>
      )}
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
    <p
      style={{
        ...ty("body", dark),
        fontSize: "12px",
        color: dark ? C.onDarkMuted : C.onLightMuted,
        margin: "12px 0 0",
        maxWidth: "420px",
      }}
    >
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
        <section
          className="mf"
          style={{
            background: C.pearl,
            borderBottom: `1px solid ${C.divLight}`,
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
                Your payment form did not open cleanly. Try once more and keep this page open while
                Stripe loads.
              </p>
            </div>
            <PromptVaultCheckoutLink label="Retry checkout" surface="light" />
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
              Each collection gives you a set of matching photos with different angles, crops and
              moments.
            </p>
            <p style={{ fontSize: "12px", color: C.onDarkMuted, letterSpacing: "0.04em" }}>
              {collectionCount} collections · {shotCount} copy-and-paste prompts · New drops
              included · One payment
            </p>
          </>
        }
        primaryNode={
          <PromptVaultCheckoutLink
            label={`Get the complete Vault · ${priceLabel}`}
            placement="hero"
          />
        }
        secondary={{ href: "#inside", label: "See what is inside" }}
        imageSrc="/images/ai-prompts/dark-feminine-cafe-shot-3.jpg"
        imageAlt="Dark café editorial portrait from a Prompt Vault photoshoot"
        minHeight="min(860px, 92dvh)"
        imagePosition="50% 25%"
        contentPaddingBottom="52px"
      />

      {/* HOW IT WORKS - Pearl */}
      <Section
        eyebrow="How it works"
        title="Create your photoshoot in three simple steps."
        dark={false}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <FCard
            dark={false}
            eyebrow="01"
            title="Choose a photoshoot"
            body="Start with the collection that gives you the photos you need right now."
          />
          <FCard
            dark={false}
            eyebrow="02"
            title="Upload one clear selfie"
            body="Open ChatGPT and add a photo where your face is easy to see."
          />
          <FCard
            dark={false}
            eyebrow="03"
            title="Copy and create"
            body="Use the prompts one by one to create a full set of matching photos."
          />
        </div>
      </Section>

      {/* OFFER SUMMARY - dark */}
      <Section id="inside" eyebrow="Everything inside" title="The complete Prompt Vault." dark>
        <div
          className="grid gap-px md:grid-cols-2"
          style={{ background: C.divDark, border: `1px solid ${C.divDark}` }}
        >
          {[
            [
              `${collectionCount} complete collections`,
              "Full photoshoots with matching angles, crops and moments.",
            ],
            [
              `${shotCount} ready-to-use prompts`,
              "Copy each prompt into ChatGPT with your own selfie.",
            ],
            [
              "A finished example for every prompt",
              "See the photo you are creating before you start.",
            ],
            ["Every new drop included", "New Prompt Vault collections are added to your access."],
          ].map(([title, body]) => (
            <div
              key={title}
              className="mf"
              style={{ background: C.obsidian, padding: "clamp(24px, 4vw, 38px)" }}
            >
              <h3 style={{ ...ty("h3", true), marginBottom: "8px" }}>{title}</h3>
              <p style={{ ...ty("body", true), fontSize: "14px", color: C.onDarkMuted }}>{body}</p>
            </div>
          ))}
        </div>
        <div className="mf" style={{ marginTop: "32px" }}>
          <PromptVaultCheckoutLink
            label={`Get the complete Vault · ${priceLabel}`}
            placement="offer-summary"
          />
          <VaultRiskLine dark />
        </div>
      </Section>

      {/* CURATED COLLECTION PREVIEW - Pearl */}
      <Section
        id="collections"
        eyebrow="A look inside the Vault"
        title="See how each photoshoot continues."
        dark={false}
      >
        <p
          className="mf max-w-3xl"
          style={{ ...ty("body", false), fontSize: "16px", marginBottom: "40px" }}
        >
          The free prompts show you the first photo. Here are three different photos from six of the
          complete collections inside the Vault.
        </p>
        <div className="grid gap-6 md:grid-cols-2">
          {collections.map(card => (
            <article
              key={card.id}
              className="mf"
              style={{ ...cardSx(false), padding: 0, overflow: "hidden" }}
            >
              <div
                className="grid grid-cols-[1.35fr_1fr] grid-rows-2 gap-px"
                style={{ height: "clamp(320px, 55vw, 520px)", background: C.divLight }}
              >
                {card.images.map((image, index) => (
                  <div
                    key={image.src}
                    className={`relative overflow-hidden ${index === 0 ? "row-span-2" : ""}`}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes={
                        index === 0
                          ? "(min-width: 768px) 28vw, 62vw"
                          : "(min-width: 768px) 20vw, 34vw"
                      }
                      className="object-cover"
                      style={{ objectPosition: "center top" }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ padding: "22px 24px 24px" }}>
                <span style={{ ...ty("eyebrow", false), marginBottom: "8px" }}>
                  {card.shotCount}-photo collection
                </span>
                <h3 style={{ ...ty("h3", false), textShadow: "none" }}>{card.title}</h3>
              </div>
            </article>
          ))}
        </div>
        <div className="mf" style={{ marginTop: "36px" }}>
          <p
            style={{
              ...ty("body", false),
              fontSize: "14px",
              marginBottom: "18px",
              maxWidth: "620px",
            }}
          >
            These are only six of the {collectionCount} collections. Your Vault access includes
            every current photoshoot and every new drop I add.
          </p>
          <PromptVaultCheckoutLink
            label={`Get all ${collectionCount} collections · ${priceLabel}`}
            surface="light"
            placement="collection-preview"
          />
        </div>
      </Section>

      {/* TRUST - dark */}
      <Section
        eyebrow="Why the prompts help"
        title="The prompt makes a big difference."
        dark
        narrow
      >
        <div className="mf space-y-4" style={{ ...ty("body", true), fontSize: "16px" }}>
          <p>
            Every prompt already includes the outfit, setting, lighting, composition and mood, so
            ChatGPT has less to guess.
          </p>
          <p>
            You use your own selfie as the reference. AI can still change small details, so always
            check your result before you use it and try again with a clearer selfie when needed.
          </p>
        </div>
      </Section>

      {/* FAQ - Pearl */}
      <Section eyebrow="Quick answers" title="Before you get the Vault." dark={false} narrow>
        <FaqAccordion items={VAULT_FAQ} dark={false} />
      </Section>

      {/* FINAL CTA - dark */}
      <Section
        eyebrow="The complete Prompt Vault"
        title={`${priceLabel} once. No subscription.`}
        dark
        narrow
      >
        <ul
          className="mf"
          style={{
            listStyle: "none",
            padding: 0,
            margin: "0 0 30px",
            display: "flex",
            flexDirection: "column",
            gap: "9px",
          }}
        >
          {[
            `${collectionCount} complete photoshoot collections`,
            `${shotCount} copy-and-paste prompts`,
            "A finished example for every prompt",
            "Every new Prompt Vault drop included",
            "Private access link sent by email",
          ].map(item => (
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

// ─── Vault Maya · the vault, made for you · one selfie, many photos ─────────
const vmResult = (file: string, alt: string, label: string) => ({
  src: `/images/vault-maya/proof/${file}`,
  alt,
  label,
})

const VAULT_MAYA_IMAGES = {
  original: {
    src: "/images/vault-maya/proof/img-2534-original-selfie.webp",
    alt: "Sandra's original clear phone selfie used to create the Vault Maya results",
  },
  results: [
    vmResult(
      "img-7880-bw-editorial.webp",
      "Black-and-white crouched editorial result",
      "B&W editorial"
    ),
    vmResult("img-7879-white-top-mirror.webp", "White-top mirror result", "Mirror look"),
    vmResult("1782982166995-509337-blazer-ipad.webp", "Blazer and iPad work result", "Work look"),
    vmResult(
      "img-7883-street-cream-bag.webp",
      "Street-style result with a cream bag",
      "Street look"
    ),
    vmResult("img-7884-coffee-trench.webp", "Coffee and trench-coat result", "Coffee look"),
    vmResult("img-7874-sunglasses-close.webp", "Close-up sunglasses result", "Close-up"),
    vmResult("img-7872-side-profile.webp", "Side-profile beauty result", "Beauty look"),
    vmResult("img-7873-phone-lifestyle.webp", "Phone lifestyle portrait result", "Lifestyle look"),
    vmResult("img-7876-casual-mirror.webp", "Casual gym mirror result", "Casual look"),
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

export function VaultMayaPageContent({ priceLabel }: Readonly<{ priceLabel: string }>) {
  useEffect(() => {
    void trackAnalyticsEvent({
      event: "vault_maya_landing_view",
      properties: { surface: "vault_maya_landing" },
    })
  }, [])

  const ctaLabel = `START WITH MY SELFIE · ${priceLabel.toUpperCase()}`

  return (
    <PublicPageShell>
      <PublicNav />

      <section className={vaultMayaStyles.hero}>
        <div className={vaultMayaStyles.heroCopy}>
          <span className={`mf ${vaultMayaStyles.eyebrow}`}>Vault Maya · selfie to photo</span>
          <h1 className={`mf ${vaultMayaStyles.heroTitle}`}>
            One selfie. Choose a look. Maya makes the photo.
          </h1>
          <p className={`mf ${vaultMayaStyles.heroBody}`}>
            Upload one clear selfie, choose the photo you want to create, and let Maya do the
            prompting for you.
          </p>
          <div className={`mf ${vaultMayaStyles.heroActions}`}>
            <VaultMayaCheckoutLink label={ctaLabel} surface="light" />
          </div>
          <p className={`mf ${vaultMayaStyles.heroTerms}`}>
            30 photo creations each month · cancel anytime
          </p>
        </div>
        <div
          className={vaultMayaStyles.heroProof}
          aria-label="Sandra's original selfie overlaid on the black-and-white Vault Maya result"
        >
          <figure className={vaultMayaStyles.heroResultMain}>
            <Image
              src={VAULT_MAYA_IMAGES.results[0].src}
              alt={VAULT_MAYA_IMAGES.results[0].alt}
              fill
              priority
              sizes="(max-width: 767px) 100vw, 59vw"
              className="object-cover"
            />
          </figure>
          <figure className={vaultMayaStyles.heroOriginal}>
            <Image
              src={VAULT_MAYA_IMAGES.original.src}
              alt={VAULT_MAYA_IMAGES.original.alt}
              fill
              priority
              sizes="(max-width: 767px) 32vw, 18vw"
              className="object-cover"
            />
            <figcaption>Original selfie</figcaption>
          </figure>
        </div>
      </section>

      <section className={vaultMayaStyles.proofSection}>
        <div className={vaultMayaStyles.proofHeader}>
          <div>
            <span className={vaultMayaStyles.eyebrow}>This was the selfie</span>
            <div className={vaultMayaStyles.proofOriginal}>
              <Image
                src={VAULT_MAYA_IMAGES.original.src}
                alt={VAULT_MAYA_IMAGES.original.alt}
                fill
                sizes="(max-width: 767px) 72vw, 25vw"
                className="object-cover"
              />
            </div>
          </div>
          <div className={vaultMayaStyles.proofStatement}>
            <span className={vaultMayaStyles.eyebrow}>And these came from it</span>
            <h2>One starting selfie. A whole camera roll.</h2>
            <p>
              Same starting selfie. Different photos. I chose the look; Maya handled the prompt.
            </p>
          </div>
        </div>
        <div
          className={vaultMayaStyles.proofGallery}
          aria-label="Vault Maya results from the same selfie"
        >
          {VAULT_MAYA_IMAGES.results.map((image, index) => (
            <figure key={image.src} className={vaultMayaStyles.proofCard}>
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(max-width: 767px) 72vw, 25vw"
                className="object-cover"
              />
              <figcaption>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {image.label}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section id="how-vault-maya-works" className={vaultMayaStyles.demoSection}>
        <div className={vaultMayaStyles.demoInner}>
          <div className={`mf ${vaultMayaStyles.demoCopy}`}>
            <span className={vaultMayaStyles.eyebrow}>How it works</span>
            <h2>From the selfie you have to the photo you want.</h2>
          </div>
          <ol className={vaultMayaStyles.steps}>
            <li>
              <span>01</span>
              <div>
                <strong>Add your selfie</strong>
                <p>Start with one clear photo where your face is easy to see.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Choose a look</strong>
                <p>Pick the Vault photo you want to make.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Maya creates it</strong>
                <p>No prompt to copy. Review the result, save what you love, and create another.</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <section className={vaultMayaStyles.whySection}>
        <div className={vaultMayaStyles.whyImage}>
          <Image
            src={VAULT_MAYA_IMAGES.results[2].src}
            alt={VAULT_MAYA_IMAGES.results[2].alt}
            fill
            sizes="(max-width: 767px) 100vw, 44vw"
            className="object-cover"
          />
        </div>
        <div className={vaultMayaStyles.whyCopy}>
          <span className={vaultMayaStyles.eyebrow}>Why Vault Maya</span>
          <h2>For the days you want the photo, not another prompt to figure out.</h2>
          <p>
            The Prompt Vault gives you my prompts to use yourself in ChatGPT. Vault Maya puts the
            looks inside SSELFIE, so you can choose the photo and create it there.
          </p>
        </div>
      </section>

      <section className={vaultMayaStyles.includedSection}>
        <div className={vaultMayaStyles.includedInner}>
          <div>
            <span className={vaultMayaStyles.eyebrow}>What Vault Maya includes</span>
            <h2>Everything you need to choose, create and keep your photos.</h2>
          </div>
          <ul>
            <li>Vault looks ready to create</li>
            <li>30 photo creations each month</li>
            <li>New Vault drops as they are published</li>
            <li>Personal Vault Maya gallery</li>
            <li>Extra photo credits available when needed</li>
          </ul>
        </div>
      </section>

      <section className={vaultMayaStyles.distinctionSection}>
        <div className={vaultMayaStyles.sectionHeading}>
          <span className={vaultMayaStyles.eyebrow}>Choose the right product</span>
          <h2>Three different ways to create with SSELFIE.</h2>
        </div>
        <div className={vaultMayaStyles.compareGrid}>
          {[
            ["Prompt Vault", "Copy Sandra’s prompts and create the photos yourself in ChatGPT."],
            ["Vault Maya", "Choose a Vault look and Maya creates it for you."],
            [
              "SSELFIE SUITE",
              "Full workspace for custom photo creation plus content planning, feed work and captions.",
            ],
          ].map(([title, body], index) => (
            <article
              key={title}
              className={`${vaultMayaStyles.compareCard} ${index === 1 ? vaultMayaStyles.compareCardSelected : ""}`}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
        <div className={vaultMayaStyles.distinctionCta}>
          <VaultMayaCheckoutLink label={ctaLabel} surface="light" />
          <p>30 photo creations each month · cancel anytime</p>
        </div>
      </section>

      <section className={vaultMayaStyles.aiNote}>
        <span className={vaultMayaStyles.eyebrow}>An honest note about AI</span>
        <p>
          AI will not make a perfect photo every single time. Keeping the result recognizable is at
          the heart of how these looks are built, and you should always review what you create
          before you use it.
        </p>
      </section>

      <Section eyebrow="Questions you might have" title="Before you join." dark={false} narrow>
        <FaqAccordion items={VAULT_MAYA_FAQ} dark={false} />
      </Section>

      <section className={vaultMayaStyles.final}>
        <div className={`mf ${vaultMayaStyles.finalInner}`}>
          <span className={vaultMayaStyles.eyebrow}>Vault Maya</span>
          <h2>Start with the selfie you already have.</h2>
          <p>{priceLabel} · 30 photo creations each month · cancel anytime</p>
          <VaultMayaCheckoutLink label={ctaLabel} />
        </div>
      </section>

      <PublicFooter />
    </PublicPageShell>
  )
}

// Work With Me: Your Personal AI Team
export function WorkWithMePageContent() {
  const trackPrimaryCta = (location: string) => {
    void trackAnalyticsEvent({
      event: "work_with_me_primary_cta_clicked",
      properties: { source: "work_with_me_page", location },
    })
  }

  return (
    <PublicPageShell>
      <PublicNav />

      {/* HERO - dark, full-bleed */}
      <Hero
        eyebrow="Work With Me · Six Weeks"
        title={<>Your business has grown. Your support has not.</>}
        body={
          <p>
            In six weeks, I build and train a personal AI team around your business, so the
            research, planning, content, and repeatable work do not keep landing back on you.
          </p>
        }
        primary={{
          href: "#inquiry",
          label: "Apply to Work Together",
          onClick: () => trackPrimaryCta("hero"),
        }}
        imageSrc={IMG.wwmHero}
      />

      {/* RECOGNITION - Pearl */}
      <Section
        eyebrow="Maybe this is you"
        title={<>Everything still comes back to you.</>}
        dark={false}
        narrow
      >
        <div className="mf space-y-3" style={{ ...ty("body", false), fontSize: "16px" }}>
          <p>
            The ideas, research, plans, writing, and small jobs all wait for your brain and your
            time. Even when you finally open ChatGPT, you have to explain the business again.
          </p>
          <p>
            You do not need another tool to manage. You need reliable help that already knows how
            your business works.
          </p>
        </div>
      </Section>

      {/* THE STORY - dark */}
      <Split
        eyebrow="From Sandra"
        title={<>I built the support I needed.</>}
        body={
          <div className="space-y-3">
            <p>
              I am not a technical person. I learned how to direct AI because I was running SSELFIE
              and could not keep doing every piece of research, planning, writing, and preparation
              myself.
            </p>
            <p>
              Today my AI team helps me think, organize, create, and keep moving. I will build a
              simpler version around the work that keeps falling back on you.
            </p>
          </div>
        }
        imgSrc={IMG.wwmFounder}
        imgAlt="Sandra, founder of SSELFIE"
        imgFirst
        dark
        cta={
          <Btn href="#inquiry" onClick={() => trackPrimaryCta("proof")} surface="dark" ghost>
            Apply to Work Together
          </Btn>
        }
      />

      {/* TRANSFORMATION - dark */}
      <Section eyebrow="The result" title={<>The work can move without starting from you.</>} dark>
        <div className="mf space-y-3" style={{ ...ty("body", true), fontSize: "16px" }}>
          <p>
            Your team helps prepare the research, plans, drafts, and repeatable work before it
            reaches you. You still make the decisions only you can make, but you are not carrying
            every step alone.
          </p>
          <p>
            Everything starts from the same Business Brain, so the help stays connected to your
            offers, customers, voice, and way of working. You do not have to start over or explain
            the business again every time.
          </p>
        </div>
      </Section>

      {/* HOW I WORK - Pearl */}
      <Split
        eyebrow="How I work"
        title={<>We build it, use it, and make it sound like you.</>}
        body={
          <div className="space-y-3">
            <p>
              <strong>1. I learn your business.</strong> Your offers, customers, voice, visuals, and
              the work that keeps coming back to you.
            </p>
            <p>
              <strong>2. I build and train your team.</strong> One Business Brain and three personal
              AI roles chosen around your real workload.
            </p>
            <p>
              <strong>3. We use it together.</strong> We test the team on real work, fix what feels
              generic, and leave you with three workflows and a 30-day working plan.
            </p>
          </div>
        }
        imgSrc={IMG.wwmHowIWork}
        imgAlt="Sandra researching and building inside a client's business"
        dark={false}
        cta={
          <Btn href="#inquiry" onClick={() => trackPrimaryCta("plan")} surface="light">
            Apply to Work Together
          </Btn>
        }
      />

      {/* WHY THIS IS DIFFERENT - dark */}
      <Split
        eyebrow="Keeping it simple"
        title={<>One problem: too much of the business still depends on you.</>}
        body={
          <div className="space-y-3">
            <p>
              We choose three recurring areas where trained AI support can genuinely help. This
              might include research, planning, content, writing, organizing ideas, or preparing
              repeatable work.
            </p>
            <p style={{ color: C.onDark }}>
              I am not giving you a folder of prompts. I am building support around the business you
              already run.
            </p>
          </div>
        }
        imgSrc={IMG.wwmEditorial}
        imgAlt="Editorial AI-assisted brand photo used in the SSELFIE visual system"
        imgFirst
        dark
        cta={
          <Btn href="#inquiry" onClick={() => trackPrimaryCta("scope")} surface="dark" ghost>
            Apply to Work Together
          </Btn>
        }
      />

      {/* THE SPRINT / OFFER - Pearl */}
      <Split
        eyebrow="Your Personal AI Team"
        title={<>Six weeks together. &euro;2,000.</>}
        body={
          <div className="space-y-3">
            <p>
              I am starting with two women before opening the remaining three places. No payment is
              taken when you apply. If I believe I can genuinely help, we have a short fit call
              first.
            </p>
            <ul
              className="space-y-2"
              style={{ ...ty("body", false), paddingLeft: "20px", listStyle: "disc" }}
            >
              <li>Your AI Business Brain</li>
              <li>Your founder workload map</li>
              <li>Three personal AI roles trained around your real business</li>
              <li>Three repeatable workflows using your real work</li>
              <li>Your 30-day working plan</li>
              <li>Four weekly 45-minute calls</li>
              <li>Training and handover so you can keep using your team</li>
            </ul>
            <p style={{ color: C.onLightMuted }}>
              For a woman with a real business, a service people already buy, and clients she
              understands. This is not for starting a business from zero.
            </p>
          </div>
        }
        imgSrc={IMG.wwmApplication}
        imgAlt="Applying to work with Sandra"
        dark={false}
        cta={
          <Btn href="#inquiry" onClick={() => trackPrimaryCta("offer")} surface="light">
            Apply to Work Together
          </Btn>
        }
      />

      {/* FAQ - Pearl */}
      <Section eyebrow="Questions" title="Before you apply" dark={false} narrow>
        <FaqAccordion items={FAQS.visibilityToPaid} dark={false} />
      </Section>

      {/* INQUIRY FORM - dark */}
      <section
        id="inquiry"
        style={{
          position: "relative",
          background: C.obsidian,
          padding: "clamp(60px, 8vw, 88px) clamp(18px, 4vw, 24px)",
          overflow: "hidden",
          scrollMarginTop: "60px",
        }}
      >
        <PaperTexture dark />
        <div
          className="max-w-5xl mx-auto grid gap-14 md:grid-cols-2 md:items-start relative"
          style={{ zIndex: 2 }}
        >
          <div className="mf">
            <span style={{ ...ty("eyebrow", true), marginBottom: "14px" }}>Application</span>
            <h2 style={{ ...ty("h2", true), marginBottom: "16px" }}>
              Tell me what keeps falling back on you.
            </h2>
            <p style={{ ...ty("body", true), fontSize: "16px" }}>
              This is for a woman who already has a real business, service, and clients. Tell me
              what you sell, what keeps coming back to you, and where AI has not helped yet.
            </p>
            <div className="mt-8" style={{ ...cardSx(true), padding: "20px" }}>
              <p style={{ ...ty("body", true), fontSize: "13px", color: C.onDarkMuted }}>
                <span style={{ color: C.onDarkSub }}>No payment is taken here.</span> If it looks
                like a good fit, I&apos;ll invite you to a short call.
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
