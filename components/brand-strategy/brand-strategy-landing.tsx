"use client"

import Image from "next/image"
import { Cormorant_Garamond, Inter } from "next/font/google"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "500"],
})

interface Props {
  checkoutFailed?: boolean
}

export default function BrandStrategyLanding({ checkoutFailed }: Props) {
  return (
    <main className={`bs-page ${inter.className}`}>
      <header className="bs-header">
        <a href="https://sselfie.ai" className={`bs-logo ${cormorant.className}`}>
          SSELFIE
        </a>
        <span className="bs-header-label">BRAND STRATEGY</span>
      </header>

      {/* HERO */}
      <section className="bs-hero">
        <div className="bs-hero-bg-wrap">
          <Image
            src="/assets/brand-strategy/hero.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="bs-hero-bg"
            style={{ objectFit: "cover", objectPosition: "center 30%", filter: "brightness(0.38)" }}
          />
        </div>
        <div className="bs-hero-content">
          <p className="bs-eyebrow">ONE-TIME · $19</p>
          <h1 className={`bs-hero-title ${cormorant.className}`}>YOUR BRAND STRATEGY</h1>
          <p className="bs-hero-copy">
            Maya builds your custom brand positioning, content pillars, voice guide, and caption
            starters in minutes. Yours to keep forever.
          </p>
          <a href="/checkout/brand-strategy-pack" className="bs-btn-primary">
            GET YOUR STRATEGY — $19 →
          </a>
        </div>
      </section>

      {/* SECTION 01 — WHAT'S INSIDE */}
      <section className="bs-section">
        <p className="bs-section-label">01 — WHAT&apos;S INSIDE</p>

        <div className="bs-split">
          <div className="bs-preview-panel">
            <div className="bs-image-wrap">
              <Image
                src="/assets/brand-strategy/woman.png"
                alt="Brand strategy preview"
                fill
                sizes="(max-width: 700px) 100vw, 45vw"
                className="bs-cover-image"
                style={{ objectFit: "cover", objectPosition: "center top" }}
              />
            </div>
            <div className="bs-preview-body">
              <p className="bs-preview-eyebrow">BUILT JUST FOR YOU</p>
              <h2 className={`bs-preview-heading ${cormorant.className}`}>
                Everything you need to show up consistently and sound like yourself.
              </h2>
              <ul className="bs-feature-list">
                <li>Positioning statement — what you do, who it&apos;s for, why it matters</li>
                <li>Three content pillars tailored to your business and audience</li>
                <li>Voice guide — your tone, what to say, what to avoid</li>
                <li>Caption starters you can use this week</li>
                <li>Example posts written in your voice</li>
              </ul>
            </div>
          </div>

          <div className="bs-purchase-panel">
            <p className="bs-purchase-eyebrow">YOUR INVESTMENT</p>
            <div className="bs-price-row">
              <span className={`bs-price-amount ${cormorant.className}`}>$19</span>
              <span className="bs-price-label">one-time · no subscription</span>
            </div>
            <p className="bs-purchase-desc">
              Answer four short questions. Maya does the rest. Your strategy is ready in minutes —
              not days.
            </p>

            {checkoutFailed ? (
              <p className="bs-error">Something went wrong with checkout. Please try again.</p>
            ) : null}

            <a href="/checkout/brand-strategy-pack" className="bs-btn-primary">
              GET YOUR STRATEGY — $19 →
            </a>

            <ul className="bs-trust-list">
              <li>✓ Personalised to your business</li>
              <li>✓ Ready in under 5 minutes</li>
              <li>✓ Yours to keep and edit forever</li>
              <li>✓ Secure checkout via Stripe</li>
            </ul>
          </div>
        </div>
      </section>

      {/* SECTION 02 — HOW IT WORKS */}
      <section className="bs-section bs-section-steps">
        <p className="bs-section-label">02 — HOW IT WORKS</p>
        <div className="bs-steps-grid">
          <article className="bs-step-card">
            <p className="bs-step-num">STEP 1</p>
            <h3 className={`bs-step-title ${cormorant.className}`}>Pay once — $19</h3>
            <p className="bs-step-copy">
              Secure checkout via Stripe. No subscription, no upsell hidden behind a paywall.
            </p>
          </article>
          <article className="bs-step-card">
            <p className="bs-step-num">STEP 2</p>
            <h3 className={`bs-step-title ${cormorant.className}`}>Answer four questions</h3>
            <p className="bs-step-copy">
              Tell Maya about your business, your audience, and your vibe. Takes less than two
              minutes.
            </p>
          </article>
          <article className="bs-step-card">
            <p className="bs-step-num">STEP 3</p>
            <h3 className={`bs-step-title ${cormorant.className}`}>Your strategy is live</h3>
            <p className="bs-step-copy">
              Maya generates your full strategy instantly. Access it at your private link forever.
            </p>
          </article>
        </div>
      </section>

      {/* SECTION 03 — SANDRA'S NOTE */}
      <section className="bs-section bs-section-note">
        <p className="bs-section-label">03 — FROM SANDRA</p>
        <div className="bs-note-wrap">
          <div className="bs-note-image-wrap">
            <Image
              src="/assets/brand-strategy/journals.png"
              alt=""
              fill
              sizes="(max-width: 700px) 100vw, 50vw"
              className="bs-cover-image"
              style={{ objectFit: "cover", objectPosition: "center" }}
            />
          </div>
          <div className="bs-note-body">
            <p className="bs-note-text">
              &ldquo;I spent two years trying to explain what I do. I had all these ideas in my
              head — who I help, what I stand for, why it matters — but I couldn&apos;t get it into
              words that actually landed.
            </p>
            <p className="bs-note-text">
              When I finally wrote it down properly, everything clicked. My content got more
              consistent. My captions took half the time. People started following who actually
              stayed.
            </p>
            <p className="bs-note-text">
              That&apos;s what this strategy does for you. It puts language to everything
              you&apos;ve been trying to say.&rdquo;
            </p>
            <p className="bs-note-sig">— Sandra, Founder of SSELFIE</p>
            <a href="/checkout/brand-strategy-pack" className="bs-btn-outline">
              GET YOUR STRATEGY — $19 →
            </a>
          </div>
        </div>
      </section>

      <footer className="bs-footer">
        <span className="bs-footer-note">© 2026 SSELFIE Studio · sselfie.ai</span>
      </footer>

      <style jsx>{`
        .bs-page {
          background: #0d0c0b;
          color: #f0ede8;
          min-height: 100vh;
        }

        /* HEADER */
        .bs-header {
          padding: 28px 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(195, 190, 182, 0.15);
          position: sticky;
          top: 0;
          background: rgba(13, 12, 11, 0.92);
          backdrop-filter: blur(50px);
          z-index: 100;
        }
        .bs-logo {
          font-weight: 300;
          font-size: 17px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #f0ede8;
          text-decoration: none;
        }
        .bs-header-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8a8780;
        }

        /* HERO */
        .bs-hero {
          position: relative;
          min-height: 88vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 80px 24px;
          overflow: hidden;
        }
        .bs-hero-bg-wrap {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .bs-hero-bg {
          width: 100%;
          height: 100%;
        }
        .bs-hero-content {
          position: relative;
          z-index: 1;
          max-width: 680px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
        .bs-eyebrow {
          margin: 0;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: #a8a49c;
        }
        .bs-hero-title {
          margin: 0;
          font-size: clamp(52px, 9vw, 88px);
          font-weight: 300;
          line-height: 0.93;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #f0ede8;
        }
        .bs-hero-copy {
          margin: 0;
          font-size: 17px;
          line-height: 1.75;
          color: #c3beb6;
          max-width: 480px;
        }

        /* SECTIONS */
        .bs-section {
          padding: 80px 48px;
          border-top: 1px solid rgba(195, 190, 182, 0.12);
        }
        .bs-section-label {
          margin: 0 0 48px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: #8a8780;
        }

        /* SPLIT LAYOUT */
        .bs-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 48px;
          align-items: start;
        }
        .bs-preview-panel {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .bs-image-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 5;
          overflow: hidden;
          border-radius: 4px;
          margin-bottom: 28px;
        }
        .bs-cover-image {
          width: 100%;
          height: 100%;
        }
        .bs-preview-eyebrow {
          margin: 0 0 10px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8a8780;
        }
        .bs-preview-heading {
          margin: 0 0 22px;
          font-size: clamp(24px, 3vw, 34px);
          font-weight: 300;
          line-height: 1.2;
          letter-spacing: 0.02em;
          color: #f0ede8;
        }
        .bs-feature-list {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .bs-feature-list li {
          padding-left: 18px;
          position: relative;
          font-size: 14px;
          line-height: 1.6;
          color: #a8a49c;
          font-weight: 300;
        }
        .bs-feature-list li::before {
          content: "—";
          position: absolute;
          left: 0;
          color: #6b6762;
        }

        /* PURCHASE PANEL */
        .bs-purchase-panel {
          background: #1c1b19;
          border: 1px solid rgba(195, 190, 182, 0.14);
          border-radius: 8px;
          padding: 36px 32px;
          display: flex;
          flex-direction: column;
          gap: 0;
          position: sticky;
          top: 90px;
        }
        .bs-purchase-eyebrow {
          margin: 0 0 12px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8a8780;
        }
        .bs-price-row {
          display: flex;
          align-items: baseline;
          gap: 12px;
          margin-bottom: 16px;
        }
        .bs-price-amount {
          font-size: 64px;
          font-weight: 300;
          line-height: 1;
          letter-spacing: -0.01em;
          color: #f0ede8;
        }
        .bs-price-label {
          font-size: 12px;
          color: #8a8780;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          font-weight: 300;
        }
        .bs-purchase-desc {
          margin: 0 0 24px;
          font-size: 14px;
          line-height: 1.7;
          color: #a8a49c;
          font-weight: 300;
        }
        .bs-error {
          margin: 0 0 12px;
          font-size: 13px;
          color: #e87070;
        }
        .bs-trust-list {
          margin: 20px 0 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .bs-trust-list li {
          font-size: 12px;
          color: #8a8780;
          font-weight: 300;
          letter-spacing: 0.02em;
        }

        /* STEPS */
        .bs-section-steps {
          background: #111010;
        }
        .bs-steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
        }
        .bs-step-card {
          padding: 28px 24px;
          border: 1px solid rgba(195, 190, 182, 0.1);
          border-radius: 4px;
        }
        .bs-step-num {
          margin: 0 0 12px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #6b6762;
        }
        .bs-step-title {
          margin: 0 0 10px;
          font-size: 22px;
          font-weight: 300;
          line-height: 1.2;
          letter-spacing: 0.02em;
          color: #f0ede8;
        }
        .bs-step-copy {
          margin: 0;
          font-size: 14px;
          line-height: 1.7;
          color: #8a8780;
          font-weight: 300;
        }

        /* SANDRA'S NOTE */
        .bs-note-wrap {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 64px;
          align-items: center;
        }
        .bs-note-image-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 3 / 4;
          overflow: hidden;
          border-radius: 4px;
        }
        .bs-note-body {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .bs-note-text {
          margin: 0 0 18px;
          font-size: 16px;
          line-height: 1.8;
          color: #c3beb6;
          font-weight: 300;
        }
        .bs-note-sig {
          margin: 8px 0 28px;
          font-size: 13px;
          color: #8a8780;
          font-weight: 300;
          letter-spacing: 0.04em;
        }

        /* BUTTONS */
        .bs-btn-primary {
          display: inline-block;
          background: #f0ede8;
          color: #0d0c0b;
          padding: 16px 28px;
          text-decoration: none;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          border-radius: 2px;
          transition: opacity 0.15s;
        }
        .bs-btn-primary:hover {
          opacity: 0.88;
        }
        .bs-btn-outline {
          display: inline-block;
          background: transparent;
          color: #f0ede8;
          padding: 14px 26px;
          text-decoration: none;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          border: 1px solid rgba(240, 237, 232, 0.3);
          border-radius: 2px;
          transition: border-color 0.15s;
        }
        .bs-btn-outline:hover {
          border-color: rgba(240, 237, 232, 0.6);
        }

        /* FOOTER */
        .bs-footer {
          padding: 28px 48px;
          border-top: 1px solid rgba(195, 190, 182, 0.12);
          text-align: center;
        }
        .bs-footer-note {
          font-size: 12px;
          color: #6b6762;
          letter-spacing: 0.08em;
        }

        /* RESPONSIVE */
        @media (max-width: 900px) {
          .bs-header {
            padding: 20px 24px;
          }
          .bs-section {
            padding: 60px 24px;
          }
          .bs-split,
          .bs-note-wrap {
            grid-template-columns: 1fr;
            gap: 32px;
          }
          .bs-purchase-panel {
            position: static;
          }
          .bs-steps-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  )
}
