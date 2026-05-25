import fs from "node:fs"
import path from "node:path"
import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { sql } from "@/lib/db/client"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { CopyButton } from "@/components/ai-prompts/copy-button"
import { TrackedLink } from "@/components/ai-prompts/tracked-link"
import {
  REUSABLE_STARTER,
  MAIN_LOOKS,
  BONUS_LOOKS,
  WORKFLOW_PROMPTS,
  FREEBIE_COLLECTION_PREVIEWS,
  type PromptCard,
} from "@/lib/ai-prompts/prompt-data"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

const HERO_IMAGE = path.join(process.cwd(), "public", "images", "ai-prompts", "ai-prompts-hero.jpg")

export const metadata: Metadata = {
  title: "Your ChatGPT Selfie Prompts · SSELFIE",
  description: "18 copy-paste prompts for turning one selfie into editorial, beauty, mirror, car, café, and content-ready visuals.",
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
          OR 'ai-prompts-subscriber' = ANY(email_tags)
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

  if (!result.valid) {
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
      ...(result.subscriberSource ? { subscriber_source: result.subscriberSource } : {}),
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
            The ChatGPT Selfie Prompt Pack.
          </h1>
          <p className="ap-hero-sub">
            12 copy-paste prompts for turning one selfie into editorial, beauty, mirror,
            car, and content-ready visuals.
          </p>
          <div className="ap-hero-actions">
            <a href="#bw-supermodel" className="ap-hero-cta">
              Start with the 90s Supermodel prompt
            </a>
          </div>
          <p className="ap-hero-safety">
            Use your own photo or a photo you have permission to edit. AI can still change
            small facial details, so check the result before you post.
          </p>
        </div>
      </section>

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

      {/* 4. Vault preview — one shot from each paid collection */}
      {FREEBIE_COLLECTION_PREVIEWS.length > 0 && (
        <section className="ap-section ap-vault-preview">
          <div className="ap-section-inner">
            <p className="ap-eyebrow ap-eyebrow-new">VAULT PREVIEW</p>
            <h2 className={`ap-section-title ${cormorant.className}`}>
              A taste of what is inside the Prompt Vault.
            </h2>
            <p className="ap-workflow-note">
              These are the opening shots from the paid editorial collections. The full vault gives
              you every shoot, every angle, and every copy-paste prompt.
            </p>
            <div className="ap-cards">
              {FREEBIE_COLLECTION_PREVIEWS.map((card) => (
                <PromptCardEl key={card.id} card={card} />
              ))}
            </div>
            <div className="ap-vault-cta-row">
              <TrackedLink
                href="/prompt-vault?utm_source=ai_prompts&utm_medium=prompt_pack&utm_campaign=ai_prompts_to_prompt_vault"
                className="ap-bridge-cta ap-bridge-cta-primary"
                trackEvent="ai_prompts_prompt_vault_click"
                trackProperties={{
                  source: "ai-prompts",
                  destination: "prompt-vault",
                  utm_campaign: "ai_prompts_to_prompt_vault",
                }}
              >
                Get the Full Prompt Vault
              </TrackedLink>
            </div>
          </div>
        </section>
      )}

      {/* 5. The main looks */}
      <section className="ap-section">
        <div className="ap-section-inner">
          <p className="ap-eyebrow">THE LOOKS</p>
          <h2 className={`ap-section-title ${cormorant.className}`}>
            Five prompts. Five transformations.
          </h2>
          <div className="ap-cards ap-main-grid">
            {MAIN_LOOKS.map((card) => (
              <PromptCardEl key={card.id} card={card} />
            ))}
          </div>
        </div>
      </section>

      {/* 7. Bonus looks */}
      <section className="ap-section">
        <div className="ap-section-inner">
          <p className="ap-eyebrow">BONUS LOOKS</p>
          <h2 className={`ap-section-title ${cormorant.className}`}>
            Three more. For specific moments.
          </h2>
          <div className="ap-cards">
            {BONUS_LOOKS.map((card) => (
              <PromptCardEl key={card.id} card={card} />
            ))}
          </div>
        </div>
      </section>

      {/* 8. Workflow prompts */}
      <section className="ap-section ap-workflow-section">
        <div className="ap-section-inner">
          <p className="ap-eyebrow">SSELFIE WORKFLOW</p>
          <h2 className={`ap-section-title ${cormorant.className}`}>
            Use these when you want the photo to become content, not just a pretty image.
          </h2>
          <p className="ap-workflow-note">
            These prompts do not change how you look. They help you understand your photo,
            edit it, caption it, and turn it into a content plan.
          </p>
          <div className="ap-cards">
            {WORKFLOW_PROMPTS.map((card) => (
              <PromptCardEl key={card.id} card={card} isWorkflow />
            ))}
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

      {/* 10. Soft product bridge */}
      <section className="ap-section ap-kit-bridge">
        <div className="ap-section-inner">
          <p className="ap-kit-question">Want the edit to look good before AI touches it?</p>
          <p className="ap-kit-body">
            The Starter Kit includes the Lightroom presets, setup guide, posing guide,
            caption templates, and 7-day content starter.
          </p>
          <TrackedLink
            href="/starter-kit?utm_source=ai_prompts&utm_medium=prompt_pack&utm_campaign=ai_prompts_to_starter_kit"
            className="ap-bridge-cta ap-bridge-cta-secondary"
            trackEvent="ai_prompts_starter_kit_click"
            trackProperties={{ source: "ai-prompts", destination: "starter-kit", utm_campaign: "ai_prompts_to_starter_kit" }}
          >
            See the Starter Kit
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
      `}</style>
    </main>
  )
}
