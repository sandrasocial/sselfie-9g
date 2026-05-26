import fs from "node:fs"
import path from "node:path"
import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { Cormorant_Garamond, Inter } from "next/font/google"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

const SANDRA_IMAGE = path.join(process.cwd(), "public", "images", "sandra-bio.jpg")

export const metadata: Metadata = {
  title: "Sandra · SSELFIE",
  description:
    "Personal brand photography for women building online. Free Selfie Guide, AI Selfie Prompts, Starter Kit, and more.",
}

export default function BioPage() {
  const hasImage = fs.existsSync(SANDRA_IMAGE)

  return (
    <main className={`bio-page ${inter.className}`}>
      <div className="bio-inner">
        <p className="bio-wordmark">SSELFIE</p>

        <div className="bio-portrait-wrap">
          {hasImage ? (
            <Image
              src="/images/sandra-bio.jpg"
              alt="Sandra, founder of SSELFIE"
              width={200}
              height={260}
              className="bio-portrait"
              priority
            />
          ) : (
            <div className="bio-portrait-placeholder" aria-hidden="true" />
          )}
        </div>

        <div className="bio-identity">
          <h1 className={`bio-headline ${cormorant.className}`}>
            They say a picture tells a thousand words.
          </h1>
          <p className={`bio-follow ${cormorant.className}`}>
            So what do your photos say about you?
          </p>
          <p className="bio-sub">
            Better selfies, cleaner edits, and content you can actually post from your phone.
          </p>
          <p className="bio-positioning">
            No photographer. No studio. No overthinking.
          </p>
        </div>

        <div className="bio-links">
          <Link href="/selfie-guide" className="bio-card bio-card-primary">
            <span className="bio-card-eyebrow">FREE GUIDE</span>
            <span className={`bio-card-title ${cormorant.className}`}>
              Your first real selfie starts here.
            </span>
            <span className="bio-card-body">
              Light, angles, confidence. The guide is free and you can start today.
            </span>
            <span className="bio-card-cta">Get the free guide</span>
          </Link>

          <Link href="/ai-prompts" className="bio-card bio-card-secondary">
            <span className="bio-card-eyebrow">FREE DOWNLOAD</span>
            <span className={`bio-card-title ${cormorant.className}`}>
              The ChatGPT Selfie Prompt Pack.
            </span>
            <span className="bio-card-body">
              17 copy-paste prompts. Upload your selfie. Choose the look.
            </span>
            <span className="bio-card-cta">Get the prompts</span>
          </Link>

          <div className="bio-tertiary">
            <Link href="/starter-kit" className="bio-tertiary-link">
              The Starter Kit
              <span className="bio-price">$37</span>
            </Link>
            <Link href="/masterclass" className="bio-tertiary-link">
              Selfie Masterclass
              <span className="bio-arrow">&#8599;</span>
            </Link>
            <Link href="/work-with-me" className="bio-tertiary-link">
              Work With Me
              <span className="bio-arrow">&#8599;</span>
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        .bio-page {
          min-height: 100vh;
          background: #f5f5f5;
          color: #0a0a0a;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 52px 20px 80px;
        }

        .bio-inner {
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .bio-wordmark {
          margin: 0 0 36px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.42em;
          text-transform: uppercase;
          color: rgba(10, 10, 10, 0.36);
        }

        .bio-portrait-wrap {
          margin-bottom: 28px;
        }

        .bio-portrait {
          width: 160px;
          height: 200px;
          border-radius: 16px;
          object-fit: cover;
          display: block;
        }

        .bio-portrait-placeholder {
          width: 160px;
          height: 200px;
          border-radius: 16px;
          background: rgba(10, 10, 10, 0.06);
          border: 1px solid rgba(10, 10, 10, 0.1);
        }

        .bio-identity {
          text-align: center;
          margin-bottom: 40px;
          padding: 0 4px;
        }

        .bio-headline {
          margin: 0 0 6px;
          font-size: clamp(1.7rem, 6vw, 2.2rem);
          font-weight: 300;
          line-height: 1.15;
          color: #0a0a0a;
        }

        .bio-follow {
          margin: 0 0 16px;
          font-size: clamp(1.25rem, 4.5vw, 1.55rem);
          font-weight: 300;
          line-height: 1.2;
          color: rgba(10, 10, 10, 0.58);
        }

        .bio-sub {
          margin: 0 0 10px;
          font-size: 14px;
          line-height: 1.7;
          color: rgba(10, 10, 10, 0.52);
        }

        .bio-positioning {
          margin: 0;
          font-size: 12px;
          line-height: 1.65;
          color: rgba(10, 10, 10, 0.36);
        }

        .bio-links {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .bio-card {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 22px 22px 20px;
          border-radius: 18px;
          text-decoration: none;
          transition: opacity 0.15s ease;
        }

        .bio-card:hover {
          opacity: 0.87;
        }

        .bio-card-primary {
          background: #0a0a0a;
          color: #f5f5f5;
        }

        .bio-card-secondary {
          background: transparent;
          border: 1px solid rgba(10, 10, 10, 0.14);
          color: #0a0a0a;
        }

        .bio-card-eyebrow {
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.32em;
          opacity: 0.48;
        }

        .bio-card-title {
          font-size: 1.4rem;
          font-weight: 300;
          line-height: 1.1;
          margin-top: 2px;
        }

        .bio-card-body {
          font-size: 13px;
          line-height: 1.65;
          opacity: 0.65;
          margin-top: 2px;
        }

        .bio-card-cta {
          margin-top: 12px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.24em;
          text-transform: uppercase;
        }

        .bio-card-primary .bio-card-cta { color: rgba(245, 245, 245, 0.7); }
        .bio-card-secondary .bio-card-cta { color: rgba(10, 10, 10, 0.5); }

        .bio-tertiary {
          margin-top: 4px;
          width: 100%;
          border-top: 1px solid rgba(10, 10, 10, 0.08);
        }

        .bio-tertiary-link {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px 4px;
          font-size: 14px;
          color: rgba(10, 10, 10, 0.42);
          text-decoration: none;
          border-bottom: 1px solid rgba(10, 10, 10, 0.06);
          transition: color 0.15s ease;
        }

        .bio-tertiary-link:last-child { border-bottom: none; }
        .bio-tertiary-link:hover { color: rgba(10, 10, 10, 0.78); }

        .bio-price {
          font-size: 12px;
          opacity: 0.55;
        }

        .bio-arrow {
          font-size: 13px;
          opacity: 0.4;
        }
      `}</style>
    </main>
  )
}
