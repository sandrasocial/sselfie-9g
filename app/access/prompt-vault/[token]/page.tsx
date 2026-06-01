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
  NOIR_FEMME_SERIES,
  CLEAN_GIRL_MORNING_SERIES,
  DARK_FEMININE_CAFE_SERIES,
  DARK_BALCONY_SERIES,
  COASTAL_WHITE_SERIES,
  MARBLE_CAFE_SERIES,
  DENIM_STREET_SERIES,
  COZY_LEATHER_SERIES,
  VAULT_COLLECTION_META,
  type PromptCard,
} from "@/lib/ai-prompts/prompt-data"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

// ── Collection data ─────────────────────────────────────────────────────────

const COLLECTION_OVERVIEW = [
  {
    eyebrow: "COLLECTION 08",
    title: "Noir Femme",
    note: "Black lace flares. European cobblestones. Movement captured in deep black and white.",
    image: NOIR_FEMME_SERIES[0]?.exampleImage,
    href: "#noir-femme",
  },
  {
    eyebrow: "COLLECTION 07",
    title: "Clean Girl Morning",
    note: "Cream knit, slow coffee, soft window light. The founder morning before the day begins.",
    image: CLEAN_GIRL_MORNING_SERIES[0]?.exampleImage,
    href: "#clean-girl-morning",
  },
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
  heroImage?: string
  cards: PromptCard[]
}> = [
  {
    id: "noir-femme",
    eyebrow: "COLLECTION 08 · NOIR FEMME EDITORIAL",
    title: "NOIR FEMME Editorial",
    note: "European cobblestone streets, black lace flare trousers, oversized blazer, black and white. Five movement shots from ground level to wide vanishing point, plus four close portrait bonus shots: eyes down, hair push, sharp profile, and the only eye-contact shot in the set.",
    heroImage: NOIR_FEMME_SERIES[0]?.exampleImage,
    cards: NOIR_FEMME_SERIES,
  },
  {
    id: "clean-girl-morning",
    eyebrow: "COLLECTION 07 · CLEAN GIRL FOUNDER MORNING EDITORIAL",
    title: "Clean Girl Founder Morning Editorial",
    note: "A full morning narrative in cream, oat, and soft window light: bedroom mirror selfie, skincare, kitchen coffee, laptop work, and getting dressed. Ten shots that turn a regular founder morning into aspirational content.",
    heroImage: CLEAN_GIRL_MORNING_SERIES[0]?.exampleImage,
    cards: CLEAN_GIRL_MORNING_SERIES,
  },
  {
    id: "dark-feminine-cafe",
    eyebrow: "COLLECTION 06 · DARK FEMININE CAFÉ COFFEE-RUN EDITORIAL",
    title: "Dark Feminine Café Coffee-Run Editorial",
    note: "City street, marble table, black blazer and boots. From street arrival to seated hero to reel-cover exit, every shot belongs to one coffee-run story.",
    heroImage: DARK_FEMININE_CAFE_SERIES[0]?.exampleImage,
    cards: DARK_FEMININE_CAFE_SERIES,
  },
  {
    id: "dark-balcony",
    eyebrow: "COLLECTION 05 · DARK BALCONY LUXURY CITY EDITORIAL",
    title: "Dark Balcony Luxury City Editorial",
    note: "European apartment balcony, black outfit, oversized sunglasses, blurred city below. Every angle from hero kiss to shadow silhouette.",
    heroImage: DARK_BALCONY_SERIES[0]?.exampleImage,
    cards: DARK_BALCONY_SERIES,
  },
  {
    id: "coastal-white",
    eyebrow: "COLLECTION 04 · COASTAL WHITE DRESS SUNSET EDITORIAL",
    title: "Coastal White Dress Sunset Editorial",
    note: "Mediterranean terrace, white maxi dress, ocean cliffs at golden hour. Every angle from hero full-body to close-up beauty portrait.",
    heroImage: COASTAL_WHITE_SERIES[0]?.exampleImage,
    cards: COASTAL_WHITE_SERIES,
  },
  {
    id: "marble-cafe",
    eyebrow: "COLLECTION 01 · MARBLE CAFÉ WINE EDITORIAL",
    title: "Marble Café Wine Editorial",
    note: "Café table, wine glass, marble surfaces. From casual sip to close editorial detail.",
    heroImage: MARBLE_CAFE_SERIES[0]?.exampleImage,
    cards: MARBLE_CAFE_SERIES,
  },
  {
    id: "denim-street",
    eyebrow: "COLLECTION 02 · DENIM STREET EDITORIAL",
    title: "Soft Blazer + Light Denim Street Editorial",
    note: "Outdoor editorial covering every angle. Wide establishing frames to tight close-up detail.",
    heroImage: DENIM_STREET_SERIES[0]?.exampleImage,
    cards: DENIM_STREET_SERIES,
  },
  {
    id: "cozy-leather",
    eyebrow: "COLLECTION 03 · COZY LEATHER + MIRROR EDITORIAL",
    title: "Cozy Leather + Oversized Knit Mirror Editorial",
    note: "Indoor mirror light, leather jacket, oversized knit. Soft natural light to high-contrast moody.",
    heroImage: COZY_LEATHER_SERIES[0]?.exampleImage,
    cards: COZY_LEATHER_SERIES,
  },
]

const FIRST_RESULT_PATHS = [
  {
    label: "Most copied",
    title: "Dark Feminine Brand Shoot",
    useWhen: "Use this when you want your next profile, reel cover, or launch image to feel sharper and more expensive.",
    selfie: "Best source selfie: clear face, dark top or blazer, soft window light, no sunglasses.",
    fix: "If ChatGPT makes it too polished, rerun and add: keep my real facial features, natural skin texture, and normal expression.",
    collectionHref: "#dark-feminine-cafe",
    card: DARK_FEMININE_CAFE_SERIES[0],
  },
  {
    label: "Fastest visual proof",
    title: "Clean Girl Founder Morning",
    useWhen: "Use this when you want soft founder energy: laptop, coffee, skincare, morning routine, calm personal brand.",
    selfie: "Best source selfie: natural face, hair visible, neutral top, clean light from the front or side.",
    fix: "If the result looks too generic, tell ChatGPT: keep my age, facial structure, hair color, and realistic body proportions.",
    collectionHref: "#clean-girl-morning",
    card: CLEAN_GIRL_MORNING_SERIES[0],
  },
  {
    label: "Best for outfit/content",
    title: "Denim Street Editorial",
    useWhen: "Use this when you want full-body personal brand images that feel like a street-style content day.",
    selfie: "Best source selfie: mirror selfie or full outfit photo with your body shape and outfit visible.",
    fix: "If the outfit changes too much, rerun and add: preserve my outfit silhouette, body proportions, and natural pose.",
    collectionHref: "#denim-street",
    card: DENIM_STREET_SERIES[0],
  },
].filter((path) => path.card)

export const metadata: Metadata = {
  title: "AI Photo Prompt Vault · SSELFIE",
  description: "Turn one selfie into unlimited editorial photoshoots.",
  robots: { index: false, follow: false },
}

// ── Token validation ─────────────────────────────────────────────────────────

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

// ── Prompt card component ────────────────────────────────────────────────────

function PromptCardEl({ card }: { card: PromptCard }) {
  return (
    <article id={card.id} className="pva-card">
      <PromptViewTracker
        promptId={card.id}
        promptTitle={card.title}
        promptNumber={card.number}
        mood={card.mood}
      />
      {card.exampleImage && (
        <div className="pva-card-image-wrap">
          <Image
            src={card.exampleImage}
            alt={`Example result for ${card.title}`}
            width={600}
            height={900}
            className="pva-card-image"
          />
        </div>
      )}
      <div className="pva-card-body">
        <div className="pva-card-header">
          <span className="pva-card-number">{card.number}</span>
          <h3 className={`pva-card-title ${cormorant.className}`}>
            {card.title}
          </h3>
        </div>
        {card.whenToUse && (
          <>
            <p className="pva-when-label">When to use it</p>
            <p className="pva-when">{card.whenToUse}</p>
          </>
        )}
        <p className="pva-mood">{card.mood}</p>
        <div className="pva-prompt-wrap">
          <p className="pva-prompt-text">{card.prompt}</p>
          <div className="pva-copy-row">
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

// ── Page ─────────────────────────────────────────────────────────────────────

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
      <main
        className={inter.className}
        style={{
          background: "#F5EFE6",
          color: "#0A0A0A",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 24px",
        }}
      >
        <div style={{ maxWidth: "480px", textAlign: "center" }}>
          <p
            className={cormorant.className}
            style={{
              margin: "0 0 28px",
              fontSize: "14px",
              fontWeight: 300,
              letterSpacing: "0.42em",
              textTransform: "uppercase",
              color: "#9B9189",
            }}
          >
            SSELFIE
          </p>
          <h1
            className={cormorant.className}
            style={{
              margin: "0 0 16px",
              fontSize: "clamp(2rem, 7vw, 3rem)",
              fontWeight: 300,
              lineHeight: 1.1,
              color: "#0A0A0A",
            }}
          >
            This link doesn&apos;t look right.
          </h1>
          <p
            style={{
              margin: "0 0 36px",
              fontSize: "15px",
              lineHeight: 1.8,
              color: "#3A3632",
            }}
          >
            This access link is not valid. Use the link from your purchase
            confirmation email or contact hello@sselfie.ai if you need help.
          </p>
          <Link
            href="/prompt-vault"
            style={{
              display: "inline-block",
              padding: "13px 28px",
              background: "#0A0A0A",
              color: "#FFFFFF",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            Get the Prompt Vault
          </Link>
        </div>
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

  const firstName =
    (result.valid && result.name) ? result.name.split(" ")[0] : null

  return (
    <main className={`pva-page ${inter.className}`}>

      {/* ── NAV ── */}
      <nav className="pva-nav">
        <Link href="/" className={`pva-nav-logo ${cormorant.className}`}>
          SSELFIE
        </Link>
        <span className="pva-nav-label">The Vault</span>
      </nav>

      {/* ── HERO ── */}
      <section className="pva-hero">
        <div className="pva-hero-inner">
          <p className="pva-eyebrow">SSELFIE · SELFIE TO BRAND SHOOT</p>
          <h1 className={`pva-headline ${cormorant.className}`}>
            {firstName ? `${firstName}'s` : "The"} Selfie to<br />Brand Shoot Vault
          </h1>
          <p className="pva-subhead">
            A guided library of full AI photoshoot sequences, creative direction,
            styling notes, and tested prompts for turning one selfie into elevated
            personal brand images.
          </p>
          <a href="#first-result" className="pva-scroll-link">
            Start with your first result ↓
          </a>
        </div>

        {/* Hero image strip — 3 shots from different collections */}
        <div className="pva-hero-strip">
          {[
            "/images/ai-prompts/dark-feminine-cafe-shot-3.jpg",
            "/images/ai-prompts/coastal-white-shot-1.jpg",
            "/images/ai-prompts/dark-balcony-shot-1.png",
          ].map((src, i) => (
            <div key={i} className="pva-hero-strip-img">
              <Image
                src={src}
                alt=""
                fill
                aria-hidden
                priority={i === 0}
                style={{ objectFit: "cover", objectPosition: "center top" }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── FIRST RESULT PATH ── */}
      <section id="first-result" className="pva-first-result">
        <div className="pva-first-result-inner">
          <p className="pva-eyebrow">START HERE</p>
          <h2 className={`pva-first-title ${cormorant.className}`}>
            Get your first brand shoot result in seven minutes.
          </h2>
          <p className="pva-first-note">
            Do not start by browsing everything. Choose one path, upload the right
            selfie, copy the first prompt, and get one usable image before you try
            another look.
          </p>

          <div className="pva-first-grid">
            {FIRST_RESULT_PATHS.map((path) => (
              <article key={path.title} className="pva-first-card">
                {path.card.exampleImage && (
                  <div className="pva-first-image-wrap">
                    <Image
                      src={path.card.exampleImage}
                      alt={`${path.title} example`}
                      fill
                      className="pva-first-image"
                      style={{ objectFit: "cover", objectPosition: "center top" }}
                    />
                  </div>
                )}
                <div className="pva-first-body">
                  <span className="pva-first-label">{path.label}</span>
                  <h3 className={`pva-first-card-title ${cormorant.className}`}>
                    {path.title}
                  </h3>
                  <p className="pva-first-copy">{path.useWhen}</p>
                  <div className="pva-first-instruction">
                    <span>Selfie to use</span>
                    <p>{path.selfie}</p>
                  </div>
                  <div className="pva-first-instruction">
                    <span>If the result feels off</span>
                    <p>{path.fix}</p>
                  </div>
                  <div className="pva-first-actions">
                    <CopyButton
                      text={path.card.prompt}
                      promptTitle={path.card.title}
                      promptNumber={path.card.number}
                      trackEvent="prompt_vault_prompt_copied"
                      trackSource="prompt-vault"
                    />
                    <a href={path.collectionHref} className="pva-first-open">
                      Open full shoot
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="pva-troubleshoot">
            <p className="pva-troubleshoot-label">If ChatGPT gives a weird result</p>
            <p>
              Start a fresh chat, upload the selfie again, paste the prompt, and add:
              &quot;Preserve my real face, age, skin texture, hair color, body proportions,
              and natural expression. Make it editorial, not fake.&quot;
            </p>
          </div>
        </div>
      </section>

      {/* ── HOW TO USE ── */}
      <section className="pva-how-section">
        <div className="pva-how-inner">
          <p className="pva-how-label">HOW IT WORKS</p>
          <ol className="pva-how-steps">
            <li>Choose the visual world you want to create.</li>
            <li>Open the shoot and copy the prompt.</li>
            <li>Paste it into ChatGPT with your selfie and create the image.</li>
          </ol>
        </div>
      </section>

      {/* ── COLLECTION OVERVIEW ── */}
      <section id="vault-overview" className="pva-overview">
        <div className="pva-overview-inner">
          <p className="pva-eyebrow">INSIDE THE VAULT</p>
          <h2 className={`pva-overview-title ${cormorant.className}`}>
            Full photoshoot collections.
          </h2>
          <p className="pva-overview-note">
            Scroll the moodboard to pick the version of you you want to
            photograph today. Then open the collection for the full prompts.
          </p>
          <div className="pva-overview-grid">
            {COLLECTION_OVERVIEW.map((c) => (
              <a key={c.href} href={c.href} className="pva-overview-card">
                {c.image && (
                  <div className="pva-overview-image-wrap">
                    <Image
                      src={c.image}
                      alt={`${c.title} preview`}
                      fill
                      className="pva-overview-image"
                      style={{ objectFit: "cover", objectPosition: "center top" }}
                    />
                  </div>
                )}
                <div className="pva-overview-card-body">
                  <span className="pva-overview-eyebrow">{c.eyebrow}</span>
                  <h3
                    className={`pva-overview-card-title ${cormorant.className}`}
                  >
                    {c.title}
                  </h3>
                  <p className="pva-overview-card-note">{c.note}</p>
                  <span className="pva-overview-open-hint">
                    Open collection
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── FULL PROMPT LIBRARY ── */}
      <section className="pva-library">
        <div className="pva-library-inner">
          <p className="pva-eyebrow">FULL PROMPT LIBRARY</p>
          <h2 className={`pva-library-title ${cormorant.className}`}>
            Open the shoot you want to create.
          </h2>
          <p
            style={{
              margin: "0 0 40px",
              fontSize: "15px",
              lineHeight: 1.8,
              color: "#3A3632",
              maxWidth: "560px",
            }}
          >
            Each collection gives you the full shoot direction. The image
            leads. The prompt supports it.
          </p>

          <div className="pva-collection-list">
            {VAULT_COLLECTIONS.map((collection) => {
              const meta = VAULT_COLLECTION_META.find(
                (m) => m.name === collection.title,
              )
              const thumbs = meta?.thumbnails.slice(0, 6) ?? []

              return (
                <details
                  key={collection.id}
                  id={collection.id}
                  className="pva-details"
                >
                  <summary className="pva-summary">
                    {collection.heroImage && (
                      <div className="pva-summary-thumb">
                        <Image
                          src={collection.heroImage}
                          alt=""
                          fill
                          aria-hidden
                          style={{ objectFit: "cover", objectPosition: "center top" }}
                        />
                      </div>
                    )}
                    <div className="pva-summary-text">
                      <span className="pva-series-eyebrow">
                        {collection.eyebrow}
                      </span>
                      <span
                        className={`pva-series-title ${cormorant.className}`}
                      >
                        {collection.title}
                      </span>
                      <span className="pva-series-note">{collection.note}</span>
                    </div>
                    <span className="pva-open-label">Open prompts</span>
                  </summary>

                  <div className="pva-details-content">
                    {/* Thumbnail strip */}
                    {thumbs.length > 0 && (
                      <div className="pva-thumb-strip">
                        {thumbs.map((src, i) => (
                          <div key={i} className="pva-thumb-item">
                            <Image
                              src={src}
                              alt=""
                              fill
                              aria-hidden
                              style={{
                                objectFit: "cover",
                                objectPosition: "center top",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Prompt cards */}
                    <div className="pva-cards">
                      {collection.cards.map((card) => (
                        <PromptCardEl key={card.id} card={card} />
                      ))}
                    </div>
                  </div>
                </details>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="pva-footer">
        <p className="pva-footer-text">
          Questions? Email{" "}
          <a href="mailto:support@sselfie.ai" className="pva-footer-link">
            support@sselfie.ai
          </a>
        </p>
        <p className={`pva-footer-brand ${cormorant.className}`}>SSELFIE</p>
      </footer>

      <style>{`
        /* Base */
        .pva-page {
          background: #F8FAFA;
          color: #0D0E10;
          min-height: 100vh;
        }

        /* NAV */
        .pva-nav {
          position: sticky;
          top: 0;
          z-index: 10;
          background: #F8FAFA;
          border-bottom: 1px solid rgba(197,198,200,0.35);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px clamp(18px, 4vw, 40px);
        }
        .pva-nav-logo {
          color: #0A0A0A;
          font-size: 16px;
          font-weight: 300;
          letter-spacing: 0.34em;
          text-decoration: none;
          text-transform: uppercase;
        }
        .pva-nav-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #818283;
        }

        /* Shared helpers */
        .pva-eyebrow {
          margin: 0 0 16px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.42em;
          text-transform: uppercase;
          color: #9B9189;
        }

        /* HERO */
        .pva-hero {
          border-bottom: 1px solid #E5DDD4;
          overflow: hidden;
        }
        .pva-hero-inner {
          max-width: 1120px;
          margin: 0 auto;
          padding: clamp(56px, 7vw, 96px) clamp(20px, 4vw, 48px) clamp(40px, 5vw, 64px);
        }
        .pva-headline {
          margin: 0 0 20px;
          font-size: clamp(3rem, 7vw, 6rem);
          font-weight: 300;
          line-height: 0.97;
          letter-spacing: -0.025em;
          color: #0A0A0A;
        }
        .pva-subhead {
          margin: 0 0 28px;
          font-size: 16px;
          line-height: 1.85;
          color: #3A3632;
          max-width: 520px;
        }
        .pva-scroll-link {
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.08em;
          color: #9B9189;
          text-decoration: none;
        }
        .pva-scroll-link:hover { color: #0A0A0A; }

        /* First result */
        .pva-first-result {
          border-bottom: 1px solid rgba(197,198,200,0.35);
          background: #F8FAFA;
        }
        .pva-first-result-inner {
          max-width: 1120px;
          margin: 0 auto;
          padding: clamp(56px, 7vw, 88px) clamp(20px, 4vw, 48px);
        }
        .pva-first-title {
          margin: 0 0 16px;
          font-size: clamp(2.2rem, 5.5vw, 4.6rem);
          font-weight: 300;
          line-height: 1.02;
          color: #0D0E10;
        }
        .pva-first-note {
          margin: 0 0 36px;
          max-width: 620px;
          font-size: 15px;
          line-height: 1.8;
          color: #4F5052;
        }
        .pva-first-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        .pva-first-card {
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.35);
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .pva-first-image-wrap {
          position: relative;
          aspect-ratio: 4 / 5;
          background: #F8FAFA;
          overflow: hidden;
        }
        .pva-first-body {
          padding: 22px 20px 20px;
          display: flex;
          flex: 1;
          flex-direction: column;
        }
        .pva-first-label {
          margin-bottom: 12px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #818283;
        }
        .pva-first-card-title {
          margin: 0 0 12px;
          font-size: clamp(1.55rem, 3vw, 2rem);
          font-weight: 300;
          line-height: 1.05;
          color: #0D0E10;
        }
        .pva-first-copy {
          margin: 0 0 18px;
          font-size: 13px;
          line-height: 1.7;
          color: #4F5052;
        }
        .pva-first-instruction {
          border-top: 1px solid rgba(197,198,200,0.35);
          padding-top: 14px;
          margin-top: 0;
          margin-bottom: 14px;
        }
        .pva-first-instruction span {
          display: block;
          margin-bottom: 6px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #818283;
        }
        .pva-first-instruction p {
          margin: 0;
          font-size: 12px;
          line-height: 1.65;
          color: #4F5052;
        }
        .pva-first-actions {
          display: grid;
          gap: 10px;
          margin-top: auto;
          padding-top: 8px;
        }
        .pva-first-actions .copy-action {
          align-items: stretch;
        }
        .pva-first-actions .copy-btn,
        .pva-first-open {
          width: 100%;
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          text-decoration: none;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        .pva-first-actions .copy-btn {
          background: #0D0E10 !important;
          border-color: #0D0E10 !important;
          color: #FFFFFF !important;
        }
        .pva-first-open {
          border: 1px solid rgba(13,14,16,0.18);
          color: #0D0E10;
        }
        .pva-troubleshoot {
          margin-top: 18px;
          padding: 22px;
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .pva-troubleshoot-label {
          margin: 0 0 8px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #818283;
        }
        .pva-troubleshoot p:last-child {
          margin: 0;
          font-size: 13px;
          line-height: 1.75;
          color: #4F5052;
        }

        /* Hero image strip */
        .pva-hero-strip {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          margin: 0;
          height: clamp(200px, 35vw, 480px);
        }
        .pva-hero-strip-img {
          position: relative;
          overflow: hidden;
        }

        /* How to use */
        .pva-how-section {
          border-bottom: 1px solid rgba(197,198,200,0.35);
          background: #FFFFFF;
          padding: clamp(32px, 4vw, 48px) clamp(20px, 4vw, 48px);
        }
        .pva-how-inner {
          max-width: 680px;
          margin: 0 auto;
        }
        .pva-how-label {
          margin: 0 0 10px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: #9B9189;
        }
        .pva-how-steps {
          margin: 0;
          padding-left: 20px;
          color: #3A3632;
          font-size: 14px;
          line-height: 2;
        }
        .pva-how-steps strong {
          color: #0A0A0A;
          font-weight: 500;
        }

        /* Overview */
        .pva-overview {
          border-bottom: 1px solid rgba(197,198,200,0.35);
          background: #FFFFFF;
        }
        .pva-overview-inner {
          max-width: 1120px;
          margin: 0 auto;
          padding: clamp(56px, 7vw, 88px) clamp(20px, 4vw, 48px);
        }
        .pva-overview-title {
          margin: 0 0 12px;
          font-size: clamp(2.2rem, 5.5vw, 4.5rem);
          font-weight: 300;
          line-height: 1.02;
          color: #0A0A0A;
        }
        .pva-overview-note {
          margin: 0 0 40px;
          font-size: 15px;
          line-height: 1.8;
          color: #3A3632;
          max-width: 580px;
        }
        .pva-overview-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .pva-overview-card {
          display: block;
          color: inherit;
          text-decoration: none;
          background: #F8FAFA;
          border: 1px solid rgba(197,198,200,0.35);
          overflow: hidden;
          transition: border-color 0.2s;
        }
        .pva-overview-card:hover {
          border-color: #9B9189;
        }
        .pva-overview-image-wrap {
          position: relative;
          aspect-ratio: 4/5;
          overflow: hidden;
          background: #EDE8E1;
        }
        .pva-overview-image {
          transition: transform 0.4s ease !important;
        }
        .pva-overview-card:hover .pva-overview-image {
          transform: scale(1.03) !important;
        }
        .pva-overview-card-body {
          padding: 20px 18px 22px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .pva-overview-eyebrow {
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.34em;
          text-transform: uppercase;
          color: #9B9189;
        }
        .pva-overview-card-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 300;
          line-height: 1.1;
          color: #0A0A0A;
        }
        .pva-overview-card-note {
          margin: 0;
          font-size: 13px;
          line-height: 1.65;
          color: #3A3632;
          font-style: italic;
        }
        .pva-overview-open-hint {
          margin-top: 4px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.1em;
          color: #9B9189;
        }

        /* Library */
        .pva-library {
          border-bottom: 1px solid rgba(197,198,200,0.35);
          background: #F8FAFA;
        }
        .pva-library-inner {
          max-width: 1140px;
          margin: 0 auto;
          padding: clamp(56px, 7vw, 88px) clamp(20px, 4vw, 48px);
        }
        .pva-library-title {
          margin: 0 0 10px;
          font-size: clamp(2rem, 5vw, 3.6rem);
          font-weight: 300;
          line-height: 1.04;
          color: #0A0A0A;
        }
        .pva-collection-list {
          display: grid;
          gap: 12px;
        }

        /* Accordion */
        .pva-details {
          border: 1px solid rgba(197,198,200,0.35);
          background: #FFFFFF;
          overflow: hidden;
        }
        .pva-summary {
          list-style: none;
          cursor: pointer;
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 20px;
          align-items: center;
          padding: 20px 28px;
        }
        .pva-summary::-webkit-details-marker { display: none; }
        .pva-summary-thumb {
          position: relative;
          width: 64px;
          aspect-ratio: 2/3;
          flex-shrink: 0;
          overflow: hidden;
          background: #EDE8E1;
        }
        .pva-summary-text {
          display: grid;
          gap: 6px;
        }
        .pva-series-eyebrow {
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.36em;
          text-transform: uppercase;
          color: #9B9189;
        }
        .pva-series-title {
          font-size: clamp(1.4rem, 3vw, 2rem);
          font-weight: 300;
          line-height: 1.08;
          color: #0A0A0A;
        }
        .pva-series-note {
          font-size: 14px;
          line-height: 1.7;
          color: #3A3632;
          max-width: 540px;
          font-style: italic;
        }
        .pva-open-label {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(10,10,10,0.18);
          padding: 10px 16px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(10,10,10,0.7);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .pva-details[open] .pva-open-label {
          background: #0A0A0A;
          color: #FFFFFF;
          border-color: #0A0A0A;
        }

        /* Accordion content */
        .pva-details-content {
          border-top: 1px solid rgba(197,198,200,0.35);
        }

        /* Thumbnail strip */
        .pva-thumb-strip {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 4px;
          padding: 20px 28px 0;
        }
        .pva-thumb-item {
          position: relative;
          aspect-ratio: 3/4;
          overflow: hidden;
          background: #EDE8E1;
        }

        /* Cards grid */
        .pva-cards {
          display: grid;
          gap: 16px;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          padding: 20px 28px 28px;
        }

        /* Card */
        .pva-card {
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.35);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .pva-card-image-wrap {
          width: 100%;
          aspect-ratio: 2/3;
          overflow: hidden;
          background: #EDE8E1;
        }
        .pva-card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
          display: block;
        }
        .pva-card-body {
          padding: 22px 20px 20px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0;
          background: #FFFFFF;
        }
        .pva-card-header {
          display: flex;
          align-items: baseline;
          gap: 10px;
          margin-bottom: 12px;
        }
        .pva-card-number {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.2em;
          color: #9B9189;
          flex-shrink: 0;
        }
        .pva-card-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 300;
          line-height: 1.15;
          color: #0A0A0A;
        }
        .pva-when-label {
          margin: 0 0 4px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #9B9189;
        }
        .pva-when {
          margin: 0 0 10px;
          font-size: 13px;
          line-height: 1.7;
          color: #3A3632;
        }
        .pva-mood {
          margin: 0 0 14px;
          font-size: 11px;
          letter-spacing: 0.04em;
          color: #9B9189;
          font-style: italic;
        }
        .pva-prompt-wrap {
          margin-top: auto;
          border-top: 1px solid rgba(197,198,200,0.35);
          padding-top: 14px;
        }
        .pva-prompt-text {
          margin: 0 0 12px;
          font-size: 13px;
          line-height: 1.75;
          color: #3A3632;
          white-space: pre-wrap;
        }
        .pva-copy-row { display: flex; }

        /* CopyButton override */
        .copy-btn {
          color: #0A0A0A !important;
          border-color: rgba(10,10,10,0.18) !important;
          background: transparent !important;
        }
        .copy-btn:hover {
          color: #0A0A0A !important;
          border-color: rgba(10,10,10,0.5) !important;
          background: transparent !important;
        }

        /* Footer */
        .pva-footer {
          border-top: 1px solid rgba(197,198,200,0.35);
          padding: 36px 24px;
          text-align: center;
          background: #F8FAFA;
        }
        .pva-footer-text {
          margin: 0 0 8px;
          font-size: 13px;
          color: #9B9189;
        }
        .pva-footer-link {
          color: #3A3632;
          text-decoration: none;
        }
        .pva-footer-brand {
          margin: 0;
          font-size: 10px;
          font-weight: 300;
          letter-spacing: 0.46em;
          text-transform: uppercase;
          color: #9B9189;
        }

        /* Tablet */
        @media (max-width: 960px) {
          .pva-overview-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .pva-first-grid {
            grid-template-columns: 1fr;
          }
          .pva-thumb-strip {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        /* Mobile */
        @media (max-width: 640px) {
          .pva-hero-strip {
            height: clamp(160px, 50vw, 280px);
          }
          .pva-overview-grid {
            grid-template-columns: 1fr;
          }
          .pva-thumb-strip {
            grid-template-columns: repeat(3, 1fr);
            padding: 16px 16px 0;
          }
          .pva-summary {
            grid-template-columns: auto 1fr;
            gap: 14px;
            padding: 20px 18px;
          }
          .pva-open-label {
            grid-column: 1 / -1;
            justify-self: start;
          }
          .pva-cards {
            grid-template-columns: 1fr;
            padding: 16px 16px 20px;
          }
        }
      `}</style>
    </main>
  )
}
