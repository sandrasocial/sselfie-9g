import Image from "next/image"
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

interface StrategyPillar {
  name?: string
  description?: string
  postIdeas?: string[]
}

interface StrategyVoice {
  tone?: string
  do?: string
  avoid?: string
  phrases?: string[]
}

interface StrategyExamplePost {
  hook?: string
  body?: string
  cta?: string
}

interface StrategyPack {
  positioning?: string[]
  pillars?: StrategyPillar[]
  voice?: StrategyVoice
  captionStarters?: string[]
  examplePosts?: StrategyExamplePost[]
}

interface StrategyResponse {
  name?: string
  business_type?: string
  target_audience?: string
  brand_vibe?: string
  strategy?: StrategyPack
  created_at?: string
}

function formatMonthYear(dateValue: string | undefined) {
  const date = dateValue ? new Date(dateValue) : new Date()
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  })
    .format(date)
    .toUpperCase()
}

function vibeLabel(vibe: string | undefined) {
  if (vibe === "bold") return "Bold & Edgy"
  if (vibe === "minimal") return "Minimal & Refined"
  if (vibe === "playful") return "Playful & Fun"
  if (vibe === "soft") return "Soft & Feminine"
  return "Warm & Real"
}

function upperName(name: string | undefined) {
  const value = (name || "Friend").trim()
  return value.length > 0 ? value.toUpperCase() : "FRIEND"
}

function normalizeArray(values: unknown, maxItems?: number): string[] {
  if (!Array.isArray(values)) {
    return []
  }

  const normalized = values
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)

  return typeof maxItems === "number" ? normalized.slice(0, maxItems) : normalized
}

function normalizePillars(values: unknown): StrategyPillar[] {
  if (!Array.isArray(values)) {
    return []
  }

  return values
    .map((pillar) => {
      if (!pillar || typeof pillar !== "object") return null
      const maybe = pillar as Record<string, unknown>
      const name = typeof maybe.name === "string" ? maybe.name.trim() : ""
      const description = typeof maybe.description === "string" ? maybe.description.trim() : ""
      const postIdeas = normalizeArray(maybe.postIdeas, 3)

      if (!name && !description && postIdeas.length === 0) {
        return null
      }

      return {
        name: name || "Content Pillar",
        description,
        postIdeas,
      }
    })
    .filter((pillar): pillar is StrategyPillar => Boolean(pillar))
}

function normalizeExamplePosts(values: unknown): StrategyExamplePost[] {
  if (!Array.isArray(values)) {
    return []
  }

  return values
    .map((post) => {
      if (!post || typeof post !== "object") return null
      const maybe = post as Record<string, unknown>
      const hook = typeof maybe.hook === "string" ? maybe.hook.trim() : ""
      const body = typeof maybe.body === "string" ? maybe.body.trim() : ""
      const cta = typeof maybe.cta === "string" ? maybe.cta.trim() : ""
      if (!hook && !body && !cta) {
        return null
      }
      return { hook, body, cta }
    })
    .filter((post): post is StrategyExamplePost => Boolean(post))
    .slice(0, 3)
}

async function getStrategy(token: string): Promise<{
  status: "ok" | "not_found" | "generating" | "error"
  data?: StrategyResponse
}> {
  try {
    const rows = await sql`
      SELECT name, business_type, target_audience, brand_vibe, strategy_json, created_at
      FROM freebie_brand_strategies
      WHERE access_token = ${token}
      LIMIT 1
    `
    if (rows.length === 0) {
      return { status: "not_found" }
    }
    const row = rows[0]
    if (!row.strategy_json) {
      return { status: "generating" }
    }
    return {
      status: "ok",
      data: {
        name: row.name,
        business_type: row.business_type,
        target_audience: row.target_audience,
        brand_vibe: row.brand_vibe,
        strategy: row.strategy_json as StrategyPack,
        created_at: row.created_at,
      },
    }
  } catch (err) {
    console.error("[strategy page] DB error:", err)
    return { status: "error" }
  }
}

function StrategyStatus({ title, body }: { title: string; body: string }) {
  return (
    <main className={`strategy-status ${inter.className}`}>
      <div className="status-card">
        <p className="status-label">SSELFIE</p>
        <h1 className={`${cormorant.className}`}>{title}</h1>
        <p>{body}</p>
      </div>

      <style>{`
        .strategy-status {
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
      `}</style>
    </main>
  )
}

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function FreebieStrategyResultPage({ params }: PageProps) {
  const { token } = await params
  const result = await getStrategy(token)

  if (result.status === "not_found") {
    return (
      <StrategyStatus
        title="STRATEGY NOT FOUND"
        body="This strategy link has expired or doesn't exist."
      />
    )
  }

  if (result.status === "generating") {
    return (
      <StrategyStatus
        title="MAYA IS STILL WRITING"
        body="Your strategy is still being prepared — refresh in a moment."
      />
    )
  }

  if (result.status !== "ok" || !result.data) {
    return (
      <StrategyStatus
        title="UNAVAILABLE"
        body="We couldn't load this strategy right now. Please try again in a moment."
      />
    )
  }

  const data = result.data
  const strategy = (data.strategy || {}) as Record<string, unknown>

  const positioning = normalizeArray(strategy.positioning)
  const pillars = normalizePillars(strategy.pillars)
  const captionStarters = normalizeArray(strategy.captionStarters, 10)
  const examplePosts = normalizeExamplePosts(strategy.examplePosts)
  const voice = (strategy.voice || {}) as StrategyVoice

  const safePillars: StrategyPillar[] =
    pillars.length > 0
      ? pillars
      : [
          {
            name: "Core Story",
            description: "Lead with one lived truth your audience instantly recognizes.",
            postIdeas: ["Share the turning point", "Tell a behind-the-scenes moment", "Ask a direct reflection question"],
          },
        ]

  const safeCaptionStarters =
    captionStarters.length > 0
      ? captionStarters
      : [
          "I wish someone told me this sooner...",
          "You don't need to wait until you're ready...",
          "Here's what changed when I finally got honest...",
        ]

  const safeExamplePosts: StrategyExamplePost[] =
    examplePosts.length > 0
      ? examplePosts
      : [
          {
            hook: "You're not behind. You're just rebuilding differently.",
            body: "Most women I work with think they need a full rebrand before they post. They don't. They need one honest angle and one message they can repeat.",
            cta: "If this is you, send me the word REBUILD.",
          },
        ]

  const createdFor = upperName(data.name)
  const monthYear = formatMonthYear(data.created_at)
  const pillarImages = [
    "/assets/brand-strategy/pillar1.png",
    "/assets/brand-strategy/pillar2.png",
    "/assets/brand-strategy/journals.png",
    "/assets/brand-strategy/flowers.png",
    "/assets/brand-strategy/ocean.png",
  ]

  return (
    <main className={`strategy-page ${inter.className}`}>
      <header className="site-header">
        <a href="https://sselfie.ai" className={`logo ${cormorant.className}`}>
          SSELFIE
        </a>
        <span className="header-label">YOUR BRAND STRATEGY</span>
      </header>

      <section className="hero">
        <div className="hero-bg-wrap">
          <Image src="/assets/brand-strategy/hero.png" alt="Hero background" fill priority sizes="100vw" className="hero-bg" />
        </div>
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-eyebrow">CREATED FOR</p>
          <h1 className={`hero-name ${cormorant.className}`}>{createdFor}</h1>
          <div className="hero-meta">
            <div>
              <div className="meta-label">Date</div>
              <div className="meta-value">{monthYear}</div>
            </div>
            <div>
              <div className="meta-label">Business</div>
              <div className="meta-value">{data.business_type || "Personal Brand"}</div>
            </div>
            <div>
              <div className="meta-label">Audience</div>
              <div className="meta-value">{data.target_audience || "Women building online"}</div>
            </div>
            <div>
              <div className="meta-label">Brand Vibe</div>
              <div className="meta-value">{vibeLabel(data.brand_vibe)}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <p className="section-label">01 — YOUR POSITIONING</p>
        <div className="positioning-split">
          <div className="positioning-image-wrap">
            <Image src="/assets/brand-strategy/journals.png" alt="Journals" fill sizes="(max-width: 700px) 100vw, 40vw" className="cover-image" />
          </div>
          <div className="positioning-text">
            <span className="positioning-badge">PRIMARY</span>
            <p className={`positioning-statement ${cormorant.className}`}>
              {positioning[0] || "Your personalized positioning statement is being finalized."}
            </p>
          </div>
        </div>

        {positioning[1] ? (
          <div className="positioning-alt">
            <span className="positioning-badge">ALTERNATIVE</span>
            <p className={`positioning-statement ${cormorant.className}`}>{positioning[1]}</p>
          </div>
        ) : null}
      </section>

      <hr className="divider" />

      <section className="editorial-strip">
        <div className="editorial-text">
          <p className="editorial-eyebrow">YOUR VOICE</p>
          <p className={`editorial-quote ${cormorant.className}`}>{voice.tone || "Warm and direct. Personal and true."}</p>
          <div className="editorial-subgrid">
            <div>
              <p className="editorial-sub-label">WHAT TO DO</p>
              <p className="editorial-sub-copy">{voice.do || "Lead with emotion, stay specific, and speak like you talk."}</p>
            </div>
            <div>
              <p className="editorial-sub-label">WHAT TO AVOID</p>
              <p className="editorial-sub-copy">{voice.avoid || "Generic language, perfection, and empty motivational clichés."}</p>
            </div>
          </div>
          {Array.isArray(voice?.phrases) && voice.phrases.length > 0 ? (
            <ul className="phrases-list">
              {voice.phrases.slice(0, 6).map((phrase, index) => (
                <li key={`${phrase}-${index}`}>{phrase}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="editorial-image-wrap">
          <Image src="/assets/brand-strategy/woman.png" alt="Woman portrait" fill sizes="(max-width: 700px) 100vw, 35vw" className="cover-image top" />
        </div>
      </section>

      <hr className="divider" />

      <section className="section">
        <p className="section-label">02 — YOUR CONTENT PILLARS</p>
        <div className="pillars-grid">
          {safePillars.map((pillar, index) => (
            <article key={`${pillar.name || "pillar"}-${index}`} className="pillar-card">
              <div className="pillar-image-wrap">
                <Image
                  src={pillarImages[index % pillarImages.length]}
                  alt={pillar.name || `Pillar ${index + 1}`}
                  fill
                  sizes="(max-width: 700px) 100vw, 30vw"
                  className="cover-image"
                />
                <div className="pillar-image-overlay" />
                <span className="pillar-number-on-image">PILLAR {String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="pillar-body">
                <h3 className={`pillar-name ${cormorant.className}`}>{pillar.name || "Content Pillar"}</h3>
                <p className="pillar-desc">{pillar.description || "Use this pillar to anchor your weekly content."}</p>
                <div className="pillar-ideas-label">POST IDEAS</div>
                <ul className="pillar-ideas">
                  {(pillar.postIdeas && pillar.postIdeas.length > 0
                    ? pillar.postIdeas
                    : ["Share the story behind this", "Teach one tiny lesson", "Invite conversation"]
                  ).map((idea, ideaIndex) => (
                    <li key={`${idea}-${ideaIndex}`}>{idea}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>

      <hr className="divider" />

      <section className="section">
        <p className="section-label">03 — CAPTION STARTERS</p>
        <div className="starters-grid">
          {safeCaptionStarters.map((starter, index) => (
            <div key={`${starter}-${index}`} className="starter-chip">
              {starter}
            </div>
          ))}
        </div>
      </section>

      <hr className="divider" />

      <section className="section">
        <p className="section-label">04 — EXAMPLE POSTS</p>
        {safeExamplePosts.map((post, index) => (
          <article key={`${post.hook || "post"}-${index}`} className="post-card">
            <div className="post-meta-label">HOOK</div>
            <p className={`post-hook ${cormorant.className}`}>{post.hook || "Start with an honest hook."}</p>
            <div className="post-meta-label">BODY</div>
            <p className="post-body">{post.body || "Tell the story in 2-3 clear sentences."}</p>
            <div className="post-meta-label">CTA</div>
            <p className="post-cta">{post.cta || "Invite the reader to reply or share."}</p>
          </article>
        ))}
      </section>

      <section className="upsell-section">
        <div className="upsell-bg-wrap">
          <Image src="/assets/brand-strategy/ocean.png" alt="Ocean background" fill sizes="100vw" className="cover-image" />
        </div>
        <div className="upsell-overlay" />
        <div className="upsell-content">
          <p className="upsell-eyebrow">READY TO GO FURTHER?</p>
          <h2 className={`upsell-heading ${cormorant.className}`}>Join SSELFIE Studio</h2>
          <p className="upsell-body">
            Turn this strategy into real content. Every month: new AI tools, live sessions with Sandra, your Feed
            Planner, and a community of women building their brand.
          </p>
          <div className="upsell-buttons">
            <a href="https://sselfie.ai/auth/sign-up?checkout=studio_membership" className="btn-primary">
              Join Studio — €97/month
            </a>
            <a href="https://sselfie.ai/checkout/blueprint" className="btn-secondary">
              Try Feed Planner first
            </a>
          </div>
        </div>
      </section>

      <footer className="footer">
        <span className="footer-note">© 2026 SSELFIE Studio · sselfie.ai</span>
      </footer>

      <style>{`
        .strategy-page {
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
          min-height: 92vh;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 80px 56px;
          overflow: hidden;
        }

        .hero-bg-wrap,
        .upsell-bg-wrap,
        .positioning-image-wrap,
        .editorial-image-wrap,
        .pillar-image-wrap {
          position: relative;
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
            rgba(10, 10, 10, 0) 40%,
            rgba(10, 10, 10, 0.7) 75%,
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

        .hero-name {
          margin: 0;
          font-weight: 300;
          font-size: clamp(52px, 8vw, 96px);
          line-height: 1;
          letter-spacing: -0.02em;
          text-transform: uppercase;
          color: #ffffff;
        }

        .hero-meta {
          margin-top: 40px;
          display: flex;
          gap: 28px;
          flex-wrap: wrap;
          padding-top: 30px;
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
          max-width: 960px;
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

        .positioning-split {
          display: grid;
          grid-template-columns: 1fr 1.4fr;
          border: 1px solid rgba(255, 255, 255, 0.09);
          margin-bottom: 16px;
          min-height: 340px;
        }

        .positioning-image-wrap {
          min-height: 280px;
        }

        .cover-image {
          object-fit: cover;
          object-position: center;
        }

        .cover-image.top {
          object-position: center top;
        }

        .positioning-text {
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(20px);
          padding: 44px 40px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .positioning-badge {
          display: inline-block;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.45em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.09);
          padding: 5px 12px;
          margin-bottom: 20px;
          align-self: flex-start;
        }

        .positioning-statement {
          margin: 0;
          font-weight: 300;
          font-size: clamp(20px, 2.5vw, 28px);
          line-height: 1.4;
          letter-spacing: -0.01em;
          color: #ffffff;
        }

        .positioning-alt {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.09);
          padding: 32px 36px;
        }

        .positioning-alt .positioning-statement {
          font-size: clamp(17px, 2vw, 22px);
          color: rgba(255, 255, 255, 0.75);
        }

        .divider {
          border: none;
          border-top: 1px solid rgba(255, 255, 255, 0.09);
        }

        .editorial-strip {
          display: grid;
          grid-template-columns: 2fr 1fr;
          border-top: 1px solid rgba(255, 255, 255, 0.09);
          border-bottom: 1px solid rgba(255, 255, 255, 0.09);
          min-height: 320px;
        }

        .editorial-text {
          padding: 56px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          background: #0a0a0a;
        }

        .editorial-eyebrow {
          margin: 0 0 20px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.35);
        }

        .editorial-quote {
          margin: 0;
          font-size: clamp(24px, 3vw, 36px);
          line-height: 1.3;
          letter-spacing: -0.01em;
          color: #ffffff;
          font-style: italic;
        }

        .editorial-subgrid {
          margin-top: 18px;
          display: grid;
          gap: 16px;
          grid-template-columns: 1fr 1fr;
        }

        .editorial-sub-label {
          margin: 0 0 8px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.38em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.35);
        }

        .editorial-sub-copy {
          margin: 0;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.5);
          line-height: 1.8;
        }

        .phrases-list {
          list-style: none;
          margin: 18px 0 0;
          padding: 0;
        }

        .phrases-list li {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.75);
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          font-style: italic;
        }

        .phrases-list li:last-child {
          border-bottom: none;
        }

        .editorial-image-wrap {
          min-height: 320px;
        }

        .pillars-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 12px;
        }

        .pillar-card {
          display: flex;
          flex-direction: column;
          border: 1px solid rgba(255, 255, 255, 0.09);
          overflow: hidden;
        }

        .pillar-image-wrap {
          height: 200px;
          flex-shrink: 0;
        }

        .pillar-image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, transparent 40%, rgba(10, 10, 10, 0.85) 100%);
        }

        .pillar-number-on-image {
          position: absolute;
          bottom: 16px;
          left: 16px;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.45em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.5);
        }

        .pillar-body {
          background: rgba(255, 255, 255, 0.04);
          padding: 24px 24px 28px;
          flex: 1;
        }

        .pillar-name {
          margin: 0 0 10px;
          font-weight: 400;
          font-size: 20px;
          letter-spacing: -0.01em;
          text-transform: uppercase;
          color: #ffffff;
          line-height: 1.1;
        }

        .pillar-desc {
          margin: 0 0 18px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.75);
          line-height: 1.7;
        }

        .pillar-ideas-label {
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.35);
          margin-bottom: 8px;
        }

        .pillar-ideas {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .pillar-ideas li {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.75);
          line-height: 1.65;
          padding: 5px 0 5px 18px;
          position: relative;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        }

        .pillar-ideas li:last-child {
          border-bottom: none;
        }

        .pillar-ideas li::before {
          content: "→";
          position: absolute;
          left: 0;
          color: rgba(255, 255, 255, 0.35);
          font-size: 11px;
          top: 6px;
        }

        .starters-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .starter-chip {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.09);
          padding: 18px 22px;
          font-size: 14px;
          color: rgba(255, 255, 255, 0.75);
          line-height: 1.55;
        }

        .post-card {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.09);
          padding: 40px 44px;
          margin-bottom: 12px;
        }

        .post-meta-label {
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.35);
          margin-bottom: 8px;
          margin-top: 20px;
        }

        .post-meta-label:first-child {
          margin-top: 0;
        }

        .post-hook {
          margin: 0 0 4px;
          font-size: clamp(20px, 2.5vw, 26px);
          color: #ffffff;
          line-height: 1.35;
        }

        .post-body {
          margin: 0;
          font-size: 15px;
          color: rgba(255, 255, 255, 0.75);
          line-height: 1.8;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          white-space: pre-wrap;
        }

        .post-cta {
          margin: 0;
          font-size: 14px;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.5);
        }

        .upsell-section {
          position: relative;
          overflow: hidden;
          margin: 0;
        }

        .upsell-bg-wrap {
          position: absolute;
          inset: 0;
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
          margin: 0 auto 40px;
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
          padding: 18px 52px;
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
          padding: 14px 40px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          text-decoration: none;
          transition: border-color 0.2s;
        }

        .btn-secondary:hover {
          border-color: rgba(255, 255, 255, 0.5);
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
            padding: 48px 28px;
            min-height: 85vh;
          }

          .section {
            padding: 56px 28px;
          }

          .positioning-split {
            grid-template-columns: 1fr;
          }

          .positioning-image-wrap {
            min-height: 220px;
          }

          .editorial-strip {
            grid-template-columns: 1fr;
          }

          .editorial-image-wrap {
            min-height: 250px;
            order: -1;
          }

          .editorial-text {
            padding: 36px 28px;
          }

          .editorial-subgrid {
            grid-template-columns: 1fr;
          }

          .starters-grid {
            grid-template-columns: 1fr;
          }

          .post-card {
            padding: 30px 28px;
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
