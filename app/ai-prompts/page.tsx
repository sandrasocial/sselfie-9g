import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { OptInForm } from "@/components/ai-prompts/opt-in-form"
import {
  VAULT_COLLECTION_META,
  FREEBIE_COLLECTION_PREVIEWS,
} from "@/lib/ai-prompts/prompt-data"
import { getPublishedFreebiePreviews, getPublishedVaultCollectionMeta } from "@/lib/vault/published-collections"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

export const metadata: Metadata = {
  title: "Selfie to Brand Shoot · SSELFIE",
  description:
    "Free AI photoshoot prompts for turning one selfie into elevated personal brand images.",
}

export const dynamic = "force-dynamic"

// ── Dynamic hero + preview data ─────────────────────────────────────────────
// Sourced from the same approved collection data that powers the Vault.
// When new collections are added to VAULT_COLLECTION_META (newest-first),
// the hero background and preview cards update automatically.

/** Two-word short label for the preview strip — e.g. "Dark Feminine" */
function collectionShortLabel(fullName: string): string {
  return fullName.split(/\s+/).slice(0, 2).join(" ")
}

/**
 * Hero background: PINNED to a warm lifestyle image, intentionally NOT auto-swapped.
 * (Previously pulled the newest collection's 3rd thumbnail, which meant a dark
 * beauty close-up could land here. The opt-in hero should always be an
 * aspirational, lifestyle, full-body shot from a flagship collection.)
 *
 * To change it: swap the path below for any thumbnail in VAULT_COLLECTION_META.
 * Good lifestyle alternatives:
 *   "/images/ai-prompts/quiet-luxury-london-shot-1.jpg" (café arrival, full body)
 *   "/images/ai-prompts/dark-feminine-cafe-shot-3.jpg"  (seated hero)
 *   "/images/ai-prompts/coastal-white-shot-1.jpg"       (cliffside full body)
 */
const HERO_IMAGE: string = "/images/ai-prompts/quiet-luxury-london-shot-3.jpg"

/**
 * Preview strip: Shot 1 from the 3 newest approved freebie collections.
 * Updates automatically when FREEBIE_COLLECTION_PREVIEWS gains new entries.
 * Do not show cards without a valid image src.
 */
function buildHeroPreviews(
  freebiePreviews = FREEBIE_COLLECTION_PREVIEWS,
  vaultMeta = VAULT_COLLECTION_META,
) {
  return freebiePreviews.slice(0, 3)
  .map((card) => {
    const meta = vaultMeta.find((m) => m.previewCardId === card.id)
    return {
      src: card.exampleImage ?? "",
      label: meta
        ? collectionShortLabel(meta.name)
        : card.title.split(" ").slice(0, 2).join(" "),
    }
  })
  .filter((p) => p.src !== "")
}

const VALUE_ITEMS = [
  "Free AI photoshoot prompts you can test with your own selfies.",
  "Editorial looks for personal brand images, profile photos, and content.",
  "Beginner-friendly instructions so you know what to paste and where.",
  "A growing free preview of the SSELFIE visual world, with new prompts added over time.",
]

const FUNNEL_STEPS = [
  {
    label: "01",
    title: "Free Preview",
    body: "Start with opening-shot prompts and see what your own selfie can become.",
  },
  {
    label: "02",
    title: "The Vault",
    body: "Unlock the full photoshoot collections, newest drops, and future visual worlds.",
  },
  {
    label: "03",
    title: "The System",
    body: "Use the guided Selfie to Brand Shoot path to choose, create, edit, and post the images.",
  },
]

export default async function AiPromptsOptInPage() {
  const [publishedPreviews, publishedMeta] = await Promise.all([
    getPublishedFreebiePreviews(),
    getPublishedVaultCollectionMeta(),
  ])
  const heroPreviews = buildHeroPreviews(
    [...publishedPreviews, ...FREEBIE_COLLECTION_PREVIEWS],
    [...publishedMeta, ...VAULT_COLLECTION_META],
  )

  return (
    <main className={inter.className}>

      {/* ── Editorial capture hero ─────────────────────────────────────── */}
      <section className="opt-hero-section">
        <div className="opt-hero-media" aria-hidden="true">
          <Image
            src={HERO_IMAGE}
            alt=""
            fill
            priority
            className="opt-hero-img"
            style={{ objectFit: "cover", objectPosition: "50% 18%" }}
          />
        </div>
        <div className="opt-hero-overlay" />

        <div className="opt-hero-content">
          <div className="opt-container">
            <p className="opt-eyebrow">FREE DOWNLOAD</p>
            <h1 className={`opt-headline ${cormorant.className}`}>
              Selfie to Brand Shoot.
            </h1>
            <p className="opt-sub">
              Get the free photoshoot prompts to turn your own selfie into cinematic,
              editorial personal brand images. No studio, no photographer, no perfect setup.
            </p>

            <div className="opt-proof-strip" aria-label="Photoshoot prompt examples">
              {heroPreviews.map((preview) => (
                <div key={preview.src} className="opt-proof-card">
                  <Image
                    src={preview.src}
                    alt={`${preview.label} AI photoshoot prompt preview`}
                    fill
                    priority
                    sizes="(max-width: 640px) 30vw, 150px"
                    className="opt-proof-image"
                  />
                  <span>{preview.label}</span>
                </div>
              ))}
            </div>

            <div className="opt-form-card">
              <OptInForm />
            </div>
          </div>
        </div>
      </section>

      {/* ── Value section ──────────────────────────────────────────────── */}
      <section className="opt-value">
        <div className="opt-value-inner">
          <div className="opt-value-copy">
            <p className="opt-value-label">WHAT YOU GET</p>
            <h2 className={`opt-value-title ${cormorant.className}`}>
              Your first step into the SSELFIE visual world.
            </h2>
            <p className="opt-value-body">
              Upload your selfie, choose the look, and start creating elevated
              brand-style images from your own photo. The prompts are the first
              step. The full path is Selfie to Brand Shoot.
            </p>
          </div>
          <div className="opt-value-list">
            {VALUE_ITEMS.map((item, index) => (
              <div key={item} className="opt-value-item">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Ladder section ────────────────────────────────────────────── */}
      <section className="opt-path">
        <div className="opt-path-inner">
          <div>
            <p className="opt-value-label">THE SSELFIE PATH</p>
            <h2 className={`opt-value-title ${cormorant.className}`}>
              Free preview today. Full brand shoot when you are ready.
            </h2>
          </div>
          <div className="opt-path-list">
            {FUNNEL_STEPS.map((step) => (
              <article key={step.label} className="opt-path-card">
                <span>{step.label}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bridge section ─────────────────────────────────────────────── */}
      <section className="opt-bridge">
        <div className="opt-container">
          <p className={`opt-bridge-headline ${cormorant.className}`}>
            Your photo is the starting point.
          </p>
          <p className="opt-bridge-body">
            The better the selfie, the better the AI result. Start with a clear
            photo before you create your shoot.
          </p>
          <Link
            href="/selfie-guide?utm_source=ai_prompts&utm_medium=landing_page&utm_campaign=ai_prompts_to_selfie_guide"
            className="opt-bridge-link"
          >
            Get the Free Selfie Guide
          </Link>
        </div>
      </section>

      <style>{`
        html,
        body {
          background: #F8FAFA;
        }

        /* ── Page shell ──────────────────────────────────────────────── */
        main {
          background: #F8FAFA;
          color: #0D0E10;
        }

        .opt-container {
          max-width: 540px;
          margin: 0 auto;
        }

        /* ── Hero ────────────────────────────────────────────────────── */
        .opt-hero-section {
          position: relative;
          min-height: 100svh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          background: #F8FAFA;
        }

        .opt-hero-media {
          position: absolute;
          inset: 0;
        }

        .opt-hero-img {
          filter: saturate(0.94) contrast(1.08);
        }

        .opt-hero-overlay {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 74% 18%, rgba(13, 14, 16, 0.02) 0%, rgba(13, 14, 16, 0.16) 42%, rgba(13, 14, 16, 0.42) 100%),
            linear-gradient(115deg, rgba(13, 14, 16, 0.64) 0%, rgba(13, 14, 16, 0.48) 38%, rgba(13, 14, 16, 0.1) 72%, rgba(13, 14, 16, 0.24) 100%),
            linear-gradient(to top, rgba(13, 14, 16, 0.62) 0%, rgba(13, 14, 16, 0.02) 54%);
        }

        .opt-hero-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          flex: 1;
          padding: 64px 22px 34px;
        }

        /* ── Hero typography ─────────────────────────────────────────── */
        .opt-eyebrow {
          margin: 0 0 16px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.4em;
          color: rgba(248, 250, 250, 0.68);
          text-transform: uppercase;
        }

        .opt-headline {
          margin: 0 0 16px;
          font-size: clamp(3rem, 14vw, 5.4rem);
          font-weight: 300;
          line-height: 0.92;
          letter-spacing: 0;
          color: #F8FAFA;
          text-shadow: 0 18px 52px rgba(13, 14, 16, 0.72);
        }

        .opt-sub {
          margin: 0 0 22px;
          font-size: 15px;
          line-height: 1.72;
          color: rgba(248, 250, 250, 0.78);
        }

        .opt-proof-strip {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          margin: 0 0 18px;
        }

        .opt-proof-card {
          position: relative;
          aspect-ratio: 4 / 5;
          overflow: hidden;
          border: 1px solid rgba(197, 198, 200, 0.38);
          background: rgba(13, 14, 16, 0.24);
        }

        .opt-proof-image {
          object-fit: cover;
          object-position: center top;
          filter: saturate(0.9) contrast(1.02);
        }

        .opt-proof-card span {
          position: absolute;
          left: 8px;
          right: 8px;
          bottom: 8px;
          padding: 6px 7px;
          background: rgba(13, 14, 16, 0.72);
          color: #F8FAFA;
          font-size: 8px;
          font-weight: 600;
          letter-spacing: 0.18em;
          line-height: 1.35;
          text-transform: uppercase;
        }

        /* ── Form card ──────────────────────────────────────────────── */
        .opt-form-card {
          background: rgba(13, 14, 16, 0.72);
          border: 1px solid rgba(197, 198, 200, 0.35);
          padding: 22px;
          backdrop-filter: blur(18px);
          box-shadow: 0 28px 70px rgba(13, 14, 16, 0.28);
        }

        /* ── Form fields — used by OptInForm client component ─────────── */
        .opt-form-header {
          margin: 0 0 20px;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(248, 250, 250, 0.62);
        }

        .opt-fields {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
        }

        .opt-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .opt-label {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.08em;
          color: rgba(248, 250, 250, 0.74);
          text-transform: uppercase;
        }

        .opt-input {
          width: 100%;
          min-height: 50px;
          padding: 15px 16px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(197, 198, 200, 0.35);
          border-radius: 0;
          color: #F8FAFA;
          font-size: 15px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s ease;
          box-sizing: border-box;
        }

        .opt-input::placeholder {
          color: rgba(248, 250, 250, 0.45);
        }

        .opt-input:focus {
          border-color: rgba(248, 250, 250, 0.72);
        }

        .opt-submit:focus-visible,
        .opt-open-btn:focus-visible,
        .opt-bridge-link:focus-visible {
          outline: 2px solid rgba(248, 250, 250, 0.8);
          outline-offset: 3px;
        }

        .opt-submit {
          width: 100%;
          min-height: 52px;
          padding: 16px 20px;
          background: #F8FAFA;
          color: #0D0E10;
          border: none;
          border-radius: 0;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: inherit;
          transition: opacity 0.15s ease;
          margin-top: 4px;
        }

        .opt-submit:hover {
          opacity: 0.82;
        }

        .opt-trust {
          margin: 14px 0 0;
          font-size: 12px;
          line-height: 1.6;
          color: rgba(248, 250, 250, 0.56);
          text-align: center;
        }

        .opt-confirmation {
          padding: 24px;
          background: rgba(13, 14, 16, 0.72);
          border: 1px solid rgba(197, 198, 200, 0.35);
          border-radius: 0;
        }

        .opt-confirmation-text {
          margin: 0 0 20px;
          font-size: 15px;
          line-height: 1.75;
          color: rgba(248, 250, 250, 0.74);
        }

        .opt-open-btn {
          display: inline-block;
          padding: 14px 24px;
          background: #F8FAFA;
          color: #0D0E10;
          border-radius: 0;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          text-decoration: none;
          transition: opacity 0.15s ease;
        }

        .opt-open-btn:hover {
          opacity: 0.82;
        }

        .opt-error {
          margin: 12px 0 0;
          font-size: 13px;
          line-height: 1.6;
          color: rgba(240, 120, 120, 0.9);
          text-align: center;
        }

        /* ── Value section ───────────────────────────────────────────── */
        .opt-value {
          background: #F8FAFA;
          border-top: 1px solid rgba(197, 198, 200, 0.35);
          border-bottom: 1px solid rgba(197, 198, 200, 0.35);
          padding: 70px 24px;
        }

        .opt-value-inner {
          max-width: 1040px;
          margin: 0 auto;
          display: grid;
          gap: 34px;
        }

        .opt-value-label {
          margin: 0 0 14px;
          color: #818283;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.38em;
          text-transform: uppercase;
        }

        .opt-value-title {
          margin: 0 0 18px;
          color: #0D0E10;
          font-size: clamp(2.15rem, 8vw, 4rem);
          font-weight: 300;
          line-height: 1.02;
        }

        .opt-value-body {
          margin: 0;
          color: #4F5052;
          font-size: 15px;
          line-height: 1.8;
          max-width: 560px;
        }

        .opt-value-list {
          display: grid;
          gap: 0;
          border-top: 1px solid rgba(197, 198, 200, 0.35);
        }

        .opt-value-item {
          display: grid;
          grid-template-columns: 34px 1fr;
          gap: 16px;
          padding: 18px 0;
          border-bottom: 1px solid rgba(197, 198, 200, 0.35);
        }

        .opt-value-item span {
          color: #818283;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
        }

        .opt-value-item p {
          margin: 0;
          color: #4F5052;
          font-size: 14px;
          line-height: 1.75;
        }

        /* ── Funnel path section ─────────────────────────────────────── */
        .opt-path {
          background: #FFFFFF;
          border-bottom: 1px solid rgba(197, 198, 200, 0.35);
          padding: 70px 24px;
        }

        .opt-path-inner {
          max-width: 1040px;
          margin: 0 auto;
          display: grid;
          gap: 34px;
        }

        .opt-path-list {
          display: grid;
          gap: 1px;
          background: rgba(197, 198, 200, 0.35);
          border: 1px solid rgba(197, 198, 200, 0.35);
        }

        .opt-path-card {
          background: #FFFFFF;
          padding: 24px 22px;
        }

        .opt-path-card span {
          display: block;
          margin-bottom: 28px;
          color: #818283;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.24em;
        }

        .opt-path-card h3 {
          margin: 0 0 10px;
          color: #0D0E10;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }

        .opt-path-card p {
          margin: 0;
          color: #4F5052;
          font-size: 14px;
          line-height: 1.75;
        }

        /* ── Bridge section ──────────────────────────────────────────── */
        .opt-bridge {
          background: #FFFFFF;
          color: #0D0E10;
          padding: 64px 24px 80px;
        }

        .opt-bridge-headline {
          margin: 0 0 14px;
          font-size: clamp(1.5rem, 5vw, 2rem);
          font-weight: 300;
          line-height: 1.15;
          color: #0D0E10;
        }

        .opt-bridge-body {
          margin: 0 0 24px;
          font-size: 15px;
          line-height: 1.8;
          color: #4F5052;
        }

        .opt-bridge-link {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: #282728;
          text-decoration: none;
          border-bottom: 1px solid rgba(79, 80, 82, 0.28);
          padding-bottom: 2px;
          transition: color 0.15s ease, border-color 0.15s ease;
        }

        .opt-bridge-link:hover {
          color: #0D0E10;
          border-color: rgba(13, 14, 16, 0.55);
        }

        /* ── Responsive ──────────────────────────────────────────────── */
        @media (min-width: 640px) {
          .opt-hero-content {
            padding: 80px 40px 64px;
          }

          .opt-bridge {
            padding: 80px 40px 100px;
          }

          .opt-fields {
            flex-direction: row;
          }

          .opt-field {
            flex: 1;
          }
        }

        @media (min-width: 900px) {
          .opt-hero-section {
            min-height: 100vh;
          }

          .opt-hero-content {
            padding: 96px 64px 76px;
          }

          .opt-container {
            margin-left: 0;
            max-width: 620px;
          }

          .opt-headline {
            font-size: clamp(4.6rem, 7vw, 7rem);
          }

          .opt-sub {
            max-width: 580px;
            font-size: 17px;
          }

          .opt-proof-strip {
            max-width: 480px;
            gap: 8px;
            margin-bottom: 22px;
          }

          .opt-form-card {
            max-width: 560px;
          }

          .opt-value {
            padding: 92px 64px;
          }

          .opt-path {
            padding: 92px 64px;
          }

          .opt-value-inner {
            grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
            align-items: start;
            gap: 80px;
          }

          .opt-path-inner {
            grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
            align-items: start;
            gap: 80px;
          }

          .opt-path-list {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </main>
  )
}
