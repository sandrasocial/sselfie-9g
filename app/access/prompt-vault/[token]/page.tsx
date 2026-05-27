import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { sql } from "@/lib/db/client"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { CopyButton } from "@/components/ai-prompts/copy-button"
import { PromptViewTracker } from "@/components/prompt-vault/prompt-view-tracker"
import {
  DARK_BALCONY_SERIES,
  COASTAL_WHITE_SERIES,
  MARBLE_CAFE_SERIES,
  DENIM_STREET_SERIES,
  COZY_LEATHER_SERIES,
  type PromptCard,
} from "@/lib/ai-prompts/prompt-data"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

export const metadata: Metadata = {
  title: "AI Photo Prompt Vault · SSELFIE",
  description: "Turn one selfie into unlimited editorial photoshoots.",
  robots: { index: false, follow: false },
}

// ---------------------------------------------------------------------------
// Token validation
// ---------------------------------------------------------------------------

type TokenResult =
  | { valid: false }
  | { valid: true; name?: string | null }

async function validateToken(token: string): Promise<TokenResult> {
  try {
    const rows = await sql`
      SELECT name
      FROM freebie_subscribers
      WHERE access_token = ${token}
        AND (
          source = 'prompt-vault-paid'
          OR 'prompt-vault-paid' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
        )
      LIMIT 1
    `
    if (rows.length === 0) return { valid: false }
    return { valid: true, name: (rows[0].name as string | null) ?? null }
  } catch (error) {
    console.error("[prompt-vault/access] DB error during token validation:", error)
    return { valid: false }
  }
}

// ---------------------------------------------------------------------------
// Prompt card component
// ---------------------------------------------------------------------------

function PromptCardEl({ card }: { card: PromptCard }) {
  return (
    <article id={card.id} className="pv-card">
      <PromptViewTracker
        promptId={card.id}
        promptTitle={card.title}
        promptNumber={card.number}
        mood={card.mood}
      />
      {card.exampleImage && (
        <div className="pv-card-image-wrap">
          <Image
            src={card.exampleImage}
            alt={`Example result for ${card.title}`}
            width={600}
            height={900}
            className="pv-card-image"
          />
        </div>
      )}
      <div className="pv-card-body">
        <div className="pv-card-header">
          <span className="pv-card-number">{card.number}</span>
          <h3 className={`pv-card-title ${cormorant.className}`}>{card.title}</h3>
        </div>
        <p className="pv-when-label">When to use it</p>
        <p className="pv-when">{card.whenToUse}</p>
        <p className="pv-mood">{card.mood}</p>
        <div className="pv-prompt-wrap">
          <p className="pv-prompt-text">{card.prompt}</p>
          <div className="pv-copy-row">
            <CopyButton
              text={card.prompt}
              promptTitle={card.title}
              promptNumber={card.number}
              trackEvent="prompt_vault_prompt_copied"
              trackSource="prompt-vault"
            />
          </div>
        </div>
      </div>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PromptVaultAccessPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const result = await validateToken(token)

  if (!result.valid) {
    return (
      <main className={`pv-page ${inter.className}`}>
        <div className="pv-invalid">
          <p className="pv-invalid-eyebrow">SSELFIE</p>
          <h1 className={`pv-invalid-headline ${cormorant.className}`}>
            This link doesn&apos;t look right.
          </h1>
          <p className="pv-invalid-body">
            This access link is not valid. Use the link from your purchase confirmation email or
            contact hello@sselfie.ai if you need help.
          </p>
          <Link href="/prompt-vault" className="pv-invalid-cta">
            Get the Prompt Vault
          </Link>
        </div>
        <style>{`
          .pv-page {
            background: #0a0a0a;
            color: #f5f5f5;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 48px 24px;
          }
          .pv-invalid {
            max-width: 480px;
            text-align: center;
          }
          .pv-invalid-eyebrow {
            margin: 0 0 24px;
            font-size: 9px;
            font-weight: 600;
            letter-spacing: 0.42em;
            color: rgba(245, 245, 245, 0.32);
          }
          .pv-invalid-headline {
            margin: 0 0 16px;
            font-size: clamp(2rem, 7vw, 3rem);
            font-weight: 300;
            line-height: 1.1;
            color: #f5f5f5;
          }
          .pv-invalid-body {
            margin: 0 0 36px;
            font-size: 15px;
            line-height: 1.8;
            color: rgba(245, 245, 245, 0.54);
          }
          .pv-invalid-cta {
            display: inline-block;
            padding: 14px 28px;
            background: #f5f5f5;
            color: #0a0a0a;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.24em;
            text-transform: uppercase;
            text-decoration: none;
          }
        `}</style>
      </main>
    )
  }

  logAnalyticsEvent({
    eventName: "prompt_vault_access_opened",
    path: "/access/prompt-vault/[token]",
    properties: { token_prefix: token.slice(0, 8) },
  }).catch(() => {})

  return (
    <main className={`pv-page ${inter.className}`}>
      {/* Hero */}
      <section className="pv-hero">
        <p className="pv-eyebrow">AI Photo Prompt Vault</p>
        <h1 className={`pv-headline ${cormorant.className}`}>
          YOUR SELFIE TRANSFORMATIONS
        </h1>
        <p className="pv-subhead">
          Turn one selfie into unlimited editorial photoshoots. Pick a transformation,
          paste it into ChatGPT with your selfie, and get the visual identity you want in under a minute.
        </p>
        <div className="pv-how-to">
          <p className="pv-how-label">HOW TO USE</p>
          <ol className="pv-how-steps">
            <li>Choose the aesthetic you want to become today.</li>
            <li>Click <strong>Copy prompt</strong> on that card.</li>
            <li>Open <strong>ChatGPT</strong> and start a new conversation.</li>
            <li>Paste the prompt, then attach your selfie.</li>
            <li>Hit send. Your photoshoot is ready in seconds.</li>
          </ol>
        </div>
      </section>

      {/* Dark Balcony */}
      <section className="pv-section">
        <div className="pv-section-inner">
          <p className="pv-series-eyebrow">COLLECTION 05 · DARK BALCONY LUXURY CITY EDITORIAL</p>
          <h2 className={`pv-series-title ${cormorant.className}`}>
            Dark Balcony Luxury City Editorial
          </h2>
          <p className="pv-series-note">
            European apartment balcony, black outfit, oversized sunglasses, blurred city below. Every angle from hero kiss to shadow silhouette.
          </p>
          <div className="pv-cards">
            {DARK_BALCONY_SERIES.map((card) => (
              <PromptCardEl key={card.id} card={card} />
            ))}
          </div>
        </div>
      </section>

      {/* Coastal White */}
      <section className="pv-section">
        <div className="pv-section-inner">
          <p className="pv-series-eyebrow">COLLECTION 04 · COASTAL WHITE DRESS SUNSET EDITORIAL</p>
          <h2 className={`pv-series-title ${cormorant.className}`}>
            Coastal White Dress Sunset Editorial
          </h2>
          <p className="pv-series-note">
            Mediterranean terrace, white maxi dress, ocean cliffs at golden hour. Every angle from hero full-body to close-up beauty portrait.
          </p>
          <div className="pv-cards">
            {COASTAL_WHITE_SERIES.map((card) => (
              <PromptCardEl key={card.id} card={card} />
            ))}
          </div>
        </div>
      </section>

      {/* Marble Café */}
      <section className="pv-section">
        <div className="pv-section-inner">
          <p className="pv-series-eyebrow">COLLECTION 01 · MARBLE CAFÉ WINE EDITORIAL</p>
          <h2 className={`pv-series-title ${cormorant.className}`}>
            Marble Café Wine Editorial
          </h2>
          <p className="pv-series-note">
            Café table, wine glass, marble surfaces. From casual sip to close editorial detail.
          </p>
          <div className="pv-cards">
            {MARBLE_CAFE_SERIES.map((card) => (
              <PromptCardEl key={card.id} card={card} />
            ))}
          </div>
        </div>
      </section>

      {/* Denim Street */}
      <section className="pv-section">
        <div className="pv-section-inner">
          <p className="pv-series-eyebrow">COLLECTION 02 · DENIM STREET EDITORIAL</p>
          <h2 className={`pv-series-title ${cormorant.className}`}>
            Soft Blazer + Light Denim Street Editorial
          </h2>
          <p className="pv-series-note">
            Outdoor editorial covering every angle. Wide establishing frames to tight close-up detail.
          </p>
          <div className="pv-cards">
            {DENIM_STREET_SERIES.map((card) => (
              <PromptCardEl key={card.id} card={card} />
            ))}
          </div>
        </div>
      </section>

      {/* Cozy Leather */}
      <section className="pv-section">
        <div className="pv-section-inner">
          <p className="pv-series-eyebrow">COLLECTION 03 · COZY LEATHER + MIRROR EDITORIAL</p>
          <h2 className={`pv-series-title ${cormorant.className}`}>
            Cozy Leather + Oversized Knit Mirror Editorial
          </h2>
          <p className="pv-series-note">
            Indoor mirror light, leather jacket, oversized knit. Soft natural light to high-contrast moody.
          </p>
          <div className="pv-cards">
            {COZY_LEATHER_SERIES.map((card) => (
              <PromptCardEl key={card.id} card={card} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="pv-footer">
        <p className="pv-footer-text">
          Questions? Email{" "}
          <a href="mailto:support@sselfie.ai" className="pv-footer-link">
            support@sselfie.ai
          </a>
        </p>
        <p className="pv-footer-brand">SSELFIE</p>
      </footer>

      <style>{`
        .pv-page {
          background: #0a0a0a;
          color: #f5f5f5;
          min-height: 100vh;
          padding: 0 0 80px;
        }

        /* Hero */
        .pv-hero {
          max-width: 860px;
          margin: 0 auto;
          padding: 64px 24px 48px;
        }
        .pv-eyebrow {
          margin: 0 0 20px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.42em;
          text-transform: uppercase;
          color: rgba(245, 245, 245, 0.38);
        }
        .pv-headline {
          margin: 0 0 18px;
          font-size: clamp(2.6rem, 8vw, 5.2rem);
          font-weight: 300;
          line-height: 0.95;
          letter-spacing: -0.02em;
          color: #f5f5f5;
        }
        .pv-subhead {
          max-width: 620px;
          margin: 0 0 32px;
          font-size: 16px;
          line-height: 1.85;
          color: rgba(245, 245, 245, 0.64);
        }
        .pv-how-to {
          border: 1px solid rgba(245, 245, 245, 0.1);
          background: rgba(245, 245, 245, 0.04);
          border-radius: 14px;
          padding: 20px 24px 22px;
          max-width: 520px;
        }
        .pv-how-label {
          margin: 0 0 10px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.36em;
          color: rgba(245, 245, 245, 0.36);
        }
        .pv-how-steps {
          margin: 0;
          padding-left: 18px;
          color: rgba(245, 245, 245, 0.68);
          font-size: 14px;
          line-height: 1.9;
        }
        .pv-how-steps strong {
          color: rgba(245, 245, 245, 0.9);
          font-weight: 500;
        }

        /* Sections */
        .pv-section {
          border-top: 1px solid rgba(245, 245, 245, 0.07);
          padding: 56px 0;
        }
        .pv-section-inner {
          max-width: 1140px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .pv-series-eyebrow {
          margin: 0 0 10px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.38em;
          text-transform: uppercase;
          color: rgba(245, 245, 245, 0.38);
        }
        .pv-series-title {
          margin: 0 0 10px;
          font-size: clamp(1.8rem, 4vw, 2.8rem);
          font-weight: 300;
          line-height: 1.05;
          color: #f5f5f5;
        }
        .pv-series-note {
          max-width: 560px;
          margin: 0 0 36px;
          font-size: 15px;
          line-height: 1.8;
          color: rgba(245, 245, 245, 0.52);
        }

        /* Cards grid */
        .pv-cards {
          display: grid;
          gap: 20px;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        }

        /* Card */
        .pv-card {
          background: rgba(245, 245, 245, 0.04);
          border: 1px solid rgba(245, 245, 245, 0.09);
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .pv-card-image-wrap {
          width: 100%;
          aspect-ratio: 2 / 3;
          overflow: hidden;
        }
        .pv-card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .pv-card-body {
          padding: 24px 22px 22px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .pv-card-header {
          display: flex;
          align-items: baseline;
          gap: 10px;
          margin-bottom: 14px;
        }
        .pv-card-number {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.2em;
          color: rgba(245, 245, 245, 0.34);
          flex-shrink: 0;
        }
        .pv-card-title {
          margin: 0;
          font-size: 1.32rem;
          font-weight: 300;
          line-height: 1.15;
          color: #f5f5f5;
        }
        .pv-when-label {
          margin: 0 0 4px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: rgba(245, 245, 245, 0.3);
        }
        .pv-when {
          margin: 0 0 12px;
          font-size: 13px;
          line-height: 1.7;
          color: rgba(245, 245, 245, 0.58);
        }
        .pv-mood {
          margin: 0 0 16px;
          font-size: 11px;
          letter-spacing: 0.04em;
          color: rgba(245, 245, 245, 0.34);
        }
        .pv-prompt-wrap {
          margin-top: auto;
          border-top: 1px solid rgba(245, 245, 245, 0.07);
          padding-top: 16px;
        }
        .pv-prompt-text {
          margin: 0 0 14px;
          font-size: 13px;
          line-height: 1.75;
          color: rgba(245, 245, 245, 0.72);
          white-space: pre-wrap;
        }
        .pv-copy-row {
          display: flex;
        }

        /* Footer */
        .pv-footer {
          border-top: 1px solid rgba(245, 245, 245, 0.07);
          margin-top: 64px;
          padding: 32px 24px;
          text-align: center;
        }
        .pv-footer-text {
          margin: 0 0 8px;
          font-size: 13px;
          color: rgba(245, 245, 245, 0.38);
        }
        .pv-footer-link {
          color: rgba(245, 245, 245, 0.52);
        }
        .pv-footer-brand {
          margin: 0;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.46em;
          color: rgba(245, 245, 245, 0.22);
        }
      `}</style>
    </main>
  )
}
