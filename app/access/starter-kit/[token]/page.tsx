import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"

import { sql } from "@/lib/db/client"
import { logAnalyticsEvent } from "@/lib/analytics/events"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
})

const STARTER_KIT_DNG_PRESET_URL =
  "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/academy/starter-kit/presets/starter-kit-dng-presets.zip"
const STARTER_KIT_PRESET_GUIDE_URL =
  "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/academy/starter-kit/presets/sselfie-preset-setup-guide.pdf"
const STARTER_KIT_POSING_GUIDE_URL =
  "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/academy/starter-kit/sselfie-posing-guide.pdf"
const STARTER_KIT_CAPTIONS_URL =
  "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/academy/starter-kit/sselfie-instagram-captions-content-ideas.pdf"
const STARTER_KIT_STORYTELLING_URL =
  "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/academy/starter-kit/sselfie-selfie-to-ceo-storytelling-captions.pdf"

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

function buildSystemUpgradeHref(token: string, email?: string | null) {
  const params = new URLSearchParams({
    source: "starter_kit_access",
    utm_source: "owned",
    utm_medium: "starter_kit_access",
    utm_campaign: "starter_kit_to_selfie_to_brand_shoot_system",
    utm_content: "starter_kit_access_upgrade_block",
    checkout_source: "starter_kit_buyer_upgrade_credit",
    cta_keyword: "STARTER_KIT",
    buyer_stage: "micro",
    starter_kit_credit: "1",
    upgrade_credit: "3700",
    freebie_token: token,
  })

  const cleanEmail = email?.trim().toLowerCase()
  if (cleanEmail) {
    params.set("checkout_email", cleanEmail)
  }

  return `/checkout/selfie-to-brand-shoot?${params.toString()}`
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

  const desktopPresetDownloadUrl = process.env.STARTER_KIT_PRESET_DOWNLOAD_URL || null
  const guideAccessUrl = `/selfie-guide/access/${token}`
  const systemUpgradeHref = buildSystemUpgradeHref(token, result.data.email)

  // Log access event (fire-and-forget — do not block render)
  logAnalyticsEvent({
    eventName: "starter_kit_access_opened",
    path: `/access/starter-kit/${token}`,
    properties: { source: result.data.source ?? null },
  }).catch(() => {})

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

      <section className="system-upgrade">
        <div className="system-upgrade-copy">
          <p className="eyebrow">YOUR $37 IS A CREDIT</p>
          <h2 className={cormorant.className}>Ready for the full thing? Your $37 comes off.</h2>
          <p>
            The Selfie to Brand Shoot System is the complete guided path. Choose your look, build
            a full shoot from one selfie, and turn it into content. Your Starter Kit credit is
            already applied, so it&apos;s $160 instead of $197. No code needed.
          </p>
        </div>
        <div className="system-upgrade-card">
          <span>$37 credit applied</span>
          <strong className={cormorant.className}>The Selfie to Brand Shoot System</strong>
          <p>Your Starter Kit helps create the source photo. The System shows you what to do with it.</p>
          <Link href={systemUpgradeHref} className="primary-cta">
            See the System · $160
          </Link>
        </div>
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
          <div className="format-note">
            <p className="format-label">Which files should I use?</p>
            <p>
              Editing on your phone? Use the DNG preset files. Editing in Lightroom on desktop?
              Use the XMP preset files.
            </p>
          </div>
          <div className="download-actions">
            <a href={STARTER_KIT_DNG_PRESET_URL} className="primary-cta">
              DNG mobile presets
            </a>
            <a href={STARTER_KIT_PRESET_GUIDE_URL} className="secondary-cta">
              Setup guide
            </a>
            {desktopPresetDownloadUrl ? (
              <a href={desktopPresetDownloadUrl} className="secondary-cta">
                Desktop XMP files
              </a>
            ) : null}
          </div>
        </article>

        <article className="card">
          <p className="card-label">PDF Guides</p>
          <h2 className={cormorant.className}>Your kit guides</h2>
          <p>
            Three guides to support your photos from setup to caption. Download and keep them for
            reference.
          </p>
          <div className="download-actions">
            <a href={STARTER_KIT_POSING_GUIDE_URL} className="primary-cta" download>
              Download Posing Guide
            </a>
            <a href={STARTER_KIT_CAPTIONS_URL} className="secondary-cta" download>
              Download Caption Templates
            </a>
            <a href={STARTER_KIT_STORYTELLING_URL} className="secondary-cta" download>
              Download Storytelling Guide
            </a>
          </div>
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

      <section className="system-upgrade">
        <div className="system-upgrade-copy">
          <p className="eyebrow">Next Step</p>
          <h2 className={cormorant.className}>Now turn the selfie into the shoot.</h2>
          <p>
            The Starter Kit helps you create the source photo. Selfie to Brand Shoot shows you how
            to turn that one clear selfie into your first AI brand images, choose the results that
            still look like you, and use them in your content.
          </p>
        </div>
        <div className="system-upgrade-card">
          <span>$37 credit applied</span>
          <strong className={cormorant.className}>Complete the System for $160.</strong>
          <p>You keep the Starter Kit and add the guided brand shoot path.</p>
          <Link href={systemUpgradeHref} className="primary-cta">
            Complete the System
          </Link>
        </div>
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

        .system-upgrade {
          max-width: 1100px;
          margin: 24px auto 0;
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
          gap: 20px;
          border: 1px solid rgba(244, 240, 230, 0.14);
          background: rgba(244, 240, 230, 0.04);
          padding: 28px;
          border-radius: 20px;
        }

        .system-upgrade-copy p {
          max-width: 640px;
        }

        .system-upgrade-card {
          border: 1px solid rgba(244, 240, 230, 0.16);
          background: rgba(15, 13, 11, 0.42);
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
        }

        .system-upgrade-card span {
          font-size: 10px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(244, 240, 230, 0.58);
        }

        .system-upgrade-card strong {
          margin-top: 10px;
          font-size: 2rem;
          font-weight: 300;
          line-height: 1;
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

        .download-actions {
          margin-top: 18px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .download-actions .primary-cta,
        .download-actions .secondary-cta {
          margin-top: 0;
        }

        .format-note {
          margin-top: 18px;
          border: 1px solid rgba(244, 240, 230, 0.14);
          padding: 16px;
          background: rgba(244, 240, 230, 0.05);
        }

        .format-note p {
          margin: 0;
          font-size: 13px;
          line-height: 1.7;
        }

        .format-label {
          margin-bottom: 8px !important;
          font-size: 10px !important;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          color: rgba(244, 240, 230, 0.58) !important;
        }

        @media (max-width: 760px) {
          .system-upgrade {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  )
}
