import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"

import { sql } from "@/lib/db/client"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
})

type StarterKitRecord = {
  name?: string | null
  email?: string | null
  source?: string | null
  email_tags?: string[] | null
}

function upperName(name: string | undefined | null) {
  const value = (name || "Friend").trim()
  return value.length > 0 ? value.toUpperCase() : "FRIEND"
}

async function getStarterKitRecord(token: string): Promise<{
  status: "ok" | "not_found" | "error"
  data?: StarterKitRecord
}> {
  try {
    const rows = await sql`
      SELECT name, email, source, email_tags
      FROM freebie_subscribers
      WHERE access_token = ${token}
        AND (
          source = 'starter-kit-paid'
          OR 'starter-kit-paid' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
        )
      LIMIT 1
    `

    if (rows.length === 0) {
      return { status: "not_found" }
    }

    return {
      status: "ok",
      data: rows[0] as StarterKitRecord,
    }
  } catch (error) {
    console.error("[starter-kit access] DB error:", error)
    return { status: "error" }
  }
}

function StatusView({ title, body }: { title: string; body: string }) {
  return (
    <main className={`status-page ${inter.className}`}>
      <div className="status-card">
        <p className="status-label">SSELFIE</p>
        <h1 className={cormorant.className}>{title}</h1>
        <p>{body}</p>
        <Link href="/starter-kit" className="status-cta">
          Back to Starter Kit
        </Link>
      </div>

      <style>{`
        .status-page {
          min-height: 100vh;
          background: #0a0a0a;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .status-card {
          max-width: 580px;
          border: 1px solid rgba(229, 229, 229, 0.2);
          background: rgba(245, 245, 245, 0.06);
          backdrop-filter: blur(42px);
          padding: 38px 32px;
          border-radius: 18px;
        }

        .status-label {
          margin: 0 0 10px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.88);
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
          color: #ffffff;
        }

        .status-cta {
          margin-top: 22px;
          display: inline-block;
          color: #0a0a0a;
          background: #e5e5e5;
          padding: 12px 16px;
          font-size: 10px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          text-decoration: none;
          border-radius: 999px;
        }
      `}</style>
    </main>
  )
}

export default async function StarterKitAccessPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const result = await getStarterKitRecord(token)

  if (result.status === "not_found") {
    return (
      <StatusView
        title="INVALID ACCESS LINK"
        body="This Starter Kit link is not valid right now. Use the link from your email or contact hello@sselfie.ai if you need help."
      />
    )
  }

  if (result.status !== "ok" || !result.data) {
    return (
      <StatusView
        title="UNAVAILABLE"
        body="We could not load your Starter Kit right now. Please try again in a moment."
      />
    )
  }

  const presetDownloadUrl =
    process.env.STARTER_KIT_PRESET_DOWNLOAD_URL ||
    process.env.SELFIE_GUIDE_PRESET_DOWNLOAD_URL ||
    null
  const guideAccessUrl = `/selfie-guide/access/${token}`

  return (
    <main className={`starter-kit-page ${inter.className}`}>
      <section className="hero">
        <p className="eyebrow">Starter Kit Access</p>
        <h1 className={cormorant.className}>WELCOME, {upperName(result.data.name)}</h1>
        <p className="intro">
          Your Starter Kit is ready. Start with one cleaner selfie, download your presets, and use
          the 7-day starter to turn that photo into content.
        </p>
      </section>

      <section className="grid">
        <article className="card">
          <p className="card-label">Start Here</p>
          <h2 className={cormorant.className}>Your first photo to post</h2>
          <ol>
            <li>Open your camera and find a window with soft light.</li>
            <li>Take 10 photos instead of judging the first one.</li>
            <li>Choose one that already feels like you before you edit.</li>
            <li>Use one preset lightly. Stop before the photo stops feeling real.</li>
            <li>Write one simple caption: “This is what I am building next.”</li>
          </ol>
        </article>

        <article className="card">
          <p className="card-label">Downloads</p>
          <h2 className={cormorant.className}>Your kit files</h2>
          <p>
            The presets are here. Keep them simple. The goal is a photo that looks like you on a
            good day, not a different person.
          </p>
          {presetDownloadUrl ? (
            <a href={presetDownloadUrl} className="primary-cta">
              Download presets
            </a>
          ) : (
            <p className="note">Preset download will be added here as soon as the file is connected.</p>
          )}
        </article>

        <article className="card">
          <p className="card-label">Guide</p>
          <h2 className={cormorant.className}>Open the full guide</h2>
          <p>
            Your Starter Kit links straight into the Selfie Guide flow so you can move from the
            quick-start into light, angles, confidence, and the 7-day posting challenge.
          </p>
          <Link href={guideAccessUrl} className="secondary-cta">
            Open the Selfie Guide
          </Link>
        </article>
      </section>

      <style>{`
        .starter-kit-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top, rgba(196, 181, 160, 0.18), transparent 34%),
            #0f0d0b;
          color: #f4f0e6;
          padding: 56px 24px 72px;
        }

        .hero {
          max-width: 860px;
          margin: 0 auto 32px;
        }

        .eyebrow,
        .card-label {
          margin: 0 0 12px;
          font-size: 11px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(244, 240, 230, 0.52);
        }

        h1 {
          margin: 0;
          font-size: clamp(3rem, 7vw, 5.4rem);
          line-height: 0.95;
          font-weight: 300;
          letter-spacing: -0.04em;
        }

        .intro {
          max-width: 640px;
          margin-top: 20px;
          font-size: 1.02rem;
          line-height: 1.85;
          color: rgba(244, 240, 230, 0.78);
        }

        .grid {
          max-width: 1100px;
          margin: 0 auto;
          display: grid;
          gap: 20px;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        }

        .card {
          border: 1px solid rgba(244, 240, 230, 0.12);
          background: rgba(255, 255, 255, 0.03);
          padding: 28px;
          border-radius: 20px;
        }

        h2 {
          margin: 0;
          font-size: 2rem;
          font-weight: 300;
          line-height: 1.02;
        }

        p,
        li {
          color: rgba(244, 240, 230, 0.76);
          line-height: 1.8;
          font-size: 15px;
        }

        ol {
          padding-left: 18px;
          margin: 18px 0 0;
        }

        .primary-cta,
        .secondary-cta {
          margin-top: 18px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 0 18px;
          border-radius: 999px;
          text-decoration: none;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-size: 11px;
        }

        .primary-cta {
          background: #f4f0e6;
          color: #0f0d0b;
        }

        .secondary-cta {
          border: 1px solid rgba(244, 240, 230, 0.18);
          color: #f4f0e6;
        }

        .note {
          margin-top: 18px;
          color: rgba(244, 240, 230, 0.58);
        }
      `}</style>
    </main>
  )
}
