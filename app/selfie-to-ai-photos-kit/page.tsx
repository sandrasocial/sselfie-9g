import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { Cormorant_Garamond, Inter } from "next/font/google"

import { logAnalyticsEvent } from "@/lib/analytics/events"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

export const metadata: Metadata = {
  title: "Selfie To AI Photos Kit | SSELFIE",
  description:
    "Turn one clear selfie into realistic AI photos that still look like you.",
}

const checkoutHref =
  "/checkout/selfie-to-ai-photos-kit?source=selfie_ai_photos_kit_page&utm_source=site&utm_medium=sales_page&utm_campaign=selfie_ai_photos_kit&buyer_stage=micro&cta_keyword=PROMPT"

export default async function SelfieToAiPhotosKitPage() {
  await logAnalyticsEvent({
    eventName: "selfie_ai_photos_kit_landing_view",
    path: "/selfie-to-ai-photos-kit",
    properties: {
      product_type: "selfie_ai_photos_kit",
      source: "selfie_ai_photos_kit_page",
    },
  })

  return (
    <main className={`${inter.className} ai-kit-page`}>
      <nav className="nav" aria-label="SSELFIE navigation">
        <Link href="/" className={`${cormorant.className} wordmark`}>
          SSELFIE
        </Link>
        <div className="nav-links">
          <Link href="/ai-prompts">Free AI Prompts</Link>
          <Link href="/prompt-vault">Prompt Vault</Link>
          <Link href="/starter-kit">iPhone Selfie Kit</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">SELFIE TO AI PHOTOS KIT · $37</p>
          <h1 className={cormorant.className}>Turn one clear selfie into AI photos that still look like you.</h1>
          <p className="lead">
            I built this for the woman who wants to try AI photos, but doesn&apos;t want to end up
            looking fake, random, or like a completely different person. One selfie. A few simple
            prompts. Still you.
          </p>
          <div className="actions">
            <Link href={checkoutHref} className="primary">
              Get the Kit · $37
            </Link>
            <Link href="/ai-prompts" className="secondary">
              Try the free prompts first
            </Link>
          </div>
        </div>
        <div className="hero-image">
          <Image
            src="/images/ai-prompts/clean-girl-morning-shot-10.jpg"
            alt="Soft editorial AI brand photo example"
            fill
            priority
            sizes="(min-width: 900px) 44vw, 100vw"
          />
        </div>
      </section>

      <section className="section pale">
        <p className="eyebrow">THE DIFFERENCE</p>
        <h2 className={cormorant.className}>This is not the iPhone Selfie Starter Kit.</h2>
        <div className="split-copy">
          <p>
            The Selfie Starter Kit teaches you how to take and edit better phone photos. That&apos;s a
            different first step, and it&apos;s still there if that&apos;s what you need.
          </p>
          <p>
            This one starts after that moment. Pick one clear selfie, upload it into your AI tool, use
            a simple prompt, and fix it if the face, pose, or mood feels off. That&apos;s the whole
            system.
          </p>
        </div>
      </section>

      <section className="section dark">
        <p className="eyebrow">WHAT YOU GET</p>
        <h2 className={cormorant.className}>One small system. Nothing complicated.</h2>
        <div className="grid">
          {[
            ["Source selfie checklist", "Know which selfie gives AI the best chance of keeping you recognizable."],
            ["Good vs bad examples", "See why some source photos create strange results and what to change first."],
            ["Starter prompts", "Profile photo, reel cover, and lifestyle image prompts for your first AI shoot."],
            ["Still-you fix prompts", "Use these when the image is close, but the face, skin, body, or light feels wrong."],
            ["3-image shoot path", "Create one profile image, one stronger cover image, and one softer lifestyle image."],
            ["Next-step bridge", "Know when to use the Prompt Vault and when SUITE makes more sense."],
          ].map(([title, body]) => (
            <article key={title} className="item">
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section pale">
        <p className="eyebrow">HOW TO USE IT</p>
        <h2 className={cormorant.className}>Start small. Don&apos;t turn this into a giant project.</h2>
        <div className="steps">
          {[
            ["01", "Choose one clean selfie."],
            ["02", "Copy the profile image prompt."],
            ["03", "Upload your selfie into your AI image tool."],
            ["04", "Fix what feels off instead of changing the whole look."],
            ["05", "Repeat for a reel cover and a lifestyle image."],
          ].map(([num, text]) => (
            <div key={num} className="step">
              <span>{num}</span>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="final">
        <p className="eyebrow">START HERE</p>
        <h2 className={cormorant.className}>One selfie. Three useful AI photos. Still you.</h2>
        <p>
          If you want more visual worlds later, the Vault is there. If you want Maya to help you keep
          creating every month, SUITE is there. This Kit is just the first small step.
        </p>
        <Link href={checkoutHref} className="primary light">
          Get the Kit · $37
        </Link>
      </section>

      <style>{`
        .ai-kit-page {
          min-height: 100vh;
          background: var(--color-porcelain);
          color: var(--color-obsidian);
        }
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 24px clamp(18px, 5vw, 54px);
          border-bottom: 1px solid rgba(10, 10, 10, 0.1);
        }
        .wordmark {
          color: inherit;
          text-decoration: none;
          font-size: 24px;
          letter-spacing: 0.16em;
        }
        .nav-links {
          display: flex;
          gap: 18px;
          flex-wrap: wrap;
          justify-content: flex-end;
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .nav-links a {
          color: inherit;
          text-decoration: none;
        }
        .hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(320px, 0.82fr);
          min-height: 720px;
        }
        .hero-copy {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: clamp(44px, 7vw, 96px);
        }
        .eyebrow {
          margin: 0 0 18px;
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--stone-accent);
        }
        h1, h2 {
          margin: 0;
          font-weight: 300;
          line-height: 0.98;
        }
        h1 {
          max-width: 820px;
          font-size: clamp(58px, 8vw, 112px);
        }
        h2 {
          max-width: 760px;
          font-size: clamp(42px, 5.8vw, 78px);
        }
        .lead {
          max-width: 620px;
          margin: 26px 0 0;
          font-size: 18px;
          line-height: 1.75;
          color: var(--stone-quarry);
        }
        .actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 34px;
        }
        .primary,
        .secondary {
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 20px;
          text-decoration: none;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-size: 11px;
        }
        .primary {
          background: var(--color-obsidian);
          color: var(--color-porcelain);
          border: 1px solid var(--color-obsidian);
        }
        .secondary {
          color: var(--color-obsidian);
          border: 1px solid rgba(10, 10, 10, 0.25);
        }
        .hero-image {
          position: relative;
          min-height: 520px;
          overflow: hidden;
          background: var(--stone-pale);
        }
        .hero-image img {
          object-fit: cover;
        }
        .section {
          padding: clamp(54px, 8vw, 110px) clamp(18px, 5vw, 72px);
        }
        .pale {
          background: var(--color-porcelain);
        }
        .dark {
          background: var(--color-obsidian);
          color: var(--color-porcelain);
        }
        .dark .eyebrow,
        .dark p {
          color: var(--stone-pale);
        }
        .split-copy {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 24px;
          max-width: 980px;
          margin-top: 30px;
        }
        .split-copy p,
        .final p {
          margin: 0;
          font-size: 17px;
          line-height: 1.75;
          color: var(--stone-quarry);
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1px;
          margin-top: 34px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.18);
        }
        .item {
          min-height: 190px;
          padding: 28px;
          background: var(--color-obsidian);
        }
        .item h3 {
          margin: 0 0 12px;
          font-size: 17px;
          font-weight: 500;
          color: var(--color-porcelain);
        }
        .item p {
          margin: 0;
          font-size: 14px;
          line-height: 1.7;
        }
        .steps {
          display: grid;
          gap: 1px;
          max-width: 980px;
          margin-top: 34px;
          border-top: 1px solid rgba(10, 10, 10, 0.14);
        }
        .step {
          display: grid;
          grid-template-columns: 84px 1fr;
          align-items: center;
          min-height: 76px;
          border-bottom: 1px solid rgba(10, 10, 10, 0.14);
        }
        .step span {
          font-size: 12px;
          letter-spacing: 0.2em;
          color: var(--stone-accent);
        }
        .step p {
          margin: 0;
          font-size: 17px;
          color: var(--stone-dark);
        }
        .final {
          background: var(--color-obsidian);
          color: var(--color-porcelain);
          padding: clamp(54px, 8vw, 110px) clamp(18px, 5vw, 72px);
        }
        .final p {
          max-width: 720px;
          margin: 26px 0 30px;
          color: var(--stone-pale);
        }
        .primary.light {
          background: var(--color-porcelain);
          color: var(--color-obsidian);
          border-color: var(--color-porcelain);
        }
        @media (max-width: 880px) {
          .hero,
          .split-copy,
          .grid {
            grid-template-columns: 1fr;
          }
          .hero {
            min-height: auto;
          }
          .nav {
            align-items: flex-start;
            flex-direction: column;
          }
          .nav-links {
            justify-content: flex-start;
          }
          .item {
            min-height: auto;
          }
        }
        @media (max-width: 560px) {
          h1 {
            font-size: 52px;
          }
          h2 {
            font-size: 40px;
          }
          .hero-copy {
            padding: 40px 18px;
          }
          .hero-image {
            min-height: 420px;
          }
          .actions,
          .primary,
          .secondary {
            width: 100%;
          }
          .step {
            grid-template-columns: 54px 1fr;
          }
        }
      `}</style>
    </main>
  )
}
