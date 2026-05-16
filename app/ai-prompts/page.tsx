import Link from "next/link"
import type { Metadata } from "next"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { OptInForm } from "@/components/ai-prompts/opt-in-form"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

export const metadata: Metadata = {
  title: "The ChatGPT Selfie Prompt Pack · SSELFIE",
  description:
    "12 copy-paste prompts for turning one selfie into editorial, beauty, mirror, car, and content-ready visuals.",
}

export default function AiPromptsOptInPage() {
  return (
    <main className={`opt-page ${inter.className}`}>
      <div className="opt-container">
        <section className="opt-hero">
          <p className="opt-eyebrow">FREE DOWNLOAD</p>
          <h1 className={`opt-headline ${cormorant.className}`}>
            The ChatGPT Selfie Prompt Pack.
          </h1>
          <p className="opt-sub">
            12 copy-paste prompts. Upload your selfie. Choose the look.
          </p>
        </section>

        <section className="opt-form-section">
          <OptInForm />
        </section>

        <div className="opt-rule" aria-hidden="true" />

        <section className="opt-bridge">
          <p className={`opt-bridge-headline ${cormorant.className}`}>
            The better the original selfie, the better the AI result.
          </p>
          <p className="opt-bridge-body">
            If you want to get the photo right before you run it through AI, start with the
            Free Selfie Guide. It is free.
          </p>
          <Link
            href="/selfie-guide?utm_source=ai_prompts&utm_medium=landing_page&utm_campaign=ai_prompts_to_selfie_guide"
            className="opt-bridge-link"
          >
            Get the Free Selfie Guide
          </Link>
        </section>
      </div>

      <style>{`
        .opt-page {
          min-height: 100vh;
          background: #0a0a0a;
          color: #f5f5f5;
          padding: 64px 24px 80px;
        }

        .opt-container {
          max-width: 540px;
          margin: 0 auto;
        }

        .opt-hero {
          margin-bottom: 48px;
        }

        .opt-eyebrow {
          margin: 0 0 16px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.4em;
          color: rgba(245, 245, 245, 0.38);
        }

        .opt-headline {
          margin: 0 0 18px;
          font-size: clamp(2.4rem, 8vw, 3.6rem);
          font-weight: 300;
          line-height: 1.0;
          letter-spacing: -0.02em;
          color: #f5f5f5;
        }

        .opt-sub {
          margin: 0;
          font-size: 16px;
          line-height: 1.75;
          color: rgba(245, 245, 245, 0.62);
        }

        .opt-form-section {
          margin-bottom: 0;
        }

        /* Form styles — used by OptInForm client component */
        .opt-form-header {
          margin: 0 0 20px;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(245, 245, 245, 0.46);
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
          color: rgba(245, 245, 245, 0.44);
          text-transform: uppercase;
        }

        .opt-input {
          width: 100%;
          padding: 14px 16px;
          background: rgba(245, 245, 245, 0.05);
          border: 1px solid rgba(245, 245, 245, 0.12);
          border-radius: 10px;
          color: #f5f5f5;
          font-size: 15px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s ease;
          box-sizing: border-box;
        }

        .opt-input::placeholder {
          color: rgba(245, 245, 245, 0.24);
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
          opacity: 0.88;
        }

        .opt-trust {
          margin: 14px 0 0;
          font-size: 12px;
          line-height: 1.6;
          color: rgba(245, 245, 245, 0.3);
          text-align: center;
        }

        .opt-confirmation {
          padding: 28px 24px;
          background: rgba(245, 245, 245, 0.04);
          border: 1px solid rgba(245, 245, 245, 0.1);
          border-radius: 14px;
        }

        .opt-confirmation-text {
          margin: 0;
          font-size: 15px;
          line-height: 1.75;
          color: rgba(245, 245, 245, 0.7);
        }

        .opt-rule {
          margin: 56px 0;
          height: 1px;
          background: rgba(245, 245, 245, 0.07);
        }

        .opt-bridge {
          padding: 0;
        }

        .opt-bridge-headline {
          margin: 0 0 14px;
          font-size: clamp(1.5rem, 5vw, 2rem);
          font-weight: 300;
          line-height: 1.15;
          color: #f5f5f5;
        }

        .opt-bridge-body {
          margin: 0 0 24px;
          font-size: 15px;
          line-height: 1.8;
          color: rgba(245, 245, 245, 0.56);
        }

        .opt-bridge-link {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(245, 245, 245, 0.62);
          text-decoration: none;
          border-bottom: 1px solid rgba(245, 245, 245, 0.18);
          padding-bottom: 2px;
          transition: color 0.15s ease, border-color 0.15s ease;
        }

        .opt-bridge-link:hover {
          color: #f5f5f5;
          border-color: rgba(245, 245, 245, 0.48);
        }

        @media (min-width: 640px) {
          .opt-page {
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
