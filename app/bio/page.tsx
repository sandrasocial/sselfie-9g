import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { Cormorant_Garamond, Inter } from "next/font/google"
import {
  isSkoolPublicAcquisitionEnabled,
  resolvePublicMembershipAcquisitionHref,
} from "@/lib/skool/public-acquisition"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

const HERO_IMAGE = "/images/ai-prompts/clean-girl-morning-shot-1.jpg"

export const metadata: Metadata = {
  title: "Sandra · SSELFIE",
  description:
    "Personal brand photography for women building online. Free Selfie Guide, AI Selfie Prompts, Starter Kit, and more.",
}

export default function BioPage() {
  const skoolLaunch = isSkoolPublicAcquisitionEnabled()
  const membershipHref = resolvePublicMembershipAcquisitionHref({ legacyHref: "/join/studio" })

  return (
    <main className={`bio-page ${inter.className}`}>
      <div className="bio-hero">
        <Image
          src={HERO_IMAGE}
          alt="Sandra, founder of SSELFIE"
          fill
          sizes="100vw"
          className="bio-hero-img"
          style={{ objectFit: "cover", objectPosition: "50% 16%" }}
          priority
        />
        <span className="bio-hero-fade" aria-hidden="true" />
        <p className="bio-hero-wordmark">SSELFIE</p>
      </div>

      <div className="bio-inner">
        <div className="bio-profile-wrap">
          <span className="bio-profile">
            <Image
              src={HERO_IMAGE}
              alt="Sandra"
              fill
              sizes="120px"
              style={{ objectFit: "cover", objectPosition: "48% 24%" }}
            />
          </span>
        </div>

        <p className="bio-proof">
          Join <strong>100,000+</strong> people learning to show up online
        </p>

        <div className="bio-identity">
          <h1 className={`bio-headline ${cormorant.className}`}>
            They say a picture tells a thousand words.
          </h1>
          <p className={`bio-follow ${cormorant.className}`}>
            So what do your photos say about you?
          </p>
        </div>

        <div className="bio-links">
          {/* PRIMARY - Free ChatGPT Selfie Prompt Pack (feeds the Vault funnel) */}
          <Link href="/ai-prompts" className="bio-card bio-card-primary">
            <Image
              src="/images/ai-prompts/dark-feminine-cafe-shot-1.jpg"
              alt=""
              fill
              sizes="(max-width: 460px) 100vw, 420px"
              className="bio-card-bg"
              style={{ objectFit: "cover", objectPosition: "50% 22%" }}
              priority
            />
            <span className="bio-card-overlay" aria-hidden="true" />
            <span className="bio-card-tag">Start here</span>
            <span className="bio-card-content">
              <span className="bio-card-eyebrow">FREE DOWNLOAD</span>
              <span className={`bio-card-title ${cormorant.className}`}>
                The ChatGPT Selfie Prompt Pack.
              </span>
              <span className="bio-card-body">
                17 copy-paste prompts. Upload your selfie. Choose the look.
              </span>
              <span className="bio-card-cta">Download the prompt pack</span>
            </span>
          </Link>

          {/* SECONDARY - Free Selfie-to-Brand Guide */}
          <Link href="/selfie-guide" className="bio-card bio-card-secondary">
            <Image
              src="/images/ai-prompts/quiet-luxury-london-shot-1.jpg"
              alt=""
              fill
              sizes="(max-width: 460px) 100vw, 420px"
              className="bio-card-bg"
              style={{ objectFit: "cover", objectPosition: "50% 24%" }}
            />
            <span className="bio-card-overlay" aria-hidden="true" />
            <span className="bio-card-content">
              <span className="bio-card-eyebrow">FREE GUIDE</span>
              <span className={`bio-card-title ${cormorant.className}`}>
                The Selfie-to-Brand Guide.
              </span>
              <span className="bio-card-body">
                Light, angles, confidence. Start today, all free.
              </span>
              <span className="bio-card-cta">Start the free guide</span>
            </span>
          </Link>
        </div>

        <div className="bio-shop">
          <p className="bio-shop-label">The Shop</p>
          <div className="bio-shop-list">
            <Link href="/prompt-vault" className="bio-shop-card">
              <span className="bio-shop-thumb">
                <Image
                  src="/images/ai-prompts/dark-balcony-shot-1.png"
                  alt=""
                  fill
                  sizes="64px"
                  style={{ objectFit: "cover", objectPosition: "50% 20%" }}
                />
              </span>
              <span className="bio-shop-text">
                <span className="bio-shop-title">Unlock the Prompt Vault</span>
                <span className="bio-shop-desc">Every editorial shoot, copy-paste ready</span>
              </span>
              <span className="bio-shop-price">$37</span>
            </Link>

            <Link href="/starter-kit" className="bio-shop-card">
              <span className="bio-shop-thumb">
                <Image
                  src="/images/ai-prompts/coastal-white-shot-1.jpg"
                  alt=""
                  fill
                  sizes="64px"
                  style={{ objectFit: "cover", objectPosition: "50% 20%" }}
                />
              </span>
              <span className="bio-shop-text">
                <span className="bio-shop-title">Get the Starter Kit</span>
                <span className="bio-shop-desc">Your first brand shoot, done with you</span>
              </span>
              <span className="bio-shop-price">$37</span>
            </Link>

            <Link href={membershipHref} className="bio-shop-card">
              <span className="bio-shop-thumb">
                <Image
                  src="/images/ai-prompts/marble-wine-shot-1.jpg"
                  alt=""
                  fill
                  sizes="64px"
                  style={{ objectFit: "cover", objectPosition: "50% 20%" }}
                />
              </span>
              <span className="bio-shop-text">
                <span className="bio-shop-title">
                  {skoolLaunch ? "Build With Sandra" : "Join SSELFIE SUITE"}
                </span>
                <span className="bio-shop-desc">
                  {skoolLaunch
                    ? "Live weekly help · SUITE and Maya included"
                    : "Your whole brand studio · cancel anytime"}
                </span>
              </span>
              <span className="bio-shop-price">
                {skoolLaunch ? "$97" : "€97"}
                <span className="bio-shop-per">/mo</span>
              </span>
            </Link>
          </div>

          <div className="bio-tertiary">
            <Link href="/masterclass" className="bio-tertiary-link">
              Selfie Masterclass
              <span className="bio-price">$147</span>
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        .bio-page {
          min-height: 100vh;
          background: #f5f5f5;
          color: #0a0a0a;
          padding: 0 0 80px;
        }

        .bio-hero {
          position: relative;
          width: 100%;
          height: clamp(360px, 62vh, 560px);
          overflow: hidden;
          background: #ece8e3;
        }

        .bio-hero-img {
          z-index: 0;
        }

        .bio-hero-fade {
          position: absolute;
          inset: 0;
          z-index: 1;
          background:
            linear-gradient(
              to bottom,
              rgba(10, 10, 10, 0.3) 0%,
              rgba(10, 10, 10, 0) 16%
            ),
            linear-gradient(
              to bottom,
              rgba(245, 245, 245, 0) 52%,
              rgba(245, 245, 245, 0.55) 82%,
              #f5f5f5 100%
            );
        }

        .bio-hero-wordmark {
          position: absolute;
          top: 22px;
          left: 0;
          right: 0;
          z-index: 2;
          margin: 0;
          text-align: center;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.42em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.94);
          text-shadow: 0 1px 14px rgba(0, 0, 0, 0.4);
        }

        .bio-inner {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 420px;
          margin: 0 auto;
          padding: 0 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .bio-profile-wrap {
          margin-top: -58px;
          margin-bottom: 18px;
        }

        .bio-profile {
          position: relative;
          display: block;
          width: 116px;
          height: 116px;
          border-radius: 50%;
          overflow: hidden;
          border: 4px solid #f5f5f5;
          box-shadow: 0 12px 30px -12px rgba(10, 10, 10, 0.45);
          background: #ece8e3;
        }

        .bio-proof {
          margin: 0 0 20px;
          font-size: 12px;
          line-height: 1.4;
          letter-spacing: 0.01em;
          text-align: center;
          color: rgba(10, 10, 10, 0.5);
        }

        .bio-proof strong {
          font-weight: 600;
          color: rgba(10, 10, 10, 0.82);
        }

        .bio-identity {
          text-align: center;
          margin-bottom: 28px;
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
          margin: 0;
          font-size: clamp(1.2rem, 4.5vw, 1.5rem);
          font-weight: 300;
          line-height: 1.2;
          color: rgba(10, 10, 10, 0.58);
        }

        .bio-links {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .bio-card {
          position: relative;
          display: flex;
          min-height: 268px;
          border-radius: 18px;
          overflow: hidden;
          text-decoration: none;
          color: #ffffff;
          isolation: isolate;
          box-shadow: 0 18px 40px -24px rgba(10, 10, 10, 0.55);
        }

        .bio-card-primary {
          min-height: 340px;
        }

        .bio-card-secondary {
          min-height: 216px;
        }

        .bio-card-tag {
          position: absolute;
          top: 16px;
          right: 16px;
          z-index: 3;
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.94);
          color: #0a0a0a;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .bio-card-bg {
          z-index: 0;
          transition: transform 0.6s cubic-bezier(0.2, 0.7, 0.2, 1);
          will-change: transform;
        }

        .bio-card:hover .bio-card-bg {
          transform: scale(1.045);
        }

        .bio-card-overlay {
          position: absolute;
          inset: 0;
          z-index: 1;
          background:
            linear-gradient(
              to top,
              rgba(8, 8, 8, 0.86) 0%,
              rgba(8, 8, 8, 0.58) 38%,
              rgba(8, 8, 8, 0.18) 70%,
              rgba(8, 8, 8, 0.28) 100%
            );
        }

        .bio-card-content {
          position: relative;
          z-index: 2;
          width: 100%;
          align-self: flex-end;
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 24px 24px 22px;
        }

        .bio-card-eyebrow {
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.34em;
          color: rgba(255, 255, 255, 0.72);
        }

        .bio-card-title {
          font-size: 1.5rem;
          font-weight: 300;
          line-height: 1.12;
          margin-top: 3px;
          color: #ffffff;
          text-shadow: 0 1px 18px rgba(0, 0, 0, 0.5);
        }

        .bio-card-body {
          font-size: 13px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.82);
          margin-top: 3px;
          max-width: 30ch;
          text-shadow: 0 1px 12px rgba(0, 0, 0, 0.45);
        }

        .bio-card-cta {
          margin-top: 14px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.92);
        }

        .bio-shop {
          width: 100%;
          margin-top: 30px;
        }

        .bio-shop-label {
          margin: 0 0 12px;
          padding-left: 2px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: rgba(10, 10, 10, 0.4);
        }

        .bio-shop-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .bio-shop-card {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 16px 10px 10px;
          border-radius: 14px;
          background: #ffffff;
          border: 1px solid rgba(10, 10, 10, 0.07);
          text-decoration: none;
          color: #0a0a0a;
          box-shadow: 0 8px 22px -18px rgba(10, 10, 10, 0.5);
          transition: transform 0.15s ease, border-color 0.15s ease;
        }

        .bio-shop-card:hover {
          transform: translateY(-1px);
          border-color: rgba(10, 10, 10, 0.16);
        }

        .bio-shop-thumb {
          position: relative;
          flex-shrink: 0;
          width: 58px;
          height: 66px;
          border-radius: 10px;
          overflow: hidden;
          background: #ece8e3;
        }

        .bio-shop-text {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
          min-width: 0;
        }

        .bio-shop-title {
          font-size: 15px;
          font-weight: 500;
          line-height: 1.2;
          color: #0a0a0a;
        }

        .bio-shop-desc {
          font-size: 11.5px;
          line-height: 1.4;
          color: rgba(10, 10, 10, 0.5);
        }

        .bio-shop-price {
          flex-shrink: 0;
          padding-left: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #0a0a0a;
          white-space: nowrap;
        }

        .bio-shop-per {
          font-size: 11px;
          font-weight: 500;
          color: rgba(10, 10, 10, 0.45);
        }

        .bio-tertiary {
          margin-top: 22px;
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
