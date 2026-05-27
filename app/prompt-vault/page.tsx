import Image from "next/image"
import Link from "next/link"
import { Suspense } from "react"
import type { Metadata } from "next"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { PromptVaultAnalytics } from "@/components/prompt-vault/prompt-vault-analytics"
import { PromptVaultCheckoutLink } from "@/components/prompt-vault/prompt-vault-checkout-link"
import { CopyButton } from "@/components/ai-prompts/copy-button"
import {
  FREEBIE_COLLECTION_PREVIEWS,
  VAULT_COLLECTION_META,
} from "@/lib/ai-prompts/prompt-data"

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

const BUY_BUTTON_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "13px 28px",
  background: "#0A0A0A",
  color: "#FFFFFF",
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  textDecoration: "none",
  whiteSpace: "nowrap",
  border: "none",
  cursor: "pointer",
} as const

function BuyButton({ label = "Get the Vault · $27" }: { label?: string }) {
  return (
    <Suspense
      fallback={
        <Link href="/checkout/prompt-vault" style={BUY_BUTTON_STYLE}>
          {label}
        </Link>
      }
    >
      <PromptVaultCheckoutLink label={label} />
    </Suspense>
  )
}

export default function PromptVaultPage() {
  return (
    <main className={inter.className} style={{ background: "#F5EFE6", color: "#0A0A0A" }}>
      <Suspense fallback={null}>
        <PromptVaultAnalytics />
      </Suspense>

      {/* ── NAV ── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#F5EFE6",
          borderBottom: "1px solid #E5DDD4",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "15px clamp(18px, 4vw, 40px)",
        }}
      >
        <Link
          href="/"
          className={cormorant.className}
          style={{
            color: "#0A0A0A",
            fontSize: "16px",
            fontWeight: 300,
            letterSpacing: "0.34em",
            textDecoration: "none",
            textTransform: "uppercase",
          }}
        >
          SSELFIE
        </Link>
        <BuyButton label="Get the Vault · $27" />
      </nav>

      {/* ── HERO — editorial split ── */}
      <section className="pvf-hero">
        {/* Left: text */}
        <div className="pvf-hero-text">
          <p
            style={{
              margin: "0 0 18px",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.42em",
              textTransform: "uppercase",
              color: "#9B9189",
            }}
          >
            SSELFIE · FREE PHOTOSHOOT PREVIEW
          </p>
          <h1
            className={cormorant.className}
            style={{
              margin: "0 0 24px",
              fontSize: "clamp(44px, 6.5vw, 88px)",
              fontWeight: 300,
              lineHeight: 1.0,
              letterSpacing: "-0.025em",
              color: "#0A0A0A",
            }}
          >
            Your<br />Photoshoot<br />Preview
          </h1>
          <p
            style={{
              margin: "0 0 32px",
              fontSize: "17px",
              lineHeight: 1.85,
              color: "#3A3632",
              maxWidth: "400px",
            }}
          >
            Shot 1 from every Vault collection is here. Pick a visual identity,
            copy the prompt, upload one selfie, and see which version of you
            feels the most alive.
          </p>
          <a
            href="#free-previews"
            style={{
              fontSize: "13px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              color: "#9B9189",
              textDecoration: "none",
            }}
          >
            Explore the shots ↓
          </a>
        </div>

        {/* Right: 2×2 collage */}
        <div className="pvf-hero-collage">
          <div className="pvf-collage-grid">
            {[
              "/images/ai-prompts/dark-feminine-cafe-shot-3.jpg",
              "/images/ai-prompts/coastal-white-shot-1.jpg",
              "/images/ai-prompts/dark-balcony-shot-1.png",
              "/images/ai-prompts/marble-wine-shot-2.jpg",
            ].map((src, i) => (
              <div key={i} style={{ position: "relative", overflow: "hidden" }}>
                <Image
                  src={src}
                  alt=""
                  fill
                  aria-hidden
                  priority={i < 2}
                  style={{ objectFit: "cover", objectPosition: "center top" }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DESIRE BRIDGE ── */}
      <section
        style={{
          borderTop: "1px solid #E5DDD4",
          padding: "clamp(60px, 7vw, 88px) clamp(18px, 4vw, 40px)",
        }}
      >
        <div style={{ maxWidth: "620px", margin: "0 auto" }}>
          <h2
            className={cormorant.className}
            style={{
              margin: "0 0 24px",
              fontSize: "clamp(28px, 4vw, 46px)",
              fontWeight: 300,
              lineHeight: 1.24,
              letterSpacing: "-0.01em",
              color: "#0A0A0A",
            }}
          >
            You&apos;ve been saving those photos<br />for a reason.
          </h2>
          <p
            style={{
              margin: "0 0 18px",
              fontSize: "16px",
              lineHeight: 1.85,
              color: "#3A3632",
            }}
          >
            The cinematic ones. That editorial aesthetic. The kind of content
            that makes someone stop mid-scroll and think: how does her feed
            always look like that?
          </p>
          <p
            style={{
              margin: "0 0 18px",
              fontSize: "16px",
              lineHeight: 1.85,
              color: "#3A3632",
            }}
          >
            You&apos;ve been quietly building a picture of who you want to be online.
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "16px",
              lineHeight: 1.85,
              color: "#3A3632",
              fontStyle: "italic",
            }}
          >
            This is that version of you.
          </p>
        </div>
      </section>

      {/* ── FREE PREVIEW CARDS ── */}
      <section
        id="free-previews"
        style={{ borderTop: "1px solid #E5DDD4", background: "#FAF8F4" }}
      >
        <div className="pvf-section-inner">
          <p className="pvf-eyebrow">THE FREE PREVIEW</p>
          <h2 className={`pvf-section-title ${cormorant.className}`}>
            Shot 1 from every collection.
          </h2>
          <p className="pvf-section-note">
            Copy the prompt. Open ChatGPT. Attach your selfie. That is the whole process.
          </p>

          <div className="pvf-preview-grid">
            {FREEBIE_COLLECTION_PREVIEWS.map((card) => {
              const meta = VAULT_COLLECTION_META.find((m) => m.previewCardId === card.id)
              return (
                <article key={card.id} className="pvf-preview-card">
                  {card.exampleImage && (
                    <div className="pvf-preview-image-wrap">
                      <Image
                        src={card.exampleImage}
                        alt={`${card.title} example`}
                        width={600}
                        height={750}
                        className="pvf-preview-image"
                      />
                      {meta && (
                        <div className="pvf-preview-badge">
                          Shot 1 of {meta.shotCount}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="pvf-preview-body">
                    <p className="pvf-card-eyebrow">{card.number}</p>
                    <h3 className={`pvf-card-title ${cormorant.className}`}>
                      {card.title}
                    </h3>
                    {card.mood && <p className="pvf-card-mood">{card.mood}</p>}
                    {card.whenToUse && (
                      <p className="pvf-card-when">{card.whenToUse}</p>
                    )}
                    <div className="pvf-prompt-wrap">
                      <p className="pvf-prompt-label">THE PROMPT</p>
                      <p className="pvf-prompt-text">{card.prompt}</p>
                      <CopyButton
                        text={card.prompt}
                        promptTitle={card.title}
                        promptNumber={card.number}
                        trackEvent="prompt_vault_prompt_copied"
                        trackSource="prompt-vault"
                      />
                    </div>
                    {meta && (
                      <p className="pvf-vault-note">
                        Shot 1 is free. The full {meta.shotCount}-shot collection
                        is inside the Vault.
                      </p>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section
        style={{
          borderTop: "1px solid #E5DDD4",
          padding: "clamp(64px, 8vw, 96px) clamp(18px, 4vw, 40px)",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <p className="pvf-eyebrow">HOW IT WORKS</p>
          <h2
            className={`pvf-section-title ${cormorant.className}`}
            style={{ marginBottom: "52px" }}
          >
            Three steps. Under a minute.
          </h2>
          <div className="pvf-steps-grid">
            {[
              {
                n: "01",
                title: "Pick a look",
                body: "Find the aesthetic you want above. Every preview includes an example photo so you know exactly what you are getting.",
              },
              {
                n: "02",
                title: "Copy and paste",
                body: "One tap copies the prompt. Open ChatGPT, start a new conversation, paste it in. Attach your selfie.",
              },
              {
                n: "03",
                title: "Your photo is ready",
                body: "ChatGPT generates it. Download it. Post it. The whole thing takes under a minute.",
              },
            ].map((step) => (
              <div key={step.n}>
                <p
                  style={{
                    margin: "0 0 12px",
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.36em",
                    color: "#9B9189",
                  }}
                >
                  {step.n}
                </p>
                <h3
                  className={cormorant.className}
                  style={{
                    margin: "0 0 12px",
                    fontSize: "clamp(20px, 2.5vw, 28px)",
                    fontWeight: 300,
                    lineHeight: 1.18,
                    color: "#0A0A0A",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    lineHeight: 1.82,
                    color: "#3A3632",
                  }}
                >
                  {step.body}
                </p>
              </div>
            ))}
          </div>
          <p
            style={{
              marginTop: "48px",
              fontSize: "14px",
              color: "#9B9189",
              lineHeight: 1.7,
            }}
          >
            You just need a ChatGPT account. A free one works fine.
          </p>
        </div>
      </section>

      {/* ── VAULT UPSELL ── */}
      <section
        style={{
          borderTop: "1px solid #E5DDD4",
          background: "#FAF8F4",
          padding: "clamp(64px, 8vw, 96px) clamp(18px, 4vw, 40px)",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Image strip */}
          <div className="pvf-upsell-strip">
            {[
              "/images/ai-prompts/denim-street-shot-5.jpg",
              "/images/ai-prompts/coastal-white-shot-3.jpg",
              "/images/ai-prompts/dark-balcony-shot-3.png",
              "/images/ai-prompts/cozy-leather-shot-4.png",
            ].map((src, i) => (
              <div key={i} className="pvf-upsell-img">
                <Image
                  src={src}
                  alt=""
                  fill
                  aria-hidden
                  style={{ objectFit: "cover", objectPosition: "center top" }}
                />
              </div>
            ))}
          </div>

          {/* Copy + CTA */}
          <div style={{ maxWidth: "640px" }}>
            <p className="pvf-eyebrow">THE AI PHOTO PROMPT VAULT</p>
            <h2 className={`pvf-section-title ${cormorant.className}`}>
              Want the full shoots?
            </h2>
            <p
              style={{
                margin: "0 0 28px",
                fontSize: "16px",
                lineHeight: 1.85,
                color: "#3A3632",
              }}
            >
              The free preview gives you Shot 1 from every collection. The full
              Vault includes the complete shoot direction — the mood, styling,
              setting, feeling, and full shot sequence.
            </p>
            <ul className="pvf-upsell-list">
              {[
                "Six complete editorial collections",
                "Full shot sequence for every mood",
                "Example photo for every prompt",
                "Growing — new collections drop regularly",
                "One payment · Instant access",
              ].map((item) => (
                <li key={item}>
                  <span
                    style={{ color: "#9B9189", marginRight: "10px" }}
                  >
                    ·
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "24px",
                flexWrap: "wrap",
              }}
            >
              <BuyButton />
              <p style={{ margin: 0, fontSize: "13px", color: "#9B9189" }}>
                One-time payment. Access link sent to your inbox.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        style={{
          borderTop: "1px solid #E5DDD4",
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#9B9189" }}>
          Questions? Email{" "}
          <a
            href="mailto:support@sselfie.ai"
            style={{ color: "#3A3632", textDecoration: "none" }}
          >
            support@sselfie.ai
          </a>
        </p>
        <p
          className={cormorant.className}
          style={{
            margin: 0,
            fontSize: "11px",
            fontWeight: 300,
            letterSpacing: "0.46em",
            textTransform: "uppercase",
            color: "#9B9189",
          }}
        >
          SSELFIE
        </p>
      </footer>

      <style>{`
        /* Section inner */
        .pvf-section-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: clamp(60px, 8vw, 88px) clamp(18px, 4vw, 40px);
        }

        /* Shared text helpers */
        .pvf-eyebrow {
          margin: 0 0 16px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.42em;
          text-transform: uppercase;
          color: #9B9189;
        }
        .pvf-section-title {
          margin: 0 0 16px;
          font-size: clamp(30px, 4.5vw, 56px);
          font-weight: 300;
          line-height: 1.06;
          letter-spacing: -0.01em;
          color: #0A0A0A;
        }
        .pvf-section-note {
          margin: 0 0 48px;
          font-size: 16px;
          line-height: 1.85;
          color: #3A3632;
        }

        /* Hero — split desktop layout */
        .pvf-hero {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 88vh;
          align-items: stretch;
          overflow: hidden;
        }
        .pvf-hero-text {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: clamp(48px, 6vw, 88px) clamp(24px, 4vw, 60px);
        }
        .pvf-hero-collage {
          min-height: 88vh;
        }
        .pvf-collage-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          grid-template-rows: 1fr 1fr;
          gap: 4px;
          height: 100%;
          min-height: 88vh;
        }

        /* Preview cards */
        .pvf-preview-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        .pvf-preview-card {
          background: #FFFFFF;
          border: 1px solid #E5DDD4;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .pvf-preview-image-wrap {
          position: relative;
          aspect-ratio: 4/5;
          overflow: hidden;
          background: #EDE8E1;
          flex-shrink: 0;
        }
        .pvf-preview-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          display: block;
        }
        .pvf-preview-badge {
          position: absolute;
          bottom: 14px;
          left: 14px;
          background: rgba(250,248,244,0.94);
          color: #0A0A0A;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          padding: 5px 10px;
        }
        .pvf-preview-body {
          padding: 28px 24px 24px;
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        .pvf-card-eyebrow {
          margin: 0 0 6px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: #9B9189;
        }
        .pvf-card-title {
          margin: 0 0 8px;
          font-size: clamp(18px, 2vw, 26px);
          font-weight: 300;
          line-height: 1.12;
          color: #0A0A0A;
        }
        .pvf-card-mood {
          margin: 0 0 8px;
          font-size: 13px;
          line-height: 1.65;
          color: #9B9189;
          font-style: italic;
        }
        .pvf-card-when {
          margin: 0 0 20px;
          font-size: 14px;
          line-height: 1.75;
          color: #3A3632;
        }
        .pvf-prompt-wrap {
          margin-top: auto;
          padding-top: 18px;
          border-top: 1px solid #E5DDD4;
        }
        .pvf-prompt-label {
          margin: 0 0 8px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.36em;
          text-transform: uppercase;
          color: #9B9189;
        }
        .pvf-prompt-text {
          margin: 0 0 14px;
          font-size: 13px;
          line-height: 1.75;
          color: #3A3632;
          white-space: pre-wrap;
        }
        .pvf-vault-note {
          margin: 14px 0 0;
          font-size: 12px;
          line-height: 1.6;
          color: #9B9189;
          font-style: italic;
        }

        /* CopyButton override for cream context */
        .copy-btn {
          color: #0A0A0A !important;
          border-color: rgba(10,10,10,0.2) !important;
          background: transparent !important;
        }
        .copy-btn:hover {
          color: #0A0A0A !important;
          border-color: rgba(10,10,10,0.5) !important;
          background: transparent !important;
        }

        /* Steps */
        .pvf-steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: clamp(32px, 5vw, 64px);
        }

        /* Upsell strip */
        .pvf-upsell-strip {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 52px;
        }
        .pvf-upsell-img {
          position: relative;
          aspect-ratio: 3/4;
          overflow: hidden;
        }

        /* Upsell list */
        .pvf-upsell-list {
          list-style: none;
          padding: 0;
          margin: 0 0 32px;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .pvf-upsell-list li {
          font-size: 14px;
          color: #3A3632;
          line-height: 1.6;
        }

        /* Mobile */
        @media (max-width: 760px) {
          .pvf-hero {
            grid-template-columns: 1fr;
            min-height: unset;
          }
          .pvf-hero-text {
            padding: 48px 20px 32px;
          }
          .pvf-hero-collage {
            min-height: unset;
          }
          .pvf-collage-grid {
            min-height: 72vw;
          }
          .pvf-preview-grid {
            grid-template-columns: 1fr;
          }
          .pvf-steps-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .pvf-upsell-strip {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </main>
  )
}
