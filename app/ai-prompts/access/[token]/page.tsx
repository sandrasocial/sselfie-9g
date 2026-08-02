import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { sql } from "@/lib/db/client"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { isAdminEmail } from "@/lib/admin-feature-flags"
import { CopyButton } from "@/components/ai-prompts/copy-button"
import { TrackedLink } from "@/components/ai-prompts/tracked-link"
import { buildPromptVaultFreebieCheckoutHref } from "@/lib/revenue-engine/prompt-vault-freebie-checkout-url"
import {
  REUSABLE_STARTER,
  FREEBIE_ROTATING_DROP_LIMIT,
  getStaticVaultFreebieCollections,
  selectLatestFreebieShootCollections,
  type PromptCard,
} from "@/lib/ai-prompts/prompt-data"
import { getPublishedFreebieCollectionPreviews } from "@/lib/vault/published-collections"
import { getPromptVaultPriceDisplay } from "@/lib/launch/cash-launch-pricing"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

export const metadata: Metadata = {
  title: "Your Five Free AI Photo Prompts · SSELFIE",
  description:
    "Choose one of your five free AI photo prompts, copy it, and create your photo in ChatGPT.",
  robots: { index: false, follow: false },
}

// ---------------------------------------------------------------------------
// Token validation
// ---------------------------------------------------------------------------

type TokenResult = { valid: false } | { valid: true; subscriberSource: string | null }

async function validateToken(token: string): Promise<TokenResult> {
  try {
    const rows = await sql`
      SELECT id, utm_source
      FROM freebie_subscribers
      WHERE access_token = ${token}
        AND (
          source = 'ai-prompts'
          OR 'ai-prompts-subscriber' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
          OR 'ai-photoshoot-audience' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
        )
      LIMIT 1
    `
    if (rows.length === 0) return { valid: false }
    return {
      valid: true,
      subscriberSource: (rows[0].utm_source as string | null) ?? null,
    }
  } catch (error) {
    console.error("[ai-prompts/access] DB error during token validation:", error)
    return { valid: false }
  }
}

async function isCurrentUserAdmin(): Promise<boolean> {
  const { user } = await getAuthenticatedUser()
  return isAdminEmail(user?.email)
}

function PreviewCardEl({
  card,
  collectionName,
  shotCount,
  showAfterCopyOffer,
  upgradeHref,
  vaultPriceLabel,
}: {
  card: PromptCard
  collectionName: string
  shotCount: number
  showAfterCopyOffer: boolean
  upgradeHref: string
  vaultPriceLabel: string
}) {
  const displayTitle = card.title.startsWith(`${collectionName} · `)
    ? card.title.slice(collectionName.length + 3)
    : card.title

  return (
    <article id={card.id} className="ap-preview-card">
      {card.exampleImage && (
        <div className="ap-preview-image-wrap">
          <Image
            src={card.exampleImage}
            alt={`Preview result for ${card.title}`}
            width={600}
            height={900}
            className="ap-preview-image"
          />
        </div>
      )}
      <div className="ap-preview-body">
        <p className="ap-preview-collection">{collectionName}</p>
        <h3 className={`ap-preview-title ${cormorant.className}`}>{displayTitle}</h3>
        <p className="ap-preview-when">{card.whenToUse}</p>
        <details className="ap-preview-prompt">
          <summary>Read prompt</summary>
          <p>{card.prompt}</p>
        </details>
        <div className="pc-copy-row">
          <CopyButton
            text={card.prompt}
            promptTitle={card.title}
            promptNumber={card.number}
            label="Copy prompt"
            afterCopyHref={showAfterCopyOffer ? upgradeHref : undefined}
            afterCopyTitle={
              showAfterCopyOffer ? "Want the rest of this photoshoot?" : undefined
            }
            afterCopyNote={
              showAfterCopyOffer
                ? "This prompt is one photo from a complete collection. The Prompt Vault gives you the rest of this shoot, every collection, and the new prompt drops I add."
                : undefined
            }
            afterCopyLabel={
              showAfterCopyOffer
                ? `Get the complete Prompt Vault · ${vaultPriceLabel}`
                : undefined
            }
            afterCopyFootnote={showAfterCopyOffer ? "One payment. No subscription." : undefined}
            afterCopyViewEvent="ai_prompts_after_copy_vault_cta_view"
            afterCopyTrackEvent="ai_prompts_prompt_vault_click"
            afterCopyTrackProperties={
              showAfterCopyOffer
                ? {
                    source: "ai-prompts",
                    destination: "checkout-prompt-vault",
                    utm_campaign: "ai_prompts_to_prompt_vault",
                    utm_content: "after_first_copy",
                    checkout_source: "after_first_copy_prompt_vault_cta",
                    cta_position: "after_first_copy",
                    prompt_id: card.id,
                    prompt_title: card.title,
                  }
                : undefined
            }
          />
        </div>
        <p className="ap-preview-included">
          This is one complete prompt from a {shotCount}-photo collection.
        </p>
      </div>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AiPromptsAccessPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const result = await validateToken(token)
  const adminOverride = !result.valid ? await isCurrentUserAdmin() : false
  const publishedCollections = await getPublishedFreebieCollectionPreviews({
    limit: FREEBIE_ROTATING_DROP_LIMIT,
  })
  const freebieCollections = selectLatestFreebieShootCollections(
    publishedCollections,
    getStaticVaultFreebieCollections()
  )
  const heroCollection = freebieCollections[0] ?? null
  const heroImageSrc = heroCollection?.freeCard.exampleImage ?? null
  const promptVaultPrice = getPromptVaultPriceDisplay()

  if (!result.valid && !adminOverride) {
    return (
      <main className={`ap-page ${inter.className}`}>
        <div className="ap-invalid">
          <p className="ap-invalid-eyebrow">SSELFIE</p>
          <h1 className={`ap-invalid-headline ${cormorant.className}`}>
            This link doesn&apos;t look right.
          </h1>
          <p className="ap-invalid-body">
            The access link may be expired or incorrect. Sign up to get a fresh one.
          </p>
          <Link href="/ai-prompts" className="ap-invalid-cta">
            Get the free shoot prompts
          </Link>
        </div>
        <style>{`
          .ap-page {
            background: #F8FAFA;
            color: #0D0E10;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 48px 24px;
          }
          .ap-invalid {
            max-width: 480px;
            text-align: center;
          }
          .ap-invalid-eyebrow {
            margin: 0 0 24px;
            font-size: 9px;
            font-weight: 600;
            letter-spacing: 0.42em;
            color: #818283;
          }
          .ap-invalid-headline {
            margin: 0 0 16px;
            font-size: clamp(2rem, 7vw, 3rem);
            font-weight: 300;
            line-height: 1.1;
            color: #0D0E10;
          }
          .ap-invalid-body {
            margin: 0 0 36px;
            font-size: 15px;
            line-height: 1.8;
            color: #4F5052;
          }
          .ap-invalid-cta {
            display: inline-block;
            padding: 14px 28px;
            background: #0D0E10;
            color: #F8FAFA;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.24em;
            text-transform: uppercase;
            text-decoration: none;
            transition: opacity 0.15s ease;
          }
          .ap-invalid-cta:hover { opacity: 0.88; }
        `}</style>
      </main>
    )
  }

  // Fire-and-forget: track that a valid token page was opened.
  // Never awaited - failure must not delay or block the page render.
  logAnalyticsEvent({
    eventName: "ai_prompts_access_opened",
    path: "/ai-prompts/access/[token]",
    properties: {
      source: "ai-prompts",
      token_prefix: token.slice(0, 8),
      subscriber_source: result.valid ? result.subscriberSource : "admin_override",
    },
  }).catch(() => {})

  const vaultPreviewCheckoutHref = buildPromptVaultFreebieCheckoutHref({
    promptId: "vault_preview",
    accessToken: token,
  })
  return (
    <main className={`ap-page ${inter.className}`}>
      {/* 1. Confirm delivery */}
      <section className={`ap-hero ${heroImageSrc ? "ap-hero-with-image" : ""}`}>
        {heroImageSrc && (
          <div className="ap-hero-image-wrap" aria-hidden="true">
            <Image
              src={heroImageSrc}
              alt=""
              fill
              className="ap-hero-image"
              priority
              sizes="100vw"
            />
            <div className="ap-hero-image-overlay" />
          </div>
        )}
        <div className="ap-hero-content">
          <p className="ap-hero-eyebrow">YOUR FREE AI PHOTO PROMPTS</p>
          <h1 className={`ap-hero-title ${cormorant.className}`}>
            Your five free AI photo prompts are ready.
          </h1>
          <p className="ap-hero-sub">
            Choose a look, copy the prompt, and upload it to ChatGPT with your selfie.
          </p>
          <p className="ap-hero-start">
            Start with the photo you would love to create for yourself.
          </p>
          <div className="ap-hero-actions">
            <a href="#how-it-works" className="ap-hero-cta">
              Show me how
            </a>
          </div>
        </div>
      </section>

      {/* 2. Put the first successful action before any upgrade invitation */}
      <section id="how-it-works" className="ap-section ap-how">
        <div className="ap-section-inner">
          <p className="ap-eyebrow">HOW IT WORKS</p>
          <h2 className={`ap-section-title ${cormorant.className}`}>
            You don&apos;t need to be good at AI.
          </h2>
          <div className="ap-how-steps">
            <div className="ap-how-step">
              <span>01</span>
              <div>
                <h3>Choose a clear selfie</h3>
                <p>
                  Make sure your face is easy to see. Avoid sunglasses, heavy shadows, and blurry
                  photos.
                </p>
              </div>
            </div>
            <div className="ap-how-step">
              <span>02</span>
              <div>
                <h3>Choose one of the looks below</h3>
                <p>Open the prompt you want to try and tap Copy prompt.</p>
              </div>
            </div>
            <div className="ap-how-step">
              <span>03</span>
              <div>
                <h3>Open ChatGPT</h3>
                <p>Upload your selfie, paste the prompt, and create your photo. That&apos;s it.</p>
              </div>
            </div>
          </div>
          <a href="#free-prompts" className="ap-bridge-cta ap-bridge-cta-primary ap-how-cta">
            Choose my first prompt
          </a>
          <p className="ap-how-safety">
            Use your own photo or a photo you have permission to edit. AI can change small facial
            details, so check the result before you post.
          </p>
        </div>
      </section>

      {/* 3. Deliver all five prompts without locked-image interruptions */}
      {freebieCollections.length > 0 && (
        <section id="free-prompts" className="ap-section ap-vault-preview">
          <div className="ap-section-inner">
            <p className="ap-eyebrow ap-eyebrow-new">YOUR FIVE FREE PROMPTS</p>
            <h2 className={`ap-section-title ${cormorant.className}`}>Choose your first look.</h2>
            <p className="ap-workflow-note">
              You have five complete prompts to try. Start with the photo you love most.
            </p>
            <div className="ap-vault-grid">
              {freebieCollections.map((collection, index) => {
                const card = collection.freeCard
                return (
                  <div key={card.id} className="ap-vault-item">
                    <PreviewCardEl
                      card={card}
                      collectionName={collection.name}
                      shotCount={collection.shotCount}
                      showAfterCopyOffer={index === 0}
                      upgradeHref={vaultPreviewCheckoutHref}
                      vaultPriceLabel={promptVaultPrice.label}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* 4. One paid invitation after the complete gift */}
      <section className="ap-section ap-vault-offer">
        <div className="ap-section-inner ap-vault-offer-inner">
          <p className="ap-eyebrow">WHEN YOU&apos;RE READY FOR MORE</p>
          <h2 className={`ap-section-title ${cormorant.className}`}>
            Get the complete SSELFIE Prompt Vault
          </h2>
          <p className="ap-vault-offer-body">
            These five prompts let you try one photo from five different SSELFIE collections. Inside
            the Prompt Vault, you get the complete collections so you can create photos that work
            together, plus the new prompt drops I add.
          </p>
          <TrackedLink
            href={vaultPreviewCheckoutHref}
            className="ap-bridge-cta ap-bridge-cta-primary"
            trackEvent="ai_prompts_prompt_vault_click"
            trackProperties={{
              source: "ai-prompts",
              destination: "checkout-prompt-vault",
              utm_campaign: "ai_prompts_to_prompt_vault",
              utm_content: "vault_preview_primary",
              checkout_source: "free_prompts_vault_bridge",
              cta_position: "after_free_prompts",
            }}
          >
            Get the full Prompt Vault · {promptVaultPrice.label}
          </TrackedLink>
          <p className="ap-vault-offer-note">
            One-time payment. Instant access. New prompt drops included.
          </p>
        </div>
      </section>

      {/* 5. Troubleshooting is available, but never blocks the one-click default path */}
      <section className="ap-section ap-starter">
        <div className="ap-section-inner">
          <p className="ap-eyebrow">IF THE PHOTO DOESN&apos;T LOOK LIKE YOU</p>
          <h2 className={`ap-section-title ${cormorant.className}`}>
            Try this before you create again.
          </h2>
          <p className="ap-starter-note">
            AI can sometimes change small facial details. Copy this line and paste it before the
            photo prompt on your next try. It reminds ChatGPT to use your selfie as the identity
            reference.
          </p>
          <div className="ap-starter-card">
            <p className="ap-starter-text">{REUSABLE_STARTER}</p>
            <div className="pc-copy-row">
              <CopyButton text={REUSABLE_STARTER} label="Copy identity line" />
            </div>
          </div>
        </div>
      </section>

      {/* 6. The Selfie Guide is still a separate free opt-in */}
      <section className="ap-section ap-bridge">
        <div className="ap-section-inner ap-bridge-inner">
          <h2 className={`ap-bridge-title ${cormorant.className}`}>
            Not getting the result you expected?
          </h2>
          <p className="ap-bridge-body">
            Your original selfie makes a big difference. My free Selfie Guide shows you the light,
            angle, and simple setup that helps AI create a more realistic result.
          </p>
          <TrackedLink
            href="/selfie-guide?utm_source=ai_prompts&utm_medium=prompt_pack&utm_campaign=ai_prompts_to_selfie_guide"
            className="ap-bridge-cta ap-bridge-cta-primary"
            trackEvent="ai_prompts_selfie_guide_click"
            trackProperties={{
              source: "ai-prompts",
              destination: "selfie-guide",
              utm_campaign: "ai_prompts_to_selfie_guide",
            }}
          >
            Get the Free Selfie Guide
          </TrackedLink>
        </div>
      </section>

      <style>{`
        html,
        body {
          background: #F8FAFA;
        }

        .ap-page {
          background: #F8FAFA;
          color: #0D0E10;
          min-height: 100vh;
        }

        .ap-hero {
          position: relative;
          min-height: 72vh;
          display: flex;
          align-items: flex-end;
          padding: 96px 24px 56px;
          overflow: hidden;
          background: #F8FAFA;
        }

        .ap-hero-image-wrap {
          position: absolute;
          inset: 0;
        }

        .ap-hero-image {
          object-fit: cover;
          object-position: 50% 16%;
        }

        .ap-hero-image-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(248, 250, 250, 0.96) 0%, rgba(248, 250, 250, 0.74) 42%, rgba(248, 250, 250, 0.28) 100%),
            linear-gradient(0deg, rgba(248, 250, 250, 0.90) 0%, rgba(248, 250, 250, 0.12) 55%);
        }

        .ap-hero-content {
          position: relative;
          z-index: 1;
          max-width: 680px;
          width: 100%;
        }

        .ap-hero-eyebrow {
          margin: 0 0 20px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.38em;
          color: #818283;
        }

        .ap-hero-title {
          margin: 0 0 18px;
          font-size: clamp(2.8rem, 9vw, 5.5rem);
          font-weight: 300;
          line-height: 0.96;
          letter-spacing: -0.02em;
          color: #0D0E10;
        }

        .ap-hero-sub {
          margin: 0 0 18px;
          font-size: clamp(0.95rem, 2.5vw, 1.05rem);
          line-height: 1.8;
          color: #4F5052;
          max-width: 520px;
        }

        .ap-hero-start {
          margin: 0 0 30px;
          max-width: 480px;
          font-size: 14px;
          line-height: 1.7;
          color: #4F5052;
        }

        .ap-hero-actions {
          margin-bottom: 28px;
        }

        .ap-hero-cta {
          display: inline-block;
          padding: 14px 24px;
          background: #0D0E10;
          color: #F8FAFA;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          text-decoration: none;
          transition: opacity 0.15s ease;
        }

        .ap-hero-cta:hover { opacity: 0.88; }

        .ap-section {
          padding: 72px 24px;
          border-top: 1px solid rgba(197, 198, 200, 0.35);
        }

        .ap-section-inner {
          max-width: 800px;
          margin: 0 auto;
        }

        .ap-eyebrow {
          margin: 0 0 14px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.4em;
          color: #818283;
        }

        .ap-eyebrow-new {
          color: #4F5052;
        }

        .ap-section-title {
          margin: 0 0 40px;
          font-size: clamp(1.8rem, 5vw, 2.8rem);
          font-weight: 300;
          line-height: 1.08;
          color: #0D0E10;
        }

        .ap-starter-note {
          margin: 0 0 24px;
          font-size: 15px;
          line-height: 1.75;
          color: #4F5052;
        }

        .ap-starter-card {
          border: 1px solid rgba(197, 198, 200, 0.35);
          border-radius: 16px;
          padding: 28px 28px 20px;
          background: #FFFFFF;
        }

        .ap-how-steps {
          display: grid;
          gap: 0;
          margin-bottom: 32px;
        }

        .ap-how-step {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 20px;
          padding: 24px 0;
          border-top: 1px solid rgba(13, 12, 11, 0.08);
        }

        .ap-how-step:last-child {
          border-bottom: 1px solid rgba(13, 12, 11, 0.08);
        }

        .ap-how-step span {
          color: #818283;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.24em;
        }

        .ap-how-step h3 {
          margin: 0 0 8px;
          color: #0D0E10;
          font-size: 15px;
          font-weight: 500;
          line-height: 1.4;
        }

        .ap-how-step p {
          margin: 0;
          color: #4F5052;
          font-size: 14px;
          line-height: 1.7;
        }

        .ap-how-cta {
          margin-bottom: 18px;
        }

        .ap-how-safety {
          margin: 0;
          max-width: 580px;
          font-size: 12px;
          line-height: 1.7;
          color: #818283;
        }

        .ap-starter-text {
          margin: 0 0 20px;
          font-size: 15px;
          line-height: 1.8;
          color: #4F5052;
        }

        .pc-copy-row {
          display: flex;
          justify-content: flex-end;
        }

        .copy-action {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .copy-btn {
          padding: 8px 18px;
          background: transparent;
          border: 1px solid rgba(197, 198, 200, 0.45);
          border-radius: 999px;
          color: #4F5052;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: inherit;
          transition: border-color 0.15s ease, color 0.15s ease;
        }

        .copy-btn:hover {
          border-color: rgba(13, 14, 16, 0.38);
          color: rgba(13, 14, 16, 0.72);
        }

        .copy-after-cta {
          width: 100%;
          margin-top: 22px;
          padding-top: 22px;
          border-top: 1px solid rgba(13, 12, 11, 0.1);
          text-align: left;
          animation: ap-copy-offer-reveal 260ms ease-out both;
        }

        .copy-after-title {
          margin: 0 0 10px;
          color: #0D0E10;
          font-size: 18px;
          font-weight: 400;
          line-height: 1.3;
        }

        .copy-after-note {
          max-width: 520px;
          margin: 0 0 18px;
          color: rgba(13, 12, 11, 0.64);
          font-size: 13px;
          line-height: 1.7;
        }

        .copy-after-link {
          display: flex;
          width: 100%;
          min-height: 46px;
          align-items: center;
          justify-content: center;
          padding: 13px 18px;
          background: #0D0E10;
          color: #F8FAFA;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.16em;
          line-height: 1.4;
          text-align: center;
          text-decoration: none;
          text-transform: uppercase;
          transition: opacity 0.15s ease;
        }

        .copy-after-link:hover {
          opacity: 0.82;
        }

        .copy-after-dismiss {
          margin: 14px 0 0;
          padding: 0;
          border: 0;
          background: transparent;
          color: rgba(13, 12, 11, 0.48);
          cursor: pointer;
          font-family: inherit;
          font-size: 11px;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .copy-after-footnote {
          margin: 12px 0 0;
          color: rgba(13, 12, 11, 0.42);
          font-size: 11px;
          line-height: 1.6;
        }

        @keyframes ap-copy-offer-reveal {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .copy-after-cta {
            animation: none;
          }
        }

        .ap-workflow-note {
          margin: -24px 0 36px;
          font-size: 15px;
          line-height: 1.8;
          color: #818283;
        }

        .ap-bridge {
          background: #FFFFFF;
          border-top: 1px solid rgba(197, 198, 200, 0.35);
        }

        .ap-bridge-inner {
          text-align: center;
          padding: 24px 0;
        }

        .ap-bridge-title {
          margin: 0 0 20px;
          font-size: clamp(2rem, 6vw, 3.2rem);
          font-weight: 300;
          line-height: 1.1;
          color: #0D0E10;
        }

        .ap-bridge-body {
          margin: 0 0 36px;
          font-size: 15px;
          line-height: 1.85;
          color: #4F5052;
          max-width: 540px;
          margin-left: auto;
          margin-right: auto;
        }

        .ap-bridge-cta {
          display: inline-block;
          text-decoration: none;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          transition: opacity 0.15s ease;
        }

        .ap-bridge-cta:hover { opacity: 0.82; }

        .ap-bridge-cta-primary {
          padding: 16px 32px;
          background: #0D0E10;
          color: #F8FAFA;
        }

        /* Five complete prompts */
        .ap-vault-grid {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        .ap-vault-item {
          display: flex;
          flex-direction: column;
        }

        .ap-vault-offer-inner {
          text-align: center;
        }

        .ap-vault-offer-body {
          max-width: 620px;
          margin: -22px auto 30px;
          color: #4F5052;
          font-size: 15px;
          line-height: 1.8;
        }

        .ap-vault-offer-note {
          margin: 16px 0 0;
          color: #818283;
          font-size: 12px;
          line-height: 1.7;
        }

        @media (min-width: 900px) {
          .ap-vault-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
        }

        @media (min-width: 640px) {
          .copy-after-link {
            display: inline-flex;
            width: auto;
          }
          .ap-hero {
            padding: 112px 48px 72px;
          }
          .ap-hero-image {
            object-position: 50% 20%;
          }
          .ap-section {
            padding: 88px 48px;
          }
          .ap-bridge {
            padding: 88px 48px;
          }
          .ap-bridge-inner {
            text-align: left;
          }
          .ap-bridge-body {
            margin-left: 0;
            margin-right: 0;
          }
        }

        @media (min-width: 900px) {
          .ap-hero {
            padding: 128px 72px 80px;
            min-height: 78vh;
          }
          .ap-section {
            padding: 96px 72px;
          }
          .ap-bridge {
            padding: 96px 72px;
          }
        }

        /* Editorial light refresh: the access page should feel like the email
           and the product itself, not a dark prompt database. */
        .ap-page {
          background: #F8FAFA;
          color: #0D0E10;
        }
        .ap-hero {
          background: #F8FAFA;
        }
        .ap-hero-title {
          letter-spacing: 0;
        }
        .ap-section,
        .ap-bridge {
          border-top-color: rgba(13, 12, 11, 0.08);
        }
        .ap-section {
          background: #F8FAFA;
        }
        .ap-vault-preview {
          background: #FFFFFF;
        }
        .ap-starter {
          background: #F8FAFA;
        }
        .ap-eyebrow {
          color: #818283;
        }
        .ap-section-title,
        .ap-bridge-title {
          color: #0D0E10;
          letter-spacing: 0;
        }
        .ap-workflow-note,
        .ap-starter-note,
        .ap-bridge-body {
          color: rgba(13, 12, 11, 0.64);
        }
        .ap-starter-card {
          background: #FFFFFF;
          border-color: rgba(197, 198, 200, 0.35);
          border-radius: 8px;
        }
        .ap-starter-text {
          color: rgba(13, 12, 11, 0.74);
        }
        .copy-btn {
          color: #0D0E10;
          border-color: rgba(197, 198, 200, 0.6);
          background: transparent;
        }
        .copy-btn:hover {
          color: #0D0E10;
          border-color: rgba(13, 14, 16, 0.42);
        }
        .ap-bridge-cta,
        .ap-bridge-cta-primary {
          background: #0D0E10;
          color: #F8FAFA;
          border-color: #0D0E10;
          border-radius: 0;
        }
        .ap-bridge {
          background: #FFFFFF;
        }
        .ap-preview-card {
          background: #FFFFFF;
          border: 1px solid rgba(197, 198, 200, 0.35);
          border-radius: 8px;
          overflow: hidden;
        }
        .ap-preview-image-wrap {
          background: #F8FAFA;
        }
        .ap-preview-image {
          display: block;
          width: 100%;
          height: auto;
          max-height: 520px;
          object-fit: cover;
          object-position: center top;
        }
        .ap-preview-body {
          padding: 24px 22px 22px;
        }
        .ap-preview-collection,
        .ap-preview-prompt summary {
          color: rgba(13, 12, 11, 0.42);
        }
        .ap-preview-collection,
        .ap-preview-prompt summary {
          display: block;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
        }
        .ap-preview-collection {
          margin: 0;
        }
        .ap-preview-title {
          margin: 10px 0 12px;
          color: #0D0E10;
          font-size: clamp(1.6rem, 6vw, 2.3rem);
          font-weight: 300;
          line-height: 1.04;
          letter-spacing: 0;
        }
        .ap-preview-when {
          margin: 0 0 14px;
          color: rgba(13, 12, 11, 0.64);
          font-size: 14px;
          line-height: 1.7;
        }
        .ap-preview-included {
          margin: 20px 0 0;
          padding-top: 16px;
          border-top: 1px solid rgba(13, 12, 11, 0.08);
          color: rgba(13, 12, 11, 0.48);
          font-size: 11px;
          line-height: 1.6;
        }
        .ap-preview-prompt {
          margin: 0 0 18px;
          border-top: 1px solid rgba(13, 12, 11, 0.08);
          padding-top: 16px;
        }
        .ap-preview-prompt summary {
          cursor: pointer;
          list-style: none;
        }
        .ap-preview-prompt summary::-webkit-details-marker {
          display: none;
        }
        .ap-preview-prompt p {
          margin: 14px 0 0;
          color: rgba(13, 12, 11, 0.7);
          font-size: 13px;
          line-height: 1.75;
        }
      `}</style>
    </main>
  )
}
