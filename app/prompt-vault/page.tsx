import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { PromptVaultAnalytics } from "@/components/prompt-vault/prompt-vault-analytics"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

export const metadata: Metadata = {
  title: "The AI Photo Prompt Vault · SSELFIE",
  description:
    "Turn one selfie into editorial brand photos. Copy-paste prompts, ChatGPT does the rest. $27.",
  openGraph: {
    title: "The AI Photo Prompt Vault · SSELFIE",
    description:
      "Turn one selfie into editorial brand photos. Copy-paste prompts, ChatGPT does the rest.",
    images: ["/academy/visibility-suite/sandra-hero.png"],
  },
}

const CHECKOUT_URL = "/checkout/prompt-vault"

const LP  = "0 2px 8px rgba(0,0,0,0.8), 0 -1px 0 rgba(255,255,255,0.06), 1px 1px 0 rgba(0,0,0,0.5)"
const HERO_GRAD = "linear-gradient(to bottom, rgba(10,10,10,0.28) 0%, rgba(10,10,10,0.08) 40%, rgba(10,10,10,0.88) 100%)"

function BuyButton({ label = "Get the Vault · $27" }: { label?: string }) {
  return (
    <Link
      href={CHECKOUT_URL}
      style={{
        display:         "inline-flex",
        alignItems:      "center",
        justifyContent:  "center",
        padding:         "13px 32px",
        minHeight:       "46px",
        background:      "#f5f5f5",
        color:           "#0a0a0a",
        fontSize:        "10px",
        fontWeight:      600,
        letterSpacing:   "0.22em",
        textTransform:   "uppercase",
        textDecoration:  "none",
        border:          "1px solid transparent",
        boxShadow:       "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)",
        whiteSpace:      "nowrap",
      }}
    >
      {label}
    </Link>
  )
}

export default function PromptVaultPage() {
  return (
    <main className={inter.className} style={{ background: "#0a0a0a", color: "#f5f5f5" }}>
      <PromptVaultAnalytics />

      {/* SVG noise defs — referenced throughout */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <defs>
          <filter id="pv-noise" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
      </svg>

      {/* ── HERO — Sandra's face, full-bleed, 100dvh ── */}
      <section
        style={{
          position:      "relative",
          minHeight:     "100dvh",
          display:       "flex",
          flexDirection: "column",
          overflow:      "hidden",
          background:    "#0a0a0a",
        }}
      >
        <Image
          src="/images/ai-prompts/coastal-white-shot-1.jpg"
          alt=""
          fill
          priority
          aria-hidden
          style={{ objectFit: "cover", objectPosition: "center 15%" }}
        />
        <div style={{ position: "absolute", inset: 0, background: HERO_GRAD }} />
        <svg aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.05, mixBlendMode: "screen", zIndex: 1 }}>
          <rect width="100%" height="100%" filter="url(#pv-noise)" />
        </svg>
        <nav
          aria-label="Prompt Vault navigation"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "22px clamp(18px, 4vw, 40px)",
          }}
        >
          <Link
            href="/"
            aria-label="SSELFIE home"
            className={cormorant.className}
            style={{
              color: "rgba(245,245,245,0.82)",
              fontSize: "15px",
              fontWeight: 300,
              letterSpacing: "0.34em",
              textDecoration: "none",
              textTransform: "uppercase",
              textShadow: LP,
            }}
          >
            SSELFIE
          </Link>
          <Link
            href="/starter-kit"
            style={{
              color: "rgba(245,245,245,0.56)",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.24em",
              textDecoration: "none",
              textTransform: "uppercase",
              textShadow: LP,
            }}
          >
            Starter Kit
          </Link>
        </nav>

        {/* Text at bottom — same as homepage */}
        <div
          style={{
            position:       "relative",
            zIndex:         2,
            flex:           1,
            display:        "flex",
            flexDirection:  "column",
            alignItems:     "center",
            justifyContent: "flex-end",
            textAlign:      "center",
            padding:        "80px 20px 68px",
          }}
        >
          <div style={{ maxWidth: "700px", width: "100%" }}>
            <p style={{
              margin:          "0 0 20px",
              fontSize:        "10px",
              fontWeight:      600,
              letterSpacing:   "0.5em",
              textTransform:   "uppercase",
              color:           "rgba(245,245,245,0.48)",
            }}>
              SSELFIE · AI PHOTO PROMPT VAULT
            </p>
            <h1
              className={cormorant.className}
              style={{
                margin:        "0 0 22px",
                fontSize:      "clamp(38px, 7vw, 72px)",
                fontWeight:    300,
                lineHeight:    1.02,
                letterSpacing: "-0.02em",
                color:         "#f5f5f5",
                textShadow:    LP,
              }}
            >
              The content you&apos;ve<br />been trying to create.
            </h1>
            <p style={{
              margin:   "0 auto 36px",
              fontSize: "16px",
              lineHeight: 1.8,
              color:    "rgba(245,245,245,0.72)",
              maxWidth: "460px",
            }}>
              One selfie. Editorial brand photos.
              Copy a prompt, open ChatGPT, attach your selfie. Done.
            </p>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              <BuyButton />
              <p style={{ margin: 0, fontSize: "12px", color: "rgba(245,245,245,0.34)", letterSpacing: "0.04em" }}>
                Instant access. No account required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── DESIRE MIRROR ── */}
      <section style={{
        borderTop: "1px solid rgba(245,245,245,0.07)",
        padding:   "clamp(80px, 10vw, 120px) clamp(18px, 4vw, 24px)",
      }}>
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          <h2
            className={cormorant.className}
            style={{
              margin:        "0 0 32px",
              fontSize:      "clamp(26px, 3.8vw, 42px)",
              fontWeight:    300,
              lineHeight:    1.32,
              letterSpacing: "-0.01em",
              color:         "#f5f5f5",
              textShadow:    LP,
            }}
          >
            You&apos;ve been saving those photos<br />for a reason.
          </h2>
          <p style={{ margin: "0 0 20px", fontSize: "16px", lineHeight: 1.85, color: "rgba(245,245,245,0.64)" }}>
            The cinematic ones. That editorial aesthetic. The kind of content that makes someone
            stop mid-scroll and think: how does her feed always look like that?
          </p>
          <p style={{ margin: "0 0 20px", fontSize: "16px", lineHeight: 1.85, color: "rgba(245,245,245,0.64)" }}>
            You&apos;ve been quietly building a Pinterest board of it. Calling it vibes. Someday.
            Inspiration. But really, you&apos;ve been building a picture of who you want to be online.
          </p>
          <p style={{ margin: 0, fontSize: "16px", lineHeight: 1.85, color: "rgba(245,245,245,0.72)", fontStyle: "italic" }}>
            This is that someday.
          </p>
        </div>
      </section>

      {/* ── COLLECTION 01 — Marble Café ── */}
      <section style={{ borderTop: "1px solid rgba(245,245,245,0.07)" }}>
        <div className="pv-section-inner">
          <p className="pv-eyebrow">COLLECTION 01</p>
          <h2 className={`${cormorant.className} pv-collection-title`}>
            Marble Café Wine Editorial
          </h2>
          <p className="pv-collection-feeling">
            For the version of you who has a favourite café table and a good glass of wine.
          </p>

          <div className="pv-col-01-grid">
            <div className="pv-img-dominant">
              <Image
                src="/images/ai-prompts/marble-wine-shot-2.jpg"
                alt="Marble Café Wine Editorial"
                fill
                style={{ objectFit: "cover", objectPosition: "center top" }}
              />
            </div>
            <div className="pv-img-stack">
              <div className="pv-img-stack-item">
                <Image
                  src="/images/ai-prompts/marble-wine-shot-5.jpg"
                  alt=""
                  fill
                  style={{ objectFit: "cover" }}
                  aria-hidden
                />
              </div>
              <div className="pv-img-stack-item">
                <Image
                  src="/images/ai-prompts/marble-wine-shot-3.jpg"
                  alt=""
                  fill
                  style={{ objectFit: "cover" }}
                  aria-hidden
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COLLECTION 02 — Denim Street ── */}
      <section style={{ borderTop: "1px solid rgba(245,245,245,0.07)" }}>
        <div className="pv-section-inner">
          <div className="pv-col-02-grid">
            {/* Text */}
            <div className="pv-col-02-copy">
              <p className="pv-eyebrow">COLLECTION 02</p>
              <h2 className={`${cormorant.className} pv-collection-title`}>
                Soft Blazer + Light Denim Street Editorial
              </h2>
              <p className="pv-collection-feeling">
                For the version of you who makes the sidewalk feel like a runway.
              </p>
            </div>
            {/* Hero portrait */}
            <div className="pv-col-02-hero">
              <Image
                src="/images/ai-prompts/denim-street-shot-5.jpg"
                alt="Soft Blazer Denim Street Editorial"
                fill
                style={{ objectFit: "cover", objectPosition: "center 18%" }}
              />
            </div>
          </div>

          {/* Two landscape support shots */}
          <div className="pv-support-grid">
            <div className="pv-support-img">
              <Image src="/images/ai-prompts/denim-street-shot-2.jpg" alt="" fill style={{ objectFit: "cover", objectPosition: "center 20%" }} aria-hidden />
            </div>
            <div className="pv-support-img">
              <Image src="/images/ai-prompts/denim-street-shot-9.jpg" alt="" fill style={{ objectFit: "cover", objectPosition: "center 20%" }} aria-hidden />
            </div>
          </div>
        </div>
      </section>

      {/* ── COLLECTION 03 — Cozy Leather ── */}
      <section style={{ borderTop: "1px solid rgba(245,245,245,0.07)" }}>
        <div className="pv-section-inner">
          <p className="pv-eyebrow">COLLECTION 03</p>
          <h2 className={`${cormorant.className} pv-collection-title`}>
            Cozy Leather + Oversized Knit Mirror Editorial
          </h2>
          <p className="pv-collection-feeling">
            For the version of you who turns a Sunday morning into a whole aesthetic.
          </p>

          {/* Full-width hero */}
          <div className="pv-col-03-hero">
            <Image
              src="/images/ai-prompts/cozy-leather-shot-1.png"
              alt="Cozy Leather Mirror Editorial"
              fill
              style={{ objectFit: "cover", objectPosition: "center 30%" }}
            />
          </div>

          {/* Two portrait support shots */}
          <div className="pv-col-03-support">
            <div className="pv-col-03-support-img">
              <Image src="/images/ai-prompts/cozy-leather-shot-4.png" alt="" fill style={{ objectFit: "cover" }} aria-hidden />
            </div>
            <div className="pv-col-03-support-img">
              <Image src="/images/ai-prompts/cozy-leather-shot-7.png" alt="" fill style={{ objectFit: "cover" }} aria-hidden />
            </div>
          </div>
        </div>
      </section>

      {/* ── COLLECTION 05 — Dark Balcony ── */}
      <section style={{ borderTop: "1px solid rgba(245,245,245,0.07)" }}>
        <div className="pv-section-inner">
          <p className="pv-eyebrow">COLLECTION 05</p>
          <h2 className={`${cormorant.className} pv-collection-title`}>
            Dark Balcony Luxury City Editorial
          </h2>
          <p className="pv-collection-feeling">
            For the version of you who steps onto a balcony in all black and lets the city watch.
          </p>

          <div className="pv-col-05-grid">
            <div className="pv-col-05-hero">
              <Image
                src="/images/ai-prompts/dark-balcony-shot-1.png"
                alt="Dark Balcony Luxury City Editorial"
                fill
                style={{ objectFit: "cover", objectPosition: "center top" }}
              />
            </div>
            <div className="pv-col-05-stack">
              <div className="pv-col-05-stack-item">
                <Image src="/images/ai-prompts/dark-balcony-shot-6.png" alt="" fill style={{ objectFit: "cover", objectPosition: "center top" }} aria-hidden />
              </div>
              <div className="pv-col-05-stack-item">
                <Image src="/images/ai-prompts/dark-balcony-shot-8.png" alt="" fill style={{ objectFit: "cover" }} aria-hidden />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COLLECTION 04 — Coastal White ── */}
      <section style={{ borderTop: "1px solid rgba(245,245,245,0.07)" }}>
        <div className="pv-section-inner">
          <div className="pv-col-04-grid">
            {/* Hero portrait */}
            <div className="pv-col-04-hero">
              <Image
                src="/images/ai-prompts/coastal-white-shot-1.jpg"
                alt="Coastal White Dress Sunset Editorial"
                fill
                style={{ objectFit: "cover", objectPosition: "center top" }}
              />
            </div>
            {/* Text + portrait stack */}
            <div className="pv-col-04-side">
              <div style={{ padding: "0 0 32px" }}>
                <p className="pv-eyebrow">COLLECTION 04</p>
                <h2 className={`${cormorant.className} pv-collection-title`}>
                  Coastal White Dress Sunset Editorial
                </h2>
                <p className="pv-collection-feeling">
                  For the version of you who belongs somewhere beautiful, in white, at golden hour.
                </p>
              </div>
              <div className="pv-col-04-stack">
                <div className="pv-col-04-stack-item">
                  <Image src="/images/ai-prompts/coastal-white-shot-3.jpg" alt="" fill style={{ objectFit: "cover" }} aria-hidden />
                </div>
                <div className="pv-col-04-stack-item">
                  <Image src="/images/ai-prompts/coastal-white-shot-8.jpg" alt="" fill style={{ objectFit: "cover", objectPosition: "center top" }} aria-hidden />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS — casual, no cards ── */}
      <section style={{
        borderTop: "1px solid rgba(245,245,245,0.07)",
        padding:   "clamp(60px, 8vw, 88px) clamp(18px, 4vw, 24px)",
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <p style={{ margin: "0 0 14px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.5em", textTransform: "uppercase", color: "rgba(245,245,245,0.32)" }}>
            HOW IT WORKS
          </p>
          <h2
            className={cormorant.className}
            style={{
              margin:        "0 0 56px",
              fontSize:      "clamp(28px, 4.5vw, 48px)",
              fontWeight:    300,
              lineHeight:    1.07,
              letterSpacing: "-0.015em",
              color:         "#f5f5f5",
              textShadow:    LP,
            }}
          >
            Three steps. Under a minute.
          </h2>

          <div className="pv-steps-grid">
            {[
              { n: "01", title: "Pick a look", body: "Open your vault. Find the aesthetic you want. Every prompt has an example photo so you know exactly what you're getting." },
              { n: "02", title: "Copy and paste", body: "One tap copies the prompt. Open ChatGPT, start a new conversation, paste it in. Attach your selfie." },
              { n: "03", title: "Your photo is ready", body: "ChatGPT generates it. Download it. Post it. The whole thing takes under a minute." },
            ].map((step) => (
              <div key={step.n}>
                <p style={{ margin: "0 0 14px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.36em", color: "rgba(245,245,245,0.28)" }}>{step.n}</p>
                <h3
                  className={cormorant.className}
                  style={{
                    margin:     "0 0 12px",
                    fontSize:   "clamp(19px, 2.5vw, 26px)",
                    fontWeight: 300,
                    lineHeight: 1.18,
                    color:      "#f5f5f5",
                    textShadow: LP,
                  }}
                >
                  {step.title}
                </h3>
                <p style={{ margin: 0, fontSize: "15px", lineHeight: 1.82, color: "rgba(245,245,245,0.5)" }}>{step.body}</p>
              </div>
            ))}
          </div>

          <p style={{ margin: "56px 0 0", fontSize: "14px", lineHeight: 1.8, color: "rgba(245,245,245,0.36)", maxWidth: "460px" }}>
            You just need a ChatGPT account. A free one works fine.
          </p>
        </div>
      </section>

      {/* ── FINAL CTA — Sandra portrait, full-bleed ── */}
      <section className="pv-cta-section">
        <Image
          src="/images/ai-prompts/marble-wine-shot-1.jpg"
          alt=""
          fill
          aria-hidden
          style={{ objectFit: "cover", objectPosition: "center 30%" }}
        />
        <div style={{
          position:   "absolute",
          inset:      0,
          background: "linear-gradient(to bottom, rgba(10,10,10,0.62) 0%, rgba(10,10,10,0.72) 100%)",
        }} />
        <svg aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.05, mixBlendMode: "screen", zIndex: 1 }}>
          <rect width="100%" height="100%" filter="url(#pv-noise)" />
        </svg>

        <div className="pv-cta-inner">
          <p style={{ margin: "0 0 20px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.5em", textTransform: "uppercase", color: "rgba(245,245,245,0.42)" }}>
            THE AI PHOTO PROMPT VAULT
          </p>
          <h2
            className={cormorant.className}
            style={{
              margin:        "0 0 20px",
              fontSize:      "clamp(34px, 5.5vw, 60px)",
              fontWeight:    300,
              lineHeight:    1.04,
              letterSpacing: "-0.02em",
              color:         "#f5f5f5",
              textShadow:    LP,
            }}
          >
            This is how you become<br />that girl online.
          </h2>
          <p style={{ margin: "0 0 16px", fontSize: "16px", lineHeight: 1.85, color: "rgba(245,245,245,0.66)", maxWidth: "480px" }}>
            No photographer. No studio. No perfect circumstances. One selfie is all you need.
          </p>
          <p style={{ margin: "0 0 40px", fontSize: "15px", lineHeight: 1.8, color: "rgba(245,245,245,0.44)" }}>
            Five editorial collections. Growing as new shoots drop. Buy once, keep forever.
          </p>

          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 36px", display: "flex", flexDirection: "column", gap: "7px" }}>
            {[
              "Dark Balcony Luxury City Editorial",
              "Coastal White Dress Sunset Editorial",
              "Marble Café Wine Editorial",
              "Soft Blazer + Light Denim Street Editorial",
              "Cozy Leather + Oversized Knit Mirror Editorial",
              "Growing collection as new styles drop",
              "Example photo for every prompt",
              "Instant access, no account required",
            ].map((item) => (
              <li key={item} style={{ fontSize: "14px", color: "rgba(245,245,245,0.52)", lineHeight: 1.6 }}>
                <span style={{ color: "rgba(245,245,245,0.28)", marginRight: "8px" }}>·</span>
                {item}
              </li>
            ))}
          </ul>

          <BuyButton />
          <p style={{ margin: "16px 0 0", fontSize: "12px", color: "rgba(245,245,245,0.28)", letterSpacing: "0.04em" }}>
            One-time payment. Access link sent to your inbox immediately.
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid rgba(245,245,245,0.07)", padding: "40px 24px", textAlign: "center" }}>
        <p style={{ margin: "0 0 8px", fontSize: "12px", color: "rgba(245,245,245,0.34)" }}>
          Questions? Email{" "}
          <a href="mailto:support@sselfie.ai" style={{ color: "rgba(245,245,245,0.5)", textDecoration: "none" }}>
            support@sselfie.ai
          </a>
        </p>
        <p className={cormorant.className} style={{ margin: 0, fontSize: "11px", fontWeight: 300, letterSpacing: "0.46em", textTransform: "uppercase", color: "rgba(245,245,245,0.18)" }}>
          SSELFIE
        </p>
      </footer>

      <style>{`
        /* Section inner wrapper */
        .pv-section-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: clamp(60px, 8vw, 88px) clamp(18px, 4vw, 24px);
        }

        /* Shared eyebrow */
        .pv-eyebrow {
          margin: 0 0 14px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: rgba(245,245,245,0.32);
        }

        /* Collection title */
        .pv-collection-title {
          margin: 0 0 16px;
          font-size: clamp(28px, 4.5vw, 52px);
          font-weight: 300;
          line-height: 1.07;
          letter-spacing: -0.015em;
          color: #f5f5f5;
          text-shadow: ${LP};
        }

        /* Collection identity line */
        .pv-collection-feeling {
          margin: 0 0 44px;
          font-size: 16px;
          line-height: 1.8;
          color: rgba(245,245,245,0.52);
          max-width: 480px;
          font-style: italic;
        }

        /* Collection 01 — dominant + stacked */
        .pv-col-01-grid {
          display: grid;
          grid-template-columns: 3fr 2fr;
          gap: 16px;
          align-items: start;
        }
        .pv-img-dominant {
          position: relative;
          aspect-ratio: 3/4;
          overflow: hidden;
        }
        .pv-img-stack {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .pv-img-stack-item {
          position: relative;
          aspect-ratio: 3/4;
          overflow: hidden;
        }

        /* Collection 02 — split editorial */
        .pv-col-02-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(40px, 6vw, 88px);
          align-items: center;
          margin-bottom: 16px;
        }
        .pv-col-02-copy { /* text side */ }
        .pv-col-02-hero {
          position: relative;
          aspect-ratio: 2/3;
          overflow: hidden;
        }
        .pv-support-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .pv-support-img {
          position: relative;
          aspect-ratio: 3/2;
          overflow: hidden;
        }

        /* Collection 03 — full-width hero */
        .pv-col-03-hero {
          position: relative;
          width: 100%;
          aspect-ratio: 16/9;
          overflow: hidden;
        }
        .pv-col-03-support {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 16px;
        }
        .pv-col-03-support-img {
          position: relative;
          aspect-ratio: 2/3;
          overflow: hidden;
        }

        /* Collection 05 — dominant hero + stacked two portraits */
        .pv-col-05-grid {
          display: grid;
          grid-template-columns: 3fr 2fr;
          gap: 16px;
          align-items: start;
        }
        .pv-col-05-hero {
          position: relative;
          aspect-ratio: 2/3;
          overflow: hidden;
        }
        .pv-col-05-stack {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .pv-col-05-stack-item {
          position: relative;
          aspect-ratio: 2/3;
          overflow: hidden;
        }

        /* Collection 04 — portrait hero + side text/stack */
        .pv-col-04-grid {
          display: grid;
          grid-template-columns: 2fr 3fr;
          gap: 16px;
          align-items: start;
        }
        .pv-col-04-hero {
          position: relative;
          aspect-ratio: 2/3;
          overflow: hidden;
        }
        .pv-col-04-side {
          display: flex;
          flex-direction: column;
        }
        .pv-col-04-stack {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .pv-col-04-stack-item {
          position: relative;
          aspect-ratio: 2/3;
          overflow: hidden;
        }

        /* How it works steps */
        .pv-steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: clamp(32px, 5vw, 64px);
        }

        /* Final CTA */
        .pv-cta-section {
          position: relative;
          overflow: hidden;
          min-height: 75vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          border-top: 1px solid rgba(245,245,245,0.07);
        }
        .pv-cta-inner {
          position: relative;
          z-index: 2;
          max-width: 560px;
          padding: clamp(60px, 8vw, 88px) 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* Mobile — collapse grids to single column */
        @media (max-width: 640px) {
          .pv-col-01-grid {
            grid-template-columns: 1fr;
          }
          .pv-img-stack {
            flex-direction: row;
          }
          .pv-img-stack-item {
            flex: 1;
          }
          .pv-col-02-grid {
            grid-template-columns: 1fr;
          }
          .pv-col-02-copy { order: 1; }
          .pv-col-02-hero { order: 2; }
          .pv-col-03-hero {
            aspect-ratio: 4/3;
          }
          .pv-col-05-grid {
            grid-template-columns: 1fr;
          }
          .pv-col-05-stack {
            flex-direction: row;
          }
          .pv-col-05-stack-item {
            flex: 1;
          }
          .pv-col-04-grid {
            grid-template-columns: 1fr;
          }
          .pv-col-04-stack {
            grid-template-columns: 1fr 1fr;
          }
          .pv-steps-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .pv-support-grid {
            grid-template-columns: 1fr 1fr;
          }
          .pv-support-img {
            aspect-ratio: 1/1;
          }
        }
      `}</style>
    </main>
  )
}
