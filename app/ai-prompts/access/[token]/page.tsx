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
import { SuiteDoor } from "@/components/marketing/suite-door"
import { buildPromptVaultFreebieCheckoutHref } from "@/lib/revenue-engine/prompt-vault-freebie-checkout-url"
import {
  REUSABLE_STARTER,
  FREEBIE_ROTATING_DROP_LIMIT,
  getStaticVaultFreebieCollections,
  selectLatestFreebieShootCollections,
  type PromptCard,
} from "@/lib/ai-prompts/prompt-data"
import { getPublishedFreebieCollectionPreviews } from "@/lib/vault/published-collections"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

export const metadata: Metadata = {
  title: "Your AI Photoshoot Preview · SSELFIE",
  description:
    "Your updated AI photoshoot preview: one selfie, cinematic transformations, and first shots from the SSELFIE Vault.",
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
  upgradeHref,
}: {
  card: PromptCard
  collectionName: string
  shotCount: number
  upgradeHref?: string
}) {
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
        <span className="ap-preview-number">{card.number}</span>
        <p className="ap-preview-gap">
          Shot 1 of {shotCount} · {collectionName}
        </p>
        <h3 className={`ap-preview-title ${cormorant.className}`}>{card.title}</h3>
        <p className="ap-preview-when">{card.whenToUse}</p>
        <p className="ap-preview-mood">{card.mood}</p>
        <details className="ap-preview-prompt">
          <summary>Read prompt</summary>
          <p>{card.prompt}</p>
        </details>
        <div className="pc-copy-row">
          <CopyButton
            text={card.prompt}
            promptTitle={card.title}
            promptNumber={card.number}
            afterCopyHref={upgradeHref}
            afterCopyTitle="That was just the opening shot."
            afterCopyLabel="Get the full Vault · $27"
            afterCopyNote="Every look in the Vault is a full shoot: matching shots that belong together, like a real shoot day, with you recognizable in every frame. You get every collection, plus each new drop I add."
            afterCopyFootnote="One payment. Yours for good."
            afterCopyViewEvent="ai_prompts_after_copy_vault_cta_view"
            afterCopyTrackEvent="ai_prompts_prompt_vault_click"
            afterCopyTrackProperties={{
              source: "ai-prompts",
              destination: "checkout-prompt-vault",
              utm_campaign: "ai_prompts_to_prompt_vault",
              utm_content: `copy_${card.id}`,
              checkout_source: "after_copy_prompt_cta",
              cta_position: "after_copy",
              prompt_id: card.id,
              prompt_title: card.title,
            }}
          />
        </div>
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
  const lockedTileCount = freebieCollections.reduce(
    (total, collection) => total + collection.lockedShots.length,
    0
  )

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
  // Never awaited — failure must not delay or block the page render.
  logAnalyticsEvent({
    eventName: "ai_prompts_access_opened",
    path: "/ai-prompts/access/[token]",
    properties: {
      source: "ai-prompts",
      token_prefix: token.slice(0, 8),
      subscriber_source: result.valid ? result.subscriberSource : "admin_override",
    },
  }).catch(() => {})

  if (lockedTileCount > 0) {
    logAnalyticsEvent({
      eventName: "ai_prompts_locked_vault_tiles_view",
      path: "/ai-prompts/access/[token]",
      properties: {
        source: "ai-prompts",
        token_prefix: token.slice(0, 8),
        collection_count: freebieCollections.length,
        locked_tile_count: lockedTileCount,
      },
    }).catch(() => {})
  }

  const vaultPreviewCheckoutHref = buildPromptVaultFreebieCheckoutHref({
    promptId: "vault_preview",
    accessToken: token,
  })
  const bottomBridgeCheckoutHref = buildPromptVaultFreebieCheckoutHref({
    promptId: "bottom_bridge",
    accessToken: token,
  })

  return (
    <main className={`ap-page ${inter.className}`}>
      {/* 1. Hero */}
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
          <p className="ap-hero-eyebrow">SSELFIE · SELFIE TO BRAND SHOOT</p>
          <h1 className={`ap-hero-title ${cormorant.className}`}>
            Your Updated Photoshoot Preview.
          </h1>
          <p className="ap-hero-sub">
            Start with the newest SSELFIE shoot previews. Pick a visual identity, copy the prompt,
            upload one selfie, and see which version of you feels most like you.
          </p>
          {heroCollection && (
            <p className="ap-hero-current">Newest Vault world: {heroCollection.name}</p>
          )}
          <div className="ap-hero-actions">
            <a href="#vault-preview" className="ap-hero-cta">
              Open the Preview
            </a>
          </div>
          <p className="ap-hero-safety">
            Use your own photo or a photo you have permission to edit. AI can still change small
            facial details, so check the result before you post.
          </p>
        </div>
      </section>

      {/* 2. Updated Vault preview — the core experience (moved directly under hero) */}
      {freebieCollections.length > 0 && (
        <section id="vault-preview" className="ap-section ap-vault-preview">
          <div className="ap-section-inner">
            <p className="ap-eyebrow ap-eyebrow-new">UPDATED PREVIEW</p>
            <h2 className={`ap-section-title ${cormorant.className}`}>
              The latest five shoot previews.
            </h2>
            <p className="ap-workflow-note">
              These are the newest free looks to test before you buy. Each one gives you a different
              visual direction from one selfie. The complete shoot library lives inside the Vault.
            </p>
            <div className="ap-vault-grid">
              {freebieCollections.map(collection => {
                const card = collection.freeCard
                const upgradeHref = buildPromptVaultFreebieCheckoutHref({
                  promptId: card.id,
                  accessToken: token,
                })
                return (
                  <div key={card.id} className="ap-vault-item">
                    <PreviewCardEl
                      card={card}
                      collectionName={collection.name}
                      shotCount={collection.shotCount}
                      upgradeHref={upgradeHref}
                    />
                    {collection.lockedShots.length > 0 && (
                      <div className="ap-thumb-wrap">
                        <p className="ap-thumb-note">
                          <span className="ap-thumb-yours-label">
                            Shot 1 of {collection.shotCount} is yours.
                          </span>{" "}
                          {collection.shotCount - 1} more shots are inside this collection.
                        </p>
                        <div
                          className="ap-locked-grid"
                          aria-label={`Locked shots in ${collection.name}`}
                        >
                          {collection.lockedShots.map((shot, index) => (
                            <TrackedLink
                              key={`${card.id}-${index}`}
                              href={upgradeHref}
                              className="ap-locked-tile"
                              trackEvent="ai_prompts_locked_vault_tile_click"
                              trackProperties={{
                                source: "ai-prompts",
                                destination: "checkout-prompt-vault",
                                utm_campaign: "ai_prompts_to_prompt_vault",
                                utm_content: `locked_${card.id}_${index + 2}`,
                                checkout_source: "free_prompt_locked_tile",
                                cta_position: "locked_tile",
                                prompt_id: card.id,
                                prompt_title: card.title,
                                collection_name: collection.name,
                                locked_shot_title: shot.title,
                                locked_shot_number: String(index + 2),
                              }}
                            >
                              <span className="ap-lock-badge">In the Vault</span>
                              {shot.exampleImage && (
                                <Image
                                  src={shot.exampleImage}
                                  alt=""
                                  fill
                                  sizes="(min-width: 900px) 120px, 42vw"
                                  className="ap-locked-image"
                                  aria-hidden
                                />
                              )}
                              <span className="ap-locked-shade" />
                              <span className="ap-locked-title">{shot.title}</span>
                            </TrackedLink>
                          ))}
                        </div>
                        <TrackedLink
                          href={upgradeHref}
                          className="ap-shoot-cta"
                          trackEvent="ai_prompts_prompt_vault_click"
                          trackProperties={{
                            source: "ai-prompts",
                            destination: "checkout-prompt-vault",
                            utm_campaign: "ai_prompts_to_prompt_vault",
                            utm_content: `shoot_${card.id}`,
                            checkout_source: "free_prompt_shoot_cta",
                            cta_position: "shoot_preview",
                            prompt_id: card.id,
                            prompt_title: card.title,
                            collection_name: collection.name,
                          }}
                        >
                          Unlock all {collection.shotCount} shots · $27
                        </TrackedLink>
                        <p className="ap-shoot-cta-note">
                          One-time access to the rest of this shoot, the full Vault, and future
                          photoshoots.
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="ap-vault-cta-row">
              <TrackedLink
                href={vaultPreviewCheckoutHref}
                className="ap-bridge-cta ap-bridge-cta-primary"
                trackEvent="ai_prompts_prompt_vault_click"
                trackProperties={{
                  source: "ai-prompts",
                  destination: "checkout-prompt-vault",
                  utm_campaign: "ai_prompts_to_prompt_vault",
                  utm_content: "vault_preview",
                  checkout_source: "free_prompts_bridge",
                }}
              >
                Get the Full Vault + Future Drops · $27
              </TrackedLink>
            </div>
          </div>
        </section>
      )}

      {/* 1b. Seven-minute value test */}
      <section className="ap-section ap-first-test">
        <div className="ap-section-inner">
          <p className="ap-eyebrow">SELFIE TO BRAND SHOOT</p>
          <h2 className={`ap-section-title ${cormorant.className}`}>
            Try one opening shot before you decide.
          </h2>
          <p className="ap-workflow-note ap-first-test-note">
            The free preview is meant to prove the transformation quickly. Pick one visual world
            below, upload a clear selfie into ChatGPT, copy Shot 1, and see if you want the full
            shoot sequence.
          </p>
          <div className="ap-test-steps">
            <div className="ap-test-step">
              <span>01</span>
              <p>Choose the version of you that feels the most magnetic today.</p>
            </div>
            <div className="ap-test-step">
              <span>02</span>
              <p>Copy the opening-shot prompt and paste it into ChatGPT with your selfie.</p>
            </div>
            <div className="ap-test-step">
              <span>03</span>
              <p>
                If the result works, unlock the remaining shots, newest drops, and future
                photoshoots.
              </p>
            </div>
          </div>
          <a href="#vault-preview" className="ap-bridge-cta ap-bridge-cta-primary ap-test-cta">
            Start With Shot 1
          </a>
        </div>
      </section>

      {/* 2. Before you start */}
      <section className="ap-section ap-before">
        <div className="ap-section-inner">
          <p className="ap-eyebrow">BEFORE YOU START</p>
          <ul className="ap-before-list">
            <li>Use your own photo or a photo you have permission to edit.</li>
            <li>
              Choose a clear selfie with your face visible. Sunglasses and heavy shadows give AI
              less to work with.
            </li>
            <li>
              Better light in the original means a better result. A blurry photo produces a blurry
              AI version.
            </li>
            <li>Copy one prompt at a time. Run it. Check the result before posting.</li>
            <li>
              If the AI changes your face too much, start your next attempt with the Reusable
              Starter Line below.
            </li>
          </ul>
        </div>
      </section>

      {/* 3. Reusable starter line */}
      <section className="ap-section ap-starter">
        <div className="ap-section-inner">
          <p className="ap-eyebrow">PASTE THIS FIRST</p>
          <h2 className={`ap-section-title ${cormorant.className}`}>Your anchor prompt.</h2>
          <p className="ap-starter-note">
            Add this before any other prompt if the AI is drifting too far from your face. You can
            also use it on its own.
          </p>
          <div className="ap-starter-card">
            <p className="ap-starter-text">{REUSABLE_STARTER}</p>
            <div className="pc-copy-row">
              <CopyButton text={REUSABLE_STARTER} />
            </div>
          </div>
        </div>
      </section>

      {/* 9. Bridge to Free Selfie Guide */}
      <section className="ap-section ap-bridge">
        <div className="ap-section-inner ap-bridge-inner">
          <h2 className={`ap-bridge-title ${cormorant.className}`}>
            The better the original selfie, the better the AI result.
          </h2>
          <p className="ap-bridge-body">
            If your photo is dark, blurry, or awkward, AI has less to work with. The Free Selfie
            Guide shows you the light, angles, and simple setup that make every prompt work better.
            It is free.
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

      {/* 10. Optional separate next step — not the primary Prompt Vault upgrade */}
      <section className="ap-section ap-kit-bridge">
        <div className="ap-section-inner">
          <p className="ap-kit-question">Want the whole shoot, not just the sample?</p>
          <p className="ap-kit-body">
            The free prompts are the taste. The Vault gives you the full shoot sequences, newest
            drops, and future SSELFIE photoshoots with complete image directions.
          </p>
          <TrackedLink
            href={bottomBridgeCheckoutHref}
            className="ap-bridge-cta ap-bridge-cta-secondary"
            trackEvent="ai_prompts_prompt_vault_click"
            trackProperties={{
              source: "ai-prompts",
              destination: "checkout-prompt-vault",
              utm_campaign: "ai_prompts_to_prompt_vault",
              utm_content: "bottom_bridge",
              checkout_source: "free_prompts_bridge",
            }}
          >
            Enter the Full Vault · $27
          </TrackedLink>
        </div>
      </section>

      {/* 11. The SUITE door — the membership invitation, after she's seen everything free. */}
      <SuiteDoor
        eyebrow="When you're ready"
        title="Ready to become her?"
        body="Prompts are the manual way. SSELFIE SUITE is your own AI creative director. Her name is Maya. You upload your selfies once, and she creates brand-shoot photos that actually look like you, tells you what to post, and plans your feed. The same you in every post. That's when a feed starts feeling like a brand."
        bullets={[
          "Your face, kept. Maya works from your real selfies, not a pasted prompt.",
          "Photoshoot-level photos every month, without booking a photographer.",
          "Never wonder what to post. Maya plans it with you.",
        ]}
        ctaLabel="See SSELFIE SUITE"
        href="/join/studio?source=suite_door_free_prompts&utm_source=ai_prompts&utm_medium=prompt_pack&utm_campaign=suite_door&utm_content=free_access_page"
        footnote="Monthly membership · cancel anytime · your photos are yours to keep"
        placement="free_prompts_access"
        serifClassName={cormorant.className}
      />

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
          object-position: center center;
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

        .ap-hero-current {
          margin: 0 0 32px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
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

        .ap-hero-safety {
          margin: 0;
          font-size: 12px;
          line-height: 1.7;
          color: #818283;
          max-width: 460px;
        }

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

        .ap-before-list {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .ap-before-list li {
          padding: 16px 0;
          font-size: 15px;
          line-height: 1.75;
          color: #4F5052;
          border-bottom: 1px solid rgba(197, 198, 200, 0.35);
        }

        .ap-before-list li:first-child { padding-top: 0; }
        .ap-before-list li:last-child { border-bottom: none; }

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

        .ap-first-test {
          background: #f8fafa;
        }

        .ap-path {
          background: #FFFFFF;
        }

        .ap-path-inner {
          display: grid;
          gap: 28px;
        }

        .ap-path-steps {
          display: grid;
          gap: 1px;
          background: rgba(197, 198, 200, 0.35);
          border: 1px solid rgba(197, 198, 200, 0.35);
        }

        .ap-path-step {
          background: #FFFFFF;
          padding: 22px 20px;
        }

        .ap-path-step span {
          display: block;
          margin-bottom: 22px;
          color: #818283;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.22em;
        }

        .ap-path-step h3 {
          margin: 0 0 8px;
          color: #0D0E10;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }

        .ap-path-step p {
          margin: 0;
          color: #4F5052;
          font-size: 14px;
          line-height: 1.7;
        }

        .ap-first-test-note {
          margin-bottom: 28px;
        }

        .ap-test-steps {
          display: grid;
          gap: 10px;
          margin-bottom: 28px;
        }

        .ap-test-step {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 16px;
          align-items: start;
          padding: 18px 0;
          border-top: 1px solid rgba(13, 12, 11, 0.08);
        }

        .ap-test-step:last-child {
          border-bottom: 1px solid rgba(13, 12, 11, 0.08);
        }

        .ap-test-step span {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.24em;
          color: rgba(13, 12, 11, 0.42);
        }

        .ap-test-step p {
          margin: 0;
          font-size: 14px;
          line-height: 1.7;
          color: rgba(13, 12, 11, 0.66);
        }

        .ap-test-cta {
          border-radius: 0;
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
          margin-top: 14px;
          padding: 20px;
          border: 1px solid #0D0E10;
          background: #0D0E10;
          border-radius: 8px;
          text-align: left;
        }

        .copy-after-title {
          margin: 0 0 8px;
          color: #F8FAFA;
          font-size: 15px;
          font-weight: 500;
          line-height: 1.35;
        }

        .copy-after-note {
          margin: 0 0 14px;
          font-size: 13px;
          line-height: 1.6;
          color: rgba(248, 250, 250, 0.72);
        }

        .copy-after-link {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          padding: 12px 16px;
          background: #F8FAFA;
          color: #0D0E10;
          text-align: center;
          text-decoration: none;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          line-height: 1.35;
          text-transform: uppercase;
        }

        .copy-after-dismiss {
          display: block;
          margin: 10px auto 0;
          padding: 4px 8px;
          border: 0;
          background: none;
          color: rgba(248, 250, 250, 0.6);
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-decoration: underline;
          text-underline-offset: 3px;
          cursor: pointer;
        }

        .copy-after-dismiss:hover {
          color: rgba(248, 250, 250, 0.85);
        }

        .copy-after-footnote {
          margin: 10px 0 0;
          color: rgba(248, 250, 250, 0.6);
          font-size: 11px;
          line-height: 1.55;
        }

        .ap-workflow-note {
          margin: -24px 0 36px;
          font-size: 15px;
          line-height: 1.8;
          color: #818283;
        }

        .ap-vault-cta-row {
          margin-top: 34px;
          text-align: center;
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

        .ap-bridge-cta-secondary {
          padding: 14px 28px;
          border: 1px solid rgba(197, 198, 200, 0.55);
          color: #4F5052;
        }

        .ap-kit-bridge {
          border-top: 1px solid rgba(197, 198, 200, 0.35);
        }

        /* Vault grid */
        .ap-vault-grid {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        /* Each vault item = prompt card + thumbnail strip stacked */
        .ap-vault-item {
          display: flex;
          flex-direction: column;
        }

        .ap-thumb-wrap {
          margin-top: 0;
          padding: 18px 28px 22px;
          background: #FFFFFF;
          border: 1px solid rgba(197, 198, 200, 0.35);
          border-top: none;
          border-radius: 0 0 18px 18px;
        }

        .ap-thumb-note {
          margin: 0 0 14px;
          font-size: 11px;
          line-height: 1.65;
          color: #818283;
          letter-spacing: 0.02em;
        }

        .ap-thumb-yours-label {
          color: #4F5052;
          font-weight: 500;
        }

        .ap-locked-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .ap-locked-tile {
          position: relative;
          min-width: 0;
          aspect-ratio: 4 / 5;
          overflow: hidden;
          border: 1px solid rgba(197, 198, 200, 0.42);
          background: #F8FAFA;
          color: #F8FAFA;
          text-decoration: none;
          isolation: isolate;
        }

        .ap-locked-image {
          object-fit: cover;
          object-position: center top;
          filter: blur(1.5px) saturate(0.82);
          transform: scale(1.04);
        }

        .ap-locked-shade {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(13, 14, 16, 0.28),
            rgba(13, 14, 16, 0.74)
          );
          z-index: 1;
        }

        .ap-lock-badge {
          position: absolute;
          top: 8px;
          left: 8px;
          right: 8px;
          z-index: 2;
          width: fit-content;
          max-width: calc(100% - 16px);
          padding: 5px 7px;
          border: 1px solid rgba(248, 250, 250, 0.52);
          background: rgba(13, 14, 16, 0.48);
          color: #F8FAFA;
          font-size: 8px;
          font-weight: 600;
          letter-spacing: 0.16em;
          line-height: 1.2;
          text-transform: uppercase;
        }

        .ap-locked-title {
          position: absolute;
          left: 9px;
          right: 9px;
          bottom: 9px;
          z-index: 2;
          color: #F8FAFA;
          font-size: 11px;
          font-weight: 500;
          line-height: 1.32;
          overflow-wrap: anywhere;
        }

        .ap-locked-tile:hover .ap-locked-image {
          filter: blur(0.5px) saturate(0.9);
          transform: scale(1.02);
        }

        .ap-shoot-cta {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          margin-top: 16px;
          padding: 13px 18px;
          background: #0D0E10;
          border: 1px solid #0D0E10;
          color: #F8FAFA;
          text-align: center;
          text-decoration: none;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          line-height: 1.35;
          text-transform: uppercase;
          transition: opacity 0.15s ease;
        }

        .ap-shoot-cta:hover {
          opacity: 0.84;
        }

        .ap-shoot-cta-note {
          margin: 10px 0 0;
          font-size: 11px;
          line-height: 1.55;
          color: #818283;
          text-align: center;
        }

        @media (min-width: 900px) {
          .ap-vault-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .ap-locked-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        .ap-kit-question {
          margin: 0 0 10px;
          font-size: 14px;
          font-weight: 500;
          color: #818283;
        }

        .ap-kit-body {
          margin: 0 0 28px;
          font-size: 15px;
          line-height: 1.78;
          color: #4F5052;
          max-width: 520px;
        }

        @media (min-width: 640px) {
          .ap-hero {
            padding: 112px 48px 72px;
          }
          .ap-section {
            padding: 88px 48px;
          }
          .ap-bridge {
            padding: 88px 48px;
          }
          .ap-kit-bridge {
            padding: 72px 48px;
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
          .ap-kit-bridge {
            padding: 80px 72px;
          }
          .ap-path-inner {
            max-width: 1080px;
            grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
            align-items: start;
            gap: 68px;
          }
          .ap-path-steps {
            grid-template-columns: repeat(3, 1fr);
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
        .ap-bridge,
        .ap-kit-bridge {
          border-top-color: rgba(13, 12, 11, 0.08);
        }
        .ap-section {
          background: #F8FAFA;
        }
        .ap-vault-preview {
          background: #FFFFFF;
        }
        .ap-before,
        .ap-starter,
        .ap-kit-bridge {
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
        .ap-before-list li,
        .ap-bridge-body,
        .ap-kit-body {
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
        .ap-thumb-note,
        .ap-kit-question {
          color: rgba(13, 12, 11, 0.48);
        }
        .ap-thumb-wrap {
          background: #FFFFFF;
          border-color: rgba(197, 198, 200, 0.35);
          border-radius: 0 0 8px 8px;
        }
        .ap-thumb-yours-label {
          color: rgba(13, 12, 11, 0.7);
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
        .copy-after-cta {
          border-color: #0D0E10;
          background: #0D0E10;
        }
        .copy-after-note {
          color: rgba(248, 250, 250, 0.72);
        }
        .copy-after-title {
          color: #F8FAFA;
        }
        .copy-after-link {
          background: #F8FAFA;
          color: #0D0E10;
        }
        .copy-after-footnote {
          color: rgba(248, 250, 250, 0.6);
        }
        .ap-bridge-cta,
        .ap-bridge-cta-primary,
        .ap-bridge-cta-secondary {
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
          border-radius: 8px 8px 0 0;
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
        .ap-preview-number,
        .ap-preview-gap,
        .ap-preview-mood,
        .ap-preview-prompt summary {
          color: rgba(13, 12, 11, 0.42);
        }
        .ap-preview-number,
        .ap-preview-prompt summary {
          display: block;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
        }
        .ap-preview-gap {
          margin: 8px 0 0;
          font-size: 11px;
          line-height: 1.45;
          color: rgba(13, 12, 11, 0.52);
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
        .ap-preview-mood {
          margin: 0 0 18px;
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
