"use client"

import { useEffect, useState, useTransition, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { appendReferralParam } from "@/lib/referrals/routing"

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#0d0c0b",
  bgAlt: "#1c1b19",
  text: "#f0ede8",
  textSub: "#c8c4bb",
  textMuted: "#a8a49c",
  textFaint: "#8a8780",
  navBg: "rgba(175,170,162,0.08)",
  navBorder: "rgba(195,190,182,0.15)",
  cardBg: "rgba(175,170,162,0.08)",
  cardBorder: "rgba(195,190,182,0.2)",
  cardBorderStrong: "rgba(200,196,187,0.45)",
  divider: "rgba(175,170,162,0.12)",
  glassBg: "rgba(13,12,11,0.6)",
  glassBorder: "rgba(195,190,182,0.25)",
  heroGradient: "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.72) 100%)",
}

const F = {
  serif: "'Cormorant Garamond', Georgia, serif",
  sans: "var(--font-inter, Inter, -apple-system, sans-serif)",
}

// ─── Shared component styles ──────────────────────────────────────────────────
const eyebrowStyle: React.CSSProperties = {
  fontFamily: F.sans,
  fontSize: "10px",
  letterSpacing: "0.5em",
  textTransform: "uppercase",
  color: C.textFaint,
  display: "block",
  marginBottom: "12px",
}

const headingStyle: React.CSSProperties = {
  fontFamily: F.serif,
  fontWeight: 300,
  fontSize: "clamp(28px, 5vw, 42px)",
  lineHeight: 1.1,
  letterSpacing: "-0.01em",
  color: C.text,
  marginBottom: "20px",
}

const heroHeadingStyle: React.CSSProperties = {
  fontFamily: F.serif,
  fontWeight: 300,
  fontSize: "clamp(32px, 7vw, 60px)",
  lineHeight: 1.08,
  letterSpacing: "-0.02em",
  color: C.text,
  textShadow: "0 2px 20px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.4)",
  marginBottom: "16px",
}

const bodyStyle: React.CSSProperties = {
  fontFamily: F.sans,
  fontSize: "15px",
  lineHeight: 1.7,
  fontWeight: 300,
  color: C.textMuted,
}

const cardStyle: React.CSSProperties = {
  background: C.cardBg,
  border: `1px solid ${C.cardBorder}`,
  backdropFilter: "blur(50px)",
  borderRadius: "16px",
  padding: "28px",
}

// ─── Button ───────────────────────────────────────────────────────────────────
function Btn({
  href,
  onClick,
  children,
  ghost = false,
  full = false,
}: {
  href?: string
  onClick?: () => void
  children: ReactNode
  ghost?: boolean
  full?: boolean
}) {
  const style: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "15px 36px",
    minHeight: "48px",
    background: ghost ? "transparent" : C.textSub,
    color: ghost ? C.textSub : C.bg,
    fontSize: "11px",
    fontFamily: F.sans,
    fontWeight: 600,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    textDecoration: "none",
    borderRadius: "100px",
    border: `1px solid ${ghost ? C.cardBorder : C.textSub}`,
    cursor: "pointer",
    transition: "all 0.25s ease",
    width: full ? "100%" : "fit-content",
    whiteSpace: "nowrap",
  }

  if (href) {
    return (
      <Link href={href} style={style}
        onMouseEnter={(e) => { e.currentTarget.style.background = ghost ? C.cardBg : C.text; e.currentTarget.style.borderColor = ghost ? C.cardBorder : C.text; e.currentTarget.style.color = ghost ? C.text : C.bg }}
        onMouseLeave={(e) => { e.currentTarget.style.background = ghost ? "transparent" : C.textSub; e.currentTarget.style.borderColor = ghost ? C.cardBorder : C.textSub; e.currentTarget.style.color = ghost ? C.textSub : C.bg }}
      >
        {children}
      </Link>
    )
  }

  return (
    <button onClick={onClick} style={style}
      onMouseEnter={(e) => { e.currentTarget.style.background = ghost ? C.cardBg : C.text; e.currentTarget.style.borderColor = ghost ? C.cardBorder : C.text }}
      onMouseLeave={(e) => { e.currentTarget.style.background = ghost ? "transparent" : C.textSub; e.currentTarget.style.borderColor = ghost ? C.cardBorder : C.textSub }}
    >
      {children}
    </button>
  )
}

// ─── Pill badge ───────────────────────────────────────────────────────────────
function Pill({ children }: { children: ReactNode }) {
  return (
    <div
      className="inline-flex items-center gap-2 mb-6"
      style={{
        background: C.glassBg,
        backdropFilter: "blur(20px)",
        border: `1px solid ${C.glassBorder}`,
        borderRadius: "100px",
        padding: "6px 16px",
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: C.textSub }} />
      <span style={{ ...eyebrowStyle, marginBottom: 0, color: C.textSub }}>{children}</span>
    </div>
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────
export function PublicPageShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            ;(entry.target as HTMLElement).style.opacity = "1"
            ;(entry.target as HTMLElement).style.transform = "translateY(0)"
          }
        })
      },
      { threshold: 0.15 },
    )
    document.querySelectorAll(".mkt-fade").forEach((el) => {
      ;(el as HTMLElement).style.opacity = "0"
      ;(el as HTMLElement).style.transform = "translateY(24px)"
      ;(el as HTMLElement).style.transition = "opacity 0.8s ease, transform 0.8s ease"
      observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div style={{ minHeight: "100vh", background: C.bg, overflowX: "hidden", color: C.text, fontFamily: F.sans }}>
      {children}
    </div>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
const navItems = [
  { href: "/starter-kit", label: "Starter Kit" },
  { href: "/masterclass", label: "Masterclass" },
  { href: "/join/studio", label: "Studio" },
  { href: "/work-with-me", label: "Work With Me" },
]

export function PublicNav() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
      style={{
        background: C.navBg,
        backdropFilter: "blur(50px)",
        borderBottom: `1px solid ${C.navBorder}`,
      }}
    >
      <Link href="/" style={{ fontFamily: F.serif, fontSize: "20px", color: C.text, letterSpacing: "0.3em", textTransform: "uppercase", fontWeight: 300, textDecoration: "none" }}>
        SSELFIE
      </Link>
      <nav className="hidden md:flex items-center gap-8">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} style={{ ...eyebrowStyle, marginBottom: 0, textDecoration: "none", transition: "color 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = C.textSub }}
            onMouseLeave={(e) => { e.currentTarget.style.color = C.textFaint }}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <Btn href="/selfie-guide">Free Guide</Btn>
    </header>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
export function PublicFooter() {
  return (
    <footer style={{ background: C.bg, borderTop: `1px solid ${C.divider}`, padding: "64px 24px 48px" }}>
      <div className="max-w-5xl mx-auto flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
        <div>
          <p style={{ fontFamily: F.serif, fontSize: "22px", color: C.text, letterSpacing: "0.3em", textTransform: "uppercase", fontWeight: 300 }}>SSELFIE</p>
          <p style={{ ...bodyStyle, fontSize: "13px", marginTop: "8px" }}>Selfie education by Sandra.</p>
        </div>
        <div className="flex flex-wrap gap-6">
          {[
            { href: "/selfie-guide", label: "Free Guide" },
            { href: "/starter-kit", label: "Starter Kit" },
            { href: "/masterclass", label: "Masterclass" },
            { href: "/join/studio", label: "Studio" },
            { href: "/work-with-me", label: "Work With Me" },
          ].map((l) => (
            <Link key={l.href} href={l.href} style={{ ...eyebrowStyle, marginBottom: 0, textDecoration: "none", transition: "color 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = C.textSub }}
              onMouseLeave={(e) => { e.currentTarget.style.color = C.textFaint }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="max-w-5xl mx-auto mt-10 pt-6 flex gap-6 items-center" style={{ borderTop: `1px solid ${C.divider}` }}>
        <p style={{ ...eyebrowStyle, marginBottom: 0 }}>© 2026 SSELFIE Studio</p>
        <Link href="/terms" style={{ ...eyebrowStyle, marginBottom: 0, textDecoration: "none" }}>Terms</Link>
        <Link href="/privacy" style={{ ...eyebrowStyle, marginBottom: 0, textDecoration: "none" }}>Privacy</Link>
      </div>
    </footer>
  )
}

// ─── Hero section ─────────────────────────────────────────────────────────────
function Hero({
  eyebrow,
  title,
  body,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  imageSrc,
  imageAlt,
}: {
  eyebrow: string
  title: ReactNode
  body: ReactNode
  primaryHref: string
  primaryLabel: string
  secondaryHref?: string
  secondaryLabel?: string
  imageSrc: string
  imageAlt: string
}) {
  return (
    <section className="relative" style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Background image */}
      <Image src={imageSrc} alt={imageAlt} fill className="object-cover" priority style={{ objectPosition: "50% 25%" }} />
      {/* Gradient */}
      <div className="absolute inset-0" style={{ background: C.heroGradient }} />
      {/* Content */}
      <div
        className="relative z-10 flex flex-col items-center justify-end text-center"
        style={{ flex: 1, padding: "24px 20px", paddingTop: "calc(80px + env(safe-area-inset-top))", paddingBottom: "calc(64px + env(safe-area-inset-bottom))" }}
      >
        <div className="max-w-2xl mx-auto">
          <Pill>{eyebrow}</Pill>
          <h1 className="mkt-fade" style={heroHeadingStyle}>{title}</h1>
          <div className="mkt-fade max-w-lg mx-auto mb-8" style={{ ...bodyStyle, color: C.textSub }}>
            {body}
          </div>
          <div className="mkt-fade flex flex-col sm:flex-row gap-3 items-center justify-center" style={{ transitionDelay: "0.1s" }}>
            <Btn href={primaryHref}>{primaryLabel}</Btn>
            {secondaryHref && secondaryLabel && (
              <Btn href={secondaryHref} ghost>{secondaryLabel}</Btn>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Dark section ─────────────────────────────────────────────────────────────
function DarkSection({
  eyebrow,
  title,
  children,
  alt = false,
  narrow = false,
  className = "",
}: {
  eyebrow?: string
  title?: ReactNode
  children: ReactNode
  alt?: boolean
  narrow?: boolean
  className?: string
}) {
  return (
    <section style={{ background: alt ? C.bgAlt : C.bg, padding: "80px 24px" }} className={className}>
      <div className={`mx-auto ${narrow ? "max-w-3xl" : "max-w-6xl"}`}>
        {eyebrow && <span className="mkt-fade" style={eyebrowStyle}>{eyebrow}</span>}
        {title && (
          <h2 className="mkt-fade" style={{ ...headingStyle, maxWidth: narrow ? "600px" : undefined }}>
            {title}
          </h2>
        )}
        {children}
      </div>
    </section>
  )
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  return (
    <article className="mkt-fade flex flex-col gap-3" style={cardStyle}>
      {eyebrow && <span style={eyebrowStyle}>{eyebrow}</span>}
      <h3 style={{ fontFamily: F.serif, fontSize: "clamp(22px,3vw,30px)", fontWeight: 300, color: C.text, lineHeight: 1.15 }}>{title}</h3>
      {body && <p style={{ ...bodyStyle, fontSize: "14px" }}>{body}</p>}
    </article>
  )
}

// ─── Before / after proof ─────────────────────────────────────────────────────
function BeforeAfterProof() {
  return (
    <div className="mkt-fade grid gap-4 md:grid-cols-2 mt-8">
      {(["Before", "After"] as const).map((label) => (
        <div key={label} style={{ ...cardStyle, padding: "16px" }}>
          <span style={{ ...eyebrowStyle, marginBottom: "12px" }}>{label}</span>
          <div className="relative overflow-hidden" style={{ aspectRatio: "4/5", borderRadius: "8px" }}>
            <Image
              src={label === "Before" ? "/images/selfie-guide/before-real.png" : "/images/selfie-guide/after-real.png"}
              alt={`${label} selfie`}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
function FaqGrid({ items }: { items: Array<{ question: string; answer: string }> }) {
  return (
    <div className="grid gap-4 md:grid-cols-3 mt-8">
      {items.map((item) => (
        <article key={item.question} className="mkt-fade" style={cardStyle}>
          <h3 style={{ fontFamily: F.serif, fontSize: "clamp(18px,2.5vw,22px)", fontWeight: 300, color: C.text, lineHeight: 1.2, marginBottom: "12px" }}>
            {item.question}
          </h3>
          <p style={{ ...bodyStyle, fontSize: "14px" }}>{item.answer}</p>
        </article>
      ))}
    </div>
  )
}

// ─── Split (text + image) section ─────────────────────────────────────────────
function SplitSection({
  eyebrow,
  title,
  body,
  imageSrc,
  imageAlt,
  imageFirst = false,
  alt = false,
  cta,
}: {
  eyebrow?: string
  title?: ReactNode
  body: ReactNode
  imageSrc: string
  imageAlt: string
  imageFirst?: boolean
  alt?: boolean
  cta?: ReactNode
}) {
  const imageCol = (
    <div className="mkt-fade relative overflow-hidden rounded-[4px]" style={{ aspectRatio: "4/5" }}>
      <Image src={imageSrc} alt={imageAlt} fill sizes="(max-width: 768px) 100vw, 45vw" className="object-cover" />
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(13,12,11,0.05) 0%, rgba(13,12,11,0.3) 100%)" }} />
    </div>
  )

  const textCol = (
    <div className="mkt-fade flex flex-col justify-center gap-4">
      {eyebrow && <span style={eyebrowStyle}>{eyebrow}</span>}
      {title && <h2 style={headingStyle}>{title}</h2>}
      <div style={{ ...bodyStyle, fontSize: "16px" }}>{body}</div>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  )

  return (
    <section style={{ background: alt ? C.bgAlt : C.bg, padding: "80px 24px" }}>
      <div className="max-w-6xl mx-auto grid gap-12 md:grid-cols-2 md:items-center">
        {imageFirst ? <>{imageCol}{textCol}</> : <>{textCol}{imageCol}</>}
      </div>
    </section>
  )
}

// ─── CTA close section ────────────────────────────────────────────────────────
function CtaClose({ title, primary, secondary }: {
  title: ReactNode
  primary: { href: string; label: string }
  secondary?: { href: string; label: string }
}) {
  return (
    <section style={{ background: C.bg, padding: "96px 24px", borderTop: `1px solid ${C.divider}` }}>
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="mkt-fade" style={{ ...heroHeadingStyle, fontSize: "clamp(26px, 4vw, 44px)", textShadow: "none" }}>{title}</h2>
        <div className="mkt-fade flex flex-col sm:flex-row gap-3 items-center justify-center mt-8">
          <Btn href={primary.href}>{primary.label}</Btn>
          {secondary && <Btn href={secondary.href} ghost>{secondary.label}</Btn>}
        </div>
      </div>
    </section>
  )
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const starterKitFaqs = [
  { question: "Do I need Lightroom already?", answer: "No. The kit shows you what to use first and how to keep it simple." },
  { question: "Will this work on iPhone photos?", answer: "Yes. That is the point. Same phone. Better system." },
  { question: "Is this for beginners?", answer: "Yes. It is for the person who knows how to take the photo and still does not like what happens after." },
]

const masterclassFaqs = [
  { question: "Do I need the Starter Kit first?", answer: "No. But it helps if you want the fastest first win." },
  { question: "Is this more presets?", answer: "No. This is the method behind the photo, the edit, and the post." },
  { question: "How is this different from Studio?", answer: "The Masterclass teaches the method. Studio is the advanced AI layer after that." },
]

const studioFaqs = [
  { question: "Who is Studio for?", answer: "For creators who already know the look they want and want speed, consistency, and memory inside the workflow." },
  { question: "What is Maya inside Studio?", answer: "She is the AI layer. She helps with images, planning, and decisions without you starting from zero every time." },
  { question: "Can I cancel?", answer: "Yes. Cancel any time from your account." },
]

const productLadder = [
  { title: "Free Guide", price: "Free", body: "Light, angles, edits, and what to do first.", href: "/selfie-guide" },
  { title: "Starter Kit", price: "$37", body: "Presets, the guide, and a first result you can get today.", href: "/starter-kit" },
  { title: "Masterclass", price: "$147", body: "The full method when you want more than a quick fix.", href: "/masterclass" },
  { title: "Studio", price: "€97/mo", body: "Maya, Feed Planner, and Academy once you know the look you want.", href: "/join/studio" },
  { title: "1:1 with Sandra", price: "From $2,000", body: "Direct eyes on the whole thing.", href: "/work-with-me" },
]

// ─── Pages ────────────────────────────────────────────────────────────────────

export function HomePageContent({ referralCode }: { referralCode?: string | null } = {}) {
  const withRef = (href: string) => appendReferralParam(href, referralCode)

  return (
    <PublicPageShell>
      <PublicNav />

      {/* Hero */}
      <Hero
        eyebrow="Selfie Education"
        title={<>You already know how to take a photo.<br />You just don&apos;t know what to do after.</>}
        body={<><p>The free guide gets you started.</p><p>The Starter Kit gives you the presets, the method, and a result you can get today.</p></>}
        primaryHref={withRef("/selfie-guide")}
        primaryLabel="Get the Free Guide"
        secondaryHref={withRef("/starter-kit")}
        secondaryLabel="See the Starter Kit"
        imageSrc="/images/selfie-guide/window-editorial-portrait.jpg"
        imageAlt="Window light editorial selfie portrait"
      />

      {/* Problem */}
      <SplitSection
        eyebrow="Sound familiar?"
        title={<>You take the photo.<br />Then you delete it.</>}
        body={
          <div className="space-y-4">
            <p>Not because you looked bad.</p>
            <p>Because the light was off. Or the edit was. Or it stopped feeling like you.</p>
            <p>That is not a confidence problem.</p>
            <p>It is a system problem.</p>
          </div>
        }
        imageSrc="/images/selfie-guide/face-covered-selfie.jpg"
        imageAlt="Selfie frustration"
        imageFirst={false}
        alt={true}
      />

      {/* Kit contents */}
      <DarkSection eyebrow="Starter Kit" title={<>Three things.<br />That&apos;s it.</>}>
        <div className="grid gap-4 md:grid-cols-3 mt-8">
          {["16 Lightroom Presets", "The Selfie Guide", "Your First Selfie Quick-Start"].map((item) => (
            <FeatureCard key={item} eyebrow="Included" title={item} />
          ))}
        </div>
      </DarkSection>

      {/* Proof */}
      <DarkSection eyebrow="It works" title="Same phone. Same face. Better light. Better edit." alt>
        <BeforeAfterProof />
      </DarkSection>

      {/* Sandra story */}
      <SplitSection
        title={<>I almost didn&apos;t post the one that took off.</>}
        body={
          <div className="space-y-4">
            <p>I used to spend too long editing one photo.</p>
            <p>Then delete it anyway.</p>
            <p>What changed wasn&apos;t my face.</p>
            <p>It was the system behind the photo.</p>
          </div>
        }
        imageSrc="/images/selfie-guide/black-blazer-coffee-standing.jpg"
        imageAlt="Sandra with coffee"
        imageFirst={true}
      />

      {/* Product ladder */}
      <DarkSection eyebrow="Start here" title="Start with the right thing." alt>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 mt-8">
          {productLadder.map((item) => (
            <Link key={item.title} href={withRef(item.href)} className="mkt-fade block" style={{ ...cardStyle, minHeight: "220px", display: "flex", flexDirection: "column", justifyContent: "space-between", textDecoration: "none", transition: "border-color 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.cardBorderStrong }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.cardBorder }}
            >
              <div>
                <span style={{ ...eyebrowStyle, marginBottom: "8px" }}>{item.price}</span>
                <h3 style={{ fontFamily: F.serif, fontSize: "clamp(20px,2.5vw,26px)", fontWeight: 300, color: C.text, marginBottom: "10px", lineHeight: 1.15 }}>{item.title}</h3>
                <p style={{ ...bodyStyle, fontSize: "13px" }}>{item.body}</p>
              </div>
              <span style={{ ...eyebrowStyle, marginBottom: 0, marginTop: "16px" }}>See page →</span>
            </Link>
          ))}
        </div>
      </DarkSection>

      {/* Free guide CTA */}
      <SplitSection
        eyebrow="Not ready to buy?"
        title="Start here. It's free."
        body={<p>The free Selfie Guide gives you the basics: light, angles, edits, and what to do first.</p>}
        imageSrc="/images/selfie-guide/ring-light-guide-portrait.png"
        imageAlt="Selfie guide portrait"
        imageFirst={false}
        cta={<Btn href={withRef("/selfie-guide")}>Get the Free Guide</Btn>}
      />

      {/* Closing */}
      <CtaClose
        title={<>Your photos are not the problem.<br />Your system is.</>}
        primary={{ href: withRef("/selfie-guide"), label: "Get the Free Guide" }}
        secondary={{ href: withRef("/starter-kit"), label: "See the Starter Kit" }}
      />

      <PublicFooter />
    </PublicPageShell>
  )
}

export function StarterKitPageContent() {
  return (
    <PublicPageShell>
      <PublicNav />

      <Hero
        eyebrow="Starter Kit — $37"
        title={<>Your photos will look like you took them on a good day.<br />Even when it wasn&apos;t.</>}
        body={<><p>You keep meaning to post.</p><p>Then you look at the photo and something feels off.</p><p>That part is easier to fix than you think.</p></>}
        primaryHref="/checkout/starter-kit"
        primaryLabel="Get the Starter Kit — $37"
        secondaryHref="/selfie-guide"
        secondaryLabel="Start Free"
        imageSrc="/images/selfie-guide/black-blazer-seated-coffee.jpg"
        imageAlt="Starter kit portrait"
      />

      {/* Problem */}
      <DarkSection eyebrow="Sound familiar?" title="You know when the photo is close. But not close enough." narrow alt>
        <div className="mkt-fade space-y-4 mt-4" style={{ ...bodyStyle, fontSize: "16px" }}>
          <p>You don&apos;t need a new face.</p>
          <p>You need better light. A cleaner edit. And a faster way to stop second-guessing it.</p>
        </div>
      </DarkSection>

      {/* Contents */}
      <DarkSection eyebrow="What is inside" title="The first fix.">
        <div className="grid gap-4 md:grid-cols-3 mt-8">
          <FeatureCard title="16 Lightroom Presets" body="The exact edits that make a phone photo look finished. Import once, use forever." />
          <FeatureCard title="The Selfie Guide" body="Light, angles, poses, and what to do in the first five minutes." />
          <FeatureCard title="Quick-Start Guide" body="One page. The fastest path from camera roll to a photo you actually want to post." />
        </div>
      </DarkSection>

      {/* Proof */}
      <DarkSection eyebrow="Proof" title="Same photo. Better finish." alt>
        <BeforeAfterProof />
      </DarkSection>

      {/* FAQ */}
      <DarkSection eyebrow="FAQ" title="A few things people ask.">
        <FaqGrid items={starterKitFaqs} />
      </DarkSection>

      <CtaClose
        title="Start with the part that changes the result fastest."
        primary={{ href: "/checkout/starter-kit", label: "Get the Starter Kit — $37" }}
        secondary={{ href: "/masterclass", label: "See the Masterclass" }}
      />

      <PublicFooter />
    </PublicPageShell>
  )
}

export function MasterclassPageContent() {
  return (
    <PublicPageShell>
      <PublicNav />

      <Hero
        eyebrow="Masterclass — $147"
        title={<>You&apos;ve got the presets.<br />Now learn the full method.</>}
        body={<><p>The Masterclass is for the person who wants the full picture.</p><p>Not just how to edit one photo. How to keep getting one you want to post.</p></>}
        primaryHref="/checkout/masterclass"
        primaryLabel="Enroll — $147"
        secondaryHref="/starter-kit"
        secondaryLabel="See the Kit First"
        imageSrc="/images/selfie-guide/cloudy-mountain-guide-portrait.jpg"
        imageAlt="Masterclass portrait"
      />

      {/* Modules */}
      <DarkSection eyebrow="Modules" title="Light. Pose. Edit. Post. Repeat." alt>
        <div className="grid gap-4 md:grid-cols-5 mt-8">
          {["Light", "Pose", "Edit", "Post", "Repeat"].map((mod) => (
            <FeatureCard key={mod} title={mod} />
          ))}
        </div>
      </DarkSection>

      {/* Sandra story */}
      <SplitSection
        title="This is the part that took me longer to learn than I want it to take you."
        body={
          <div className="space-y-4">
            <p>The method is simple once you see it.</p>
            <p>Before that, it feels random.</p>
            <p>This is the part that stops it feeling random.</p>
          </div>
        }
        imageSrc="/images/selfie-guide/window-natural-guide-portrait.jpg"
        imageAlt="Window light natural portrait"
        imageFirst={true}
      />

      {/* Who it's for */}
      <DarkSection eyebrow="Who it is for" title="For the person who is tired of hoping one good photo happens again." alt>
        <div className="grid gap-4 md:grid-cols-3 mt-8">
          {[
            "You post, but not as often as you want.",
            "You know your photos could feel more like you.",
            "You want a repeatable method, not more guessing.",
          ].map((line) => (
            <article key={line} className="mkt-fade" style={cardStyle}>
              <p style={{ ...bodyStyle, fontSize: "15px" }}>{line}</p>
            </article>
          ))}
        </div>
      </DarkSection>

      {/* FAQ */}
      <DarkSection eyebrow="FAQ" title="A few things before you enroll.">
        <FaqGrid items={masterclassFaqs} />
      </DarkSection>

      <CtaClose
        title="Learn the method once. Use it every time."
        primary={{ href: "/checkout/masterclass", label: "Enroll — $147" }}
        secondary={{ href: "/join/studio", label: "See Studio" }}
      />

      <PublicFooter />
    </PublicPageShell>
  )
}

export function StudioPageContent() {
  return (
    <PublicPageShell>
      <PublicNav />

      <Hero
        eyebrow="Studio — €97/mo"
        title={<>The AI that already knows your brand.<br />And gets smarter every time you use it.</>}
        body={<p>Maya, image generation, Feed Planner, and Academy for creators who already know the look they want.</p>}
        primaryHref="/checkout/membership"
        primaryLabel="Join Studio"
        secondaryHref="/masterclass"
        secondaryLabel="See the Masterclass"
        imageSrc="/images/selfie-guide/studio-black-portrait.png"
        imageAlt="Studio editorial portrait"
      />

      {/* What's inside */}
      <DarkSection eyebrow="Inside Studio" title="The advanced layer." alt>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-8">
          <FeatureCard title="Maya" body="The AI layer that remembers what you mean. Your brand, your style, your preferences." />
          <FeatureCard title="Image Generation" body="Generation that starts from your brand, not a blank page." />
          <FeatureCard title="Feed Planner" body="Structure when the posting part keeps slipping. 9-post grid, captions, strategy." />
          <FeatureCard title="Academy" body="The method and references in the same place, when you need to go deeper." />
        </div>
      </DarkSection>

      {/* Positioning */}
      <SplitSection
        title="Studio comes after the basics, not before."
        body={
          <div className="space-y-4">
            <p>The homepage used to lead with AI.</p>
            <p>The better truth is this: the education comes first. Then the speed.</p>
            <p>Studio is for the person who already knows the look she is building.</p>
          </div>
        }
        imageSrc="/images/selfie-guide/black-blazer-coffee-standing.jpg"
        imageAlt="Editorial portrait"
        imageFirst={true}
      />

      {/* FAQ */}
      <DarkSection eyebrow="FAQ" title="A few things people ask before joining." alt>
        <FaqGrid items={studioFaqs} />
      </DarkSection>

      <CtaClose
        title="When you want the advanced layer, this is it."
        primary={{ href: "/checkout/membership", label: "Join Studio — €97/mo" }}
        secondary={{ href: "/starter-kit", label: "Start Smaller" }}
      />

      <PublicFooter />
    </PublicPageShell>
  )
}

export function WorkWithMePageContent() {
  return (
    <PublicPageShell>
      <PublicNav />

      <Hero
        eyebrow="1:1 with Sandra"
        title={<>Two or three people at a time.<br />That&apos;s all.</>}
        body={<p>If what&apos;s not working is bigger than one preset or one lesson, this is where we start looking at the full picture.</p>}
        primaryHref="#inquiry-form"
        primaryLabel="Send an inquiry"
        secondaryHref="/join/studio"
        secondaryLabel="See Studio"
        imageSrc="/images/selfie-guide/golden-hour-guide-portrait.jpg"
        imageAlt="Golden hour portrait"
      />

      {/* What it is */}
      <DarkSection title="This is for the person who wants direct eyes on the problem." narrow alt>
        <div className="mkt-fade space-y-4 mt-4" style={{ ...bodyStyle, fontSize: "16px" }}>
          <p>Maybe the issue is the photos.</p>
          <p>Maybe it&apos;s the offer. Or the posting. Or the way none of it feels like you yet.</p>
          <p>That is what this is for.</p>
        </div>
      </DarkSection>

      {/* Inquiry form */}
      <section id="inquiry-form" style={{ background: C.bg, padding: "80px 24px", scrollMarginTop: "80px" }}>
        <div className="max-w-5xl mx-auto grid gap-12 md:grid-cols-2 md:items-start">
          <div className="mkt-fade">
            <span style={eyebrowStyle}>Inquiry</span>
            <h2 style={headingStyle}>Tell me what is not working right now.</h2>
            <p style={{ ...bodyStyle, fontSize: "16px" }}>
              Keep it simple. I only need enough to know whether this is the right fit.
            </p>
            <div className="mt-8" style={{ ...cardStyle, padding: "24px" }}>
              <p style={{ ...bodyStyle, fontSize: "13px", marginBottom: "12px" }}>
                <span style={{ color: C.textSub }}>Limited spots.</span> Sandra reads every inquiry herself and replies within 48 hours.
              </p>
            </div>
          </div>
          <div className="mkt-fade">
            <InquiryFormDark />
          </div>
        </div>
      </section>

      <PublicFooter />
    </PublicPageShell>
  )
}

// ─── Dark-themed inquiry form (standalone — avoids light public-* class conflicts) ──
function InquiryFormDark() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [instagram, setInstagram] = useState("")
  const [currentBlock, setCurrentBlock] = useState("")
  const [goal, setGoal] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const fieldStyle: React.CSSProperties = {
    display: "grid",
    gap: "8px",
    fontSize: "13px",
    color: C.textMuted,
    fontFamily: F.sans,
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    border: `1px solid ${C.cardBorder}`,
    background: "rgba(13,12,11,0.6)",
    color: C.text,
    padding: "12px 16px",
    fontSize: "14px",
    fontFamily: F.sans,
    borderRadius: "8px",
    outline: "none",
    transition: "border-color 0.2s",
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError("")
    setSuccess(false)
    startTransition(async () => {
      try {
        const response = await fetch("/api/inquiry/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, instagramHandle: instagram, currentChallenge: currentBlock, desiredOutcome: goal }),
        })
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        if (!response.ok) { setError(payload?.error || "Something went wrong. Please try again."); return }
        setSuccess(true)
        setName(""); setEmail(""); setInstagram(""); setCurrentBlock(""); setGoal("")
      } catch { setError("Something went wrong. Please try again.") }
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ ...cardStyle, display: "grid", gap: "20px" }}>
      <label style={fieldStyle}>
        <span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = C.cardBorderStrong }}
          onBlur={(e) => { e.currentTarget.style.borderColor = C.cardBorder }} />
      </label>
      <label style={fieldStyle}>
        <span>Email</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = C.cardBorderStrong }}
          onBlur={(e) => { e.currentTarget.style.borderColor = C.cardBorder }} />
      </label>
      <label style={fieldStyle}>
        <span>Instagram handle</span>
        <input value={instagram} onChange={(e) => setInstagram(e.target.value)} style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = C.cardBorderStrong }}
          onBlur={(e) => { e.currentTarget.style.borderColor = C.cardBorder }} />
      </label>
      <label style={fieldStyle}>
        <span>What&apos;s not working right now?</span>
        <textarea value={currentBlock} onChange={(e) => setCurrentBlock(e.target.value)} rows={4} required style={{ ...inputStyle, minHeight: "120px", resize: "vertical" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = C.cardBorderStrong }}
          onBlur={(e) => { e.currentTarget.style.borderColor = C.cardBorder }} />
      </label>
      <label style={fieldStyle}>
        <span>What do you want in the next 6 months?</span>
        <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={4} required style={{ ...inputStyle, minHeight: "120px", resize: "vertical" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = C.cardBorderStrong }}
          onBlur={(e) => { e.currentTarget.style.borderColor = C.cardBorder }} />
      </label>
      <button
        type="submit"
        disabled={isPending}
        style={{
          ...{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "15px 36px",
            minHeight: "48px",
            background: C.textSub,
            color: C.bg,
            fontSize: "11px",
            fontFamily: F.sans,
            fontWeight: 600,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            textDecoration: "none",
            borderRadius: "100px",
            border: `1px solid ${C.textSub}`,
            cursor: isPending ? "not-allowed" : "pointer",
            transition: "all 0.25s ease",
            width: "100%",
            opacity: isPending ? 0.6 : 1,
          },
        }}
      >
        {isPending ? "Sending…" : "Send an inquiry"}
      </button>
      {error ? <p style={{ fontSize: "13px", color: "#f87171" }}>{error}</p> : null}
      {success ? <p style={{ fontSize: "13px", color: C.textMuted }}>Got it. Sandra reads every inquiry herself and will reply within 48 hours.</p> : null}
    </form>
  )
}
