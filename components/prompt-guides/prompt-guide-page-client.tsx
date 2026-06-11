"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Copy, Check } from "lucide-react"
import PromptEmailCapture from "./prompt-email-capture"
import { trackEvent } from "@/lib/analytics"
import { Cormorant_Garamond, Inter } from "next/font/google"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
})

const FALLBACK_HERO_IMAGE = "/assets/brand-strategy/hero.png"
const FALLBACK_INTRO_IMAGE = "/assets/brand-strategy/journals.png"
const FALLBACK_UPSELL_IMAGE = "/assets/brand-strategy/ocean.png"

interface PromptGuidePageClientProps {
  page: {
    id: number
    title: string
    welcome_message: string | null
    upsell_text: string | null
    upsell_link: string | null
    email_list_tag: string | null
  }
  items: Array<{
    id: number
    concept_title: string | null
    prompt_text: string
    image_url: string | null
  }>
  hasAccessToken: boolean
  emailListTag: string | null
}

export default function PromptGuidePageClient({
  page,
  items,
  hasAccessToken,
  emailListTag,
}: PromptGuidePageClientProps) {
  const [showEmailModal, setShowEmailModal] = useState(!hasAccessToken)
  const [copiedPromptId, setCopiedPromptId] = useState<number | null>(null)

  const heroImage = useMemo(
    () => items.find((item) => !!item.image_url)?.image_url || FALLBACK_HERO_IMAGE,
    [items],
  )

  const introImage = useMemo(
    () => items.find((item) => item.image_url && item.image_url !== heroImage)?.image_url || FALLBACK_INTRO_IMAGE,
    [heroImage, items],
  )

  const copyToClipboard = async (text: string, itemId: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedPromptId(itemId)
      setTimeout(() => setCopiedPromptId(null), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  const handleEmailSuccess = () => {
    setShowEmailModal(false)
    fetch("/api/prompt-guide/set-access-cookie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: page.id }),
    }).catch(console.error)
  }

  useEffect(() => {
    trackEvent("prompt_guide_view", {
      guide_id: page.id,
      guide_title: page.title,
      item_count: items.length,
      requires_email_gate: !hasAccessToken,
    })
  }, [page.id, page.title, items.length, hasAccessToken])

  return (
    <main className={`guide-page ${inter.className}`}>
      {showEmailModal ? (
        <PromptEmailCapture
          onSuccess={handleEmailSuccess}
          onClose={() => setShowEmailModal(false)}
          emailListTag={emailListTag}
          pageId={page.id}
          guideTitle={page.title}
        />
      ) : null}

      <header className="site-header">
        <Link href="/" className={`logo ${cormorant.className}`}>
          SSELFIE
        </Link>
        <span className="header-label">PROMPT GUIDE</span>
      </header>

      <section className="hero">
        <div className="hero-bg-wrap">
          <Image src={heroImage} alt={`${page.title} hero`} fill priority sizes="100vw" className="hero-bg" />
        </div>
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-eyebrow">GUIDE</p>
          <h1 className={`hero-title ${cormorant.className}`}>{page.title}</h1>
          <div className="hero-meta">
            <div>
              <div className="meta-label">Prompts</div>
              <div className="meta-value">{items.length}</div>
            </div>
            <div>
              <div className="meta-label">Access</div>
              <div className="meta-value">{hasAccessToken ? "Unlocked" : "Email-Gated"}</div>
            </div>
          </div>
        </div>
      </section>

      {page.welcome_message ? (
        <>
          <section className="section">
            <p className="section-label">01 — GUIDE INTRO</p>
            <div className="intro-split">
              <div className="intro-image-wrap">
                <Image src={introImage} alt="Guide intro image" fill sizes="(max-width: 700px) 100vw, 40vw" className="cover-image" />
              </div>
              <div className="intro-text">
                <span className="intro-badge">WELCOME</span>
                <div className="welcome-html" dangerouslySetInnerHTML={{ __html: page.welcome_message }} />
              </div>
            </div>
          </section>
          <hr className="divider" />
        </>
      ) : null}

      <section className="section">
        <p className="section-label">{page.welcome_message ? "02 — PROMPTS" : "01 — PROMPTS"}</p>
        <div className="prompts-grid">
          {items.map((item, index) => (
            <PromptCard
              key={item.id}
              title={item.concept_title || `Prompt ${String(index + 1).padStart(2, "0")}`}
              prompt={item.prompt_text}
              image={item.image_url}
              onCopy={() => copyToClipboard(item.prompt_text, item.id)}
              isCopied={copiedPromptId === item.id}
              imageLabel={`PROMPT ${String(index + 1).padStart(2, "0")}`}
            />
          ))}
        </div>
      </section>

      {page.upsell_text && page.upsell_link ? (
        <section className="upsell-section">
          <div className="upsell-bg-wrap">
            <Image src={FALLBACK_UPSELL_IMAGE} alt="Upsell background" fill sizes="100vw" className="cover-image" />
          </div>
          <div className="upsell-overlay" />
          <div className="upsell-content">
            <p className="upsell-eyebrow">READY FOR MORE?</p>
            <h2 className={`upsell-heading ${cormorant.className}`}>Get SSELFIE SUITE</h2>
            <p className="upsell-body">{page.upsell_text}</p>
            <a
              href={page.upsell_link}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              onClick={() => {
                trackEvent("prompt_guide_studio_click", {
                  guide_id: page.id,
                  guide_title: page.title,
                  source: "prompt_guide_upsell",
                })
              }}
            >
              Join the SUITE
            </a>
          </div>
        </section>
      ) : null}

      <footer className="footer">
        <span className="footer-note">© 2026 SSELFIE Studio · sselfie.ai</span>
      </footer>

      <style jsx>{`
        .guide-page {
          background: #0a0a0a;
          color: #ffffff;
          min-height: 100vh;
        }

        .site-header {
          padding: 28px 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.09);
          position: sticky;
          top: 0;
          background: rgba(10, 10, 10, 0.94);
          backdrop-filter: blur(20px);
          z-index: 100;
        }

        .logo {
          font-weight: 300;
          font-size: 17px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #ffffff;
          text-decoration: none;
        }

        .header-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.5);
        }

        .hero {
          position: relative;
          min-height: 76vh;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 80px 56px;
          overflow: hidden;
        }

        .hero-bg-wrap {
          position: absolute;
          inset: 0;
        }

        .hero-bg {
          object-fit: cover;
          object-position: center 30%;
          filter: brightness(0.55);
        }

        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(10, 10, 10, 0.15) 0%,
            rgba(10, 10, 10, 0.05) 38%,
            rgba(10, 10, 10, 0.68) 74%,
            rgba(10, 10, 10, 1) 100%
          );
        }

        .hero-content {
          position: relative;
          z-index: 2;
          max-width: 900px;
        }

        .hero-eyebrow {
          margin: 0 0 20px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.5);
        }

        .hero-title {
          margin: 0;
          font-weight: 300;
          font-size: clamp(48px, 8vw, 94px);
          line-height: 1;
          letter-spacing: -0.02em;
          text-transform: uppercase;
          color: #ffffff;
        }

        .hero-meta {
          margin-top: 34px;
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
          border-top: 1px solid rgba(255, 255, 255, 0.09);
          padding-top: 24px;
        }

        .meta-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.45em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.35);
          margin-bottom: 5px;
        }

        .meta-value {
          font-size: 15px;
          color: #f0f0f0;
        }

        .section {
          padding: 80px 56px;
          max-width: 1080px;
          margin: 0 auto;
        }

        .section-label {
          margin: 0 0 40px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.35);
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.09);
        }

        .intro-split {
          display: grid;
          grid-template-columns: 1fr 1.4fr;
          border: 1px solid rgba(255, 255, 255, 0.09);
          min-height: 340px;
        }

        .intro-image-wrap {
          position: relative;
          min-height: 280px;
          overflow: hidden;
        }

        .cover-image {
          object-fit: cover;
          object-position: center;
        }

        .intro-text {
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(20px);
          padding: 44px 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .intro-badge {
          display: inline-block;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.45em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.09);
          padding: 5px 12px;
          margin-bottom: 18px;
          align-self: flex-start;
        }

        .welcome-html {
          font-size: 15px;
          line-height: 1.85;
          color: rgba(255, 255, 255, 0.75);
        }

        .welcome-html :global(p) {
          margin: 0 0 12px;
        }

        .welcome-html :global(p:last-child) {
          margin-bottom: 0;
        }

        .divider {
          border: none;
          border-top: 1px solid rgba(255, 255, 255, 0.09);
        }

        .prompts-grid {
          display: grid;
          gap: 14px;
        }

        .upsell-section {
          position: relative;
          overflow: hidden;
          margin: 0;
        }

        .upsell-bg-wrap {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .upsell-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(10, 10, 10, 0.75) 0%, rgba(10, 10, 10, 0.55) 100%);
        }

        .upsell-content {
          position: relative;
          z-index: 2;
          text-align: center;
          padding: 100px 56px;
          max-width: 740px;
          margin: 0 auto;
        }

        .upsell-eyebrow {
          margin: 0 0 24px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.35);
        }

        .upsell-heading {
          margin: 0 0 20px;
          font-size: clamp(36px, 5vw, 58px);
          line-height: 1.05;
          letter-spacing: -0.01em;
          text-transform: uppercase;
          color: #ffffff;
        }

        .upsell-body {
          margin: 0 auto 38px;
          font-size: 16px;
          color: rgba(255, 255, 255, 0.75);
          max-width: 620px;
          line-height: 1.8;
        }

        .btn-primary {
          display: inline-block;
          background: #ffffff;
          color: #0a0a0a;
          padding: 18px 52px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          text-decoration: none;
          border: none;
          transition: opacity 0.2s;
        }

        .btn-primary:hover {
          opacity: 0.88;
        }

        .footer {
          border-top: 1px solid rgba(255, 255, 255, 0.09);
          padding: 30px 24px;
          text-align: center;
        }

        .footer-note {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.35);
        }

        @media (max-width: 700px) {
          .site-header {
            padding: 20px 24px;
          }

          .hero {
            min-height: 72vh;
            padding: 48px 28px;
          }

          .section {
            padding: 56px 28px;
          }

          .intro-split {
            grid-template-columns: 1fr;
          }

          .intro-image-wrap {
            min-height: 220px;
          }

          .intro-text {
            padding: 36px 28px;
          }

          .upsell-content {
            padding: 72px 28px;
          }

          .btn-primary {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </main>
  )
}

interface PromptCardProps {
  image: string | null
  title: string
  prompt: string
  onCopy: () => void
  isCopied: boolean
  imageLabel: string
}

function PromptCard({ image, title, prompt, onCopy, isCopied, imageLabel }: PromptCardProps) {
  return (
    <article className="prompt-card">
      <div className="prompt-image-wrap">
        {image ? (
          <img src={image} alt={title} className="prompt-image" loading="lazy" />
        ) : (
          <div className="prompt-image-fallback">NO IMAGE</div>
        )}
        <div className="prompt-image-overlay" />
        <span className="prompt-image-label">{imageLabel}</span>
      </div>

      <div className="prompt-body">
        <h3 className={`prompt-title ${cormorant.className}`}>{title}</h3>
        <div className="prompt-meta-label">PROMPT</div>
        <pre className="prompt-text">{prompt}</pre>
        <button type="button" className="copy-button" onClick={onCopy}>
          {isCopied ? (
            <>
              <Check size={14} />
              COPIED
            </>
          ) : (
            <>
              <Copy size={14} />
              COPY PROMPT
            </>
          )}
        </button>
      </div>

      <style jsx>{`
        .prompt-card {
          display: grid;
          grid-template-columns: 1.1fr 1.9fr;
          border: 1px solid rgba(255, 255, 255, 0.09);
          background: rgba(255, 255, 255, 0.04);
          overflow: hidden;
        }

        .prompt-image-wrap {
          position: relative;
          min-height: 340px;
          border-right: 1px solid rgba(255, 255, 255, 0.09);
          overflow: hidden;
        }

        .prompt-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }

        .prompt-image-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          letter-spacing: 0.45em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.35);
          background: rgba(255, 255, 255, 0.03);
        }

        .prompt-image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, transparent 45%, rgba(10, 10, 10, 0.85) 100%);
        }

        .prompt-image-label {
          position: absolute;
          bottom: 16px;
          left: 16px;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.45em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.5);
        }

        .prompt-body {
          padding: 30px 32px 34px;
          display: flex;
          flex-direction: column;
        }

        .prompt-title {
          margin: 0 0 14px;
          font-weight: 400;
          font-size: clamp(24px, 2.5vw, 34px);
          line-height: 1.05;
          letter-spacing: -0.01em;
          text-transform: uppercase;
          color: #ffffff;
        }

        .prompt-meta-label {
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.35);
          margin-bottom: 10px;
        }

        .prompt-text {
          margin: 0;
          white-space: pre-wrap;
          font-family: inherit;
          font-size: 14px;
          line-height: 1.75;
          color: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(10, 10, 10, 0.34);
          padding: 16px;
          max-height: 260px;
          overflow: auto;
        }

        .copy-button {
          margin-top: 14px;
          display: inline-flex;
          gap: 8px;
          align-items: center;
          align-self: flex-start;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: transparent;
          color: rgba(255, 255, 255, 0.78);
          padding: 10px 14px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
        }

        .copy-button:hover {
          border-color: rgba(255, 255, 255, 0.5);
          color: #ffffff;
        }

        @media (max-width: 920px) {
          .prompt-card {
            grid-template-columns: 1fr;
          }

          .prompt-image-wrap {
            min-height: 260px;
            border-right: none;
            border-bottom: 1px solid rgba(255, 255, 255, 0.09);
          }

          .prompt-body {
            padding: 24px;
          }

          .prompt-text {
            max-height: none;
          }
        }
      `}</style>
    </article>
  )
}
