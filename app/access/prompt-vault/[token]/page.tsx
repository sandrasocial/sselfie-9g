import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { sql } from "@/lib/db/client"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { isAdminEmail } from "@/lib/admin-feature-flags"
import { CopyButton } from "@/components/ai-prompts/copy-button"
import { PromptViewTracker } from "@/components/prompt-vault/prompt-view-tracker"
import {
  DARK_FEMININE_CAFE_SERIES,
  DARK_BALCONY_SERIES,
  COASTAL_WHITE_SERIES,
  MARBLE_CAFE_SERIES,
  DENIM_STREET_SERIES,
  COZY_LEATHER_SERIES,
  type PromptCard,
} from "@/lib/ai-prompts/prompt-data"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

const COLLECTION_OVERVIEW = [
  {
    eyebrow: "COLLECTION 06",
    title: "Dark Feminine Café",
    note: "Black blazer. Coffee in hand. Moving through the city like you own it.",
    image: DARK_FEMININE_CAFE_SERIES[0]?.exampleImage,
    href: "#dark-feminine-cafe",
  },
  {
    eyebrow: "COLLECTION 05",
    title: "Dark Balcony",
    note: "City lights below. Evening silk. Luxury.",
    image: DARK_BALCONY_SERIES[0]?.exampleImage,
    href: "#dark-balcony",
  },
  {
    eyebrow: "COLLECTION 04",
    title: "Coastal White",
    note: "White linen. Salt air. Golden light on water.",
    image: COASTAL_WHITE_SERIES[0]?.exampleImage,
    href: "#coastal-white",
  },
  {
    eyebrow: "COLLECTION 01",
    title: "Marble Café",
    note: "Candlelit. Marble. Wine at dusk.",
    image: MARBLE_CAFE_SERIES[0]?.exampleImage,
    href: "#marble-cafe",
  },
  {
    eyebrow: "COLLECTION 02",
    title: "Denim Street",
    note: "Golden hour. City light. Effortless.",
    image: DENIM_STREET_SERIES[0]?.exampleImage,
    href: "#denim-street",
  },
  {
    eyebrow: "COLLECTION 03",
    title: "Cozy Leather",
    note: "Warm tones. Mirror light. Sunday morning.",
    image: COZY_LEATHER_SERIES[0]?.exampleImage,
    href: "#cozy-leather",
  },
]

const VAULT_COLLECTIONS: Array<{
  id: string
  eyebrow: string
  title: string
  note: string
  cards: PromptCard[]
}> = [
  {
    id: "dark-feminine-cafe",
    eyebrow: "COLLECTION 06 · DARK FEMININE CAFÉ COFFEE-RUN EDITORIAL",
    title: "Dark Feminine Café Coffee-Run Editorial",
    note: "City street, marble table, black blazer and boots. From street arrival to seated hero to reel-cover exit — every shot in one coffee-run story.",
    cards: DARK_FEMININE_CAFE_SERIES,
  },
  {
    id: "dark-balcony",
    eyebrow: "COLLECTION 05 · DARK BALCONY LUXURY CITY EDITORIAL",
    title: "Dark Balcony Luxury City Editorial",
    note: "European apartment balcony, black outfit, oversized sunglasses, blurred city below. Every angle from hero kiss to shadow silhouette.",
    cards: DARK_BALCONY_SERIES,
  },
  {
    id: "coastal-white",
    eyebrow: "COLLECTION 04 · COASTAL WHITE DRESS SUNSET EDITORIAL",
    title: "Coastal White Dress Sunset Editorial",
    note: "Mediterranean terrace, white maxi dress, ocean cliffs at golden hour. Every angle from hero full-body to close-up beauty portrait.",
    cards: COASTAL_WHITE_SERIES,
  },
  {
    id: "marble-cafe",
    eyebrow: "COLLECTION 01 · MARBLE CAFÉ WINE EDITORIAL",
    title: "Marble Café Wine Editorial",
    note: "Café table, wine glass, marble surfaces. From casual sip to close editorial detail.",
    cards: MARBLE_CAFE_SERIES,
  },
  {
    id: "denim-street",
    eyebrow: "COLLECTION 02 · DENIM STREET EDITORIAL",
    title: "Soft Blazer + Light Denim Street Editorial",
    note: "Outdoor editorial covering every angle. Wide establishing frames to tight close-up detail.",
    cards: DENIM_STREET_SERIES,
  },
  {
    id: "cozy-leather",
    eyebrow: "COLLECTION 03 · COZY LEATHER + MIRROR EDITORIAL",
    title: "Cozy Leather + Oversized Knit Mirror Editorial",
    note: "Indoor mirror light, leather jacket, oversized knit. Soft natural light to high-contrast moody.",
    cards: COZY_LEATHER_SERIES,
  },
]

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
          OR 'prompt-vault-admin-access' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
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

async function isCurrentUserAdmin(): Promise<boolean> {
  const { user } = await getAuthenticatedUser()
  return isAdminEmail(user?.email)
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
  const adminOverride = !result.valid ? await isCurrentUserAdmin() : false

  if (!result.valid && !adminOverride) {
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
    properties: {
      token_prefix: token.slice(0, 8),
      access_mode: result.valid ? "token" : "admin_override",
    },
  }).catch(() => {})

  return (
    <main className={`pv-page ${inter.className}`}>
      {/* Hero */}
      <section className="pv-hero">
        <p className="pv-eyebrow">AI Photo Prompt Vault</p>
        <h1 className={`pv-headline ${cormorant.className}`}>
          Your Selfie Photoshoot Vault
        </h1>
        <p className="pv-subhead">
          Turn one selfie into cinematic editorial photoshoots. Start by choosing the
          visual world you want to step into, then open the full prompt cards when you are ready.
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

      <section className="pv-overview">
        <div className="pv-overview-inner">
          <p className="pv-series-eyebrow">INSIDE THE VAULT</p>
          <h2 className={`pv-overview-title ${cormorant.className}`}>
            Six complete photoshoot collections.
          </h2>
          <p className="pv-overview-note">
            Each collection gives you the full shoot direction, every scene, and the
            copy-paste prompt for each image. Scroll the moodboard first, then open the prompts.
          </p>
          <div className="pv-overview-grid">
            {COLLECTION_OVERVIEW.map((collection) => (
              <a key={collection.href} href={collection.href} className="pv-overview-card">
                {collection.image && (
                  <Image
                    src={collection.image}
                    alt={`${collection.title} preview`}
                    width={600}
                    height={900}
                    className="pv-overview-image"
                  />
                )}
                <span className="pv-overview-eyebrow">{collection.eyebrow}</span>
                <h3 className={`pv-overview-card-title ${cormorant.className}`}>{collection.title}</h3>
                <p className="pv-overview-card-note">{collection.note}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="pv-library">
        <div className="pv-library-inner">
          <p className="pv-series-eyebrow">FULL PROMPT LIBRARY</p>
          <h2 className={`pv-library-title ${cormorant.className}`}>
            Open the shoot you want to create.
          </h2>
          <div className="pv-collection-list">
            {VAULT_COLLECTIONS.map((collection) => (
              <details key={collection.id} id={collection.id} className="pv-collection-details">
                <summary className="pv-collection-summary">
                  <span className="pv-collection-summary-text">
                    <span className="pv-series-eyebrow">{collection.eyebrow}</span>
                    <span className={`pv-series-title ${cormorant.className}`}>
                      {collection.title}
                    </span>
                    <span className="pv-series-note">{collection.note}</span>
                  </span>
                  <span className="pv-open-label">Open prompts</span>
                </summary>
                <div className="pv-cards">
                  {collection.cards.map((card) => (
                    <PromptCardEl key={card.id} card={card} />
                  ))}
                </div>
              </details>
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
        .pv-library {
          border-top: 1px solid rgba(245, 245, 245, 0.07);
          padding: 56px 0;
        }
        .pv-library-inner {
          max-width: 1140px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .pv-library-title {
          margin: 0 0 28px;
          font-size: clamp(1.9rem, 5vw, 3.2rem);
          font-weight: 300;
          line-height: 1.02;
          color: #f5f5f5;
        }
        .pv-collection-list {
          display: grid;
          gap: 14px;
        }
        .pv-collection-details {
          border: 1px solid rgba(245, 245, 245, 0.09);
          border-radius: 14px;
          background: rgba(245, 245, 245, 0.035);
          overflow: hidden;
        }
        .pv-collection-summary {
          list-style: none;
          cursor: pointer;
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
          padding: 24px;
        }
        .pv-collection-summary::-webkit-details-marker {
          display: none;
        }
        .pv-collection-summary-text {
          display: grid;
          gap: 8px;
        }
        .pv-collection-summary .pv-series-title,
        .pv-collection-summary .pv-series-note,
        .pv-collection-summary .pv-series-eyebrow {
          display: block;
          margin: 0;
        }
        .pv-open-label {
          justify-self: start;
          align-self: center;
          border: 1px solid rgba(245, 245, 245, 0.16);
          border-radius: 999px;
          padding: 11px 16px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(245, 245, 245, 0.74);
        }
        .pv-collection-details[open] .pv-open-label {
          background: rgba(245, 245, 245, 0.9);
          color: #0a0a0a;
        }
        .pv-collection-details .pv-cards {
          padding: 0 24px 24px;
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

        /* Editorial light refresh: the Vault is a visual product, so the
           interface opens like a collection moodboard before the prompt cards. */
        .pv-page {
          background: #f5f1eb;
          color: #0d0c0b;
        }
        .pv-hero {
          max-width: 1120px;
          padding: 72px 24px 44px;
        }
        .pv-eyebrow,
        .pv-series-eyebrow,
        .pv-how-label,
        .pv-card-number,
        .pv-when-label,
        .pv-overview-eyebrow {
          color: rgba(13, 12, 11, 0.42);
        }
        .pv-headline,
        .pv-series-title,
        .pv-card-title,
        .pv-overview-title,
        .pv-overview-card-title {
          color: #0d0c0b;
          letter-spacing: 0;
        }
        .pv-subhead,
        .pv-series-note,
        .pv-how-steps,
        .pv-when,
        .pv-prompt-text,
        .pv-overview-note,
        .pv-overview-card-note {
          color: rgba(13, 12, 11, 0.64);
        }
        .pv-how-steps strong {
          color: #0d0c0b;
        }
        .pv-how-to,
        .pv-card {
          background: rgba(255, 250, 244, 0.82);
          border-color: rgba(13, 12, 11, 0.1);
          border-radius: 8px;
        }
        .pv-section,
        .pv-footer {
          border-top-color: rgba(13, 12, 11, 0.08);
        }
        .pv-overview {
          padding: 32px 24px 72px;
          background: #fffaf4;
          border-top: 1px solid rgba(13, 12, 11, 0.08);
          border-bottom: 1px solid rgba(13, 12, 11, 0.08);
        }
        .pv-overview-inner {
          max-width: 1120px;
          margin: 0 auto;
        }
        .pv-overview-title {
          margin: 0 0 12px;
          font-size: clamp(2rem, 6vw, 4rem);
          font-weight: 300;
          line-height: 1.02;
        }
        .pv-overview-note {
          max-width: 620px;
          margin: 0 0 36px;
          font-size: 15px;
          line-height: 1.8;
        }
        .pv-overview-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 18px;
        }
        .pv-overview-card {
          display: block;
          color: inherit;
          text-decoration: none;
          background: #f5f1eb;
          border: 1px solid rgba(13, 12, 11, 0.1);
          border-radius: 8px;
          overflow: hidden;
        }
        .pv-overview-image {
          display: block;
          width: 100%;
          height: auto;
          aspect-ratio: 4 / 5;
          object-fit: cover;
          object-position: center top;
        }
        .pv-overview-eyebrow {
          display: block;
          padding: 20px 20px 8px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.32em;
          text-transform: uppercase;
        }
        .pv-overview-card-title {
          margin: 0;
          padding: 0 20px;
          font-size: 1.75rem;
          font-weight: 300;
          line-height: 1.08;
        }
        .pv-overview-card-note {
          margin: 0;
          padding: 10px 20px 24px;
          font-size: 14px;
          line-height: 1.7;
        }
        .pv-library {
          background: #f5f1eb;
          border-top-color: rgba(13, 12, 11, 0.08);
        }
        .pv-library-title {
          color: #0d0c0b;
          letter-spacing: 0;
        }
        .pv-collection-details {
          background: #fffaf4;
          border-color: rgba(13, 12, 11, 0.1);
          border-radius: 8px;
        }
        .pv-collection-summary {
          padding: 22px;
        }
        .pv-open-label {
          border-color: rgba(13, 12, 11, 0.16);
          color: rgba(13, 12, 11, 0.68);
        }
        .pv-collection-details[open] .pv-open-label {
          background: #0d0c0b;
          color: #fffaf4;
        }
        .pv-collection-details .pv-cards {
          border-top: 1px solid rgba(13, 12, 11, 0.08);
          padding-top: 22px;
        }
        .pv-card-image-wrap {
          background: #f0ede8;
        }
        .pv-card-body {
          background: rgba(255, 250, 244, 0.86);
        }
        .pv-mood,
        .pv-footer-text,
        .pv-footer-link {
          color: rgba(13, 12, 11, 0.48);
        }
        .pv-prompt-wrap {
          border-top-color: rgba(13, 12, 11, 0.08);
        }
        .copy-btn {
          color: #0d0c0b;
          border-color: rgba(13, 12, 11, 0.18);
          background: transparent;
        }
        .copy-btn:hover {
          color: #0d0c0b;
          border-color: rgba(13, 12, 11, 0.42);
        }
        .pv-footer-brand {
          color: rgba(13, 12, 11, 0.28);
        }
        @media (min-width: 760px) {
          .pv-overview-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          .pv-collection-summary {
            grid-template-columns: 1fr auto;
            align-items: center;
            padding: 28px 30px;
          }
          .pv-collection-details .pv-cards {
            padding: 28px 30px 30px;
          }
        }
      `}</style>
    </main>
  )
}
