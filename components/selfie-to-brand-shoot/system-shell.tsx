import Image from "next/image"
import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"

import {
  CLEAN_GIRL_MORNING_SERIES,
  DARK_FEMININE_CAFE_SERIES,
  NOIR_FEMME_SERIES,
  VAULT_COLLECTION_META,
} from "@/lib/ai-prompts/prompt-data"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

type ShellAccessMode = "token" | "academy"

type SelfieToBrandShootShellProps = {
  firstName?: string | null
  vaultHref: string
  accessMode: ShellAccessMode
  hasStudioAccess?: boolean
  hasPromptVaultAccess?: boolean
}

const featuredCollections = VAULT_COLLECTION_META.slice(0, 4).map((collection, index) => ({
  name: collection.name
    .replace(" Editorial", "")
    .replace(" Coffee-Run Editorial", "")
    .replace(" Luxury City Editorial", ""),
  image: collection.thumbnails[index === 0 ? 2 : 0] ?? collection.thumbnails[0],
  shotCount: collection.shotCount,
}))

const sourceSelfies = [
  {
    label: "Front",
    note: "Face straight to camera",
    image: "/images/selfie-to-brand-shoot/source-selfie-front.jpg",
    objectPosition: "center 38%",
  },
  {
    label: "Left side",
    note: "Profile and jawline",
    image: "/images/selfie-to-brand-shoot/source-selfie-left-profile.jpg",
    objectPosition: "24% 38%",
  },
  {
    label: "Right side",
    note: "Three-quarter angle",
    image: "/images/selfie-to-brand-shoot/source-selfie-right-profile.jpg",
    objectPosition: "68% 38%",
  },
]

const firstResultSteps = [
  "Choose or take one clear source selfie.",
  "Pick one visual world for the version of you you want to show.",
  "Copy the opening shot prompt.",
  "Paste it into ChatGPT with your selfie.",
  "Save the strongest result.",
  "Use it as your profile image, reel cover, story, or launch visual.",
]

const modules = [
  {
    number: "01",
    title: "Start With One Selfie",
    promise:
      "Choose the source photo that gives AI enough truth to keep you looking like you.",
    image: sourceSelfies[0].image,
    action: "Open selfie guide",
    href: "/selfie-guide",
    status: "Source photo",
    sourceSelfiePanel: true,
  },
  {
    number: "02",
    title: "Choose Your Visual World",
    promise:
      "Pick the shoot direction: founder morning, dark feminine, coastal, noir, street, or cafe.",
    image: NOIR_FEMME_SERIES[2]?.exampleImage,
    action: "Open the Vault",
    href: "vault",
    status: "Visual direction",
  },
  {
    number: "03",
    title: "Create The AI Brand Shoot",
    promise:
      "Use one opening prompt first. Get one usable result before browsing everything.",
    image: DARK_FEMININE_CAFE_SERIES[0]?.exampleImage,
    action: "Copy from Vault",
    href: "vault",
    status: "First result",
  },
  {
    number: "04",
    title: "Pick The Images That Look Like You",
    promise:
      "Keep the images that feel real, premium, and aligned. Discard the ones that look too AI.",
    image: NOIR_FEMME_SERIES[8]?.exampleImage,
    action: "Use the checklist",
    href: "#image-selection",
    status: "Taste filter",
  },
  {
    number: "05",
    title: "Turn Them Into Content",
    promise:
      "Decide where the shoot goes first: profile, reel cover, story, offer, or next post.",
    image: CLEAN_GIRL_MORNING_SERIES[3]?.exampleImage,
    action: "Plan first use",
    href: "#content-use",
    status: "Content use",
  },
]

const imageSelectionChecks = [
  "The face still looks like you.",
  "The expression feels natural, not plastic.",
  "Hands, hair, body, and outfit make sense.",
  "The image could live on your profile, website, offer, or reel cover.",
]

const contentUses = [
  "Profile photo",
  "Reel cover",
  "Story sequence",
  "Offer visual",
  "Carousel opener",
  "Sales page image",
]

function getModuleHref(href: string, vaultHref: string) {
  return href === "vault" ? vaultHref : href
}

export function SelfieToBrandShootSystemShell({
  firstName,
  vaultHref,
  accessMode,
  hasStudioAccess = false,
  hasPromptVaultAccess = true,
}: SelfieToBrandShootShellProps) {
  const titlePrefix = firstName ? `${firstName}'s` : "The"

  return (
    <main className={`sbs-page ${inter.className}`}>
      <nav className="sbs-nav" aria-label="Selfie to Brand Shoot navigation">
        <Link href="/" className={`sbs-logo ${cormorant.className}`}>
          SSELFIE
        </Link>
        <div className="sbs-nav-links">
          <a href="#path">Start Here</a>
          <a href="#modules">Modules</a>
          <Link href={vaultHref}>Vault</Link>
        </div>
      </nav>

      <section className="sbs-hero">
        <div className="sbs-hero-copy">
          <p className="sbs-kicker">SELFIE TO BRAND SHOOT SYSTEM</p>
          <h1 className={`sbs-headline ${cormorant.className}`}>
            {titlePrefix} Selfie to Brand Shoot.
          </h1>
          <p className="sbs-subhead">
            Start with one photo. Choose one visual world. Create one AI brand
            shoot result you can actually use in your content.
          </p>
          <div className="sbs-hero-actions">
            <a href="#path" className="sbs-primary">
              Start With One Selfie
            </a>
            <Link href={vaultHref} className="sbs-secondary">
              Open The Vault
            </Link>
          </div>
        </div>

        <div className="sbs-hero-board" aria-label="Current SSELFIE photoshoot worlds">
          {featuredCollections.slice(0, 3).map((collection, index) => (
            <figure key={collection.name} className={`sbs-hero-image sbs-hero-image-${index}`}>
              <Image
                src={collection.image}
                alt={`${collection.name} photoshoot preview`}
                fill
                priority={index === 0}
                sizes="(max-width: 768px) 75vw, 28vw"
                style={{ objectFit: "cover", objectPosition: "center top" }}
              />
              <figcaption>{collection.name}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section id="path" className="sbs-section sbs-path-section">
        <div className="sbs-section-header">
          <p className="sbs-kicker">FIRST 24 HOURS</p>
          <h2 className={`sbs-section-title ${cormorant.className}`}>
            Your first-result path.
          </h2>
          <p>
            Do this before you browse every collection. The goal is one strong
            result, not a perfect library tour.
          </p>
        </div>

        <ol className="sbs-path-list">
          {firstResultSteps.map((step, index) => (
            <li key={step}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="sbs-visual-worlds" aria-label="Visual worlds preview">
        {featuredCollections.map((collection) => (
          <article key={collection.name} className="sbs-world-card">
            <div className="sbs-world-image">
              <Image
                src={collection.image}
                alt={`${collection.name} visual world`}
                fill
                sizes="(max-width: 768px) 82vw, 24vw"
                style={{ objectFit: "cover", objectPosition: "center top" }}
              />
            </div>
            <div>
              <p className="sbs-world-meta">{collection.shotCount} shot sequence</p>
              <h3 className={cormorant.className}>{collection.name}</h3>
            </div>
          </article>
        ))}
      </section>

      <section id="modules" className="sbs-section">
        <div className="sbs-section-header sbs-narrow">
          <p className="sbs-kicker">THE SYSTEM</p>
          <h2 className={`sbs-section-title ${cormorant.className}`}>
            One transformation path, not another dashboard.
          </h2>
          <p>
            Each module moves the shoot forward: source photo, visual direction,
            first result, image selection, then content use.
          </p>
        </div>

        <div className="sbs-module-list">
          {modules.map((module) => (
            <article key={module.number} className="sbs-module">
              <div className="sbs-module-image">
                {module.sourceSelfiePanel ? (
                  <div className="sbs-source-selfies" aria-label="Real source selfie examples">
                    {sourceSelfies.map((selfie) => (
                      <figure key={selfie.label} className="sbs-source-selfie">
                        <Image
                          src={selfie.image}
                          alt={`${selfie.label} source selfie example`}
                          fill
                          sizes="(max-width: 768px) 33vw, 12vw"
                          loading="eager"
                          style={{ objectFit: "cover", objectPosition: selfie.objectPosition }}
                        />
                        <figcaption>
                          <span>{selfie.label}</span>
                          <small>{selfie.note}</small>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                ) : module.image ? (
                  <Image
                    src={module.image}
                    alt={`${module.title} module preview`}
                    fill
                    sizes="(max-width: 768px) 100vw, 34vw"
                    style={{ objectFit: "cover", objectPosition: "center top" }}
                  />
                ) : null}
              </div>
              <div className="sbs-module-copy">
                <p className="sbs-module-meta">
                  <span>{module.number}</span>
                  {module.status}
                </p>
                <h3 className={cormorant.className}>{module.title}</h3>
                <p>{module.promise}</p>
                <Link href={getModuleHref(module.href, vaultHref)} className="sbs-text-link">
                  {module.action}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="image-selection" className="sbs-section sbs-check-section">
        <div>
          <p className="sbs-kicker">TASTE FILTER</p>
          <h2 className={`sbs-section-title ${cormorant.className}`}>
            Keep the images that still feel like you.
          </h2>
        </div>
        <div className="sbs-check-grid">
          {imageSelectionChecks.map((check) => (
            <p key={check}>{check}</p>
          ))}
        </div>
      </section>

      <section id="content-use" className="sbs-content-use">
        <div className="sbs-content-inner">
          <p className="sbs-kicker">USE THE SHOOT</p>
          <h2 className={`sbs-section-title ${cormorant.className}`}>
            One shoot should give you more than one post.
          </h2>
          <div className="sbs-use-list">
            {contentUses.map((use) => (
              <span key={use}>{use}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="sbs-next-step">
        <div>
          <p className="sbs-kicker">NEXT STEP</p>
          <h2 className={cormorant.className}>Open the Vault and create the first look.</h2>
          <p>
            You do not need to finish every module today. Start with one source
            selfie, one visual world, and one usable result.
          </p>
        </div>
        <div className="sbs-next-actions">
          <Link href={vaultHref} className="sbs-primary">
            Open The Vault
          </Link>
          {hasStudioAccess && (
            <Link href="/studio?tab=maya" className="sbs-secondary">
              Open Studio
            </Link>
          )}
          {!hasPromptVaultAccess && accessMode === "academy" && (
            <Link href="/prompt-vault" className="sbs-secondary">
              Get The Vault
            </Link>
          )}
        </div>
      </section>

      <footer className="sbs-footer">
        <p>
          This is the lean Selfie to Brand Shoot home. Studio, Maya, Feed Planner,
          and older products stay available for existing customers.
        </p>
        <a href="mailto:support@sselfie.ai">support@sselfie.ai</a>
      </footer>

      <style>{`
        .sbs-page {
          min-height: 100vh;
          background: #F8FAFA;
          color: #0D0E10;
        }
        .sbs-nav {
          position: sticky;
          top: 0;
          z-index: 5;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 16px clamp(18px, 4vw, 46px);
          background: rgba(248,250,250,0.92);
          border-bottom: 1px solid rgba(197,198,200,0.35);
          backdrop-filter: blur(14px);
        }
        .sbs-logo {
          color: #0D0E10;
          font-size: 16px;
          font-weight: 300;
          letter-spacing: 0.34em;
          text-decoration: none;
          text-transform: uppercase;
        }
        .sbs-nav-links {
          display: flex;
          align-items: center;
          gap: clamp(12px, 2vw, 24px);
        }
        .sbs-nav-links a {
          color: #4F5052;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-decoration: none;
          text-transform: uppercase;
        }
        .sbs-hero {
          display: grid;
          grid-template-columns: minmax(0, 0.85fr) minmax(420px, 1.15fr);
          gap: clamp(28px, 5vw, 72px);
          align-items: center;
          max-width: 1280px;
          margin: 0 auto;
          padding: clamp(56px, 7vw, 104px) clamp(20px, 5vw, 64px);
        }
        .sbs-kicker {
          margin: 0 0 16px;
          color: #818283;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.36em;
          line-height: 1.7;
          text-transform: uppercase;
        }
        .sbs-headline {
          margin: 0 0 22px;
          color: #0D0E10;
          font-size: clamp(4rem, 8vw, 7rem);
          font-weight: 300;
          letter-spacing: -0.02em;
          line-height: 0.92;
        }
        .sbs-subhead {
          max-width: 560px;
          margin: 0 0 30px;
          color: #4F5052;
          font-size: 16px;
          line-height: 1.85;
        }
        .sbs-hero-actions,
        .sbs-next-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .sbs-primary,
        .sbs-secondary,
        .sbs-text-link {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          text-align: center;
          transition: opacity 0.18s ease, transform 0.18s ease, border-color 0.18s ease;
        }
        .sbs-primary,
        .sbs-secondary {
          padding: 14px 22px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        .sbs-primary {
          background: #0D0E10;
          color: #F8FAFA;
        }
        .sbs-secondary {
          border: 1px solid rgba(13,14,16,0.18);
          color: #0D0E10;
          background: #FFFFFF;
        }
        .sbs-primary:hover,
        .sbs-secondary:hover,
        .sbs-text-link:hover {
          opacity: 0.86;
          transform: translateY(-1px);
        }
        .sbs-hero-board {
          position: relative;
          min-height: clamp(520px, 62vw, 720px);
        }
        .sbs-hero-image {
          position: absolute;
          overflow: hidden;
          margin: 0;
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.45);
          box-shadow: 0 24px 80px rgba(13,14,16,0.08);
        }
        .sbs-hero-image figcaption {
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 12px;
          padding: 10px 12px;
          background: rgba(13,14,16,0.62);
          color: #F8FAFA;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }
        .sbs-hero-image-0 {
          inset: 0 auto auto 8%;
          width: 48%;
          aspect-ratio: 4 / 5.4;
        }
        .sbs-hero-image-1 {
          top: 12%;
          right: 0;
          width: 42%;
          aspect-ratio: 4 / 5.2;
        }
        .sbs-hero-image-2 {
          left: 36%;
          bottom: 0;
          width: 38%;
          aspect-ratio: 4 / 5.1;
        }
        .sbs-section {
          max-width: 1180px;
          margin: 0 auto;
          padding: clamp(58px, 7vw, 96px) clamp(20px, 5vw, 64px);
        }
        .sbs-section-header {
          max-width: 720px;
          margin-bottom: 34px;
        }
        .sbs-section-title {
          margin: 0 0 16px;
          color: #0D0E10;
          font-size: clamp(2.8rem, 6vw, 5.4rem);
          font-weight: 300;
          letter-spacing: -0.02em;
          line-height: 0.96;
        }
        .sbs-section-header p,
        .sbs-next-step p,
        .sbs-footer p {
          margin: 0;
          color: #4F5052;
          font-size: 15px;
          line-height: 1.8;
        }
        .sbs-path-section {
          border-top: 1px solid rgba(197,198,200,0.35);
          border-bottom: 1px solid rgba(197,198,200,0.35);
          background: #FFFFFF;
        }
        .sbs-path-list {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 1px;
          margin: 0;
          padding: 1px;
          list-style: none;
          background: rgba(197,198,200,0.35);
        }
        .sbs-path-list li {
          min-height: 190px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 20px;
          background: #FFFFFF;
        }
        .sbs-path-list span {
          color: #C5C6C8;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.18em;
        }
        .sbs-path-list p {
          margin: 0;
          color: #282728;
          font-size: 13px;
          line-height: 1.65;
        }
        .sbs-visual-worlds {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border-bottom: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-world-card {
          background: #F8FAFA;
        }
        .sbs-world-image {
          position: relative;
          aspect-ratio: 4 / 5;
          overflow: hidden;
          background: #FFFFFF;
        }
        .sbs-world-card div:last-child {
          padding: 18px;
        }
        .sbs-world-card h3 {
          margin: 0;
          color: #0D0E10;
          font-size: 1.6rem;
          font-weight: 300;
          line-height: 1.05;
        }
        .sbs-world-meta {
          margin: 0 0 8px;
          color: #818283;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }
        .sbs-narrow {
          max-width: 640px;
        }
        .sbs-module-list {
          display: grid;
          gap: 18px;
        }
        .sbs-module {
          display: grid;
          grid-template-columns: minmax(240px, 0.42fr) minmax(0, 0.58fr);
          gap: clamp(22px, 5vw, 56px);
          align-items: center;
          padding: clamp(18px, 3vw, 28px);
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-module:nth-child(even) {
          grid-template-columns: minmax(0, 0.58fr) minmax(240px, 0.42fr);
        }
        .sbs-module:nth-child(even) .sbs-module-image {
          order: 2;
        }
        .sbs-module-image {
          position: relative;
          min-height: 380px;
          overflow: hidden;
          background: #F8FAFA;
        }
        .sbs-source-selfies {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          height: 100%;
          min-height: 380px;
          gap: 1px;
          background: rgba(197,198,200,0.45);
        }
        .sbs-source-selfie {
          position: relative;
          min-width: 0;
          margin: 0;
          overflow: hidden;
          background: #FFFFFF;
        }
        .sbs-source-selfie img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .sbs-source-selfie figcaption {
          position: absolute;
          left: 10px;
          right: 10px;
          bottom: 10px;
          display: grid;
          gap: 3px;
          padding: 10px;
          background: rgba(13,14,16,0.62);
          color: #F8FAFA;
        }
        .sbs-source-selfie span {
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }
        .sbs-source-selfie small {
          color: rgba(248,250,250,0.78);
          font-size: 11px;
          line-height: 1.35;
        }
        .sbs-module-copy {
          max-width: 520px;
        }
        .sbs-module-meta {
          display: flex;
          gap: 12px;
          align-items: center;
          margin: 0 0 16px;
          color: #818283;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }
        .sbs-module-meta span {
          color: #0D0E10;
        }
        .sbs-module h3 {
          margin: 0 0 14px;
          color: #0D0E10;
          font-size: clamp(2.3rem, 4.4vw, 4rem);
          font-weight: 300;
          letter-spacing: -0.02em;
          line-height: 0.96;
        }
        .sbs-module-copy p:not(.sbs-module-meta) {
          margin: 0 0 24px;
          color: #4F5052;
          font-size: 15px;
          line-height: 1.85;
        }
        .sbs-text-link {
          min-height: 42px;
          color: #0D0E10;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          border-bottom: 1px solid #0D0E10;
        }
        .sbs-check-section {
          display: grid;
          grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
          gap: clamp(24px, 5vw, 64px);
          border-top: 1px solid rgba(197,198,200,0.35);
          border-bottom: 1px solid rgba(197,198,200,0.35);
          background: #FFFFFF;
        }
        .sbs-check-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.35);
          align-self: start;
        }
        .sbs-check-grid p {
          min-height: 160px;
          display: flex;
          align-items: flex-end;
          margin: 0;
          padding: 20px;
          background: #FFFFFF;
          color: #282728;
          font-size: 13px;
          line-height: 1.7;
        }
        .sbs-content-use {
          padding: clamp(58px, 7vw, 96px) clamp(20px, 5vw, 64px);
          background: #F8FAFA;
        }
        .sbs-content-inner {
          max-width: 1120px;
          margin: 0 auto;
        }
        .sbs-use-list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 28px;
        }
        .sbs-use-list span {
          padding: 12px 14px;
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.35);
          color: #282728;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .sbs-next-step {
          max-width: 1180px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 28px;
          align-items: end;
          margin: 0 auto;
          padding: clamp(46px, 6vw, 72px) clamp(20px, 5vw, 64px);
          border-top: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-next-step h2 {
          margin: 0 0 12px;
          color: #0D0E10;
          font-size: clamp(2.4rem, 5vw, 4.6rem);
          font-weight: 300;
          letter-spacing: -0.02em;
          line-height: 0.96;
        }
        .sbs-footer {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 28px clamp(20px, 5vw, 64px);
          border-top: 1px solid rgba(197,198,200,0.35);
          color: #818283;
        }
        .sbs-footer p,
        .sbs-footer a {
          color: #818283;
          font-size: 12px;
          line-height: 1.7;
        }

        @media (max-width: 980px) {
          .sbs-hero {
            grid-template-columns: 1fr;
          }
          .sbs-hero-board {
            min-height: 520px;
          }
          .sbs-path-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .sbs-visual-worlds {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .sbs-module,
          .sbs-module:nth-child(even),
          .sbs-check-section,
          .sbs-next-step {
            grid-template-columns: 1fr;
          }
          .sbs-module:nth-child(even) .sbs-module-image {
            order: initial;
          }
          .sbs-next-actions {
            width: 100%;
          }
        }

        @media (max-width: 640px) {
          .sbs-nav {
            align-items: flex-start;
          }
          .sbs-nav-links {
            display: none;
          }
          .sbs-hero {
            padding-top: 42px;
          }
          .sbs-headline {
            font-size: clamp(3.3rem, 17vw, 5rem);
          }
          .sbs-hero-actions,
          .sbs-next-actions {
            display: grid;
            grid-template-columns: 1fr;
          }
          .sbs-primary,
          .sbs-secondary {
            width: 100%;
          }
          .sbs-hero-board {
            min-height: 440px;
          }
          .sbs-hero-image-0 {
            left: 0;
            width: 58%;
          }
          .sbs-hero-image-1 {
            top: 18%;
            width: 50%;
          }
          .sbs-hero-image-2 {
            left: 30%;
            width: 52%;
          }
          .sbs-path-list,
          .sbs-visual-worlds,
          .sbs-check-grid {
            grid-template-columns: 1fr;
          }
          .sbs-path-list li {
            min-height: 132px;
          }
          .sbs-module {
            padding: 14px;
          }
          .sbs-module-image {
            min-height: 360px;
          }
          .sbs-source-selfies {
            min-height: 360px;
          }
          .sbs-source-selfie figcaption {
            left: 6px;
            right: 6px;
            bottom: 6px;
            padding: 8px 7px;
          }
          .sbs-source-selfie span {
            font-size: 8px;
            letter-spacing: 0.18em;
          }
          .sbs-source-selfie small {
            display: none;
          }
          .sbs-footer {
            display: grid;
          }
        }
      `}</style>
    </main>
  )
}
