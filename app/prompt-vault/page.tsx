import Image from "next/image"
import Link from "next/link"
import { Suspense } from "react"
import type { Metadata } from "next"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { PromptVaultAnalytics } from "@/components/prompt-vault/prompt-vault-analytics"
import { PromptVaultCheckoutLink } from "@/components/prompt-vault/prompt-vault-checkout-link"
import { FREEBIE_COLLECTION_PREVIEWS, VAULT_COLLECTION_META } from "@/lib/ai-prompts/prompt-data"
import {
  getPublishedFreebiePreviews,
  getPublishedVaultCollectionMeta,
} from "@/lib/vault/published-collections"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

export const metadata: Metadata = {
  title: "The AI Photo Prompt Vault · SSELFIE",
  description:
    "Unlock the full AI photoshoot library: complete editorial shot sequences, example images, tested prompts, and new visual worlds. $27.",
  openGraph: {
    title: "The AI Photo Prompt Vault · SSELFIE",
    description:
      "Unlock the full AI photoshoot library: complete editorial shot sequences, example images, tested prompts, and new visual worlds.",
    images: ["/academy/visibility-suite/sandra-hero.png"],
  },
}

const BUY_BUTTON_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "13px 28px",
  background: "#0D0E10",
  color: "#FFFFFF",
  fontSize: "10px",
  fontWeight: 600,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  textDecoration: "none",
  whiteSpace: "normal",
  textAlign: "center",
  lineHeight: 1.35,
  border: "none",
  cursor: "pointer",
} as const

function BuyButton({ label = "Unlock the Vault · $27" }: { label?: string }) {
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

export default async function PromptVaultPage({
  searchParams,
}: {
  searchParams?: Promise<{ checkout?: string }>
}) {
  const params = searchParams ? await searchParams : {}
  const checkoutFailed = params.checkout === "failed"
  const [publishedPreviews, publishedMeta] = await Promise.all([
    getPublishedFreebiePreviews(),
    getPublishedVaultCollectionMeta(),
  ])
  const freebiePreviews = [...publishedPreviews, ...FREEBIE_COLLECTION_PREVIEWS]
  const vaultMeta = [...publishedMeta, ...VAULT_COLLECTION_META]
  const vaultCollectionCount = vaultMeta.length
  const vaultShotCount = vaultMeta.reduce((total, collection) => total + collection.shotCount, 0)

  return (
    <main className={inter.className} style={{ background: "#F8FAFA", color: "#0D0E10" }}>
      <Suspense fallback={null}>
        <PromptVaultAnalytics />
      </Suspense>

      {/* ── NAV ── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#F8FAFA",
          borderBottom: "1px solid rgba(197,198,200,0.35)",
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
            color: "#0D0E10",
            fontSize: "16px",
            fontWeight: 300,
            letterSpacing: "0.34em",
            textDecoration: "none",
            textTransform: "uppercase",
          }}
        >
          SSELFIE
        </Link>
        <BuyButton label="Unlock the Vault · $27" />
      </nav>

      {checkoutFailed && (
        <section
          style={{
            borderBottom: "1px solid rgba(197,198,200,0.45)",
            background: "#FFFFFF",
            padding: "18px clamp(18px, 4vw, 40px)",
          }}
        >
          <div
            style={{
              maxWidth: "980px",
              margin: "0 auto",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
            }}
          >
            <div>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "10px",
                  fontWeight: 600,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "#818283",
                }}
              >
                Checkout paused
              </p>
              <p style={{ margin: 0, color: "#4F5052", fontSize: "14px", lineHeight: 1.6 }}>
                Payment did not open correctly. Tap below to try again.
              </p>
            </div>
            <BuyButton label="Try Checkout Again · $27" />
          </div>
        </section>
      )}

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
              color: "#818283",
            }}
          >
            THE AI PHOTO PROMPT VAULT
          </p>
          <h1
            className={cormorant.className}
            aria-label="Unlock the full AI photoshoot library"
            style={{
              margin: "0 0 24px",
              fontSize: "clamp(42px, 6.2vw, 82px)",
              fontWeight: 300,
              lineHeight: 0.98,
              letterSpacing: "-0.025em",
              color: "#0D0E10",
            }}
          >
            Unlock the
            <br />
            full AI
            <br />
            photoshoot
            <br />
            library.
          </h1>
          <p
            style={{
              margin: "0 0 32px",
              fontSize: "17px",
              lineHeight: 1.85,
              color: "#4F5052",
              maxWidth: "400px",
            }}
          >
            The free starter shoot gives you a taste. The Vault gives you the complete shoot
            library: every current collection, every shot direction, every example image, and every
            new drop I add.
          </p>
          <div className="pvf-hero-stats" aria-label="Vault library size">
            <span>{vaultCollectionCount} collections</span>
            <span>{vaultShotCount} prompts</span>
            <span>future drops included</span>
          </div>
          <a
            href="#free-previews"
            style={{
              fontSize: "13px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              color: "#818283",
              textDecoration: "none",
            }}
          >
            Preview the full library ↓
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
          borderTop: "1px solid rgba(197,198,200,0.35)",
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
              color: "#0D0E10",
            }}
          >
            You&apos;ve been saving those photos
            <br />
            for a reason.
          </h2>
          <p
            style={{
              margin: "0 0 18px",
              fontSize: "16px",
              lineHeight: 1.85,
              color: "#4F5052",
            }}
          >
            The cinematic ones. That editorial aesthetic. The kind of content that makes someone
            stop mid-scroll and think: how does her feed always look like that?
          </p>
          <p
            style={{
              margin: "0 0 18px",
              fontSize: "16px",
              lineHeight: 1.85,
              color: "#4F5052",
            }}
          >
            You&apos;ve been quietly building a picture of who you want to be online.
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "16px",
              lineHeight: 1.85,
              color: "#4F5052",
              fontStyle: "italic",
            }}
          >
            This is that version of you.
          </p>
        </div>
      </section>

      {/* ── LADDER CONTEXT ── */}
      <section className="pvf-ladder">
        <div className="pvf-ladder-inner">
          <div>
            <p className="pvf-eyebrow">THE SSELFIE PATH</p>
            <h2 className={`pvf-section-title ${cormorant.className}`}>
              The Vault is the complete shoot library.
            </h2>
            <p className="pvf-section-note">
              The free starter shoot helps you test the idea. The Vault unlocks the rest of the
              shoot: matching angles, poses, moods, and prompts so one look becomes a full content
              set.
            </p>
          </div>
          <div className="pvf-ladder-grid">
            {[
              {
                n: "01",
                title: "Starter shoot",
                body: "A small free taste so you can test the result with your own selfie.",
              },
              {
                n: "02",
                title: "Vault",
                body: "Full shoot sequences, newest drops, and future photoshoot collections.",
              },
              {
                n: "03",
                title: "SUITE",
                body: "Maya uses the same visual world, creates the content for you, and keeps your face consistent every time.",
              },
            ].map(step => (
              <article key={step.n} className="pvf-ladder-card">
                <span>{step.n}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── OPENING SHOT PREVIEW CARDS ── */}
      <section
        id="free-previews"
        style={{ borderTop: "1px solid rgba(197,198,200,0.35)", background: "#FFFFFF" }}
      >
        <div className="pvf-section-inner">
          <p className="pvf-eyebrow">THE FULL LIBRARY PREVIEW</p>
          <h2 className={`pvf-section-title ${cormorant.className}`}>
            Every world has a full sequence behind it.
          </h2>
          <p className="pvf-section-note">
            Browse the opening image from each visual world. The complete prompt sequence unlocks
            inside the Vault.
          </p>

          <div className="pvf-preview-grid">
            {freebiePreviews.map(card => {
              const meta = vaultMeta.find(m => m.previewCardId === card.id)
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
                      {meta && <div className="pvf-preview-badge">Shot 1 of {meta.shotCount}</div>}
                    </div>
                  )}
                  <div className="pvf-preview-body">
                    <p className="pvf-card-eyebrow">{card.number}</p>
                    <h3 className={`pvf-card-title ${cormorant.className}`}>{card.title}</h3>
                    {card.mood && <p className="pvf-card-mood">{card.mood}</p>}
                    {card.whenToUse && <p className="pvf-card-when">{card.whenToUse}</p>}
                    {meta && (
                      <p className="pvf-vault-note">
                        This is the opening image. The full {meta.shotCount}-shot collection and
                        copy-paste prompts unlock inside the Vault.
                      </p>
                    )}
                    <BuyButton label="Unlock full sequence · $27" />
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
          borderTop: "1px solid rgba(197,198,200,0.35)",
          padding: "clamp(64px, 8vw, 96px) clamp(18px, 4vw, 40px)",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <p className="pvf-eyebrow">HOW IT WORKS</p>
          <h2
            className={`pvf-section-title ${cormorant.className}`}
            style={{ marginBottom: "52px" }}
          >
            What changes when you unlock it.
          </h2>
          <div className="pvf-steps-grid">
            {[
              {
                n: "01",
                title: "You stop guessing from one prompt.",
                body: "Each collection gives you a complete shoot path, not a single random image idea.",
              },
              {
                n: "02",
                title: "Your images start to belong together.",
                body: "The angles, light, styling, and mood are designed as one visual world.",
              },
              {
                n: "03",
                title: "You get a library you can keep returning to.",
                body: "Use one collection today, then come back for the next campaign, profile update, or content week.",
              },
            ].map(step => (
              <div key={step.n}>
                <p
                  style={{
                    margin: "0 0 12px",
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.36em",
                    color: "#818283",
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
                    color: "#0D0E10",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    lineHeight: 1.82,
                    color: "#4F5052",
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
              color: "#818283",
              lineHeight: 1.7,
            }}
          >
            You bring the selfie. The Vault gives you the shot direction.
          </p>
        </div>
      </section>

      {/* ── VAULT UPSELL ── */}
      <section
        style={{
          borderTop: "1px solid rgba(197,198,200,0.35)",
          background: "#FFFFFF",
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
            <p className="pvf-eyebrow">THE SELFIE TO BRAND SHOOT VAULT</p>
            <h2 className={`pvf-section-title ${cormorant.className}`}>
              Unlock the rest of every shoot.
            </h2>
            <p
              style={{
                margin: "0 0 28px",
                fontSize: "16px",
                lineHeight: 1.85,
                color: "#4F5052",
              }}
            >
              The free starter shoot is the taste. The Vault is the whole library: all current
              collections, all matching shots, all prompts, and every new SSELFIE drop I add.
            </p>
            <ul className="pvf-upsell-list">
              {[
                "A growing archive of complete editorial collections",
                "Full shot sequence for every mood",
                "Example photo for every prompt",
                "Newest drops + future SSELFIE photoshoots included",
                "$27 one-time payment · Instant access",
              ].map(item => (
                <li key={item}>
                  <span style={{ color: "#818283", marginRight: "10px" }}>·</span>
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
              <p style={{ margin: 0, fontSize: "13px", color: "#818283" }}>
                One-time payment. Access link sent to your inbox.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        style={{
          borderTop: "1px solid rgba(197,198,200,0.35)",
          padding: "40px 24px",
          textAlign: "center",
        }}
      >
        <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#818283" }}>
          Questions? Email{" "}
          <a href="mailto:support@sselfie.ai" style={{ color: "#4F5052", textDecoration: "none" }}>
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
            color: "#818283",
          }}
        >
          SSELFIE
        </p>
      </footer>

      <style>{`
        html,
        body {
          background: #F8FAFA;
        }

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
          color: #818283;
        }
        .pvf-section-title {
          margin: 0 0 16px;
          font-size: clamp(30px, 4.5vw, 56px);
          font-weight: 300;
          line-height: 1.06;
          letter-spacing: -0.01em;
          color: #0D0E10;
        }
        .pvf-section-note {
          margin: 0 0 48px;
          font-size: 16px;
          line-height: 1.85;
          color: #4F5052;
        }

        /* Product ladder */
        .pvf-ladder {
          border-top: 1px solid rgba(197,198,200,0.35);
          background: #F8FAFA;
          padding: clamp(60px, 7vw, 88px) clamp(18px, 4vw, 40px);
        }
        .pvf-ladder-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          gap: 36px;
        }
        .pvf-ladder-grid {
          display: grid;
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .pvf-ladder-card {
          background: #FFFFFF;
          padding: 24px 22px;
        }
        .pvf-ladder-card span {
          display: block;
          margin-bottom: 28px;
          color: #818283;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.24em;
        }
        .pvf-ladder-card h3 {
          margin: 0 0 10px;
          color: #0D0E10;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }
        .pvf-ladder-card p {
          margin: 0;
          color: #4F5052;
          font-size: 14px;
          line-height: 1.75;
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
        .pvf-hero-stats {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 0 0 26px;
          max-width: 440px;
        }
        .pvf-hero-stats span {
          border: 1px solid rgba(197,198,200,0.55);
          background: rgba(255,255,255,0.68);
          color: #4F5052;
          padding: 8px 10px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          line-height: 1.35;
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
          border: 1px solid rgba(197,198,200,0.35);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .pvf-preview-image-wrap {
          position: relative;
          aspect-ratio: 4/5;
          overflow: hidden;
          background: #F8FAFA;
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
          background: rgba(248,250,250,0.94);
          color: #0D0E10;
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
          color: #818283;
        }
        .pvf-card-title {
          margin: 0 0 8px;
          font-size: clamp(18px, 2vw, 26px);
          font-weight: 300;
          line-height: 1.12;
          color: #0D0E10;
        }
        .pvf-card-mood {
          margin: 0 0 8px;
          font-size: 13px;
          line-height: 1.65;
          color: #818283;
          font-style: italic;
        }
        .pvf-card-when {
          margin: 0 0 20px;
          font-size: 14px;
          line-height: 1.75;
          color: #4F5052;
        }
        .pvf-prompt-wrap {
          margin-top: auto;
          padding-top: 18px;
          border-top: 1px solid rgba(197,198,200,0.35);
        }
        .pvf-prompt-label {
          margin: 0 0 8px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.36em;
          text-transform: uppercase;
          color: #818283;
        }
        .pvf-prompt-text {
          margin: 0 0 14px;
          font-size: 13px;
          line-height: 1.75;
          color: #4F5052;
          white-space: pre-wrap;
        }
        .pvf-vault-note {
          margin: 14px 0 0;
          font-size: 12px;
          line-height: 1.6;
          color: #818283;
          font-style: italic;
        }

        /* CopyButton override for light editorial context */
        .copy-btn {
          color: #0D0E10 !important;
          border-color: rgba(10,10,10,0.2) !important;
          background: transparent !important;
        }
        .copy-btn:hover {
          color: #0D0E10 !important;
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
          color: #4F5052;
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

        @media (min-width: 900px) {
          .pvf-ladder-inner {
            grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
            align-items: start;
            gap: 80px;
          }
          .pvf-ladder-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </main>
  )
}
