import fs from "node:fs"
import path from "node:path"
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
import {
  REUSABLE_STARTER,
  MAIN_LOOKS,
  BONUS_LOOKS,
  WORKFLOW_PROMPTS,
  FREEBIE_COLLECTION_PREVIEWS,
  VAULT_COLLECTION_META,
  type PromptCard,
} from "@/lib/ai-prompts/prompt-data"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

const HERO_IMAGE = path.join(process.cwd(), "public", "images", "ai-prompts", "ai-prompts-hero.jpg")

export const metadata: Metadata = {
  title: "Your ChatGPT Selfie Prompts · SSELFIE",
  description: "Your updated AI photoshoot preview: one selfie, cinematic transformations, and first shots from the SSELFIE Vault.",
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

// ---------------------------------------------------------------------------
// Prompt card component (server — CopyButton is the only client leaf)
// ---------------------------------------------------------------------------

function PromptCardEl({ card, isWorkflow }: { card: PromptCard; isWorkflow?: boolean }) {
  return (
    <article id={card.id} className={`pc ${isWorkflow ? "pc-workflow" : ""}`}>
      {card.exampleImage && (
        <div className="pc-example-image-wrap">
          <Image
            src={card.exampleImage}
            alt={`Example result for ${card.title}`}
            width={600}
            height={900}
            className="pc-example-image"
          />
        </div>
      )}
      <div className="pc-header">
        <span className="pc-number">{card.number}</span>
        <h3 className={`pc-title ${cormorant.className}`}>{card.title}</h3>
      </div>
      <p className="pc-when-label">When to use it</p>
      <p className="pc-when">{card.whenToUse}</p>
      <p className="pc-mood">{card.mood}</p>
      <div className="pc-prompt-wrap">
        <p className="pc-prompt-text">{card.prompt}</p>
        <div className="pc-copy-row">
          <CopyButton text={card.prompt} promptTitle={card.title} promptNumber={card.number} />
        </div>
      </div>
    </article>
  )
}

function PreviewCardEl({ card }: { card: PromptCard }) {
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
        <h3 className={`ap-preview-title ${cormorant.className}`}>{card.title}</h3>
        <p className="ap-preview-when">{card.whenToUse}</p>
        <p className="ap-preview-mood">{card.mood}</p>
        <details className="ap-preview-prompt">
          <summary>Read prompt</summary>
          <p>{card.prompt}</p>
        </details>
        <div className="pc-copy-row">
          <CopyButton text={card.prompt} promptTitle={card.title} promptNumber={card.number} />
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
  const hasHeroImage = fs.existsSync(HERO_IMAGE)
  const result = await validateToken(token)
  const adminOverride = !result.valid ? await isCurrentUserAdmin() : false

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
            Get the prompt pack
          </Link>
        </div>
        <style>{`
          .ap-page {
            background: #0a0a0a;
            color: #f5f5f5;
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
            color: rgba(245, 245, 245, 0.32);
          }
          .ap-invalid-headline {
            margin: 0 0 16px;
            font-size: clamp(2rem, 7vw, 3rem);
            font-weight: 300;
            line-height: 1.1;
            color: #f5f5f5;
          }
          .ap-invalid-body {
            margin: 0 0 36px;
            font-size: 15px;
            line-height: 1.8;
            color: rgba(245, 245, 245, 0.54);
          }
          .ap-invalid-cta {
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

  return (
    <main className={`ap-page ${inter.className}`}>
      {/* 1. Hero */}
      <section className="ap-hero">
        {hasHeroImage && (
          <div className="ap-hero-image-wrap" aria-hidden="true">
            <Image
              src="/images/ai-prompts/ai-prompts-hero.jpg"
              alt=""
              fill
              className="ap-hero-image"
              priority
            />
            <div className="ap-hero-image-overlay" />
          </div>
        )}
        <div className="ap-hero-content">
          <p className="ap-hero-eyebrow">SSELFIE · CHATGPT SELFIE PROMPT PACK</p>
          <h1 className={`ap-hero-title ${cormorant.className}`}>
            Your Updated Photoshoot Preview.
          </h1>
          <p className="ap-hero-sub">
            Shot 1 from every Vault collection is here. Pick a visual identity, copy the
            prompt, upload one selfie, and see which version of you feels the most alive.
          </p>
          <div className="ap-hero-actions">
            <a href="#vault-preview" className="ap-hero-cta">
              Open the Preview
            </a>
          </div>
          <p className="ap-hero-safety">
            Use your own photo or a photo you have permission to edit. AI can still change
            small facial details, so check the result before you post.
          </p>
        </div>
      </section>

      {/* 2. Updated Vault preview — the core experience */}
      {FREEBIE_COLLECTION_PREVIEWS.length > 0 && (
        <section id="vault-preview" className="ap-section ap-vault-preview">
          <div className="ap-section-inner">
            <p className="ap-eyebrow ap-eyebrow-new">UPDATED PREVIEW</p>
            <h2 className={`ap-section-title ${cormorant.className}`}>
              Shot 1 from every photoshoot collection.
            </h2>
            <p className="ap-workflow-note">
              These are the opening shots from the full Vault. Each one gives you a different
              visual identity from one selfie. The complete shoot directions are inside the Vault.
            </p>
            <div className="ap-vault-grid">
              {FREEBIE_COLLECTION_PREVIEWS.map((card) => {
                const meta = VAULT_COLLECTION_META.find((m) => m.previewCardId === card.id)
                return (
                  <div key={card.id} className="ap-vault-item">
                    <PreviewCardEl card={card} />
                    {meta && (
                      <div className="ap-thumb-wrap">
                        <div className="ap-thumb-row">
                          {meta.thumbnails.map((src, i) => (
                            <div
                              key={i}
                              className={`ap-thumb-item ${i === 0 ? "ap-thumb-item-yours" : "ap-thumb-item-locked"}`}
                            >
                              <Image
                                src={src}
                                alt=""
                                fill
                                sizes="64px"
                                style={{ objectFit: "cover", objectPosition: "center top" }}
                                aria-hidden
                              />
                            </div>
                          ))}
                        </div>
                        <p className="ap-thumb-note">
                          <span className="ap-thumb-yours-label">Shot 1 of {meta.shotCount} is yours.</span>
                          {" "}{meta.shotCount - 1} more shots in the Vault.
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="ap-vault-cta-row">
              <TrackedLink
                href="/prompt-vault?source=ai_prompts_access&utm_source=ai_prompts&utm_medium=prompt_pack&utm_campaign=ai_prompts_to_prompt_vault&utm_content=vault_preview&checkout_source=free_prompts_bridge&buyer_stage=lead"
                className="ap-bridge-cta ap-bridge-cta-primary"
                trackEvent="ai_prompts_prompt_vault_click"
                trackProperties={{
                  source: "ai-prompts",
                  destination: "prompt-vault",
                  utm_campaign: "ai_prompts_to_prompt_vault",
                }}
              >
                Get the Full Photoshoot Vault · $27
              </TrackedLink>
            </div>
          </div>
        </section>
      )}

      {/* 2. Before you start */}
      <section className="ap-section ap-before">
        <div className="ap-section-inner">
          <p className="ap-eyebrow">BEFORE YOU START</p>
          <ul className="ap-before-list">
            <li>Use your own photo or a photo you have permission to edit.</li>
            <li>
              Choose a clear selfie with your face visible. Sunglasses and heavy shadows
              give AI less to work with.
            </li>
            <li>
              Better light in the original means a better result. A blurry photo produces
              a blurry AI version.
            </li>
            <li>Copy one prompt at a time. Run it. Check the result before posting.</li>
            <li>
              If the AI changes your face too much, start your next attempt with the
              Reusable Starter Line below.
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
            Add this before any other prompt if the AI is drifting too far from your face.
            You can also use it on its own.
          </p>
          <div className="ap-starter-card">
            <p className="ap-starter-text">{REUSABLE_STARTER}</p>
            <div className="pc-copy-row">
              <CopyButton text={REUSABLE_STARTER} />
            </div>
          </div>
        </div>
      </section>

      {/* 4→7. Vault preview moved — now appears after free content below */}

      <section className="ap-section ap-bonus-section">
        <div className="ap-section-inner">
          <details className="ap-bonus-library">
            <summary>
              <span className="ap-eyebrow">BONUS PROMPT LIBRARY</span>
              <span className={`ap-section-title ap-summary-title ${cormorant.className}`}>
                Extra prompts for experimenting.
              </span>
              <span className="ap-workflow-note ap-summary-note">
                These are support prompts from the original free pack. Start with the visual
                photoshoot previews above; open this library when you want more variations.
              </span>
            </summary>

            <div className="ap-bonus-content">
              <div className="ap-bonus-group">
                <p className="ap-eyebrow">EXTRA LOOKS</p>
                <h2 className={`ap-section-title ${cormorant.className}`}>
                  More transformations to test.
                </h2>
                <div className="ap-cards ap-main-grid">
                  {MAIN_LOOKS.map((card) => (
                    <PromptCardEl key={card.id} card={card} />
                  ))}
                </div>
              </div>

              <div className="ap-bonus-group">
                <p className="ap-eyebrow">BONUS LOOKS</p>
                <h2 className={`ap-section-title ${cormorant.className}`}>
                  Specific moments and quick variations.
                </h2>
                <div className="ap-cards">
                  {BONUS_LOOKS.map((card) => (
                    <PromptCardEl key={card.id} card={card} />
                  ))}
                </div>
              </div>

              <div className="ap-bonus-group">
                <p className="ap-eyebrow">SSELFIE WORKFLOW</p>
                <h2 className={`ap-section-title ${cormorant.className}`}>
                  Make the photo useful for content.
                </h2>
                <p className="ap-workflow-note">
                  These do not change how you look. They help you understand your photo,
                  edit it, caption it, and turn it into a content plan.
                </p>
                <div className="ap-cards">
                  {WORKFLOW_PROMPTS.map((card) => (
                    <PromptCardEl key={card.id} card={card} isWorkflow />
                  ))}
                </div>
              </div>
            </div>
          </details>
        </div>
      </section>

      {/* 9. Bridge to Free Selfie Guide */}
      <section className="ap-section ap-bridge">
        <div className="ap-section-inner ap-bridge-inner">
          <h2 className={`ap-bridge-title ${cormorant.className}`}>
            The better the original selfie, the better the AI result.
          </h2>
          <p className="ap-bridge-body">
            If your photo is dark, blurry, or awkward, AI has less to work with. The Free
            Selfie Guide shows you the light, angles, and simple setup that make every
            prompt work better. It is free.
          </p>
          <TrackedLink
            href="/selfie-guide?utm_source=ai_prompts&utm_medium=prompt_pack&utm_campaign=ai_prompts_to_selfie_guide"
            className="ap-bridge-cta ap-bridge-cta-primary"
            trackEvent="ai_prompts_selfie_guide_click"
            trackProperties={{ source: "ai-prompts", destination: "selfie-guide", utm_campaign: "ai_prompts_to_selfie_guide" }}
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
            The free prompts are the taste. The Vault gives you the full transformation system:
            Dark Balcony, Coastal White, Marble Café, Denim Street, and Cozy Mirror with complete image directions.
          </p>
          <TrackedLink
            href="/prompt-vault?source=ai_prompts_access&utm_source=ai_prompts&utm_medium=prompt_pack&utm_campaign=ai_prompts_to_prompt_vault&utm_content=bottom_bridge&checkout_source=free_prompts_bridge&buyer_stage=lead"
            className="ap-bridge-cta ap-bridge-cta-secondary"
            trackEvent="ai_prompts_prompt_vault_click"
            trackProperties={{
              source: "ai-prompts",
              destination: "prompt-vault",
              utm_campaign: "ai_prompts_to_prompt_vault",
              utm_content: "bottom_bridge",
            }}
          >
            Open the Full Vault
          </TrackedLink>
        </div>
      </section>

      <style>{`
        .ap-page {
          background: #0a0a0a;
          color: #f5f5f5;
          min-height: 100vh;
        }

        .ap-hero {
          position: relative;
          min-height: 92vh;
          display: flex;
          align-items: flex-end;
          padding: 0 24px 64px;
          overflow: hidden;
          background: #0a0a0a;
        }

        .ap-hero-image-wrap {
          position: absolute;
          inset: 0;
        }

        .ap-hero-image {
          object-fit: cover;
          object-position: center top;
        }

        .ap-hero-image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(10, 10, 10, 0.28) 0%,
            rgba(10, 10, 10, 0.82) 100%
          );
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
          color: rgba(245, 245, 245, 0.48);
        }

        .ap-hero-title {
          margin: 0 0 18px;
          font-size: clamp(2.8rem, 9vw, 5.5rem);
          font-weight: 300;
          line-height: 0.96;
          letter-spacing: -0.02em;
          color: #f5f5f5;
        }

        .ap-hero-sub {
          margin: 0 0 32px;
          font-size: clamp(0.95rem, 2.5vw, 1.05rem);
          line-height: 1.8;
          color: rgba(245, 245, 245, 0.7);
          max-width: 520px;
        }

        .ap-hero-actions {
          margin-bottom: 28px;
        }

        .ap-hero-cta {
          display: inline-block;
          padding: 14px 24px;
          background: #f5f5f5;
          color: #0a0a0a;
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
          color: rgba(245, 245, 245, 0.36);
          max-width: 460px;
        }

        .ap-section {
          padding: 72px 24px;
          border-top: 1px solid rgba(245, 245, 245, 0.06);
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
          color: rgba(245, 245, 245, 0.36);
        }

        .ap-eyebrow-new {
          color: rgba(245, 245, 245, 0.62);
        }

        .ap-section-title {
          margin: 0 0 40px;
          font-size: clamp(1.8rem, 5vw, 2.8rem);
          font-weight: 300;
          line-height: 1.08;
          color: #f5f5f5;
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
          color: rgba(245, 245, 245, 0.66);
          border-bottom: 1px solid rgba(245, 245, 245, 0.06);
        }

        .ap-before-list li:first-child { padding-top: 0; }
        .ap-before-list li:last-child { border-bottom: none; }

        .ap-starter-note {
          margin: 0 0 24px;
          font-size: 15px;
          line-height: 1.75;
          color: rgba(245, 245, 245, 0.54);
        }

        .ap-starter-card {
          border: 1px solid rgba(245, 245, 245, 0.12);
          border-radius: 16px;
          padding: 28px 28px 20px;
          background: rgba(245, 245, 245, 0.03);
        }

        .ap-starter-text {
          margin: 0 0 20px;
          font-size: 15px;
          line-height: 1.8;
          color: rgba(245, 245, 245, 0.78);
        }

        .ap-cards {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .pc {
          border: 1px solid rgba(245, 245, 245, 0.09);
          border-radius: 18px;
          padding: 32px 28px 24px;
          background: rgba(245, 245, 245, 0.025);
          overflow: hidden;
        }

        /* Inside the vault item, the card's bottom corners are flat so the
           thumbnail strip connects seamlessly below it */
        .ap-vault-item > .pc {
          border-radius: 18px 18px 0 0;
          border-bottom: none;
        }

        .pc-example-image-wrap {
          margin: -32px -28px 24px;
          overflow: hidden;
          border-radius: 18px 18px 0 0;
        }

        .pc-example-image {
          width: 100%;
          height: auto;
          max-height: 420px;
          object-fit: cover;
          object-position: center top;
          display: block;
        }

        .pc-workflow {
          background: rgba(245, 245, 245, 0.04);
          border-color: rgba(245, 245, 245, 0.11);
        }

        .pc-header {
          display: flex;
          align-items: baseline;
          gap: 14px;
          margin-bottom: 20px;
        }

        .pc-number {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          color: rgba(245, 245, 245, 0.28);
          flex-shrink: 0;
        }

        .pc-title {
          margin: 0;
          font-size: clamp(1.45rem, 4vw, 1.9rem);
          font-weight: 300;
          line-height: 1.05;
          color: #f5f5f5;
        }

        .pc-when-label {
          margin: 0 0 6px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(245, 245, 245, 0.3);
        }

        .pc-when {
          margin: 0 0 16px;
          font-size: 14px;
          line-height: 1.7;
          color: rgba(245, 245, 245, 0.6);
        }

        .pc-mood {
          margin: 0 0 24px;
          font-size: 11px;
          line-height: 1.6;
          color: rgba(245, 245, 245, 0.32);
          letter-spacing: 0.04em;
        }

        .pc-prompt-wrap {
          border: 1px solid rgba(245, 245, 245, 0.08);
          border-radius: 10px;
          padding: 20px 20px 14px;
          background: rgba(0, 0, 0, 0.25);
        }

        .pc-prompt-text {
          margin: 0 0 16px;
          font-size: 14px;
          line-height: 1.85;
          color: rgba(245, 245, 245, 0.72);
          white-space: normal;
          word-break: break-word;
        }

        .pc-copy-row {
          display: flex;
          justify-content: flex-end;
        }

        .copy-btn {
          padding: 8px 18px;
          background: transparent;
          border: 1px solid rgba(245, 245, 245, 0.18);
          border-radius: 999px;
          color: rgba(245, 245, 245, 0.56);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: inherit;
          transition: border-color 0.15s ease, color 0.15s ease;
        }

        .copy-btn:hover {
          border-color: rgba(245, 245, 245, 0.38);
          color: rgba(245, 245, 245, 0.88);
        }

        .ap-workflow-note {
          margin: -24px 0 36px;
          font-size: 15px;
          line-height: 1.8;
          color: rgba(245, 245, 245, 0.48);
        }

        .ap-vault-cta-row {
          margin-top: 34px;
          text-align: center;
        }

        .ap-bridge {
          background: #141414;
          border-top: 1px solid rgba(245, 245, 245, 0.06);
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
          color: #f5f5f5;
        }

        .ap-bridge-body {
          margin: 0 0 36px;
          font-size: 15px;
          line-height: 1.85;
          color: rgba(245, 245, 245, 0.56);
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
          background: #f5f5f5;
          color: #0a0a0a;
        }

        .ap-bridge-cta-secondary {
          padding: 14px 28px;
          border: 1px solid rgba(245, 245, 245, 0.2);
          color: rgba(245, 245, 245, 0.62);
        }

        .ap-kit-bridge {
          border-top: 1px solid rgba(245, 245, 245, 0.05);
        }

        /* Vault grid — same responsive behaviour as ap-cards but without last-child span */
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

        /* Thumbnail strip */
        .ap-thumb-wrap {
          margin-top: 0;
          padding: 18px 28px 22px;
          background: rgba(245, 245, 245, 0.025);
          border: 1px solid rgba(245, 245, 245, 0.09);
          border-top: none;
          border-radius: 0 0 18px 18px;
        }

        .ap-thumb-row {
          display: flex;
          gap: 6px;
          overflow-x: auto;
          padding-bottom: 2px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .ap-thumb-row::-webkit-scrollbar { display: none; }

        .ap-thumb-item {
          position: relative;
          width: 54px;
          min-width: 54px;
          aspect-ratio: 2 / 3;
          overflow: hidden;
          border-radius: 5px;
          flex-shrink: 0;
        }

        .ap-thumb-item-yours {
          opacity: 1;
          outline: 1.5px solid rgba(245, 245, 245, 0.48);
          outline-offset: 2px;
        }

        .ap-thumb-item-locked {
          opacity: 0.28;
        }

        .ap-thumb-note {
          margin: 12px 0 0;
          font-size: 11px;
          line-height: 1.65;
          color: rgba(245, 245, 245, 0.36);
          letter-spacing: 0.02em;
        }

        .ap-thumb-yours-label {
          color: rgba(245, 245, 245, 0.56);
          font-weight: 500;
        }

        @media (min-width: 900px) {
          .ap-vault-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
        }

        .ap-kit-question {
          margin: 0 0 10px;
          font-size: 14px;
          font-weight: 500;
          color: rgba(245, 245, 245, 0.44);
        }

        .ap-kit-body {
          margin: 0 0 28px;
          font-size: 15px;
          line-height: 1.78;
          color: rgba(245, 245, 245, 0.52);
          max-width: 520px;
        }

        @media (min-width: 640px) {
          .ap-hero {
            padding: 0 48px 80px;
            min-height: 88vh;
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
            padding: 0 72px 96px;
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
          .ap-cards {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .ap-cards.ap-main-grid > .pc:last-child {
            grid-column: 1 / -1;
          }
        }

        /* Editorial light refresh: the access page should feel like the email
           and the product itself, not a dark prompt database. */
        .ap-page {
          background: #f5f1eb;
          color: #0d0c0b;
        }
        .ap-hero {
          background: #0d0c0b;
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
          background: #f5f1eb;
        }
        .ap-vault-preview,
        .ap-bonus-section {
          background: #fffaf4;
        }
        .ap-before,
        .ap-starter,
        .ap-kit-bridge {
          background: #f0ede8;
        }
        .ap-eyebrow,
        .pc-number,
        .pc-when-label {
          color: rgba(13, 12, 11, 0.42);
        }
        .ap-section-title,
        .pc-title,
        .ap-bridge-title {
          color: #0d0c0b;
          letter-spacing: 0;
        }
        .ap-workflow-note,
        .ap-starter-note,
        .ap-before-list li,
        .ap-bridge-body,
        .ap-kit-body,
        .pc-when {
          color: rgba(13, 12, 11, 0.64);
        }
        .pc,
        .ap-starter-card {
          background: rgba(255, 250, 244, 0.82);
          border-color: rgba(13, 12, 11, 0.1);
          border-radius: 8px;
        }
        .pc-example-image-wrap {
          border-radius: 8px 8px 0 0;
        }
        .ap-vault-item > .pc {
          border-radius: 8px 8px 0 0;
        }
        .pc-prompt-wrap {
          background: rgba(240, 237, 232, 0.72);
          border-color: rgba(13, 12, 11, 0.08);
        }
        .pc-prompt-text,
        .ap-starter-text {
          color: rgba(13, 12, 11, 0.74);
        }
        .pc-mood,
        .ap-thumb-note,
        .ap-kit-question {
          color: rgba(13, 12, 11, 0.48);
        }
        .ap-thumb-wrap {
          background: rgba(255, 250, 244, 0.82);
          border-color: rgba(13, 12, 11, 0.1);
          border-radius: 0 0 8px 8px;
        }
        .ap-thumb-item-yours {
          outline-color: rgba(13, 12, 11, 0.42);
        }
        .ap-thumb-yours-label {
          color: rgba(13, 12, 11, 0.7);
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
        .ap-bridge-cta,
        .ap-bridge-cta-primary,
        .ap-bridge-cta-secondary {
          background: #0d0c0b;
          color: #f5f1eb;
          border-color: #0d0c0b;
          border-radius: 0;
        }
        .ap-bridge {
          background: #fffaf4;
        }
        .ap-bonus-library {
          border: 1px solid rgba(13, 12, 11, 0.1);
          background: rgba(255, 250, 244, 0.84);
          border-radius: 8px;
          padding: 24px;
        }
        .ap-bonus-library summary {
          cursor: pointer;
          list-style: none;
        }
        .ap-bonus-library summary::-webkit-details-marker {
          display: none;
        }
        .ap-summary-title {
          display: block;
          margin-bottom: 16px;
        }
        .ap-summary-note {
          display: block;
          margin: 0;
        }
        .ap-bonus-content {
          margin-top: 40px;
          padding-top: 40px;
          border-top: 1px solid rgba(13, 12, 11, 0.08);
        }
        .ap-bonus-group + .ap-bonus-group {
          margin-top: 56px;
        }
        .ap-preview-card {
          background: rgba(255, 250, 244, 0.86);
          border: 1px solid rgba(13, 12, 11, 0.1);
          border-radius: 8px 8px 0 0;
          overflow: hidden;
        }
        .ap-preview-image-wrap {
          background: #f0ede8;
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
        .ap-preview-title {
          margin: 10px 0 12px;
          color: #0d0c0b;
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
