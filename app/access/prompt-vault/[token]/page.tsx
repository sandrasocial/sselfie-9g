import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { isAdminEmail } from "@/lib/admin-feature-flags"
import { getUserIdFromSupabase } from "@/lib/user-mapping"
import { getSuiteAccess } from "@/lib/trial/suite-trial"
import { buildAppV3AestheticHref } from "@/lib/app-v3/navigation"
import { CopyButton } from "@/components/ai-prompts/copy-button"
import { PromptViewTracker } from "@/components/prompt-vault/prompt-view-tracker"
import { SuiteDoor } from "@/components/marketing/suite-door"
import { VaultPostPurchaseOffer } from "@/components/prompt-vault/vault-post-purchase-offer"
import { getPaidPromptVaultAccess } from "@/lib/prompt-vault/paid-access"
import {
  MYSTERIOUS_VOGUE_SERIES,
  QUIET_LUXURY_LONDON_SERIES,
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
import { getPublishedVaultCollections, toAestheticId } from "@/lib/vault/published-collections"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

// Sandra-approved member action copy, 2026-07-15.
const MEMBER_ACTION_COPY = {
  openInMaya: "Open in Maya",
  copyText: "Copy text",
  copyTextAria: "Copy prompt text to clipboard",
  suiteDoor: "Open this look in Maya",
} as const

// ── Collection data ─────────────────────────────────────────────────────────

const VAULT_COLLECTIONS: Array<{
  id: string
  eyebrow: string
  title: string
  note: string
  heroImage?: string
  cards: PromptCard[]
}> = [
  {
    id: "mysterious-vogue",
    eyebrow: "COLLECTION 10 · MYSTERIOUS VOGUE EDITORIAL",
    title: "Mysterious Vogue Editorial",
    note: "Dark chiaroscuro beauty close-ups. Half-shadow eyes, damp tousled hair, a black blazer, a noir red lip. Seven luxury editorial portraits where one beam of warm light does all the work.",
    heroImage: MYSTERIOUS_VOGUE_SERIES[0]?.exampleImage,
    cards: MYSTERIOUS_VOGUE_SERIES,
  },
  {
    id: "quiet-luxury-london",
    eyebrow: "COLLECTION 09 · QUIET LUXURY LONDON EDITORIAL",
    title: "Quiet Luxury London Editorial",
    note: "Camel tailoring, black quilted bag, pointed slingbacks, takeaway coffee on a London morning. Nine shots from café arrival through the seated marble hero to the cinematic black-cab closer.",
    heroImage: QUIET_LUXURY_LONDON_SERIES[0]?.exampleImage,
    cards: QUIET_LUXURY_LONDON_SERIES,
  },
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

const FEATURED_FIRST_SHOOT = {
  title: "Dark Feminine Café",
  collectionHref: "#dark-feminine-cafe",
  aestheticId: toAestheticId("Dark Feminine Café Coffee-Run Editorial"),
  card: DARK_FEMININE_CAFE_SERIES[0]!,
  images: [
    DARK_FEMININE_CAFE_SERIES[0]?.exampleImage,
    DARK_FEMININE_CAFE_SERIES[2]?.exampleImage,
    DARK_FEMININE_CAFE_SERIES[5]?.exampleImage,
  ].filter((src): src is string => Boolean(src)),
}

export const metadata: Metadata = {
  title: "The Prompt Vault · SSELFIE",
  description:
    "The full SSELFIE prompt library: complete AI photoshoot sequences, example images, and new drops.",
  robots: { index: false, follow: false },
}

type ViewerAccess = {
  isAdmin: boolean
  isActiveMember: boolean
}

async function resolveViewerAccess(): Promise<ViewerAccess> {
  try {
    const { user } = await getAuthenticatedUser()
    if (!user) return { isAdmin: false, isActiveMember: false }

    const isAdmin = isAdminEmail(user.email)
    if (isAdmin) return { isAdmin: true, isActiveMember: true }

    const neonUserId = await getUserIdFromSupabase(user.id)
    if (!neonUserId) return { isAdmin: false, isActiveMember: false }
    const access = await getSuiteAccess(String(neonUserId))

    // getSuiteAccess deliberately resolves both recurring SUITE and the active fixed bundle
    // pass to "member". Trials and limited one-time ownership keep the existing Vault page.
    return { isAdmin: false, isActiveMember: access.level === "member" }
  } catch (error) {
    console.error("[prompt-vault/access] member resolution failed:", error)
    return { isAdmin: false, isActiveMember: false }
  }
}

// ── Prompt card component ────────────────────────────────────────────────────

function PromptActions({
  card,
  aestheticId,
  isActiveMember,
  copyLabel,
  copyAriaLabel,
}: {
  card: PromptCard
  aestheticId: string
  isActiveMember: boolean
  copyLabel?: string
  copyAriaLabel?: string
}) {
  if (!isActiveMember) {
    return (
      <CopyButton
        text={card.prompt}
        promptTitle={card.title}
        promptNumber={card.number}
        trackEvent="prompt_vault_prompt_copied"
        trackSource="prompt-vault"
        label={copyLabel}
        ariaLabel={copyAriaLabel}
      />
    )
  }

  return (
    <div className="pva-member-actions">
      <Link href={buildAppV3AestheticHref(aestheticId)} className="pva-member-open-maya">
        {MEMBER_ACTION_COPY.openInMaya}
      </Link>
      <div className="pva-member-copy">
        <CopyButton
          text={card.prompt}
          promptTitle={card.title}
          promptNumber={card.number}
          trackEvent="prompt_vault_prompt_copied"
          trackSource="prompt-vault"
          label={copyLabel ?? MEMBER_ACTION_COPY.copyText}
          ariaLabel={copyAriaLabel ?? MEMBER_ACTION_COPY.copyTextAria}
        />
      </div>
    </div>
  )
}

function PromptCardEl({
  card,
  aestheticId,
  isActiveMember,
}: {
  card: PromptCard
  aestheticId: string
  isActiveMember: boolean
}) {
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
          <h3 className={`pva-card-title ${cormorant.className}`}>{card.title}</h3>
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
            <PromptActions card={card} aestheticId={aestheticId} isActiveMember={isActiveMember} />
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
  const result = await getPaidPromptVaultAccess(token)
  const viewerAccess = await resolveViewerAccess()
  const adminOverride = !result.valid && viewerAccess.isAdmin

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
            This access link is not valid. Use the link from your purchase confirmation email or
            contact hello@sselfie.ai if you need help.
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

  const publishedCollections = await getPublishedVaultCollections()
  const allVaultCollections = [
    ...publishedCollections.map(collection => ({
      id: collection.slug,
      eyebrow: "NEW PHOTOSHOOT",
      title: collection.title,
      note: collection.note,
      heroImage: collection.heroImage ?? collection.cards[0]?.exampleImage,
      cards: collection.cards,
    })),
    ...VAULT_COLLECTIONS,
  ]
  const vaultCollections = [
    ...allVaultCollections.filter(collection => collection.id === "dark-feminine-cafe"),
    ...allVaultCollections.filter(collection => collection.id !== "dark-feminine-cafe"),
  ]
  const vaultMeta = [
    ...publishedCollections.map(collection => ({
      previewCardId: collection.cards[0]?.id ?? collection.slug,
      name: collection.title,
      shotCount: collection.cards.length,
      thumbnails: collection.cards
        .map(card => card.exampleImage)
        .filter((url): url is string => !!url),
    })),
    ...VAULT_COLLECTION_META,
  ]

  logAnalyticsEvent({
    eventName: "prompt_vault_access_opened",
    path: "/access/prompt-vault/[token]",
    properties: {
      token_prefix: token.slice(0, 8),
      access_mode: result.valid ? "token" : "admin_override",
    },
  }).catch(() => {})

  const firstName = result.valid && result.name ? result.name.split(" ")[0] : null
  const vaultShotCount = vaultMeta.reduce((total, collection) => total + collection.shotCount, 0)

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
      <section id="first-result" className="pva-hero">
        <div className="pva-hero-layout">
          <div className="pva-hero-copy">
            <p className="pva-eyebrow">YOUR PROMPT VAULT IS READY</p>
            <h1 className={`pva-headline ${cormorant.className}`}>
              {firstName ? `${firstName}, start` : "Start"} with this shoot.
            </h1>
            <p className="pva-subhead">
              Dark Feminine Café gives you six matching photos for your profile, content, and
              launch days. Use one clear selfie and create the first photo now.
            </p>
            <div className="pva-feature-actions">
              <PromptActions
                card={FEATURED_FIRST_SHOOT.card}
                aestheticId={FEATURED_FIRST_SHOOT.aestheticId}
                isActiveMember={viewerAccess.isActiveMember}
                copyLabel="Copy the first prompt"
                copyAriaLabel="Copy the first Dark Feminine Café prompt"
              />
              <a href={FEATURED_FIRST_SHOOT.collectionHref} className="pva-feature-secondary">
                See the complete shoot
              </a>
            </div>
            <p className="pva-feature-start-note">
              Upload your selfie to ChatGPT, paste the prompt, and create your photo.
            </p>
            <div className="pva-hero-library" aria-label="Vault library size">
              <span>{vaultCollections.length} complete shoots</span>
              <span>{vaultShotCount} prompts</span>
              <span>new drops included</span>
            </div>
          </div>

          <div className="pva-feature-spread" aria-label="Dark Feminine Café photoshoot preview">
            {FEATURED_FIRST_SHOOT.images.map((src, index) => (
              <div key={src} className={`pva-feature-image pva-feature-image-${index + 1}`}>
                <Image
                  src={src}
                  alt={`Dark Feminine Café result ${index + 1}`}
                  fill
                  priority={index === 0}
                  sizes="(max-width: 760px) 58vw, 28vw"
                  style={{ objectFit: "cover", objectPosition: "center top" }}
                />
              </div>
            ))}
            <p className="pva-feature-caption">DARK FEMININE CAFÉ · SIX MATCHING PHOTOS</p>
          </div>
        </div>
      </section>

      <section className="pva-quick-help">
        <details className="pva-help-details">
          <summary>Need help choosing a selfie or fixing a result?</summary>
          <div className="pva-help-copy">
            <p>
              Choose a clear photo where your face is easy to see. For this shoot, a dark top or
              blazer and soft window light work well.
            </p>
            <p>
              If the result feels too polished, start a fresh chat and add: &quot;Keep my real facial
              features, age, natural skin texture, hair color, and body proportions.&quot;
            </p>
          </div>
        </details>
      </section>

      {/* ── FULL PROMPT LIBRARY ── */}
      <section id="vault-overview" className="pva-library">
        <div className="pva-library-inner">
          <p className="pva-eyebrow">ALL PHOTOSHOOTS</p>
          <h2 className={`pva-library-title ${cormorant.className}`}>
            Choose the photos you want next.
          </h2>
          <p className="pva-library-note">
            Open any shoot to see every finished example and copy the prompts.
          </p>

          <div className="pva-collection-list">
            {vaultCollections.map(collection => {
              const meta = vaultMeta.find(m => m.name === collection.title)
              const thumbs = meta?.thumbnails.slice(0, 6) ?? []

              return (
                <details key={collection.id} id={collection.id} className="pva-details">
                  <summary className="pva-summary">
                    <div className="pva-summary-preview" aria-hidden>
                      {(thumbs.length > 0
                        ? thumbs.slice(0, 3)
                        : collection.heroImage
                          ? [collection.heroImage]
                          : []
                      ).map((src, index) => (
                        <div key={`${src}-${index}`} className="pva-summary-thumb">
                          <Image
                            src={src}
                            alt=""
                            fill
                            aria-hidden
                            sizes="(max-width: 640px) 30vw, 12vw"
                            style={{ objectFit: "cover", objectPosition: "center top" }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="pva-summary-text">
                      <span className="pva-series-eyebrow">
                        {collection.eyebrow === "NEW PHOTOSHOOT" ? "NEW · " : ""}
                        {collection.cards.length} prompts
                      </span>
                      <span className={`pva-series-title ${cormorant.className}`}>
                        {collection.title.replace(/\s*Editorial\s*$/i, "")}
                      </span>
                      <span className="pva-series-note">{collection.note}</span>
                    </div>
                    <span className="pva-open-label">
                      <span className="pva-open-text">Open shoot</span>
                      <span className="pva-close-text">Close shoot</span>
                    </span>
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
                      {collection.cards.map(card => (
                        <PromptCardEl
                          key={card.id}
                          card={card}
                          aestheticId={toAestheticId(collection.title)}
                          isActiveMember={viewerAccess.isActiveMember}
                        />
                      ))}
                    </div>
                  </div>
                </details>
              )
            })}
          </div>
        </div>
      </section>

      {!viewerAccess.isActiveMember && (
        <VaultPostPurchaseOffer vaultToken={token} serifClassName={cormorant.className} />
      )}

      {/* ── THE SUITE DOOR - the membership invitation for proven buyers ── */}
      {viewerAccess.isActiveMember && (
        <SuiteDoor
          eyebrow="Your next step"
          title="Open this look in Maya."
          body="You already have SUITE access. Choose a look from the Vault, then bring it into Maya to keep creating."
          ctaLabel={MEMBER_ACTION_COPY.suiteDoor}
          href="/app"
          placement="vault_access"
          destination="app"
          serifClassName={cormorant.className}
        />
      )}

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
        .pva-member-actions {
          display: grid;
          gap: 8px;
          width: 100%;
        }
        .pva-member-open-maya {
          display: inline-flex;
          min-height: 44px;
          width: 100%;
          align-items: center;
          justify-content: center;
          padding: 12px 16px;
          background: #0D0E10;
          color: #FFFFFF;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-align: center;
          text-decoration: none;
          text-transform: uppercase;
        }
        .pva-member-copy,
        .pva-member-copy .copy-action {
          display: flex;
          justify-content: flex-start;
          width: 100%;
        }
        .pva-member-copy .copy-btn {
          min-height: 36px;
          width: auto;
          justify-content: flex-start;
          padding: 4px 0;
          background: transparent !important;
          border: 0 !important;
          color: #4F5052 !important;
          font-size: 11px;
          font-weight: 400;
          letter-spacing: 0;
          text-decoration: underline;
          text-transform: none;
          text-underline-offset: 4px;
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
          contain: layout paint style;
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
          content-visibility: auto;
          contain-intrinsic-size: auto 760px;
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
          .pva-thumb-strip {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        /* Mobile */
        @media (max-width: 640px) {
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

        /* Paid Vault lookbook experience */
        .pva-hero {
          background: #FFFFFF;
          border-bottom: 1px solid rgba(197,198,200,0.45);
          scroll-margin-top: 64px;
        }
        .pva-hero-layout {
          display: grid;
          grid-template-columns: minmax(0, 0.82fr) minmax(520px, 1.18fr);
          max-width: 1440px;
          min-height: min(820px, calc(100svh - 54px));
          margin: 0 auto;
        }
        .pva-hero-copy {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: clamp(54px, 7vw, 104px) clamp(26px, 5vw, 76px);
        }
        .pva-headline {
          max-width: 620px;
          margin-bottom: 24px;
          font-size: clamp(3.2rem, 6.2vw, 6.4rem);
          line-height: 0.92;
        }
        .pva-subhead {
          max-width: 520px;
          margin-bottom: 28px;
          color: #4F5052;
          font-size: 15px;
          line-height: 1.75;
        }
        .pva-feature-actions {
          display: grid;
          gap: 10px;
          max-width: 420px;
        }
        .pva-feature-actions .copy-action,
        .pva-feature-actions .copy-btn,
        .pva-feature-actions .pva-member-actions {
          width: 100%;
        }
        .pva-feature-actions .copy-btn,
        .pva-feature-actions .pva-member-open-maya,
        .pva-feature-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 50px;
          padding: 14px 20px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-align: center;
          text-decoration: none;
          text-transform: uppercase;
        }
        .pva-feature-actions .copy-btn,
        .pva-feature-actions .pva-member-open-maya {
          background: #0D0E10 !important;
          border-color: #0D0E10 !important;
          color: #FFFFFF !important;
        }
        .pva-feature-secondary {
          border: 1px solid rgba(13,14,16,0.18);
          color: #0D0E10;
        }
        .pva-feature-actions .pva-member-copy .copy-btn {
          min-height: 36px;
          width: auto;
          padding: 4px 0;
          background: transparent !important;
          border: 0 !important;
          color: #4F5052 !important;
          font-size: 11px;
          font-weight: 400;
          letter-spacing: 0;
          text-transform: none;
        }
        .pva-feature-start-note {
          max-width: 420px;
          margin: 14px 0 0;
          color: #818283;
          font-size: 12px;
          line-height: 1.65;
        }
        .pva-hero-library {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 18px;
          margin-top: 38px;
          color: #818283;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.17em;
          text-transform: uppercase;
        }
        .pva-hero-library span + span::before {
          content: "";
          display: inline-block;
          width: 1px;
          height: 10px;
          margin-right: 18px;
          background: #C5C6C8;
          vertical-align: -1px;
        }
        .pva-feature-spread {
          position: relative;
          display: grid;
          grid-template-columns: 1.12fr 0.88fr;
          grid-template-rows: 1fr 1fr;
          gap: 6px;
          min-height: 680px;
          padding: 18px 18px 18px 0;
          background: #F8FAFA;
          overflow: hidden;
        }
        .pva-feature-image {
          position: relative;
          min-height: 0;
          overflow: hidden;
          background: #E7E9E9;
        }
        .pva-feature-image-1 { grid-row: 1 / 3; }
        .pva-feature-caption {
          position: absolute;
          right: 30px;
          bottom: 30px;
          margin: 0;
          padding: 10px 13px;
          background: rgba(255,255,255,0.92);
          color: #4F5052;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.2em;
        }

        .pva-quick-help {
          padding: 0 clamp(20px, 4vw, 48px);
          background: #FFFFFF;
          border-bottom: 1px solid rgba(197,198,200,0.45);
        }
        .pva-help-details {
          max-width: 1120px;
          margin: 0 auto;
          padding: 24px 0;
        }
        .pva-help-details summary {
          cursor: pointer;
          color: #4F5052;
          font-size: 13px;
          font-weight: 500;
          list-style-position: outside;
        }
        .pva-help-copy {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
          max-width: 860px;
          padding-top: 20px;
        }
        .pva-help-copy p {
          margin: 0;
          color: #4F5052;
          font-size: 13px;
          line-height: 1.75;
        }

        .pva-library {
          background: #F8FAFA;
        }
        .pva-library-inner {
          max-width: 1240px;
        }
        .pva-library-note {
          max-width: 560px;
          margin: 0 0 42px;
          color: #4F5052;
          font-size: 15px;
          line-height: 1.75;
        }
        .pva-collection-list {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }
        .pva-details {
          scroll-margin-top: 72px;
        }
        .pva-details[open] {
          grid-column: 1 / -1;
        }
        .pva-summary {
          display: block;
          padding: 0;
        }
        .pva-summary-preview {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 4px;
          height: clamp(210px, 28vw, 340px);
          overflow: hidden;
          background: #E7E9E9;
        }
        .pva-summary-thumb {
          position: relative;
          width: auto;
          height: 100%;
          aspect-ratio: auto;
        }
        .pva-summary-text {
          min-height: 180px;
          padding: 22px 22px 12px;
        }
        .pva-series-eyebrow {
          color: #818283;
        }
        .pva-series-title {
          font-size: clamp(1.65rem, 3vw, 2.25rem);
        }
        .pva-series-note {
          display: -webkit-box;
          overflow: hidden;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          color: #4F5052;
          font-size: 13px;
          font-style: normal;
          line-height: 1.6;
        }
        .pva-open-label {
          margin: 0 22px 22px;
          padding: 10px 14px;
        }
        .pva-close-text { display: none; }
        .pva-details[open] .pva-open-text { display: none; }
        .pva-details[open] .pva-close-text { display: inline; }
        .pva-details[open] .pva-summary-preview {
          height: clamp(230px, 34vw, 420px);
        }
        .pva-details[open] .pva-summary-text {
          min-height: 0;
        }

        @media (max-width: 920px) {
          .pva-hero-layout {
            grid-template-columns: 1fr;
            min-height: 0;
          }
          .pva-hero-copy {
            padding-top: 64px;
            padding-bottom: 54px;
          }
          .pva-feature-spread {
            min-height: 620px;
            padding-left: 18px;
          }
        }

        @media (max-width: 700px) {
          .pva-hero-copy {
            padding: 50px 22px 42px;
          }
          .pva-headline {
            font-size: clamp(3rem, 15vw, 4.8rem);
          }
          .pva-feature-spread {
            min-height: 500px;
            padding: 8px;
            gap: 4px;
          }
          .pva-feature-caption {
            right: 18px;
            bottom: 18px;
            max-width: calc(100% - 36px);
            font-size: 8px;
            letter-spacing: 0.14em;
          }
          .pva-hero-library {
            display: grid;
            gap: 6px;
          }
          .pva-hero-library span + span::before { display: none; }
          .pva-help-copy,
          .pva-collection-list {
            grid-template-columns: 1fr;
          }
          .pva-summary-preview {
            height: 78vw;
            max-height: 360px;
          }
          .pva-summary-text {
            min-height: 0;
          }
          .pva-details[open] { grid-column: auto; }
          .pva-details[open] .pva-summary-preview {
            height: 82vw;
            max-height: 390px;
          }
        }
      `}</style>
    </main>
  )
}
