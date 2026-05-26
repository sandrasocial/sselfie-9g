import Link from "next/link"
import type { Metadata } from "next"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { OptInForm } from "@/components/ai-prompts/opt-in-form"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

export const metadata: Metadata = {
  title: "The ChatGPT Selfie Prompt Pack · SSELFIE",
  description:
    "17 copy-paste prompts for turning one selfie into editorial, beauty, mirror, car, and content-ready visuals.",
}

export default function AiPromptsOptInPage() {
  return (
    <main className={inter.className}>

      {/* ── Full-bleed hero ────────────────────────────────────────────── */}
      <section className="opt-hero-section">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/ai-prompts/ai-prompts-hero.jpg"
          alt="Sandra in the car mirror — editorial selfie"
          className="opt-hero-img"
        />
        <div className="opt-hero-overlay" aria-hidden="true" />

        <div className="opt-hero-content">
          <div className="opt-container">
            <p className="opt-eyebrow">FREE DOWNLOAD</p>
            <h1 className={`opt-headline ${cormorant.className}`}>
              The ChatGPT Selfie Prompt Pack.
            </h1>
            <p className="opt-sub">
              17 copy-paste prompts. Upload your selfie. Choose the look.
            </p>

            <div className="opt-form-card">
              <OptInForm />
            </div>
          </div>
        </div>
      </section>

      {/* ── Bridge section ─────────────────────────────────────────────── */}
      <section className="opt-bridge">
        <div className="opt-container">
          <p className={`opt-bridge-headline ${cormorant.className}`}>
            Your photo is the starting point.
          </p>
          <p className="opt-bridge-body">
            The better the original, the better the AI result. If you want to get the photo right before you run it through AI, start with the Free Selfie Guide. It is free.
          </p>
          <Link
            href="/selfie-guide?utm_source=ai_prompts&utm_medium=landing_page&utm_campaign=ai_prompts_to_selfie_guide"
            className="opt-bridge-link"
          >
            Get the Free Selfie Guide
          </Link>
        </div>
      </section>

      <style>{`
        /* ── Page shell ──────────────────────────────────────────────── */
        .opt-container {
          max-width: 540px;
          margin: 0 auto;
        }

        /* ── Hero ────────────────────────────────────────────────────── */
        .opt-hero-section {
          position: relative;
          min-height: 100dvh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .opt-hero-img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: 50% 20%;
        }

        .opt-hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(10,10,10,0.30) 0%,
            rgba(10,10,10,0.06) 30%,
            rgba(10,10,10,0.88) 100%
          );
        }

        .opt-hero-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          flex: 1;
          padding: 80px 24px 56px;
        }

        /* ── Hero typography ─────────────────────────────────────────── */
        .opt-eyebrow {
          margin: 0 0 16px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.4em;
          color: rgba(245, 245, 245, 0.5);
        }

        .opt-headline {
          margin: 0 0 16px;
          font-size: clamp(2.4rem, 8vw, 3.6rem);
          font-weight: 300;
          line-height: 1.0;
          letter-spacing: -0.02em;
          color: #f5f5f5;
          text-shadow: 0 2px 8px rgba(0,0,0,0.7), 1px 1px 0 rgba(0,0,0,0.4);
        }

        .opt-sub {
          margin: 0 0 32px;
          font-size: 16px;
          line-height: 1.75;
          color: rgba(245, 245, 245, 0.62);
        }

        /* ── Form card (dark overlay card, same pattern as selfie guide) */
        .opt-form-card {
          background: rgba(20, 19, 18, 0.82);
          border: 1px solid rgba(245, 245, 245, 0.10);
          padding: 26px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
        }

        /* ── Form fields — used by OptInForm client component ─────────── */
        .opt-form-header {
          margin: 0 0 20px;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(245, 245, 245, 0.38);
        }

        .opt-fields {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
        }

        .opt-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .opt-label {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.08em;
          color: rgba(245, 245, 245, 0.38);
          text-transform: uppercase;
        }

        .opt-input {
          width: 100%;
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.07);
          border: 1px solid rgba(245, 245, 245, 0.14);
          border-radius: 10px;
          color: #f5f5f5;
          font-size: 15px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s ease;
          box-sizing: border-box;
        }

        .opt-input::placeholder {
          color: rgba(245, 245, 245, 0.28);
        }

        .opt-input:focus {
          border-color: rgba(245, 245, 245, 0.32);
        }

        .opt-submit {
          width: 100%;
          padding: 16px 20px;
          background: #f5f5f5;
          color: #0a0a0a;
          border: none;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: inherit;
          transition: opacity 0.15s ease;
          margin-top: 4px;
        }

        .opt-submit:hover {
          opacity: 0.82;
        }

        .opt-trust {
          margin: 14px 0 0;
          font-size: 12px;
          line-height: 1.6;
          color: rgba(245, 245, 245, 0.28);
          text-align: center;
        }

        .opt-confirmation {
          padding: 24px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(245, 245, 245, 0.12);
          border-radius: 14px;
        }

        .opt-confirmation-text {
          margin: 0 0 20px;
          font-size: 15px;
          line-height: 1.75;
          color: rgba(245, 245, 245, 0.62);
        }

        .opt-open-btn {
          display: inline-block;
          padding: 14px 24px;
          background: #f5f5f5;
          color: #0a0a0a;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          text-decoration: none;
          transition: opacity 0.15s ease;
        }

        .opt-open-btn:hover {
          opacity: 0.82;
        }

        .opt-error {
          margin: 12px 0 0;
          font-size: 13px;
          line-height: 1.6;
          color: rgba(240, 120, 120, 0.9);
          text-align: center;
        }

        /* ── Bridge section ──────────────────────────────────────────── */
        .opt-bridge {
          background: #f5f5f5;
          color: #0a0a0a;
          padding: 64px 24px 80px;
        }

        .opt-bridge-headline {
          margin: 0 0 14px;
          font-size: clamp(1.5rem, 5vw, 2rem);
          font-weight: 300;
          line-height: 1.15;
          color: #0a0a0a;
        }

        .opt-bridge-body {
          margin: 0 0 24px;
          font-size: 15px;
          line-height: 1.8;
          color: rgba(10, 10, 10, 0.5);
        }

        .opt-bridge-link {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(10, 10, 10, 0.52);
          text-decoration: none;
          border-bottom: 1px solid rgba(10, 10, 10, 0.2);
          padding-bottom: 2px;
          transition: color 0.15s ease, border-color 0.15s ease;
        }

        .opt-bridge-link:hover {
          color: #0a0a0a;
          border-color: rgba(10, 10, 10, 0.5);
        }

        /* ── Responsive ──────────────────────────────────────────────── */
        @media (min-width: 640px) {
          .opt-hero-content {
            padding: 80px 40px 64px;
          }

          .opt-bridge {
            padding: 80px 40px 100px;
          }

          .opt-fields {
            flex-direction: row;
          }

          .opt-field {
            flex: 1;
          }
        }
      `}</style>
    </main>
  )
}
