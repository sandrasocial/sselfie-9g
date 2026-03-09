import { readFile } from "node:fs/promises"
import path from "node:path"
import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { sql } from "@/lib/db/client"
import SelfieGuideExperience from "@/components/freebie/selfie-guide-experience"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
})

const GUIDE_CONTENT_PATH = path.join(process.cwd(), "content-templates", "selfie-guide-content-v3.md")

const FALLBACK_GUIDE_MARKDOWN = `## Guide Content Unavailable

We could not load the full guide content right now. Please refresh this page or request a fresh access link.`

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

function StatusView({ title, body, ctaLabel = "Back to Selfie Guide" }: { title: string; body: string; ctaLabel?: string }) {
  return (
    <main className={`status-page ${inter.className}`}>
      <div className="status-card">
        <p className="status-label">SSELFIE</p>
        <h1 className={cormorant.className}>{title}</h1>
        <p>{body}</p>
        <Link href="/selfie-guide" className="status-cta">
          {ctaLabel}
        </Link>
      </div>

      <style>{`
        .status-page {
          min-height: 100vh;
          background: #0d0c0b;
          color: #f0ede8;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .status-card {
          max-width: 580px;
          border: 1px solid rgba(195, 190, 182, 0.25);
          background: rgba(175, 170, 162, 0.1);
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
          color: #8a8780;
        }

        h1 {
          margin: 0;
          font-size: clamp(30px, 6vw, 52px);
          font-weight: 300;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: #f0ede8;
          line-height: 1;
        }

        p {
          margin: 16px 0 0;
          font-size: 15px;
          line-height: 1.8;
          color: #c8c4bb;
        }

        .status-cta {
          margin-top: 22px;
          display: inline-block;
          color: #0d0c0b;
          background: #c8c4bb;
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

interface PageProps {
  params: Promise<{ token: string }>
  searchParams: Promise<{ checkout_session?: string; brand_strategy_bump?: string }>
}

export default async function SelfieGuideAccessPage({ params, searchParams }: PageProps) {
  const { token } = await params
  const query = await searchParams
  const [result, guideMarkdown] = await Promise.all([getSubscriber(token), getGuideMarkdown()])

  if (result.status === "not_found") {
    return (
      <StatusView
        title="INVALID ACCESS LINK"
        body="This guide link is not valid right now. Go back to the Selfie Guide page, use the link from your email, or contact support if you need help."
      />
    )
  }

  if (result.status !== "ok" || !result.data) {
    return <StatusView title="UNAVAILABLE" body="We couldn't load your guide right now. Please try again in a moment." />
  }

  return (
    <SelfieGuideExperience
      firstName={upperName(result.data.name)}
      guideMarkdown={guideMarkdown}
      checkoutSessionId={typeof query.checkout_session === "string" ? query.checkout_session : undefined}
      brandStrategyBumpSelected={query.brand_strategy_bump === "1"}
    />
  )
}
