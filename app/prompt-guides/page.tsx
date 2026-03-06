import { sql } from "@/lib/db/client"
import Link from "next/link"
import Image from "next/image"
import { Cormorant_Garamond, Inter } from "next/font/google"

export const dynamic = "force-dynamic"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
})

interface Guide {
  page_id: number
  slug: string
  page_title: string
  guide_title: string
  description: string | null
  category: string | null
  preview_image: string | null
  published_at: Date | null
}

export default async function PromptGuidesIndexPage() {
  let guides: Guide[] = []

  try {
    const result = await sql`
      SELECT
        pp.id as page_id,
        pp.slug,
        pp.title as page_title,
        pg.title as guide_title,
        pg.description,
        pg.category,
        pg.published_at,
        (
          SELECT image_url
          FROM prompt_guide_items pgi
          WHERE pgi.guide_id = pg.id
          AND pgi.status = 'approved'
          AND pgi.image_url IS NOT NULL
          ORDER BY pgi.sort_order ASC, pgi.created_at ASC
          LIMIT 1
        ) as preview_image
      FROM prompt_pages pp
      JOIN prompt_guides pg ON pp.guide_id = pg.id
      WHERE pp.status = 'published'
      ORDER BY pg.published_at DESC NULLS LAST, pp.created_at DESC
    `

    guides = result as Guide[]
  } catch (error) {
    console.error("[PromptGuides] Error fetching guides:", error)
  }

  return (
    <main className={`guides-page ${inter.className}`}>
      <header className="site-header">
        <Link href="/" className={`logo ${cormorant.className}`}>
          SSELFIE
        </Link>
        <span className="header-label">PROMPT GUIDE LIBRARY</span>
      </header>

      <section className="hero">
        <div className="hero-bg-wrap">
          <Image src="/assets/brand-strategy/hero.png" alt="Prompt guides hero" fill priority sizes="100vw" className="hero-bg" />
        </div>
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-eyebrow">FREE GUIDES</p>
          <h1 className={`hero-title ${cormorant.className}`}>YOUR PROMPT GUIDE LANDING</h1>
          <p className="hero-copy">
            Explore curated prompt guides and create consistent, on-brand content using the same visual language as
            your Brand Strategy flow.
          </p>
        </div>
      </section>

      <section className="section">
        <p className="section-label">01 — AVAILABLE GUIDES</p>
        {guides.length === 0 ? (
          <div className="empty-state">
            <p>No guides available yet.</p>
          </div>
        ) : (
          <div className="guides-grid">
            {guides.map((guide, index) => (
              <Link key={guide.page_id} href={`/prompt-guides/${guide.slug}`} className="guide-card">
                <div className="guide-image-wrap">
                  {guide.preview_image ? (
                    <Image
                      src={guide.preview_image}
                      alt={guide.page_title}
                      fill
                      sizes="(max-width: 700px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="cover-image"
                    />
                  ) : (
                    <div className="guide-image-fallback">NO PREVIEW</div>
                  )}
                  <div className="guide-image-overlay" />
                  {index === 0 ? <span className="guide-badge">LATEST</span> : null}
                </div>
                <div className="guide-body">
                  <div className="guide-meta-label">{guide.category || "Prompt Guide"}</div>
                  <h2 className={`guide-title ${cormorant.className}`}>{guide.page_title}</h2>
                  {guide.description ? <p className="guide-description">{guide.description}</p> : null}
                  <span className="guide-cta">OPEN GUIDE →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <footer className="footer">
        <span className="footer-note">© 2026 SSELFIE Studio · sselfie.ai</span>
      </footer>

      <style>{`
        .guides-page {
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
          object-position: center 32%;
          filter: brightness(0.45);
        }

        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(10, 10, 10, 0.2) 0%,
            rgba(10, 10, 10, 0.2) 35%,
            rgba(10, 10, 10, 0.72) 75%,
            rgba(10, 10, 10, 1) 100%
          );
        }

        .hero-content {
          position: relative;
          z-index: 2;
          max-width: 880px;
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
        }

        .hero-copy {
          margin: 26px 0 0;
          font-size: 16px;
          line-height: 1.8;
          color: rgba(255, 255, 255, 0.75);
          max-width: 680px;
        }

        .section {
          padding: 80px 56px;
          max-width: 1080px;
          margin: 0 auto;
        }

        .section-label {
          margin: 0 0 36px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.35);
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.09);
        }

        .empty-state {
          border: 1px solid rgba(255, 255, 255, 0.09);
          background: rgba(255, 255, 255, 0.04);
          padding: 40px 32px;
        }

        .empty-state p {
          margin: 0;
          font-size: 13px;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
        }

        .guides-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }

        .guide-card {
          display: flex;
          flex-direction: column;
          border: 1px solid rgba(255, 255, 255, 0.09);
          text-decoration: none;
          color: inherit;
          transition: border-color 0.2s, transform 0.2s;
        }

        .guide-card:hover {
          border-color: rgba(255, 255, 255, 0.24);
          transform: translateY(-2px);
        }

        .guide-image-wrap {
          position: relative;
          height: 340px;
          overflow: hidden;
          border-bottom: 1px solid rgba(255, 255, 255, 0.09);
        }

        .cover-image {
          object-fit: cover;
          object-position: center;
        }

        .guide-image-fallback {
          height: 100%;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          letter-spacing: 0.45em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.35);
          background: rgba(255, 255, 255, 0.03);
        }

        .guide-image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, transparent 40%, rgba(10, 10, 10, 0.84) 100%);
        }

        .guide-badge {
          position: absolute;
          top: 16px;
          right: 16px;
          font-size: 9px;
          letter-spacing: 0.38em;
          text-transform: uppercase;
          padding: 6px 12px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          color: rgba(255, 255, 255, 0.72);
          background: rgba(10, 10, 10, 0.4);
          backdrop-filter: blur(12px);
        }

        .guide-body {
          background: rgba(255, 255, 255, 0.04);
          padding: 24px 24px 28px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .guide-meta-label {
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.35);
          margin-bottom: 12px;
        }

        .guide-title {
          margin: 0;
          font-weight: 400;
          font-size: 30px;
          line-height: 1.02;
          letter-spacing: -0.01em;
          text-transform: uppercase;
          color: #ffffff;
        }

        .guide-description {
          margin: 16px 0 18px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.72);
          line-height: 1.7;
          flex: 1;
        }

        .guide-cta {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.34em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.5);
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
            min-height: 66vh;
            padding: 48px 28px;
          }

          .section {
            padding: 56px 28px;
          }

          .guide-image-wrap {
            height: 300px;
          }
        }
      `}</style>
    </main>
  )
}
