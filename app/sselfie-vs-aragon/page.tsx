import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500"] })

export const metadata: Metadata = {
  title: "SSELFIE vs Aragon AI — Which Is Better for Personal Brand Photos?",
  description:
    "Honest comparison: SSELFIE vs Aragon AI for personal brand photos. Aragon is great for one-time headshots. SSELFIE is built for ongoing content — unlimited photos, your face, your brand voice, every week.",
  openGraph: {
    title: "SSELFIE vs Aragon AI — Which Is Better for Personal Brand Photos?",
    description:
      "Aragon gives you 40 headshots once. SSELFIE gives you unlimited brand photos forever — trained on your face, guided by your brand. Here's the honest difference.",
    url: "https://sselfie.ai/sselfie-vs-aragon",
    type: "article",
    images: [{ url: "https://sselfie.ai/og-image.png", width: 1200, height: 630 }],
  },
  alternates: { canonical: "https://sselfie.ai/sselfie-vs-aragon" },
}

const BLOB = "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com"
const IMAGES = {
  hero: `${BLOB}/maya-pro-generations/mg0q5j29yhrmr0cvh4gax57cnr-p22TsIJ1grFHwnQrt2tXZ5foPm1vvv.png`,
  result1: `${BLOB}/maya-pro-generations/30vxpdwy61rmw0cvdxj8apjzgc-xG6gcWZ8hR4QLToseBbqTGM0dPr9NM.png`,
  result2: `${BLOB}/maya-pro-generations/6sb8n7v1g9rmr0cvhyjr95kg5g-5IoNZKlXP8Umw6U040gkJeTer43jLY.png`,
  result3: `${BLOB}/maya-pro-generations/c8cjbbd6ehrmt0cvhqasfj7q30-CVfFXH8JOv3NtYQFMbPU0opeNPo6De.png`,
  sandra: `${BLOB}/tmpbmq4nfg7.png`,
}

const comparisonSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "SSELFIE vs Aragon AI — Which Is Better for Personal Brand Photos?",
  description:
    "An honest side-by-side comparison of SSELFIE and Aragon AI for personal brand photographers, coaches, and content creators.",
  author: {
    "@type": "Person",
    name: "Sandra",
    url: "https://sselfie.ai",
    description: "Founder of SSELFIE, personal branding expert, 180K+ Instagram followers",
  },
  publisher: {
    "@type": "Organization",
    name: "SSELFIE",
    url: "https://sselfie.ai",
  },
  datePublished: "2026-03-16",
  dateModified: "2026-03-16",
  mainEntityOfPage: { "@type": "WebPage", "@id": "https://sselfie.ai/sselfie-vs-aragon" },
  image: IMAGES.hero,
  keywords:
    "SSELFIE vs Aragon, Aragon AI alternative, AI headshots personal branding, AI brand photos comparison, best AI for personal brand",
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Is SSELFIE better than Aragon AI?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It depends what you need. Aragon is great if you want 40 professional headshots once and you're done. SSELFIE is better if you need ongoing brand photos every week — different outfits, scenes, contexts — because it trains a custom AI model on your face and lets you generate unlimited photos on demand for $97/month.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between SSELFIE and Aragon AI?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Aragon is a one-time headshot tool. You upload photos, get ~40 AI headshots, and you're done. SSELFIE is a personal branding platform — it trains a custom model on your face, has an AI assistant (Maya) who knows your brand voice, plans your Instagram feed, writes captions, and generates unlimited brand photos in any style, setting, or outfit.",
      },
    },
    {
      "@type": "Question",
      name: "How much does Aragon AI cost vs SSELFIE?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Aragon charges around $29–$99 per session for a one-time batch of headshots. SSELFIE Studio is $97/month for unlimited photos, custom model training, feed planning, and AI caption writing. If you need fresh content every month, SSELFIE is more cost-effective.",
      },
    },
    {
      "@type": "Question",
      name: "Can Aragon AI be used for Instagram content?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Not really — Aragon creates headshots, not ongoing content. The photos have a similar corporate look. SSELFIE is specifically designed for Instagram content creators and personal brands — different backgrounds, outfits, vibes, and a feed planner built in.",
      },
    },
  ],
}

export default function SSELFIEvsAragonPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(comparisonSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <style jsx global>{`
        .vs-page {
          background: #0d0c0b;
          color: #f0ede8;
          min-height: 100vh;
        }
        .vs-page * {
          box-sizing: border-box;
        }
        .vs-hero {
          position: relative;
          overflow: hidden;
          min-height: 70vh;
          display: flex;
          align-items: flex-end;
          padding: 0 24px 64px;
        }
        .vs-hero-img {
          position: absolute;
          inset: 0;
          object-fit: cover;
          object-position: center top;
          z-index: 0;
        }
        .vs-hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(13,12,11,0.15) 0%, rgba(13,12,11,0.7) 60%, rgba(13,12,11,0.97) 100%);
          z-index: 1;
        }
        .vs-hero-content {
          position: relative;
          z-index: 2;
          max-width: 760px;
          margin: 0 auto;
          width: 100%;
        }
        .vs-label {
          font-family: var(--inter);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #8a8780;
          margin-bottom: 16px;
        }
        .vs-h1 {
          font-size: clamp(2.2rem, 5vw, 3.8rem);
          font-weight: 300;
          line-height: 1.1;
          letter-spacing: -0.01em;
          color: #f0ede8;
          margin: 0 0 20px;
          text-shadow: 0 2px 20px rgba(0,0,0,0.5);
        }
        .vs-hero-sub {
          font-family: var(--inter);
          font-size: 1rem;
          font-weight: 300;
          color: #c8c4bb;
          line-height: 1.65;
          max-width: 560px;
        }
        .vs-section {
          max-width: 760px;
          margin: 0 auto;
          padding: 64px 24px;
        }
        .vs-section + .vs-section {
          padding-top: 0;
        }
        .vs-h2 {
          font-size: clamp(1.6rem, 3.5vw, 2.4rem);
          font-weight: 300;
          color: #f0ede8;
          margin: 0 0 32px;
          line-height: 1.2;
        }
        .vs-body {
          font-family: var(--inter);
          font-size: 1rem;
          font-weight: 300;
          color: #c8c4bb;
          line-height: 1.75;
          margin: 0 0 20px;
        }
        .vs-body strong {
          color: #f0ede8;
          font-weight: 400;
        }
        /* Comparison table */
        .vs-table-wrap {
          overflow-x: auto;
          margin: 40px 0;
          border-radius: 4px;
          border: 1px solid rgba(240,237,232,0.08);
        }
        .vs-table {
          width: 100%;
          border-collapse: collapse;
          font-family: var(--inter);
          font-size: 0.875rem;
        }
        .vs-table thead tr {
          background: rgba(240,237,232,0.06);
        }
        .vs-table th {
          padding: 16px 20px;
          text-align: left;
          font-weight: 500;
          color: #f0ede8;
          font-size: 0.8rem;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          border-bottom: 1px solid rgba(240,237,232,0.1);
          white-space: nowrap;
        }
        .vs-table th:first-child {
          color: #8a8780;
        }
        .vs-table td {
          padding: 14px 20px;
          color: #c8c4bb;
          border-bottom: 1px solid rgba(240,237,232,0.05);
          vertical-align: top;
          line-height: 1.5;
        }
        .vs-table td:first-child {
          color: #8a8780;
          font-size: 0.8rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }
        .vs-table td.win {
          color: #f0ede8;
        }
        .vs-table td.lose {
          color: #8a8780;
        }
        .vs-table tr:last-child td {
          border-bottom: none;
        }
        .vs-table tr:hover td {
          background: rgba(240,237,232,0.02);
        }
        /* Gallery */
        .vs-gallery {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin: 32px 0;
        }
        .vs-gallery-img {
          aspect-ratio: 3/4;
          overflow: hidden;
          border-radius: 2px;
        }
        .vs-gallery-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
        }
        /* Verdict blocks */
        .vs-verdict {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin: 32px 0;
        }
        .vs-verdict-card {
          padding: 28px;
          border: 1px solid rgba(240,237,232,0.1);
          border-radius: 4px;
        }
        .vs-verdict-card.winner {
          border-color: rgba(240,237,232,0.25);
          background: rgba(240,237,232,0.04);
        }
        .vs-verdict-title {
          font-size: 0.7rem;
          font-family: var(--inter);
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #8a8780;
          margin-bottom: 8px;
        }
        .vs-verdict-card.winner .vs-verdict-title {
          color: #c8c4bb;
        }
        .vs-verdict-name {
          font-size: 1.3rem;
          font-weight: 300;
          color: #f0ede8;
          margin-bottom: 12px;
        }
        .vs-verdict-text {
          font-family: var(--inter);
          font-size: 0.875rem;
          font-weight: 300;
          color: #8a8780;
          line-height: 1.65;
        }
        .vs-verdict-card.winner .vs-verdict-text {
          color: #c8c4bb;
        }
        /* Sandra note */
        .vs-note {
          border-left: 2px solid rgba(240,237,232,0.2);
          padding: 24px 28px;
          margin: 40px 0;
        }
        .vs-note-author {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .vs-note-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
        }
        .vs-note-name {
          font-family: var(--inter);
          font-size: 0.8rem;
          font-weight: 500;
          color: #f0ede8;
          letter-spacing: 0.04em;
        }
        .vs-note-title {
          font-family: var(--inter);
          font-size: 0.75rem;
          color: #8a8780;
          margin-top: 2px;
        }
        .vs-note-text {
          font-family: var(--inter);
          font-size: 0.9rem;
          font-weight: 300;
          color: #c8c4bb;
          line-height: 1.75;
          font-style: italic;
        }
        /* FAQ */
        .vs-faq {
          margin: 16px 0;
        }
        .vs-faq details {
          border-bottom: 1px solid rgba(240,237,232,0.08);
          padding: 20px 0;
        }
        .vs-faq summary {
          font-family: var(--inter);
          font-size: 0.95rem;
          font-weight: 400;
          color: #f0ede8;
          cursor: pointer;
          list-style: none;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }
        .vs-faq summary::-webkit-details-marker { display: none; }
        .vs-faq summary::after {
          content: "+";
          font-size: 1.2rem;
          color: #8a8780;
          flex-shrink: 0;
          transition: transform 0.2s;
        }
        .vs-faq details[open] summary::after {
          transform: rotate(45deg);
        }
        .vs-faq-answer {
          font-family: var(--inter);
          font-size: 0.875rem;
          font-weight: 300;
          color: #c8c4bb;
          line-height: 1.75;
          margin-top: 16px;
          padding-right: 32px;
        }
        /* CTA */
        .vs-cta {
          background: rgba(240,237,232,0.04);
          border: 1px solid rgba(240,237,232,0.1);
          border-radius: 4px;
          padding: 48px 40px;
          text-align: center;
          margin: 16px 0;
        }
        .vs-cta-h {
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 300;
          color: #f0ede8;
          margin: 0 0 12px;
        }
        .vs-cta-sub {
          font-family: var(--inter);
          font-size: 0.9rem;
          font-weight: 300;
          color: #8a8780;
          margin: 0 0 32px;
          line-height: 1.65;
        }
        .vs-btn-row {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .vs-btn-primary {
          display: inline-block;
          padding: 14px 28px;
          background: #f0ede8;
          color: #0d0c0b;
          font-family: var(--inter);
          font-size: 0.8rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          text-decoration: none;
          border-radius: 2px;
          transition: opacity 0.2s;
        }
        .vs-btn-primary:hover { opacity: 0.88; }
        .vs-btn-secondary {
          display: inline-block;
          padding: 14px 28px;
          border: 1px solid rgba(240,237,232,0.25);
          color: #c8c4bb;
          font-family: var(--inter);
          font-size: 0.8rem;
          font-weight: 400;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-decoration: none;
          border-radius: 2px;
          transition: border-color 0.2s, color 0.2s;
        }
        .vs-btn-secondary:hover {
          border-color: rgba(240,237,232,0.5);
          color: #f0ede8;
        }
        @media (max-width: 600px) {
          .vs-verdict { grid-template-columns: 1fr; }
          .vs-gallery { grid-template-columns: repeat(2, 1fr); }
          .vs-gallery-img:last-child { display: none; }
          .vs-cta { padding: 36px 24px; }
          .vs-table th, .vs-table td { padding: 12px 14px; }
        }
      `}</style>

      <main className="vs-page" style={{ fontFamily: cormorant.style.fontFamily }}>
        {/* — Hero — */}
        <section className="vs-hero">
          <Image
            src={IMAGES.hero}
            alt="Sandra — professional AI brand photo created with SSELFIE"
            fill
            priority
            className="vs-hero-img"
            style={{ position: "absolute" }}
          />
          <div className="vs-hero-overlay" />
          <div className="vs-hero-content">
            <p className="vs-label" style={{ fontFamily: inter.style.fontFamily }}>
              Tool Comparison · 2026
            </p>
            <h1 className="vs-h1">
              SSELFIE vs Aragon AI
              <br />
              which one is actually
              <br />
              for personal branding?
            </h1>
            <p className="vs-hero-sub" style={{ fontFamily: inter.style.fontFamily }}>
              Both use AI to generate photos of you. But they&apos;re solving very different problems.
              Here&apos;s the honest answer on which one to use — and when.
            </p>
          </div>
        </section>

        {/* — The honest answer up front — */}
        <section className="vs-section">
          <p className="vs-body">
            I built SSELFIE, so I&apos;m obviously biased. But I also use a lot of AI tools, and I
            think Aragon is genuinely good at what it does. So let me give you the actual difference
            — not the marketing version.
          </p>
          <p className="vs-body">
            <strong>Aragon is great if you need 40 professional headshots once.</strong> You upload
            your photos, wait a few hours, download your batch, and you&apos;re done. It&apos;s
            clean, fast, and the results are consistently good for LinkedIn profiles, speaker bios,
            press kits.
          </p>
          <p className="vs-body">
            <strong>
              SSELFIE is for something different — ongoing personal brand content.
            </strong>{" "}
            If you post on Instagram three times a week, you need more than 40 headshots. You need
            photos in different outfits, backgrounds, moods. You need your brand voice in your
            captions. You need an AI that already knows you — not one you brief from scratch every
            time.
          </p>
          <p className="vs-body">
            That&apos;s the whole reason I built this. I was spending €500–800 every time I needed
            a shoot, waiting three weeks, and still ending up with 40 photos that all looked the
            same. I needed something that worked like a creative partner — not a one-time order.
          </p>
        </section>

        {/* — Gallery — */}
        <section className="vs-section" style={{ paddingTop: 0 }}>
          <div className="vs-gallery">
            <div className="vs-gallery-img">
              <Image
                src={IMAGES.result1}
                alt="SSELFIE AI brand photo — professional outdoor setting"
                width={400}
                height={533}
              />
            </div>
            <div className="vs-gallery-img">
              <Image
                src={IMAGES.result2}
                alt="SSELFIE AI brand photo — clean studio aesthetic"
                width={400}
                height={533}
              />
            </div>
            <div className="vs-gallery-img">
              <Image
                src={IMAGES.result3}
                alt="SSELFIE AI brand photo — lifestyle content creator look"
                width={400}
                height={533}
              />
            </div>
          </div>
          <p
            className="vs-label"
            style={{ fontFamily: inter.style.fontFamily, textAlign: "center", marginTop: 8 }}
          >
            SSELFIE AI brand photos — same person, different scenes, on demand
          </p>
        </section>

        {/* — Side by side comparison — */}
        <section className="vs-section" style={{ paddingTop: 0 }}>
          <h2 className="vs-h2">The side-by-side</h2>

          <div className="vs-table-wrap">
            <table className="vs-table">
              <thead>
                <tr>
                  <th></th>
                  <th>SSELFIE</th>
                  <th>Aragon AI</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Purpose</td>
                  <td className="win">Ongoing personal brand content</td>
                  <td className="lose">One-time headshot batch</td>
                </tr>
                <tr>
                  <td>Photo output</td>
                  <td className="win">Unlimited (1 credit each)</td>
                  <td className="lose">~40 photos per session</td>
                </tr>
                <tr>
                  <td>Custom model</td>
                  <td className="win">Yes — trained on your face</td>
                  <td>Yes — per session</td>
                </tr>
                <tr>
                  <td>Brand memory</td>
                  <td className="win">Yes — Maya knows your brand, voice, aesthetic</td>
                  <td className="lose">No — starts fresh every session</td>
                </tr>
                <tr>
                  <td>Caption writing</td>
                  <td className="win">Yes — Maya writes in your voice</td>
                  <td className="lose">No</td>
                </tr>
                <tr>
                  <td>Feed planning</td>
                  <td className="win">Yes — 9-post grid planning</td>
                  <td className="lose">No</td>
                </tr>
                <tr>
                  <td>Variety</td>
                  <td className="win">Any scene, outfit, background — on demand</td>
                  <td className="lose">Professional headshot style only</td>
                </tr>
                <tr>
                  <td>Use case</td>
                  <td className="win">Instagram / content creation / personal brand</td>
                  <td>LinkedIn / press kit / speaker bio</td>
                </tr>
                <tr>
                  <td>Pricing</td>
                  <td>$97/month (unlimited)</td>
                  <td>$29–$99 per batch (one-time)</td>
                </tr>
                <tr>
                  <td>AI assistant</td>
                  <td className="win">Maya — guides everything in chat</td>
                  <td className="lose">None</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* — When to use which — */}
        <section className="vs-section" style={{ paddingTop: 0 }}>
          <h2 className="vs-h2">Who each one is for</h2>

          <div className="vs-verdict">
            <div className="vs-verdict-card">
              <p className="vs-verdict-title" style={{ fontFamily: inter.style.fontFamily }}>
                Use Aragon if
              </p>
              <p className="vs-verdict-name">You need a one-time batch</p>
              <p className="vs-verdict-text" style={{ fontFamily: inter.style.fontFamily }}>
                You&apos;re updating your LinkedIn. You need a speaker bio photo. You want a clean
                professional headshot for your About page. You&apos;re not posting on Instagram
                regularly. You want something done in an afternoon and never touched again.
              </p>
            </div>
            <div className="vs-verdict-card winner">
              <p className="vs-verdict-title" style={{ fontFamily: inter.style.fontFamily }}>
                Use SSELFIE if
              </p>
              <p className="vs-verdict-name">You&apos;re building a personal brand</p>
              <p className="vs-verdict-text" style={{ fontFamily: inter.style.fontFamily }}>
                You post on Instagram 3–5 times a week. You need new photos every week, not every
                six months. You want an AI that knows your brand — your vibe, your voice, your
                colors. You want captions written the way you actually talk. You&apos;re done
                booking photographers.
              </p>
            </div>
          </div>
        </section>

        {/* — Sandra's note — */}
        <section className="vs-section" style={{ paddingTop: 0 }}>
          <div className="vs-note">
            <div className="vs-note-author">
              <div className="vs-note-avatar">
                <Image
                  src={IMAGES.sandra}
                  alt="Sandra — founder of SSELFIE"
                  width={44}
                  height={44}
                  style={{ objectFit: "cover", objectPosition: "center top" }}
                />
              </div>
              <div>
                <p className="vs-note-name" style={{ fontFamily: inter.style.fontFamily }}>
                  SANDRA
                </p>
                <p className="vs-note-title" style={{ fontFamily: inter.style.fontFamily }}>
                  Founder, SSELFIE · 180K Instagram followers
                </p>
              </div>
            </div>
            <p className="vs-note-text" style={{ fontFamily: inter.style.fontFamily }}>
              &ldquo;The tools aren&apos;t really competing. Aragon solves a headshot problem.
              SSELFIE solves a content problem. I know coaches who use both — Aragon for their
              speaker page, SSELFIE for their Instagram. That&apos;s actually fine. Use the right
              tool for the right job. But if you&apos;re posting content every week and booking
              photographers every three months because you need new photos — that&apos;s the
              problem I built SSELFIE to fix.&rdquo;
            </p>
          </div>
        </section>

        {/* — What makes SSELFIE different — */}
        <section className="vs-section" style={{ paddingTop: 0 }}>
          <h2 className="vs-h2">The thing Aragon doesn&apos;t have</h2>
          <p className="vs-body">
            Aragon creates a model from your photos. SSELFIE does that too. But that&apos;s where
            the similarity ends.
          </p>
          <p className="vs-body">
            SSELFIE has Maya — an AI assistant who knows your brand profile. Your aesthetic. Your
            audience. Your voice. When you ask for a photo, you don&apos;t brief her from scratch.
            She already knows you want a warm, editorial look. She already knows your brand colors.
            She remembers what you rejected last time.
          </p>
          <p className="vs-body">
            Maya also writes your captions, plans your feed, and tells you what photos you&apos;re
            missing. It&apos;s not a generation tool. It&apos;s a creative partner — one that gets
            better every time you use it.
          </p>
          <p className="vs-body">
            <strong>That&apos;s what makes it different from every other AI photo tool.</strong>{" "}
            Not the image quality. The relationship.
          </p>
        </section>

        {/* — FAQ — */}
        <section className="vs-section" style={{ paddingTop: 0 }}>
          <h2 className="vs-h2">Questions I get asked a lot</h2>
          <div className="vs-faq">
            <details>
              <summary style={{ fontFamily: inter.style.fontFamily }}>
                Can I use both SSELFIE and Aragon?
              </summary>
              <p className="vs-faq-answer" style={{ fontFamily: inter.style.fontFamily }}>
                Yes. Some of our members use Aragon for their speaker pages and websites, and
                SSELFIE for their weekly Instagram content. They serve different purposes. If you
                need a static headshot library and ongoing dynamic content, using both makes sense.
              </p>
            </details>
            <details>
              <summary style={{ fontFamily: inter.style.fontFamily }}>
                Is SSELFIE more expensive than Aragon?
              </summary>
              <p className="vs-faq-answer" style={{ fontFamily: inter.style.fontFamily }}>
                Aragon is cheaper upfront — $29–$99 one time. SSELFIE is $97/month. But if you
                need new photos every month (which most content creators do), a single Aragon
                session covers one batch. SSELFIE covers unlimited photos every month — plus
                captions, feed planning, and an AI that knows your brand. The math shifts quickly
                if you&apos;re a regular content creator.
              </p>
            </details>
            <details>
              <summary style={{ fontFamily: inter.style.fontFamily }}>
                Does SSELFIE work for LinkedIn headshots too?
              </summary>
              <p className="vs-faq-answer" style={{ fontFamily: inter.style.fontFamily }}>
                Yes — you can generate professional headshots with SSELFIE. You just have more
                control over the context. You can ask Maya for a clean neutral-background headshot,
                a more editorial look, a warmly lit photo for your website. It&apos;s not limited
                to Instagram content.
              </p>
            </details>
            <details>
              <summary style={{ fontFamily: inter.style.fontFamily }}>
                How is the photo quality compared to Aragon?
              </summary>
              <p className="vs-faq-answer" style={{ fontFamily: inter.style.fontFamily }}>
                Both use Flux-based LoRA models, so quality is comparable. The difference is in
                variety and control. Aragon produces consistent professional headshots in a
                predictable style. SSELFIE gives you more range — different scenes, moods, outfits
                — guided by your own brand preferences.
              </p>
            </details>
          </div>
        </section>

        {/* — CTA — */}
        <section className="vs-section" style={{ paddingTop: 0 }}>
          <div className="vs-cta">
            <h2 className="vs-cta-h">
              Ready to stop booking photographers?
            </h2>
            <p className="vs-cta-sub" style={{ fontFamily: inter.style.fontFamily }}>
              Start with the Selfie Guide — $17 one-time. You&apos;ll learn exactly how to take
              selfies that train a great AI model. Then you can upgrade to Studio when you&apos;re
              ready.
            </p>
            <div className="vs-btn-row">
              <Link href="/selfie-guide" className="vs-btn-primary" style={{ fontFamily: inter.style.fontFamily }}>
                Start with Selfie Guide — $17
              </Link>
              <Link href="/checkout/membership" className="vs-btn-secondary" style={{ fontFamily: inter.style.fontFamily }}>
                Join Studio — $97/mo
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
