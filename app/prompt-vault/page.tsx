import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { Cormorant_Garamond, Inter } from "next/font/google"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

export const metadata: Metadata = {
  title: "The AI Photo Prompt Vault · SSELFIE",
  description:
    "33 editorial AI photo prompts across 3 themed shoot collections. Copy, paste into ChatGPT, get a brand photo. $27.",
  openGraph: {
    title: "The AI Photo Prompt Vault · SSELFIE",
    description:
      "33 copy-paste ChatGPT prompts. Marble Café, Denim Street, Cozy Leather. One selfie. One paste. One brand photo.",
    images: ["/images/ai-prompts/denim-street-shot-1.jpg"],
  },
}

const CHECKOUT_URL = "/checkout/prompt-vault"

const COLLECTIONS = [
  {
    label: "COLLECTION 01",
    name: "Marble Café Wine Editorial",
    shots: 6,
    desc: "Café table, wine glass, marble surface. Six shots from casual sip to close editorial detail.",
    images: [
      "/images/ai-prompts/marble-wine-shot-1.jpg",
      "/images/ai-prompts/marble-wine-shot-3.jpg",
      "/images/ai-prompts/marble-wine-shot-5.jpg",
    ],
  },
  {
    label: "COLLECTION 02",
    name: "Soft Blazer + Light Denim Street Editorial",
    shots: 14,
    desc: "Fourteen shots covering every angle of an outdoor editorial. Wide establishing frames to tight detail.",
    images: [
      "/images/ai-prompts/denim-street-shot-1.jpg",
      "/images/ai-prompts/denim-street-shot-5.jpg",
      "/images/ai-prompts/denim-street-shot-9.jpg",
    ],
  },
  {
    label: "COLLECTION 03",
    name: "Cozy Leather + Oversized Knit Mirror Editorial",
    shots: 13,
    desc: "Indoor mirror light, leather jacket, oversized knit. Thirteen shots from soft natural light to high-contrast moody.",
    images: [
      "/images/ai-prompts/cozy-leather-shot-1.png",
      "/images/ai-prompts/cozy-leather-shot-4.png",
      "/images/ai-prompts/cozy-leather-shot-7.png",
    ],
  },
]

export default function PromptVaultPage() {
  return (
    <main className={`vault-page ${inter.className}`}>

      {/* Hero */}
      <section className="vault-hero">
        <div className="vault-hero-inner">
          <p className="vault-eyebrow">SSELFIE · AI PHOTO PROMPT VAULT</p>
          <h1 className={`vault-headline ${cormorant.className}`}>
            Turn one selfie into a brand photo.
          </h1>
          <p className="vault-subhead">
            33 copy-paste ChatGPT prompts across three themed editorial shoot collections. Each
            prompt was designed and tested by Sandra. Copy it, paste it into ChatGPT, upload your
            selfie. Done.
          </p>
          <div className="vault-hero-cta-wrap">
            <Link href={CHECKOUT_URL} className="vault-cta-primary">
              Get the Vault — $27
            </Link>
            <p className="vault-hero-note">Instant access. No account required.</p>
          </div>
        </div>
        <div className="vault-hero-images" aria-hidden="true">
          <div className="vault-hero-img-col vault-hero-img-col-a">
            <Image src="/images/ai-prompts/denim-street-shot-2.jpg" alt="" width={300} height={450} className="vault-hero-img" />
            <Image src="/images/ai-prompts/cozy-leather-shot-2.png" alt="" width={300} height={450} className="vault-hero-img" />
          </div>
          <div className="vault-hero-img-col vault-hero-img-col-b">
            <Image src="/images/ai-prompts/marble-wine-shot-2.jpg" alt="" width={300} height={450} className="vault-hero-img" />
            <Image src="/images/ai-prompts/denim-street-shot-4.jpg" alt="" width={300} height={450} className="vault-hero-img" />
          </div>
        </div>
      </section>

      {/* What's inside */}
      <section className="vault-inside">
        <div className="vault-inside-inner">
          <p className="vault-section-eyebrow">WHAT'S INSIDE</p>
          <h2 className={`vault-section-title ${cormorant.className}`}>
            Three complete editorial shoot collections.
          </h2>
          <div className="vault-collections">
            {COLLECTIONS.map((col) => (
              <div key={col.label} className="vault-collection">
                <div className="vault-col-images">
                  {col.images.map((src, i) => (
                    <div key={i} className="vault-col-img-wrap">
                      <Image src={src} alt="" width={200} height={300} className="vault-col-img" />
                    </div>
                  ))}
                </div>
                <div className="vault-col-copy">
                  <p className="vault-col-label">{col.label} · {col.shots} PROMPTS</p>
                  <h3 className={`vault-col-name ${cormorant.className}`}>{col.name}</h3>
                  <p className="vault-col-desc">{col.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="vault-how">
        <div className="vault-how-inner">
          <p className="vault-section-eyebrow">HOW IT WORKS</p>
          <h2 className={`vault-section-title ${cormorant.className}`}>
            Copy. Paste. Done.
          </h2>
          <div className="vault-steps">
            {[
              { n: "01", title: "Pick a prompt", body: "Open your vault. Every card has a copy button. Tap it." },
              { n: "02", title: "Paste into ChatGPT", body: "Open a new ChatGPT conversation, paste the prompt, and attach your selfie." },
              { n: "03", title: "Get your brand photo", body: "ChatGPT generates the image. Download it. Post it. Done." },
            ].map((step) => (
              <div key={step.n} className="vault-step">
                <p className="vault-step-n">{step.n}</p>
                <h3 className={`vault-step-title ${cormorant.className}`}>{step.title}</h3>
                <p className="vault-step-body">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you need */}
      <section className="vault-need">
        <div className="vault-need-inner">
          <p className="vault-need-title">All you need is a ChatGPT account and one selfie.</p>
          <p className="vault-need-body">
            No design software. No editing skills. No photographer. The prompts handle everything —
            the aesthetic, the lighting, the mood. You bring the photo.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="vault-buy">
        <div className="vault-buy-inner">
          <p className="vault-buy-eyebrow">THE AI PHOTO PROMPT VAULT</p>
          <h2 className={`vault-buy-headline ${cormorant.className}`}>
            33 prompts. Three collections. $27.
          </h2>
          <ul className="vault-buy-list">
            <li>Marble Café Wine Editorial — 6 shots</li>
            <li>Soft Blazer + Light Denim Street — 14 shots</li>
            <li>Cozy Leather + Oversized Knit Mirror — 13 shots</li>
            <li>Example photo for every prompt</li>
            <li>Instant access by email, no account required</li>
          </ul>
          <Link href={CHECKOUT_URL} className="vault-cta-primary">
            Get the Vault — $27
          </Link>
          <p className="vault-buy-note">One-time payment. Access link sent to your inbox immediately.</p>
        </div>
      </section>

      <style>{`
        .vault-page {
          background: #0a0a0a;
          color: #f5f5f5;
          min-height: 100vh;
        }

        /* Hero */
        .vault-hero {
          max-width: 1200px;
          margin: 0 auto;
          padding: 72px 24px 80px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 56px;
          align-items: start;
        }
        @media (min-width: 860px) {
          .vault-hero {
            grid-template-columns: 1fr 1fr;
            gap: 64px;
            align-items: center;
          }
        }
        .vault-eyebrow {
          margin: 0 0 20px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: rgba(245, 245, 245, 0.34);
        }
        .vault-headline {
          margin: 0 0 20px;
          font-size: clamp(2.8rem, 7vw, 5rem);
          font-weight: 300;
          line-height: 0.97;
          letter-spacing: -0.02em;
          color: #f5f5f5;
        }
        .vault-subhead {
          max-width: 580px;
          margin: 0 0 36px;
          font-size: 16px;
          line-height: 1.85;
          color: rgba(245, 245, 245, 0.6);
        }
        .vault-hero-cta-wrap {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 12px;
        }
        .vault-hero-note {
          margin: 0;
          font-size: 12px;
          color: rgba(245, 245, 245, 0.36);
          letter-spacing: 0.04em;
        }
        .vault-hero-images {
          display: flex;
          gap: 12px;
          overflow: hidden;
        }
        .vault-hero-img-col {
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
        }
        .vault-hero-img-col-b {
          margin-top: 40px;
        }
        .vault-hero-img {
          width: 100%;
          height: auto;
          border-radius: 12px;
          object-fit: cover;
          display: block;
        }

        /* CTA button */
        .vault-cta-primary {
          display: inline-block;
          background: #f5f5f5;
          color: #0a0a0a;
          padding: 16px 32px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          text-decoration: none;
          transition: opacity 0.15s ease;
        }
        .vault-cta-primary:hover { opacity: 0.88; }

        /* Inside section */
        .vault-inside {
          border-top: 1px solid rgba(245, 245, 245, 0.07);
          padding: 80px 0;
        }
        .vault-inside-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .vault-section-eyebrow {
          margin: 0 0 12px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: rgba(245, 245, 245, 0.34);
        }
        .vault-section-title {
          margin: 0 0 52px;
          font-size: clamp(2rem, 4vw, 3.2rem);
          font-weight: 300;
          line-height: 1.08;
          color: #f5f5f5;
        }
        .vault-collections {
          display: flex;
          flex-direction: column;
          gap: 64px;
        }
        .vault-collection {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
          align-items: center;
        }
        @media (min-width: 720px) {
          .vault-collection {
            grid-template-columns: 1fr 1fr;
          }
        }
        .vault-col-images {
          display: flex;
          gap: 10px;
        }
        .vault-col-img-wrap {
          flex: 1;
          border-radius: 12px;
          overflow: hidden;
        }
        .vault-col-img {
          width: 100%;
          height: auto;
          display: block;
          object-fit: cover;
          aspect-ratio: 2/3;
        }
        .vault-col-label {
          margin: 0 0 10px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.36em;
          text-transform: uppercase;
          color: rgba(245, 245, 245, 0.34);
        }
        .vault-col-name {
          margin: 0 0 14px;
          font-size: clamp(1.6rem, 3vw, 2.4rem);
          font-weight: 300;
          line-height: 1.1;
          color: #f5f5f5;
        }
        .vault-col-desc {
          margin: 0;
          font-size: 15px;
          line-height: 1.8;
          color: rgba(245, 245, 245, 0.54);
        }

        /* How it works */
        .vault-how {
          border-top: 1px solid rgba(245, 245, 245, 0.07);
          padding: 80px 0;
        }
        .vault-how-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .vault-steps {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
          margin-top: 48px;
        }
        @media (min-width: 640px) {
          .vault-steps { grid-template-columns: repeat(3, 1fr); }
        }
        .vault-step {
          border: 1px solid rgba(245, 245, 245, 0.09);
          background: rgba(245, 245, 245, 0.03);
          border-radius: 18px;
          padding: 28px 24px;
        }
        .vault-step-n {
          margin: 0 0 12px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.26em;
          color: rgba(245, 245, 245, 0.3);
        }
        .vault-step-title {
          margin: 0 0 10px;
          font-size: 1.6rem;
          font-weight: 300;
          line-height: 1.1;
          color: #f5f5f5;
        }
        .vault-step-body {
          margin: 0;
          font-size: 14px;
          line-height: 1.8;
          color: rgba(245, 245, 245, 0.52);
        }

        /* What you need */
        .vault-need {
          border-top: 1px solid rgba(245, 245, 245, 0.07);
          padding: 64px 0;
          background: rgba(245, 245, 245, 0.025);
        }
        .vault-need-inner {
          max-width: 720px;
          margin: 0 auto;
          padding: 0 24px;
          text-align: center;
        }
        .vault-need-title {
          margin: 0 0 16px;
          font-size: 1.1rem;
          font-weight: 500;
          line-height: 1.5;
          color: rgba(245, 245, 245, 0.88);
        }
        .vault-need-body {
          margin: 0;
          font-size: 15px;
          line-height: 1.85;
          color: rgba(245, 245, 245, 0.52);
        }

        /* Buy CTA */
        .vault-buy {
          border-top: 1px solid rgba(245, 245, 245, 0.07);
          padding: 80px 0 96px;
        }
        .vault-buy-inner {
          max-width: 600px;
          margin: 0 auto;
          padding: 0 24px;
          text-align: center;
        }
        .vault-buy-eyebrow {
          margin: 0 0 16px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: rgba(245, 245, 245, 0.34);
        }
        .vault-buy-headline {
          margin: 0 0 24px;
          font-size: clamp(2rem, 5vw, 3.4rem);
          font-weight: 300;
          line-height: 1.05;
          color: #f5f5f5;
        }
        .vault-buy-list {
          list-style: none;
          padding: 0;
          margin: 0 0 36px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .vault-buy-list li {
          font-size: 14px;
          color: rgba(245, 245, 245, 0.56);
          line-height: 1.6;
        }
        .vault-buy-list li::before {
          content: "· ";
          color: rgba(245, 245, 245, 0.3);
        }
        .vault-buy-note {
          margin: 16px 0 0;
          font-size: 12px;
          color: rgba(245, 245, 245, 0.32);
          letter-spacing: 0.04em;
        }
      `}</style>
    </main>
  )
}
