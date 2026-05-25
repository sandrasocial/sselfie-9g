import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { Cormorant_Garamond, Inter } from "next/font/google"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

export const metadata: Metadata = {
  title: "The AI Photo Prompt Vault · SSELFIE",
  description:
    "Copy-paste ChatGPT prompts for editorial brand photos. Growing collection of photoshoot styles. $27.",
  openGraph: {
    title: "The AI Photo Prompt Vault · SSELFIE",
    description:
      "Copy-paste ChatGPT prompts for editorial brand photos. Growing collection of photoshoot styles.",
    images: ["/images/ai-prompts/denim-street-shot-1.jpg"],
  },
}

const CHECKOUT_URL = "/checkout/prompt-vault"

// Letterpress shadow — matches homepage LP.dark exactly
const LP = "0 2px 8px rgba(0,0,0,0.8), 0 -1px 0 rgba(255,255,255,0.06), 1px 1px 0 rgba(0,0,0,0.5)"

// Hero gradient — matches homepage C.heroGrad
const HERO_GRAD =
  "linear-gradient(to bottom, rgba(10,10,10,0.34) 0%, rgba(10,10,10,0.10) 38%, rgba(10,10,10,0.90) 100%)"

function BuyButton() {
  return (
    <Link
      href={CHECKOUT_URL}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "13px 32px",
        minHeight: "46px",
        background: "#f5f5f5",
        color: "#0a0a0a",
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        textDecoration: "none",
        border: "1px solid transparent",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)",
        whiteSpace: "nowrap",
      }}
    >
      Get the Vault — $27
    </Link>
  )
}

export default function PromptVaultPage() {
  return (
    <main className={inter.className} style={{ background: "#0a0a0a", color: "#f5f5f5" }}>

      {/* ── Hero — full-bleed cinematic, 100dvh ── */}
      <section
        style={{
          position: "relative",
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "#0a0a0a",
        }}
      >
        <Image
          src="/images/ai-prompts/denim-street-shot-1.jpg"
          alt=""
          fill
          priority
          aria-hidden
          style={{ objectFit: "cover", objectPosition: "50% 20%" }}
        />
        {/* Dark gradient — identical to homepage */}
        <div style={{ position: "absolute", inset: 0, background: HERO_GRAD }} />
        {/* Paper noise texture */}
        <svg aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.055, mixBlendMode: "screen", zIndex: 1 }}>
          <rect width="100%" height="100%" filter="url(#pv-noise)" />
        </svg>
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
          <defs>
            <filter id="pv-noise" x="0%" y="0%" width="100%" height="100%">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
          </defs>
        </svg>

        {/* Text anchored at bottom — same layout as homepage Hero */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            textAlign: "center",
            padding: "80px 20px 68px",
          }}
        >
          <div style={{ maxWidth: "680px", width: "100%" }}>
            <p
              style={{
                margin: "0 0 20px",
                fontSize: "10px",
                fontWeight: 600,
                letterSpacing: "0.5em",
                textTransform: "uppercase",
                color: "rgba(245,245,245,0.48)",
              }}
            >
              SSELFIE · AI PHOTO PROMPT VAULT
            </p>
            <h1
              className={cormorant.className}
              style={{
                margin: "0 0 20px",
                fontSize: "clamp(36px, 7vw, 70px)",
                fontWeight: 300,
                lineHeight: 1.03,
                letterSpacing: "-0.02em",
                color: "#f5f5f5",
                textShadow: LP,
              }}
            >
              Your selfie was<br />never the problem.
            </h1>
            <p
              style={{
                margin: "0 auto 36px",
                fontSize: "16px",
                lineHeight: 1.78,
                color: "rgba(245,245,245,0.72)",
                maxWidth: "460px",
              }}
            >
              Copy-paste prompts for editorial brand photos.
              Open ChatGPT, paste, attach your selfie. The photo does the rest.
            </p>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
              <BuyButton />
              <p style={{ margin: 0, fontSize: "12px", color: "rgba(245,245,245,0.36)", letterSpacing: "0.04em" }}>
                Instant access. No account required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Identity statement ── */}
      <section
        style={{
          borderTop: "1px solid rgba(245,245,245,0.07)",
          padding: "clamp(80px, 10vw, 120px) clamp(18px, 4vw, 24px)",
        }}
      >
        <div style={{ maxWidth: "660px", margin: "0 auto", textAlign: "center" }}>
          <p
            className={cormorant.className}
            style={{
              margin: 0,
              fontSize: "clamp(22px, 3.2vw, 36px)",
              fontWeight: 300,
              lineHeight: 1.5,
              letterSpacing: "-0.01em",
              color: "rgba(245,245,245,0.88)",
              textShadow: LP,
            }}
          >
            Your audience isn&apos;t buying prompts.<br />
            They&apos;re buying the life in the photo.
          </p>
          <p
            style={{
              margin: "28px 0 0",
              fontSize: "15px",
              lineHeight: 1.85,
              color: "rgba(245,245,245,0.46)",
            }}
          >
            These prompts were built to produce images that feel intentional, expensive, and
            unmistakably you — without a studio, a photographer, or a shoot day.
          </p>
        </div>
      </section>

      {/* ── Collection 01 — Marble Café ── */}
      <section style={{ borderTop: "1px solid rgba(245,245,245,0.07)" }}>
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "clamp(60px, 8vw, 88px) clamp(18px, 4vw, 24px)",
          }}
        >
          <p
            style={{
              margin: "0 0 14px",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.5em",
              textTransform: "uppercase",
              color: "rgba(245,245,245,0.32)",
            }}
          >
            COLLECTION 01
          </p>
          <h2
            className={cormorant.className}
            style={{
              margin: "0 0 44px",
              fontSize: "clamp(28px, 4.5vw, 52px)",
              fontWeight: 300,
              lineHeight: 1.07,
              letterSpacing: "-0.015em",
              color: "#f5f5f5",
              textShadow: LP,
            }}
          >
            Marble Café Wine Editorial
          </h2>

          {/* Editorial image layout — one dominant, two stacked */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "3fr 2fr",
              gap: "16px",
              alignItems: "start",
            }}
          >
            <div style={{ position: "relative", aspectRatio: "3/4", overflow: "hidden" }}>
              <Image
                src="/images/ai-prompts/marble-wine-shot-2.jpg"
                alt="Marble Café Wine Editorial"
                fill
                style={{ objectFit: "cover", objectPosition: "50% 20%" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ position: "relative", aspectRatio: "3/4", overflow: "hidden" }}>
                <Image
                  src="/images/ai-prompts/marble-wine-shot-5.jpg"
                  alt=""
                  fill
                  style={{ objectFit: "cover" }}
                  aria-hidden
                />
              </div>
              <div style={{ position: "relative", aspectRatio: "3/4", overflow: "hidden" }}>
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

          <p
            style={{
              margin: "32px 0 0",
              fontSize: "15px",
              lineHeight: 1.85,
              color: "rgba(245,245,245,0.44)",
              maxWidth: "480px",
            }}
          >
            Café table, wine glass, marble surface. From casual sip to close editorial detail.
          </p>
        </div>
      </section>

      {/* ── Collection 02 — Denim Street — split editorial ── */}
      <section style={{ borderTop: "1px solid rgba(245,245,245,0.07)" }}>
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "clamp(60px, 8vw, 88px) clamp(18px, 4vw, 24px)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "clamp(40px, 6vw, 88px)",
              alignItems: "center",
            }}
          >
            {/* Text left */}
            <div>
              <p
                style={{
                  margin: "0 0 14px",
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.5em",
                  textTransform: "uppercase",
                  color: "rgba(245,245,245,0.32)",
                }}
              >
                COLLECTION 02
              </p>
              <h2
                className={cormorant.className}
                style={{
                  margin: "0 0 24px",
                  fontSize: "clamp(28px, 4.5vw, 52px)",
                  fontWeight: 300,
                  lineHeight: 1.07,
                  letterSpacing: "-0.015em",
                  color: "#f5f5f5",
                  textShadow: LP,
                }}
              >
                Soft Blazer + Light Denim Street Editorial
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: "15px",
                  lineHeight: 1.85,
                  color: "rgba(245,245,245,0.44)",
                }}
              >
                Outdoor editorial covering every angle. Wide establishing frames to tight
                close-up detail.
              </p>
            </div>
            {/* Image right — tall portrait */}
            <div style={{ position: "relative", aspectRatio: "2/3", overflow: "hidden" }}>
              <Image
                src="/images/ai-prompts/denim-street-shot-5.jpg"
                alt="Soft Blazer and Light Denim Street Editorial"
                fill
                style={{ objectFit: "cover", objectPosition: "50% 15%" }}
              />
            </div>
          </div>

          {/* Supporting images below */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginTop: "16px",
            }}
          >
            <div style={{ position: "relative", aspectRatio: "3/2", overflow: "hidden" }}>
              <Image
                src="/images/ai-prompts/denim-street-shot-2.jpg"
                alt=""
                fill
                style={{ objectFit: "cover", objectPosition: "50% 20%" }}
                aria-hidden
              />
            </div>
            <div style={{ position: "relative", aspectRatio: "3/2", overflow: "hidden" }}>
              <Image
                src="/images/ai-prompts/denim-street-shot-9.jpg"
                alt=""
                fill
                style={{ objectFit: "cover", objectPosition: "50% 20%" }}
                aria-hidden
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Collection 03 — Cozy Leather — full-width hero ── */}
      <section style={{ borderTop: "1px solid rgba(245,245,245,0.07)" }}>
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "clamp(60px, 8vw, 88px) clamp(18px, 4vw, 24px)",
          }}
        >
          <p
            style={{
              margin: "0 0 14px",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.5em",
              textTransform: "uppercase",
              color: "rgba(245,245,245,0.32)",
            }}
          >
            COLLECTION 03
          </p>
          <h2
            className={cormorant.className}
            style={{
              margin: "0 0 44px",
              fontSize: "clamp(28px, 4.5vw, 52px)",
              fontWeight: 300,
              lineHeight: 1.07,
              letterSpacing: "-0.015em",
              color: "#f5f5f5",
              textShadow: LP,
            }}
          >
            Cozy Leather + Oversized Knit Mirror Editorial
          </h2>

          {/* Full-width hero image */}
          <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", overflow: "hidden" }}>
            <Image
              src="/images/ai-prompts/cozy-leather-shot-1.png"
              alt="Cozy Leather and Oversized Knit Mirror Editorial"
              fill
              style={{ objectFit: "cover", objectPosition: "50% 30%" }}
            />
          </div>

          {/* Two supporting portrait images */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginTop: "16px",
            }}
          >
            <div style={{ position: "relative", aspectRatio: "2/3", overflow: "hidden" }}>
              <Image
                src="/images/ai-prompts/cozy-leather-shot-4.png"
                alt=""
                fill
                style={{ objectFit: "cover" }}
                aria-hidden
              />
            </div>
            <div style={{ position: "relative", aspectRatio: "2/3", overflow: "hidden" }}>
              <Image
                src="/images/ai-prompts/cozy-leather-shot-7.png"
                alt=""
                fill
                style={{ objectFit: "cover" }}
                aria-hidden
              />
            </div>
          </div>

          <p
            style={{
              margin: "32px 0 0",
              fontSize: "15px",
              lineHeight: 1.85,
              color: "rgba(245,245,245,0.44)",
              maxWidth: "480px",
            }}
          >
            Indoor mirror light, leather jacket, oversized knit. Soft natural light to
            high-contrast moody.
          </p>
        </div>
      </section>

      {/* ── How it works — pure typography, no cards ── */}
      <section
        style={{
          borderTop: "1px solid rgba(245,245,245,0.07)",
          padding: "clamp(60px, 8vw, 88px) clamp(18px, 4vw, 24px)",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <p
            style={{
              margin: "0 0 14px",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.5em",
              textTransform: "uppercase",
              color: "rgba(245,245,245,0.32)",
            }}
          >
            HOW IT WORKS
          </p>
          <h2
            className={cormorant.className}
            style={{
              margin: "0 0 60px",
              fontSize: "clamp(28px, 4.5vw, 48px)",
              fontWeight: 300,
              lineHeight: 1.07,
              letterSpacing: "-0.015em",
              color: "#f5f5f5",
              textShadow: LP,
            }}
          >
            Copy. Paste. Done.
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "clamp(32px, 5vw, 64px)",
            }}
          >
            {[
              {
                n: "01",
                title: "Pick a prompt",
                body: "Open your vault. Every card has a copy button. One tap.",
              },
              {
                n: "02",
                title: "Paste into ChatGPT",
                body: "Open a new ChatGPT conversation, paste the prompt, attach your selfie.",
              },
              {
                n: "03",
                title: "Get your brand photo",
                body: "ChatGPT generates the image. Download it. Post it.",
              },
            ].map((step) => (
              <div key={step.n}>
                <p
                  style={{
                    margin: "0 0 16px",
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.36em",
                    color: "rgba(245,245,245,0.28)",
                  }}
                >
                  {step.n}
                </p>
                <h3
                  className={cormorant.className}
                  style={{
                    margin: "0 0 14px",
                    fontSize: "clamp(19px, 2.5vw, 26px)",
                    fontWeight: 300,
                    lineHeight: 1.18,
                    color: "#f5f5f5",
                    textShadow: LP,
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    lineHeight: 1.8,
                    color: "rgba(245,245,245,0.48)",
                  }}
                >
                  {step.body}
                </p>
              </div>
            ))}
          </div>

          <p
            style={{
              margin: "64px 0 0",
              fontSize: "14px",
              lineHeight: 1.8,
              color: "rgba(245,245,245,0.38)",
              maxWidth: "520px",
            }}
          >
            All you need is a ChatGPT account and one selfie. No design software. No editing
            skills. No photographer.
          </p>
        </div>
      </section>

      {/* ── Final CTA — full-bleed with image background ── */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          minHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          borderTop: "1px solid rgba(245,245,245,0.07)",
        }}
      >
        <Image
          src="/images/ai-prompts/marble-wine-shot-1.jpg"
          alt=""
          fill
          aria-hidden
          style={{ objectFit: "cover", objectPosition: "50% 40%" }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(10,10,10,0.7) 0%, rgba(10,10,10,0.72) 100%)",
          }}
        />
        <svg aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.055, mixBlendMode: "screen", zIndex: 1 }}>
          <rect width="100%" height="100%" filter="url(#pv-noise)" />
        </svg>

        <div
          style={{
            position: "relative",
            zIndex: 2,
            maxWidth: "560px",
            padding: "clamp(60px, 8vw, 88px) 20px",
          }}
        >
          <p
            style={{
              margin: "0 0 20px",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.5em",
              textTransform: "uppercase",
              color: "rgba(245,245,245,0.42)",
            }}
          >
            THE AI PHOTO PROMPT VAULT
          </p>
          <h2
            className={cormorant.className}
            style={{
              margin: "0 0 16px",
              fontSize: "clamp(32px, 5vw, 56px)",
              fontWeight: 300,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "#f5f5f5",
              textShadow: LP,
            }}
          >
            This is for the woman<br />becoming visible again.
          </h2>
          <p
            style={{
              margin: "0 0 40px",
              fontSize: "15px",
              lineHeight: 1.85,
              color: "rgba(245,245,245,0.58)",
            }}
          >
            Three editorial collections. Growing collection as new shoots drop.
            Buy once, keep forever.
          </p>

          <div style={{ marginBottom: "24px" }}>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "0 0 36px",
                display: "flex",
                flexDirection: "column",
                gap: "7px",
              }}
            >
              {[
                "Marble Café Wine Editorial",
                "Soft Blazer + Light Denim Street Editorial",
                "Cozy Leather + Oversized Knit Mirror Editorial",
                "Growing collection — new styles as they drop",
                "Example photo for every prompt",
                "Instant access, no account required",
              ].map((item) => (
                <li
                  key={item}
                  style={{
                    fontSize: "14px",
                    color: "rgba(245,245,245,0.52)",
                    lineHeight: 1.6,
                  }}
                >
                  <span style={{ color: "rgba(245,245,245,0.28)", marginRight: "8px" }}>·</span>
                  {item}
                </li>
              ))}
            </ul>
            <BuyButton />
          </div>

          <p
            style={{
              margin: "16px 0 0",
              fontSize: "12px",
              color: "rgba(245,245,245,0.30)",
              letterSpacing: "0.04em",
            }}
          >
            One-time payment. Access link sent to your inbox immediately.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: "1px solid rgba(245,245,245,0.07)",
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: "0 0 8px",
            fontSize: "12px",
            color: "rgba(245,245,245,0.34)",
          }}
        >
          Questions? Email{" "}
          <a
            href="mailto:support@sselfie.ai"
            style={{ color: "rgba(245,245,245,0.5)", textDecoration: "none" }}
          >
            support@sselfie.ai
          </a>
        </p>
        <p
          style={{
            margin: 0,
            fontFamily: `'Cormorant Garamond', Georgia, serif`,
            fontSize: "11px",
            fontWeight: 300,
            letterSpacing: "0.46em",
            textTransform: "uppercase",
            color: "rgba(245,245,245,0.18)",
          }}
        >
          SSELFIE
        </p>
      </footer>

    </main>
  )
}
