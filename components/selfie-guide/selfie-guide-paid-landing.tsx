"use client"

import Image from "next/image"
import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"

/** Sales copy: eight ## PART sections in content-templates/selfie-guide-content-v3.md — keep in sync. */

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "500"],
})

const SELFIE_GUIDE_PORTRAIT_URL =
  "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/6vc2ty3vndrmr0cwr8r9p1rd6w-z3vkF7lRWhn2aoxEQRyAZoVkBfOGOL.png"

interface Props {
  checkoutFailed: boolean
}

export default function SelfieGuidePaidLanding({ checkoutFailed }: Props) {
  return (
    <main className={`selfie-guide-page ${inter.className}`}>
      <header className="site-header">
        <Link href="/" className={`logo ${cormorant.className}`}>
          SSELFIE
        </Link>
        <span className="header-label">THE SELFIE GUIDE</span>
      </header>

      <section className="hero">
        <div className="hero-bg-wrap">
          <Image
            src="/images/selfie-guide/window-editorial-portrait.jpg"
            alt="Natural window-light portrait — Selfie Guide"
            fill
            priority
            sizes="100vw"
            className="hero-bg"
            style={{ objectFit: "cover", objectPosition: "center 32%", filter: "brightness(0.42)" }}
          />
        </div>
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-eyebrow">ONE-TIME · $17</p>
          <h1 className={`hero-title ${cormorant.className}`}>Selfies you feel good posting.</h1>
          <p className="hero-copy">
            The exact selfie framework Sandra uses for confident brand photos — phone, natural light, no photographer.
            Instant access.
          </p>
        </div>
      </section>

      <section className="section">
        <p className="section-label">01 — GET INSTANT ACCESS</p>

        <div className="capture-split">
          <div className="intro-panel">
            <div className="intro-image-wrap">
              <Image
                src={SELFIE_GUIDE_PORTRAIT_URL}
                alt="Portrait"
                fill
                sizes="(max-width: 700px) 100vw, 40vw"
                className="cover-image"
                style={{ objectFit: "cover", objectPosition: "center top" }}
              />
            </div>
            <div className="intro-body">
              <p className="intro-eyebrow">WHAT&apos;S INSIDE</p>
              <h2 className={`intro-heading ${cormorant.className}`}>
                Eight guided parts — the same structure as inside the course.
              </h2>
              <ul className="intro-list">
                <li>iPhone camera settings that actually matter</li>
                <li>Light that flatters — window, golden hour, and what to skip</li>
                <li>Angles, poses, and presence (without feeling fake)</li>
                <li>A simple edit workflow that still looks like you</li>
                <li>Confidence on camera — the part no one teaches</li>
                <li>Turning one selfie session into a week of content</li>
                <li>A 7-day challenge to lock in the habit</li>
                <li>When you&apos;re ready: how Maya fits with Studio</li>
              </ul>
            </div>
          </div>

          <div className="purchase-panel">
            <p className="purchase-eyebrow">YOUR INVESTMENT</p>
            <div className="price-row">
              <span className={`price-amount ${cormorant.className}`}>$17</span>
              <span className="price-label">one-time · instant access</span>
            </div>
            <p className="purchase-desc">
              Secure checkout via Stripe. You&apos;ll get instant access to the full interactive course right after payment.
            </p>

            {checkoutFailed ? <p className="error-msg">Something went wrong with checkout. Please try again.</p> : null}

            <a href="/checkout/selfie-guide?plan=guide" className="btn-primary">
              GET INSTANT ACCESS — $17 →
            </a>

            <ul className="trust-list">
              <li>Instant access after checkout</li>
              <li>Works on any phone or camera</li>
              <li>No subscription required</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="section section-journey">
        <p className="section-label">02 — WHAT HAPPENS NEXT</p>
        <div className="journey-grid">
          <article className="journey-card">
            <p className="journey-step">STEP 1</p>
            <h3 className={`journey-title ${cormorant.className}`}>Access your course instantly</h3>
            <p className="journey-copy">Pay once and get immediate access to the full interactive course. No waiting.</p>
          </article>
          <article className="journey-card">
            <p className="journey-step">STEP 2</p>
            <h3 className={`journey-title ${cormorant.className}`}>Master the selfie system</h3>
            <p className="journey-copy">
              Walk the eight-part guide at your pace — checklists, images, and prompts you can use today.
            </p>
          </article>
          <article className="journey-card">
            <p className="journey-step">STEP 3</p>
            <h3 className={`journey-title ${cormorant.className}`}>Keep showing up</h3>
            <p className="journey-copy">
              Finish the 7-day challenge with photos you&apos;re willing to post — and a repeatable rhythm for the next
              round.
            </p>
          </article>
        </div>

        <div className="studio-followon">
          <p className="studio-followon-label">Want help every week?</p>
          <p className="studio-followon-copy">
            Studio is optional. When you&apos;re ready, Maya can help you generate on-brand photos and ideas on top of
            what you learned here.
          </p>
          <Link href="/checkout/membership" className="studio-followon-link">
            Explore Studio membership →
          </Link>
        </div>
      </section>

      <section className="section section-peek" aria-label="Look inside the guide">
        <p className="section-label">03 — LOOK INSIDE</p>
        <div className="peek-grid">
          <figure className="peek-card">
            <div className="peek-image-wrap">
              <Image
                src="/images/selfie-guide/iphone-settings-mockup.png"
                alt="iPhone camera settings checklist from the guide"
                fill
                sizes="(max-width: 700px) 100vw, 50vw"
                className="peek-image"
              />
            </div>
            <figcaption className="peek-caption">Settings checklist — start before you shoot.</figcaption>
          </figure>
          <figure className="peek-card">
            <div className="peek-image-wrap">
              <Image
                src="/images/selfie-guide/lighting-comparison-grid.png"
                alt="Lighting comparison: window, golden hour, ring light, cloudy day"
                fill
                sizes="(max-width: 700px) 100vw, 50vw"
                className="peek-image"
              />
            </div>
            <figcaption className="peek-caption">The four lights worth knowing — pulled straight from Part 2.</figcaption>
          </figure>
        </div>
      </section>

      <footer className="footer">
        <span className="footer-note">© 2026 SSELFIE Studio · sselfie.ai</span>
      </footer>

      <style jsx>{`
        .selfie-guide-page {
          background: #0a0a0a;
          color: #f5f5f5;
          min-height: 100vh;
        }

        .site-header {
          padding: 28px 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(195, 190, 182, 0.15);
          position: sticky;
          top: 0;
          background: rgba(10, 10, 10, 0.92);
          backdrop-filter: blur(50px);
          z-index: 100;
        }

        .logo {
          font-weight: 300;
          font-size: 17px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #f5f5f5;
          text-decoration: none;
        }

        .header-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: #666666;
        }

        .hero {
          position: relative;
          min-height: 72vh;
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
          object-position: center 26%;
          filter: brightness(0.45);
        }

        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(10, 10, 10, 0.12) 0%,
            rgba(10, 10, 10, 0.04) 38%,
            rgba(10, 10, 10, 0.75) 74%,
            rgba(10, 10, 10, 1) 100%
          );
        }

        .hero-content {
          position: relative;
          z-index: 2;
          max-width: 900px;
        }

        .hero-eyebrow {
          margin: 0 0 20px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: #666666;
        }

        .hero-title {
          margin: 0;
          font-weight: 300;
          font-size: clamp(36px, 6.5vw, 64px);
          line-height: 1.08;
          letter-spacing: -0.02em;
          text-transform: none;
          color: #ffffff;
        }

        .hero-copy {
          margin: 24px 0 0;
          font-size: 16px;
          line-height: 1.8;
          color: #666666;
          max-width: 680px;
        }

        .section {
          padding: 80px 56px;
          max-width: 1120px;
          margin: 0 auto;
        }

        .section-label {
          margin: 0 0 40px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: #666666;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(175, 170, 162, 0.12);
        }

        .capture-split {
          display: grid;
          grid-template-columns: 1fr 1.3fr;
          border: 1px solid rgba(195, 190, 182, 0.25);
          border-radius: 16px;
          overflow: hidden;
        }

        .intro-panel {
          border-right: 1px solid rgba(195, 190, 182, 0.25);
          display: flex;
          flex-direction: column;
        }

        .intro-image-wrap {
          position: relative;
          min-height: 280px;
          overflow: hidden;
          border-bottom: 1px solid rgba(195, 190, 182, 0.25);
        }

        .cover-image {
          object-fit: cover;
          object-position: center top;
        }

        .intro-body {
          background: rgba(175, 170, 162, 0.08);
          padding: 32px 30px;
          flex: 1;
        }

        .intro-eyebrow {
          margin: 0 0 14px;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.45em;
          text-transform: uppercase;
          color: #666666;
        }

        .intro-heading {
          margin: 0;
          font-size: clamp(22px, 2.2vw, 30px);
          font-weight: 300;
          line-height: 1.3;
          letter-spacing: -0.01em;
          color: #f5f5f5;
        }

        .intro-list {
          list-style: none;
          margin: 18px 0 0;
          padding: 0;
        }

        .intro-list li {
          font-size: 14px;
          color: #666666;
          line-height: 1.75;
          padding: 6px 0 6px 18px;
          position: relative;
          border-bottom: 1px solid rgba(175, 170, 162, 0.12);
        }

        .intro-list li:last-child {
          border-bottom: none;
        }

        .intro-list li::before {
          content: "→";
          position: absolute;
          left: 0;
          color: #e5e5e5;
        }

        .purchase-panel {
          background: rgba(175, 170, 162, 0.05);
          padding: 34px 32px 30px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          align-items: flex-start;
        }

        .purchase-eyebrow {
          margin: 0;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.45em;
          text-transform: uppercase;
          color: #666666;
        }

        .price-row {
          display: flex;
          align-items: baseline;
          gap: 14px;
        }

        .price-amount {
          font-size: clamp(52px, 6vw, 72px);
          font-weight: 300;
          line-height: 1;
          letter-spacing: -0.02em;
          color: #ffffff;
        }

        .price-label {
          font-size: 12px;
          font-weight: 300;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #666666;
        }

        .purchase-desc {
          margin: 0;
          font-size: 14px;
          line-height: 1.75;
          color: #666666;
        }

        .error-msg {
          margin: 0;
          color: #e5e5e5;
          font-size: 13px;
        }

        .btn-primary {
          display: block;
          width: 100%;
          border: none;
          background: #e5e5e5;
          color: #0a0a0a;
          padding: 16px 18px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s;
          border-radius: 9999px;
          text-align: center;
          text-decoration: none;
          box-sizing: border-box;
        }

        .btn-primary:hover {
          background: #ffffff;
        }

        .trust-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .trust-list li {
          position: relative;
          padding-left: 22px;
          font-size: 13px;
          color: #666666;
          line-height: 1.5;
        }

        .trust-list li::before {
          content: "";
          position: absolute;
          left: 2px;
          top: 0.35em;
          width: 5px;
          height: 9px;
          border: solid #e5e5e5;
          border-width: 0 1.5px 1.5px 0;
          transform: rotate(45deg);
        }

        .section-journey {
          padding-top: 24px;
        }

        .journey-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .journey-card {
          border: 1px solid rgba(195, 190, 182, 0.25);
          background: rgba(175, 170, 162, 0.08);
          border-radius: 14px;
          padding: 20px;
        }

        .journey-step {
          margin: 0;
          font-size: 9px;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: #666666;
        }

        .journey-title {
          margin: 8px 0 6px;
          font-size: 26px;
          line-height: 1.1;
          text-transform: uppercase;
          color: #f5f5f5;
          font-weight: 300;
        }

        .journey-copy {
          margin: 0;
          font-size: 14px;
          line-height: 1.7;
          color: #666666;
        }

        .studio-followon {
          margin-top: 36px;
          padding: 28px 24px;
          border: 1px solid rgba(229, 229, 229, 0.2);
          border-radius: 14px;
          background: rgba(245, 245, 245, 0.04);
        }

        .studio-followon-label {
          margin: 0 0 10px;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: #666666;
        }

        .studio-followon-copy {
          margin: 0 0 16px;
          font-size: 14px;
          line-height: 1.75;
          color: #666666;
          max-width: 640px;
        }

        .studio-followon-link {
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #f5f5f5;
          text-decoration: none;
          border-bottom: 1px solid rgba(245, 245, 245, 0.35);
          padding-bottom: 2px;
        }

        .studio-followon-link:hover {
          color: #ffffff;
          border-bottom-color: rgba(255, 255, 255, 0.55);
        }

        .section-peek {
          padding-top: 48px;
        }

        .peek-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .peek-card {
          margin: 0;
          border: 1px solid rgba(229, 229, 229, 0.2);
          border-radius: 14px;
          overflow: hidden;
          background: rgba(245, 245, 245, 0.04);
        }

        .peek-image-wrap {
          position: relative;
          aspect-ratio: 4 / 3;
          background: #0a0a0a;
        }

        .peek-image {
          object-fit: cover;
        }

        .peek-caption {
          margin: 0;
          padding: 14px 16px 16px;
          font-size: 13px;
          line-height: 1.55;
          color: #666666;
        }

        .footer {
          border-top: 1px solid rgba(175, 170, 162, 0.12);
          padding: 30px 24px;
          text-align: center;
        }

        .footer-note {
          font-size: 12px;
          color: #666666;
        }

        @media (max-width: 900px) {
          .capture-split {
            grid-template-columns: 1fr;
          }

          .intro-panel {
            border-right: none;
            border-bottom: 1px solid rgba(195, 190, 182, 0.25);
          }

          .journey-grid {
            grid-template-columns: 1fr;
          }

          .peek-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .site-header {
            padding: 20px 24px;
          }

          .hero {
            min-height: 68vh;
            padding: 48px 28px;
          }

          .section {
            padding: 56px 28px;
          }

          .intro-image-wrap {
            min-height: 220px;
          }

          .intro-body,
          .purchase-panel {
            padding: 24px;
          }
        }
      `}</style>
    </main>
  )
}
