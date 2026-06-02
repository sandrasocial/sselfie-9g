import Image from "next/image"
import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"

import {
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

const selfieExampleCards = [
  {
    label: "Good Selfie",
    eyebrow: "Use this when possible",
    image: sourceSelfies[0].image,
    objectPosition: "center 38%",
    traits: [
      "Clear face",
      "Soft natural light",
      "Full facial features visible",
      "No heavy filter",
      "Simple background",
      "Natural expression",
      "Front or slight 3/4 angle",
      "High-resolution image",
    ],
    note: "This gives AI the best chance of keeping you recognizable.",
  },
  {
    label: "Okay Selfie",
    eyebrow: "Can work, but may need more tries",
    image: "/images/selfie-guide/mirror-selfie-side-profile.jpg",
    objectPosition: "center 34%",
    traits: [
      "Mirror selfie",
      "Slightly busy background",
      "Uneven light",
      "Phone partly visible",
      "Slight shadow",
      "Mild filter",
      "A more dramatic angle",
      "Still clear enough to read the face",
    ],
    note: "This might work, but expect more variation. If your first result looks off, try a clearer selfie before changing the prompt.",
  },
  {
    label: "Bad Selfie",
    eyebrow: "Do not start here",
    image: "/images/selfie-guide/face-covered-selfie.jpg",
    objectPosition: "center 38%",
    traits: [
      "Face covered",
      "Blurry or dark",
      "Sunglasses",
      "Heavy beauty filter",
      "Face too small",
      "Group photo",
      "Extreme angle",
      "Cropped forehead or chin",
    ],
    note: "Bad input creates fake output. Do not fight the prompt if the source selfie is the problem.",
  },
]

const sourceSelfieChecklist = [
  "My face is clear and sharp.",
  "My full face is visible.",
  "My eyes, nose, mouth, jawline, and hairline are not hidden.",
  "The photo is well-lit.",
  "The photo is not blurry.",
  "The photo is not overly filtered.",
  "I am the only person in the image.",
  "My face is not too far away.",
  "My head is not cropped.",
  "My face is not covered by sunglasses, hair, hands, or phone.",
  "My expression feels natural.",
  "My skin tone and hair color look close to real life.",
  "My shoulders or upper body are visible if possible.",
  "The image is high enough quality to zoom in without losing the face.",
]

const angleGuidance = [
  {
    title: "Front-facing selfie",
    bestFor: "Keeping facial identity strong.",
    note: "Best beginner option.",
    image: sourceSelfies[0].image,
    objectPosition: "center 38%",
  },
  {
    title: "Slight 3/4 angle",
    bestFor: "Editorial portraits.",
    note: "Good if the face is still clear.",
    image: sourceSelfies[2].image,
    objectPosition: "68% 38%",
  },
  {
    title: "Side-angle selfie",
    bestFor: "Cinematic and lifestyle shots.",
    note: "Use only if features are still visible.",
    image: sourceSelfies[1].image,
    objectPosition: "24% 38%",
  },
  {
    title: "Mirror selfie",
    bestFor: "Outfit or body reference.",
    note: "Less ideal for face accuracy.",
    image: "/images/selfie-guide/mirror-selfie-side-profile.jpg",
    objectPosition: "center 34%",
  },
]

const fakeResultChecks = [
  {
    problem: "Face does not look like you",
    cause: "Source selfie unclear",
    fix: "Try a clearer front-facing selfie.",
  },
  {
    problem: "Skin tone is wrong",
    cause: "Bad lighting or filter",
    fix: "Use a natural-light selfie.",
  },
  {
    problem: "Hair looks wrong",
    cause: "Hair hidden or cropped",
    fix: "Use a photo where hair is visible.",
  },
  {
    problem: "Face looks too perfect",
    cause: "Prompt over-stylized",
    fix: "Use natural skin texture, realistic face, do not over-smooth.",
  },
  {
    problem: "Body looks weird",
    cause: "Selfie has no body reference",
    fix: "Start with face accuracy first, then later add outfit or body reference.",
  },
  {
    problem: "Result looks too AI",
    cause: "Prompt too dramatic",
    fix: "Choose a calmer visual world or reduce cinematic wording.",
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
    action: "Choose my source selfie",
    href: "#module-1",
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
    image: NOIR_FEMME_SERIES[2]?.exampleImage,
    action: "Use the checklist",
    href: "#image-selection",
    status: "Taste filter",
  },
  {
    number: "05",
    title: "Turn Them Into Content",
    promise:
      "Decide where the shoot goes first: profile, reel cover, story, offer, or next post.",
    image: DARK_FEMININE_CAFE_SERIES[0]?.exampleImage,
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

      <section id="module-1" className="sbs-module-depth">
        <div className="sbs-module-depth-hero">
          <div>
            <p className="sbs-kicker">MODULE 01</p>
            <h2 className={`sbs-section-title ${cormorant.className}`}>
              Start With One Selfie.
            </h2>
            <p>
              Your first AI brand shoot starts before the prompt. It starts with
              the photo you upload. This step helps you choose the selfie that
              gives you the most believable, elevated result.
            </p>
            <a href="#source-selfie-checklist" className="sbs-primary">
              Choose My Source Selfie
            </a>
          </div>
          <div className="sbs-module-depth-image">
            <Image
              src={sourceSelfies[0].image}
              alt="Clear front-facing source selfie example"
              fill
              sizes="(max-width: 768px) 100vw, 36vw"
              style={{ objectFit: "cover", objectPosition: "center 38%" }}
            />
          </div>
        </div>

        <div className="sbs-rule-card">
          <p className="sbs-kicker">THE RULE</p>
          <h3 className={cormorant.className}>Clear beats pretty.</h3>
          <p>
            Do not start with the most filtered, angled, dramatic selfie. Start
            with the clearest photo of your face. AI can style you beautifully
            later, but it needs to understand you first.
          </p>
        </div>

        <div className="sbs-example-grid" aria-label="Good, okay, and bad source selfie examples">
          {selfieExampleCards.map((example) => (
            <article key={example.label} className="sbs-example-card">
              <div className="sbs-example-image">
                <Image
                  src={example.image}
                  alt={`${example.label} example`}
                  fill
                  sizes="(max-width: 768px) 100vw, 28vw"
                  style={{ objectFit: "cover", objectPosition: example.objectPosition }}
                />
              </div>
              <div className="sbs-example-copy">
                <p className="sbs-example-eyebrow">{example.eyebrow}</p>
                <h3 className={cormorant.className}>{example.label}</h3>
                <div className="sbs-trait-list">
                  {example.traits.map((trait) => (
                    <span key={trait}>{trait}</span>
                  ))}
                </div>
                <p>{example.note}</p>
              </div>
            </article>
          ))}
        </div>

        <div id="source-selfie-checklist" className="sbs-checklist-panel">
          <div className="sbs-checklist-intro">
            <p className="sbs-kicker">UPLOAD CHECK</p>
            <h3 className={cormorant.className}>Your source selfie should have:</h3>
            <p>
              If ChatGPT cannot clearly understand your face, it will guess. And
              when AI guesses, the result usually looks fake.
            </p>
          </div>
          <div className="sbs-source-checklist">
            {sourceSelfieChecklist.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </div>

        <aside className="sbs-taste-note">
          <p className="sbs-kicker">SANDRA&apos;S TASTE NOTE</p>
          <p>
            Your AI result is only as strong as the selfie you give it. The goal
            is not to upload your prettiest selfie. The goal is to upload your
            clearest selfie. Pretty can happen later. Clarity comes first.
          </p>
        </aside>

        <div className="sbs-angle-section">
          <div className="sbs-section-header sbs-narrow">
            <p className="sbs-kicker">BEST ANGLE TO START WITH</p>
            <h3 className={`sbs-section-title ${cormorant.className}`}>
              Start simple before you experiment.
            </h3>
            <p>
              For your first AI brand shoot, start with a clear front-facing or
              slight 3/4 selfie. Once you get better results, you can experiment
              with side angles, mirror selfies, and full-body references.
            </p>
          </div>
          <div className="sbs-angle-grid">
            {angleGuidance.map((angle) => (
              <article key={angle.title} className="sbs-angle-card">
                <div className="sbs-angle-image">
                  <Image
                    src={angle.image}
                    alt={`${angle.title} example`}
                    fill
                    sizes="(max-width: 768px) 50vw, 18vw"
                    style={{ objectFit: "cover", objectPosition: angle.objectPosition }}
                  />
                </div>
                <div>
                  <h4>{angle.title}</h4>
                  <p>{angle.bestFor}</p>
                  <small>{angle.note}</small>
                </div>
              </article>
            ))}
          </div>
          <div className="sbs-support-photo">
            <h4>Full-body photo</h4>
            <p>
              Best for styling or outfit support. Use it as support, not the main
              face source.
            </p>
          </div>
        </div>

        <div className="sbs-troubleshooting">
          <div className="sbs-section-header">
            <p className="sbs-kicker">FIRST RESULT WARNING</p>
            <h3 className={`sbs-section-title ${cormorant.className}`}>
              If the result looks fake, do not blame yourself.
            </h3>
            <p>
              Most bad AI results come from one of three things: unclear selfie,
              wrong visual world, or too dramatic prompt. Start by fixing the
              selfie first.
            </p>
          </div>
          <div className="sbs-trouble-table" role="table" aria-label="First result troubleshooting">
            <div className="sbs-trouble-row sbs-trouble-head" role="row">
              <span role="columnheader">Problem</span>
              <span role="columnheader">Likely cause</span>
              <span role="columnheader">First fix</span>
            </div>
            {fakeResultChecks.map((check) => (
              <div key={check.problem} className="sbs-trouble-row" role="row">
                <span role="cell">{check.problem}</span>
                <span role="cell">{check.cause}</span>
                <span role="cell">{check.fix}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sbs-module-complete">
          <div>
            <p className="sbs-kicker">MODULE COMPLETE</p>
            <h3 className={cormorant.className}>Have your selfie?</h3>
            <p>
              Now you are ready to choose the visual world that tells AI what
              kind of brand shoot to create.
            </p>
          </div>
          <a href="#module-02" className="sbs-primary">
            I Have My Selfie - Choose My Visual World
          </a>
        </div>
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
            <article key={module.number} id={`module-${module.number}`} className="sbs-module">
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
        .sbs-module-depth {
          max-width: 1280px;
          margin: 0 auto;
          padding: clamp(58px, 7vw, 104px) clamp(20px, 5vw, 64px);
        }
        .sbs-module-depth-hero {
          display: grid;
          grid-template-columns: minmax(0, 0.9fr) minmax(320px, 0.55fr);
          gap: clamp(24px, 5vw, 64px);
          align-items: center;
          margin-bottom: 18px;
          padding: clamp(20px, 4vw, 38px);
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-module-depth-hero p:not(.sbs-kicker),
        .sbs-rule-card p,
        .sbs-checklist-intro p,
        .sbs-taste-note p:not(.sbs-kicker),
        .sbs-troubleshooting p,
        .sbs-module-complete p,
        .sbs-support-photo p {
          margin: 0;
          color: #4F5052;
          font-size: 15px;
          line-height: 1.8;
        }
        .sbs-module-depth-hero .sbs-primary {
          margin-top: 28px;
        }
        .sbs-module-depth-image {
          position: relative;
          min-height: 520px;
          overflow: hidden;
          background: #F8FAFA;
        }
        .sbs-rule-card {
          margin-bottom: 18px;
          padding: clamp(22px, 4vw, 42px);
          background: #282728;
          color: #F8FAFA;
        }
        .sbs-rule-card .sbs-kicker {
          color: #C5C6C8;
        }
        .sbs-rule-card h3 {
          margin: 0 0 14px;
          color: #F8FAFA;
          font-size: clamp(2.4rem, 5vw, 4.8rem);
          font-weight: 300;
          letter-spacing: -0.02em;
          line-height: 0.96;
        }
        .sbs-rule-card p {
          max-width: 720px;
          color: rgba(248,250,250,0.78);
        }
        .sbs-example-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          margin-bottom: 18px;
        }
        .sbs-example-card {
          display: grid;
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-example-image {
          position: relative;
          min-height: 430px;
          overflow: hidden;
          background: #F8FAFA;
        }
        .sbs-example-copy {
          display: grid;
          gap: 16px;
          padding: 20px;
        }
        .sbs-example-eyebrow {
          margin: 0;
          color: #818283;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        .sbs-example-copy h3 {
          margin: 0;
          color: #0D0E10;
          font-size: clamp(2rem, 3vw, 3rem);
          font-weight: 300;
          letter-spacing: -0.02em;
          line-height: 0.98;
        }
        .sbs-example-copy p {
          margin: 0;
          color: #4F5052;
          font-size: 13px;
          line-height: 1.7;
        }
        .sbs-trait-list {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }
        .sbs-trait-list span {
          padding: 8px 9px;
          background: #F8FAFA;
          border: 1px solid rgba(197,198,200,0.35);
          color: #282728;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .sbs-checklist-panel {
          display: grid;
          grid-template-columns: minmax(0, 0.62fr) minmax(0, 1fr);
          gap: clamp(22px, 4vw, 48px);
          margin-bottom: 18px;
          padding: clamp(22px, 4vw, 42px);
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-checklist-intro h3,
        .sbs-module-complete h3 {
          margin: 0 0 14px;
          color: #0D0E10;
          font-size: clamp(2.3rem, 4vw, 4rem);
          font-weight: 300;
          letter-spacing: -0.02em;
          line-height: 0.96;
        }
        .sbs-source-checklist {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.35);
        }
        .sbs-source-checklist p {
          min-height: 92px;
          display: flex;
          align-items: flex-end;
          margin: 0;
          padding: 16px;
          background: #FFFFFF;
          color: #282728;
          font-size: 12px;
          line-height: 1.6;
        }
        .sbs-taste-note {
          margin-bottom: 18px;
          padding: clamp(22px, 4vw, 38px);
          background: #F8FAFA;
          border: 1px solid rgba(197,198,200,0.5);
        }
        .sbs-taste-note p:not(.sbs-kicker) {
          max-width: 820px;
          color: #282728;
          font-size: clamp(1.25rem, 2.1vw, 1.7rem);
          line-height: 1.55;
        }
        .sbs-angle-section {
          margin-bottom: 18px;
          padding: clamp(22px, 4vw, 42px);
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-angle-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.35);
        }
        .sbs-angle-card {
          display: grid;
          background: #FFFFFF;
        }
        .sbs-angle-image {
          position: relative;
          min-height: 300px;
          overflow: hidden;
          background: #F8FAFA;
        }
        .sbs-angle-card div:last-child {
          padding: 16px;
        }
        .sbs-angle-card h4,
        .sbs-support-photo h4 {
          margin: 0 0 10px;
          color: #0D0E10;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.18em;
          line-height: 1.4;
          text-transform: uppercase;
        }
        .sbs-angle-card p {
          margin: 0 0 8px;
          color: #282728;
          font-size: 13px;
          line-height: 1.6;
        }
        .sbs-angle-card small {
          color: #818283;
          font-size: 12px;
          line-height: 1.5;
        }
        .sbs-support-photo {
          margin-top: 1px;
          padding: 20px;
          background: #F8FAFA;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-troubleshooting {
          margin-bottom: 18px;
          padding: clamp(22px, 4vw, 42px);
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-trouble-table {
          display: grid;
          gap: 1px;
          background: rgba(197,198,200,0.35);
        }
        .sbs-trouble-row {
          display: grid;
          grid-template-columns: minmax(0, 0.9fr) minmax(0, 0.9fr) minmax(0, 1.2fr);
          gap: 1px;
          background: rgba(197,198,200,0.35);
        }
        .sbs-trouble-row span {
          min-height: 84px;
          display: flex;
          align-items: center;
          padding: 16px;
          background: #FFFFFF;
          color: #282728;
          font-size: 12px;
          line-height: 1.6;
        }
        .sbs-trouble-head span {
          min-height: auto;
          background: #F8FAFA;
          color: #818283;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        .sbs-module-complete {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 22px;
          align-items: end;
          padding: clamp(22px, 4vw, 42px);
          background: #282728;
        }
        .sbs-module-complete .sbs-kicker {
          color: #C5C6C8;
        }
        .sbs-module-complete h3 {
          color: #F8FAFA;
        }
        .sbs-module-complete p {
          max-width: 660px;
          color: rgba(248,250,250,0.76);
        }
        .sbs-module-complete .sbs-primary {
          background: #F8FAFA;
          color: #0D0E10;
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
          .sbs-module-depth-hero,
          .sbs-checklist-panel,
          .sbs-module-complete {
            grid-template-columns: 1fr;
          }
          .sbs-example-grid {
            grid-template-columns: 1fr;
          }
          .sbs-example-card {
            grid-template-columns: minmax(220px, 0.45fr) minmax(0, 0.55fr);
          }
          .sbs-angle-grid {
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
          .sbs-check-grid,
          .sbs-source-checklist,
          .sbs-angle-grid {
            grid-template-columns: 1fr;
          }
          .sbs-module-depth {
            padding-left: 14px;
            padding-right: 14px;
          }
          .sbs-module-depth-hero,
          .sbs-rule-card,
          .sbs-checklist-panel,
          .sbs-angle-section,
          .sbs-troubleshooting,
          .sbs-module-complete {
            padding: 18px;
          }
          .sbs-module-depth-image {
            min-height: 430px;
          }
          .sbs-example-card {
            grid-template-columns: 1fr;
          }
          .sbs-example-image {
            min-height: 420px;
          }
          .sbs-source-checklist p {
            min-height: 74px;
          }
          .sbs-trouble-row,
          .sbs-trouble-head {
            grid-template-columns: 1fr;
          }
          .sbs-trouble-head {
            display: none;
          }
          .sbs-trouble-row {
            margin-bottom: 1px;
          }
          .sbs-trouble-row span {
            min-height: auto;
            align-items: flex-start;
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
