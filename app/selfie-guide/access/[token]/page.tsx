import { readFile } from "node:fs/promises"
import path from "node:path"
import Image from "next/image"
import Link from "next/link"
import type { ReactElement, ReactNode } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { sql } from "@/lib/db/client"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
})

const GUIDE_CONTENT_PATH = path.join(process.cwd(), "content-templates", "selfie-guide-content-v2.md")

const FALLBACK_GUIDE_MARKDOWN = `## Guide Content Unavailable

We could not load the full guide content right now. Please refresh this page or request a fresh access link.`

const MAYA_GALLERY_IMAGES = [
  {
    src: "/images/selfie-guide/feed-post-1.png",
    alt: "Before and after comparison showing Sandra's selfie enhanced with AI to create professional brand photography",
    caption: "Original selfie -> AI-enhanced brand photo",
    width: 1856,
    height: 2304,
  },
  {
    src: "/images/selfie-guide/feed-post-3.png",
    alt: "Sandra's brand photo with consistent editorial style and cohesive aesthetic",
    caption: "Consistent editorial vibe",
    width: 1856,
    height: 2304,
  },
  {
    src: "/images/selfie-guide/feed-post-5.png",
    alt: "Professional portrait of Sandra with warm, approachable expression and polished editorial style",
    caption: "Warm + approachable (but still polished)",
    width: 1856,
    height: 2304,
  },
  {
    src: "/images/selfie-guide/feed-post-7.png",
    alt: "Sandra's brand photo balancing professional quality with natural, authentic presence",
    caption: "Professional without being stiff",
    width: 1856,
    height: 2304,
  },
  {
    src: "/images/selfie-guide/parisian-cafe-tranquility.png",
    alt: "AI-generated brand photo of Sandra in Parisian cafe setting with editorial aesthetic",
    caption: "AI-generated scene that still feels like me",
    width: 2048,
    height: 2048,
  },
] as const

let cachedGuideMarkdown: string | null = null

interface SubscriberRecord {
  name?: string
  email?: string
}

function upperName(name: string | undefined) {
  const value = (name || "Friend").trim()
  return value.length > 0 ? value.toUpperCase() : "FRIEND"
}

async function getGuideMarkdown() {
  if (cachedGuideMarkdown) {
    return cachedGuideMarkdown
  }

  try {
    const markdown = await readFile(GUIDE_CONTENT_PATH, "utf8")
    cachedGuideMarkdown = markdown.replace(/\]\(#\)/g, "](/brand-strategy)")
    return cachedGuideMarkdown
  } catch (error) {
    console.error("[selfie-guide access] failed to load markdown:", error)
    return FALLBACK_GUIDE_MARKDOWN
  }
}

async function getSubscriber(token: string): Promise<{
  status: "ok" | "not_found" | "error"
  data?: SubscriberRecord
}> {
  try {
    const rows = await sql`
      SELECT name, email
      FROM freebie_subscribers
      WHERE access_token = ${token}
      LIMIT 1
    `

    if (rows.length === 0) {
      return { status: "not_found" }
    }

    // Best-effort tracking only; don't fail page render if this schema field is missing.
    try {
      await sql`
        UPDATE freebie_subscribers
        SET guide_opened = TRUE,
            guide_opened_at = COALESCE(guide_opened_at, NOW()),
            updated_at = NOW()
        WHERE access_token = ${token}
      `
    } catch {
      // no-op
    }

    return {
      status: "ok",
      data: {
        name: rows[0].name,
        email: rows[0].email,
      },
    }
  } catch (error) {
    console.error("[selfie-guide access] DB error:", error)
    return { status: "error" }
  }
}

function getPlainText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node)
  }

  if (Array.isArray(node)) {
    return node.map(getPlainText).join("")
  }

  if (node && typeof node === "object" && "props" in node) {
    return getPlainText((node as ReactElement<{ children?: ReactNode }>).props.children)
  }

  return ""
}

function MayaGallery() {
  return (
    <div className="maya-gallery" aria-label="AI-enhanced selfie examples">
      <div className="maya-grid">
        {MAYA_GALLERY_IMAGES.map((image) => (
          <figure key={image.src} className="maya-card">
            <div className="maya-image-wrap">
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                sizes="(max-width: 700px) 100vw, (max-width: 1120px) 50vw, 460px"
                className="maya-image"
              />
            </div>
            <figcaption>{image.caption}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

function FeedPreview() {
  return (
    <figure className="feed-preview">
      <div className="feed-preview-image-wrap">
        <Image
          src="/images/selfie-guide/img-editorial-dark.png"
          alt="Instagram feed grid preview showing 9 cohesive brand photos with consistent editorial style and color palette"
          width={1536}
          height={2752}
          sizes="(max-width: 700px) 100vw, 700px"
          className="feed-preview-image"
        />
      </div>
      <figcaption>This is what a cohesive feed actually looks like.</figcaption>
    </figure>
  )
}

function StatusView({ title, body }: { title: string; body: string }) {
  return (
    <main className={`status-page ${inter.className}`}>
      <div className="status-card">
        <p className="status-label">SSELFIE</p>
        <h1 className={cormorant.className}>{title}</h1>
        <p>{body}</p>
        <Link href="/selfie-guide" className="status-cta">
          GET NEW ACCESS
        </Link>
      </div>

      <style>{`
        .status-page {
          min-height: 100vh;
          background: #0a0a0a;
          color: rgba(255, 255, 255, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .status-card {
          max-width: 580px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          background: rgba(255, 255, 255, 0.04);
          padding: 38px 32px;
        }

        .status-label {
          margin: 0 0 10px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
        }

        h1 {
          margin: 0;
          font-size: clamp(30px, 6vw, 52px);
          font-weight: 300;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: #ffffff;
          line-height: 1;
        }

        p {
          margin: 16px 0 0;
          font-size: 15px;
          line-height: 1.8;
        }

        .status-cta {
          margin-top: 22px;
          display: inline-block;
          color: #0a0a0a;
          background: #ffffff;
          padding: 12px 16px;
          font-size: 10px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          text-decoration: none;
        }
      `}</style>
    </main>
  )
}

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function SelfieGuideAccessPage({ params }: PageProps) {
  const { token } = await params
  const [result, guideMarkdown] = await Promise.all([getSubscriber(token), getGuideMarkdown()])

  if (result.status === "not_found") {
    return (
      <StatusView
        title="INVALID ACCESS LINK"
        body="This guide link has expired or doesn't exist. Enter your email again to get a fresh link."
      />
    )
  }

  if (result.status !== "ok" || !result.data) {
    return (
      <StatusView
        title="UNAVAILABLE"
        body="We couldn't load your guide right now. Please try again in a moment."
      />
    )
  }

  const firstName = upperName(result.data.name)

  const markdownComponents: Components = {
    h1: ({ children }) => <h1 className={`guide-h1 ${cormorant.className}`}>{children}</h1>,
    h2: ({ children }) => <h2 className={`guide-h2 ${cormorant.className}`}>{children}</h2>,
    h3: ({ children }) => <h3 className={`guide-h3 ${cormorant.className}`}>{children}</h3>,
    p: ({ children }) => {
      const text = getPlainText(children).replace(/\s+/g, " ").trim()

      if (text.includes("[IMAGE: feed-post-1.png")) {
        return <MayaGallery />
      }

      if (text.includes("[IMAGE: img-editorial-dark.png")) {
        return <FeedPreview />
      }

      return <p className="guide-p">{children}</p>
    },
    ul: ({ children }) => <ul className="guide-ul">{children}</ul>,
    ol: ({ children }) => <ol className="guide-ol">{children}</ol>,
    li: ({ children }) => <li className="guide-li">{children}</li>,
    hr: () => <hr className="guide-hr" />,
    a: ({ href, children }) => (
      <a className="guide-link" href={href || "#"}>
        {children}
      </a>
    ),
  }

  return (
    <main className={`guide-page ${inter.className}`}>
      <header className="site-header">
        <a href="https://sselfie.ai" className={`logo ${cormorant.className}`}>
          SSELFIE
        </a>
        <span className="header-label">YOUR SELFIE GUIDE</span>
      </header>

      <section className="hero">
        <div className="hero-bg-wrap">
          <Image
            src="/images/selfie-guide/feed-post-1.png"
            alt="Sandra's professional brand photo with warm editorial lighting"
            fill
            priority
            sizes="100vw"
            className="hero-bg"
          />
        </div>
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-eyebrow">CREATED FOR</p>
          <h1 className={`hero-title ${cormorant.className}`}>{firstName}</h1>
          <div className="hero-meta">
            <div>
              <div className="meta-label">Guide</div>
              <div className="meta-value">Become a Selfie Queen</div>
            </div>
            <div>
              <div className="meta-label">Focus</div>
              <div className="meta-value">Confident Personal Brand Photos</div>
            </div>
            <div>
              <div className="meta-label">Format</div>
              <div className="meta-value">All Chapters + Visual Examples</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <p className="section-label">01 — THE COMPLETE PLAYBOOK</p>
        <article className="guide-article">
          <ReactMarkdown components={markdownComponents}>{guideMarkdown}</ReactMarkdown>
        </article>
      </section>

      <section className="upsell-section">
        <div className="upsell-bg-wrap">
          <Image src="/assets/brand-strategy/ocean.png" alt="Ocean background" fill sizes="100vw" className="cover-image" />
        </div>
        <div className="upsell-overlay" />
        <div className="upsell-content">
          <p className="upsell-eyebrow">READY FOR THE NEXT STEP?</p>
          <h2 className={`upsell-heading ${cormorant.className}`}>Build Your Full Brand Strategy + Test Maya</h2>
          <p className="upsell-body">
            Start with the low-ticket brand strategy, then jump into Maya and create your first selfie generation
            directly in Studio.
          </p>
          <div className="upsell-buttons">
            <a href="/brand-strategy" className="btn-primary">
              Get Your EUR 17 Brand Strategy
            </a>
            <a href="/studio?tab=maya" className="btn-secondary">
              Try Maya for Free
            </a>
            <a href="/checkout/credits" className="btn-tertiary">
              Need more generations? Add credits
            </a>
          </div>
        </div>
      </section>

      <footer className="footer">
        <span className="footer-note">© 2026 SSELFIE Studio · sselfie.ai</span>
      </footer>

      <style>{`
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
          min-height: 88vh;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 80px 56px;
          overflow: hidden;
        }

        .hero-bg-wrap,
        .upsell-bg-wrap {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .hero-bg {
          object-fit: cover;
          object-position: center 22%;
          filter: brightness(0.5);
        }

        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(10, 10, 10, 0.2) 0%,
            rgba(10, 10, 10, 0) 40%,
            rgba(10, 10, 10, 0.72) 75%,
            rgba(10, 10, 10, 1) 100%
          );
        }

        .hero-content {
          position: relative;
          z-index: 2;
          max-width: 900px;
        }

        .hero-eyebrow {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 20px;
        }

        .hero-title {
          margin: 0;
          font-weight: 300;
          font-size: clamp(52px, 8vw, 96px);
          line-height: 1;
          letter-spacing: -0.02em;
          text-transform: uppercase;
        }

        .hero-meta {
          margin-top: 36px;
          display: flex;
          gap: 28px;
          flex-wrap: wrap;
          padding-top: 28px;
          border-top: 1px solid rgba(255, 255, 255, 0.09);
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
          max-width: 280px;
        }

        .section {
          padding: 80px 56px;
          max-width: 1180px;
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

        .guide-article {
          border: 1px solid rgba(255, 255, 255, 0.09);
          background: rgba(255, 255, 255, 0.03);
          padding: clamp(24px, 4vw, 54px);
        }

        .guide-h1 {
          margin: 0 0 20px;
          font-size: clamp(36px, 5.2vw, 64px);
          font-weight: 300;
          letter-spacing: -0.01em;
          line-height: 1.05;
          text-transform: uppercase;
          color: #ffffff;
        }

        .guide-h2 {
          margin: 54px 0 18px;
          font-size: clamp(30px, 4.2vw, 48px);
          font-weight: 300;
          letter-spacing: -0.01em;
          line-height: 1.08;
          text-transform: uppercase;
          color: #ffffff;
        }

        .guide-h3 {
          margin: 34px 0 10px;
          font-size: clamp(22px, 2.7vw, 34px);
          font-weight: 300;
          line-height: 1.15;
          letter-spacing: -0.01em;
          color: #ffffff;
        }

        .guide-p {
          margin: 0;
          font-size: 16px;
          line-height: 1.86;
          color: rgba(255, 255, 255, 0.8);
        }

        .guide-p + .guide-p,
        .guide-p + .guide-ul,
        .guide-p + .guide-ol,
        .guide-ul + .guide-p,
        .guide-ol + .guide-p,
        .guide-ul + .guide-ul,
        .guide-ol + .guide-ol {
          margin-top: 14px;
        }

        .guide-ul,
        .guide-ol {
          margin: 0;
          padding-left: 1.2rem;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.82;
        }

        .guide-li {
          margin: 4px 0;
        }

        .guide-hr {
          border: 0;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          margin: 32px 0;
        }

        .guide-link {
          color: #ffffff;
          text-underline-offset: 3px;
        }

        .maya-gallery {
          margin: 18px 0 22px;
        }

        .maya-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .maya-card {
          margin: 0;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          overflow: hidden;
        }

        .maya-card:last-child {
          grid-column: 1 / -1;
          max-width: 430px;
          justify-self: center;
        }

        .maya-image-wrap {
          line-height: 0;
        }

        .maya-image {
          width: 100%;
          height: auto;
          display: block;
        }

        .maya-card figcaption {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.68);
          line-height: 1.6;
          padding: 10px 12px 12px;
        }

        .feed-preview {
          margin: 22px 0 14px;
        }

        .feed-preview-image-wrap {
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.02);
          padding: 8px;
        }

        .feed-preview-image {
          width: 100%;
          max-width: 700px;
          height: auto;
          display: block;
          margin: 0 auto;
        }

        .feed-preview figcaption {
          margin-top: 10px;
          text-align: center;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.65);
          font-style: italic;
        }

        .upsell-section {
          position: relative;
          overflow: hidden;
        }

        .cover-image {
          object-fit: cover;
          object-position: center;
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
        }

        .upsell-body {
          margin: 0 auto 38px;
          font-size: 16px;
          color: rgba(255, 255, 255, 0.75);
          max-width: 620px;
          line-height: 1.8;
        }

        .upsell-buttons {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .btn-primary {
          display: inline-block;
          background: #ffffff;
          color: #0a0a0a;
          padding: 18px 48px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          text-decoration: none;
          transition: opacity 0.2s;
        }

        .btn-primary:hover {
          opacity: 0.88;
        }

        .btn-secondary {
          display: inline-block;
          border: 1px solid rgba(255, 255, 255, 0.25);
          color: rgba(255, 255, 255, 0.75);
          padding: 14px 32px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          text-decoration: none;
        }

        .btn-secondary:hover {
          border-color: rgba(255, 255, 255, 0.5);
        }

        .btn-tertiary {
          width: 100%;
          text-align: center;
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.72);
          text-decoration: none;
          margin-top: 2px;
        }

        .btn-tertiary:hover {
          color: rgba(255, 255, 255, 0.95);
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

        @media (max-width: 920px) {
          .maya-grid {
            grid-template-columns: 1fr;
          }

          .maya-card:last-child {
            grid-column: auto;
            max-width: none;
          }
        }

        @media (max-width: 700px) {
          .site-header {
            padding: 20px 24px;
          }

          .header-label {
            display: none;
          }

          .hero {
            padding: 48px 28px;
            min-height: 82vh;
          }

          .section {
            padding: 56px 20px;
          }

          .guide-article {
            padding: 24px 20px;
          }

          .guide-h2 {
            margin-top: 46px;
          }

          .upsell-content {
            padding: 72px 28px;
          }

          .btn-primary,
          .btn-secondary {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </main>
  )
}
