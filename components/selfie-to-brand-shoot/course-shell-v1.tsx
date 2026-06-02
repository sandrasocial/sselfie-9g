import Image from "next/image"
import Link from "next/link"
import type { ReactNode } from "react"
import { Cormorant_Garamond, Inter } from "next/font/google"

import {
  DARK_FEMININE_CAFE_SERIES,
  NOIR_FEMME_SERIES,
  VAULT_COLLECTION_META,
} from "@/lib/ai-prompts/prompt-data"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"] })

type ShellAccessMode = "token" | "academy"

type SelfieToBrandShootCourseShellProps = {
  firstName?: string | null
  vaultHref: string
  accessMode: ShellAccessMode
  hasStudioAccess?: boolean
  hasPromptVaultAccess?: boolean
}

const sourceSelfies = [
  {
    label: "Clear front",
    note: "Best beginner source photo",
    image: "/images/selfie-to-brand-shoot/module-1-source-selfies/good-front-selfie.png",
    objectPosition: "center 38%",
  },
  {
    label: "Clear 3/4",
    note: "Editorial, but still readable",
    image: "/images/selfie-to-brand-shoot/module-1-source-selfies/good-3-4-selfie.png",
    objectPosition: "center 38%",
  },
  {
    label: "Mirror support",
    note: "Useful for outfit direction",
    image: "/images/selfie-to-brand-shoot/module-1-source-selfies/okay-mirror-selfie.png",
    objectPosition: "center 34%",
  },
]

const selfieExampleCards = [
  {
    label: "Good Selfie",
    eyebrow: "Use this when possible",
    images: [
      {
        src: "/images/selfie-to-brand-shoot/module-1-source-selfies/good-front-selfie.png",
        label: "Clear front",
        objectPosition: "center 38%",
      },
      {
        src: "/images/selfie-to-brand-shoot/module-1-source-selfies/good-3-4-selfie.png",
        label: "Clear 3/4",
        objectPosition: "center 38%",
      },
    ],
    traits: [
      "Clear face",
      "Soft natural light",
      "Full facial features visible",
      "No heavy filter",
      "Simple background",
      "Natural expression",
    ],
    note: "This gives AI the best chance of keeping you recognizable.",
  },
  {
    label: "Okay Selfie",
    eyebrow: "Can work, but may need more tries",
    images: [
      {
        src: "/images/selfie-to-brand-shoot/module-1-source-selfies/okay-mirror-selfie.png",
        label: "Mirror support",
        objectPosition: "center 34%",
      },
    ],
    traits: [
      "Mirror selfie",
      "Busier background",
      "Phone partly visible",
      "A little farther away",
      "Still clear enough",
    ],
    note: "This might work, but expect more variation. If your first result looks off, try a clearer selfie before changing the prompt.",
  },
  {
    label: "Bad Selfie",
    eyebrow: "Do not start here",
    images: [
      {
        src: "/images/selfie-to-brand-shoot/module-1-source-selfies/bad-blurry-selfie.png",
        label: "Blurry",
        objectPosition: "center 40%",
      },
      {
        src: "/images/selfie-to-brand-shoot/module-1-source-selfies/bad-filtered-selfie.png",
        label: "Filtered",
        objectPosition: "center 40%",
      },
      {
        src: "/images/selfie-to-brand-shoot/module-1-source-selfies/bad-covered-face-selfie.png",
        label: "Covered",
        objectPosition: "center 38%",
      },
      {
        src: "/images/selfie-to-brand-shoot/module-1-source-selfies/bad-group-or-cropped-selfie.png",
        label: "Unclear",
        objectPosition: "center 40%",
      },
    ],
    traits: [
      "Face covered",
      "Blurry or dark",
      "Heavy filter",
      "Face too small",
      "Group photo",
      "Cropped face",
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
]

const fakeResultChecks = [
  {
    problem: "Face does not look like you",
    fix: "Try a clearer front-facing selfie.",
  },
  {
    problem: "Skin tone is wrong",
    fix: "Use a natural-light selfie without a heavy filter.",
  },
  {
    problem: "Hair looks wrong",
    fix: "Use a photo where hair color and hairline are visible.",
  },
  {
    problem: "Face looks too perfect",
    fix: "Ask for natural skin texture and realistic face detail.",
  },
  {
    problem: "Result looks too AI",
    fix: "Choose a calmer visual world before changing everything.",
  },
]

const featuredCollections = VAULT_COLLECTION_META.slice(0, 4).map((collection, index) => ({
  name: collection.name
    .replace(" Editorial", "")
    .replace(" Coffee-Run Editorial", "")
    .replace(" Luxury City Editorial", ""),
  image: collection.thumbnails[index === 0 ? 2 : 0] ?? collection.thumbnails[0],
  shotCount: collection.shotCount,
}))

const modules = [
  {
    number: "01",
    title: "Start With One Selfie",
    outcome: "Choose the source photo that gives AI enough truth to keep you looking like you.",
    image: sourceSelfies[0].image,
    imagePosition: "center 38%",
    href: "#module-1",
    status: "In progress",
    time: "12 minutes",
    available: true,
  },
  {
    number: "02",
    title: "Choose Your Visual World",
    outcome: "Pick the shoot direction that fits the woman you want to become visible as.",
    image: NOIR_FEMME_SERIES[2]?.exampleImage,
    imagePosition: "center top",
    href: "#module-2",
    status: "Coming next",
    time: "15 minutes",
    available: false,
  },
  {
    number: "03",
    title: "Create The AI Brand Shoot",
    outcome: "Copy one prompt, upload one selfie, and create your first usable image.",
    image: DARK_FEMININE_CAFE_SERIES[0]?.exampleImage,
    imagePosition: "center top",
    href: "#module-3",
    status: "Coming next",
    time: "20 minutes",
    available: false,
  },
  {
    number: "04",
    title: "Pick The Images That Still Look Like You",
    outcome: "Keep the results that feel realistic, premium, and aligned with your identity.",
    image: NOIR_FEMME_SERIES[3]?.exampleImage ?? NOIR_FEMME_SERIES[2]?.exampleImage,
    imagePosition: "center top",
    href: "#module-4",
    status: "Coming next",
    time: "12 minutes",
    available: false,
  },
  {
    number: "05",
    title: "Turn The Shoot Into Content",
    outcome: "Turn one shoot into profile images, reel covers, stories, carousels, and offer visuals.",
    image: DARK_FEMININE_CAFE_SERIES[1]?.exampleImage ?? DARK_FEMININE_CAFE_SERIES[0]?.exampleImage,
    imagePosition: "center top",
    href: "#module-5",
    status: "Coming next",
    time: "18 minutes",
    available: false,
  },
]

const quickLinks = [
  { label: "Open The Vault", href: "vault" },
  { label: "Source Selfie Checklist", href: "#source-selfie-checklist" },
  { label: "Troubleshooting", href: "#troubleshooting" },
  { label: "3x3 Mini Feed Planner", href: "#mini-feed-planner" },
]

function resolveHref(href: string, vaultHref: string) {
  return href === "vault" ? vaultHref : href
}

function CourseProgressBar() {
  return (
    <div className="sbs-course-progress" aria-label="Course progress">
      <div className="sbs-progress-copy">
        <span>Progress</span>
        <strong>1 of 5 modules started</strong>
      </div>
      <div className="sbs-progress-track" aria-hidden="true">
        <span />
      </div>
    </div>
  )
}

function ResourceQuickLinks({ vaultHref }: { vaultHref: string }) {
  return (
    <div className="sbs-quick-links" aria-label="Course quick links">
      {quickLinks.map((link) => (
        <Link key={link.label} href={resolveHref(link.href, vaultHref)}>
          {link.label}
        </Link>
      ))}
    </div>
  )
}

function ModuleCard({ module, vaultHref }: { module: (typeof modules)[number]; vaultHref: string }) {
  return (
    <article className={`sbs-module-card ${module.available ? "is-active" : "is-locked"}`}>
      <div className="sbs-module-card-image">
        {module.image ? (
          <Image
            src={module.image}
            alt={`${module.title} preview`}
            fill
            sizes="(max-width: 768px) 100vw, 22vw"
            style={{ objectFit: "cover", objectPosition: module.imagePosition }}
          />
        ) : null}
      </div>
      <div className="sbs-module-card-copy">
        <p className="sbs-module-meta">
          <span>{module.number}</span>
          {module.status}
        </p>
        <h3 className={cormorant.className}>{module.title}</h3>
        <p>{module.outcome}</p>
        <Link href={resolveHref(module.href, vaultHref)} className="sbs-text-link" aria-disabled={!module.available}>
          {module.available ? "Start Module" : "Preview Step"}
        </Link>
      </div>
    </article>
  )
}

function LessonSection({
  id,
  eyebrow,
  title,
  children,
  open = false,
}: {
  id?: string
  eyebrow: string
  title: string
  children: ReactNode
  open?: boolean
}) {
  return (
    <details id={id} className="sbs-lesson-section" open={open}>
      <summary>
        <span>{eyebrow}</span>
        <strong className={cormorant.className}>{title}</strong>
      </summary>
      <div className="sbs-lesson-body">{children}</div>
    </details>
  )
}

function VisualExampleBlock() {
  return (
    <div className="sbs-example-grid" aria-label="Good, okay, and bad source selfie examples">
      {selfieExampleCards.map((example) => (
        <article key={example.label} className="sbs-example-card">
          <div className={`sbs-example-image-grid sbs-example-image-grid-${example.images.length}`}>
            {example.images.map((image) => (
              <figure key={image.src} className="sbs-example-image">
                <Image
                  src={image.src}
                  alt={`${example.label}: ${image.label}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 14vw"
                  style={{ objectFit: "cover", objectPosition: image.objectPosition }}
                />
                <figcaption>{image.label}</figcaption>
              </figure>
            ))}
          </div>
          <div className="sbs-example-copy">
            <p className="sbs-example-eyebrow">{example.eyebrow}</p>
            <h4 className={cormorant.className}>{example.label}</h4>
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
  )
}

function DecisionToolBlock() {
  return (
    <div className="sbs-decision-tool">
      <div>
        <p className="sbs-kicker">DECISION TOOL</p>
        <h4 className={cormorant.className}>Can I use this selfie?</h4>
        <p>
          If three or more answers are no, choose a clearer source photo before
          you touch the prompt.
        </p>
      </div>
      <div className="sbs-decision-list">
        {[
          "Can I clearly see both eyes?",
          "Is my face sharp if I zoom in?",
          "Is my face free from phone, hand, hair, and sunglasses?",
          "Does my skin tone and hair color look close to real life?",
          "Would a stranger recognize me from this photo?",
        ].map((question) => (
          <label key={question}>
            <input type="checkbox" />
            <span>{question}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function ChecklistBlock() {
  return (
    <div className="sbs-source-checklist">
      {sourceSelfieChecklist.map((item) => (
        <label key={item}>
          <input type="checkbox" />
          <span>{item}</span>
        </label>
      ))}
    </div>
  )
}

function TroubleshootingBlock() {
  return (
    <div className="sbs-trouble-list">
      {fakeResultChecks.map((check) => (
        <article key={check.problem}>
          <span>{check.problem}</span>
          <p>{check.fix}</p>
        </article>
      ))}
    </div>
  )
}

function CourseSidebar({ vaultHref }: { vaultHref: string }) {
  return (
    <aside className="sbs-course-sidebar" aria-label="Course modules">
      <div className="sbs-sidebar-card">
        <p className="sbs-kicker">COURSE PLAYER</p>
        <h2 className={cormorant.className}>Your path</h2>
        <CourseProgressBar />
      </div>
      <nav className="sbs-sidebar-modules">
        {modules.map((module) => (
          <Link
            key={module.number}
            href={resolveHref(module.href, vaultHref)}
            className={module.available ? "is-active" : ""}
          >
            <span>{module.number}</span>
            <strong>{module.title}</strong>
            <small>{module.status}</small>
          </Link>
        ))}
      </nav>
      <ResourceQuickLinks vaultHref={vaultHref} />
    </aside>
  )
}

function PlaceholderModule({ module }: { module: (typeof modules)[number] }) {
  return (
    <section id={module.href.replace("#", "")} className="sbs-placeholder-module">
      <div>
        <p className="sbs-kicker">MODULE {module.number}</p>
        <h3 className={cormorant.className}>{module.title}</h3>
        <p>{module.outcome}</p>
      </div>
      <span>{module.status}</span>
    </section>
  )
}

export function SelfieToBrandShootCourseShell({
  firstName,
  vaultHref,
  accessMode,
  hasStudioAccess = false,
  hasPromptVaultAccess = true,
}: SelfieToBrandShootCourseShellProps) {
  const titlePrefix = firstName ? `${firstName}'s` : "The"

  return (
    <main className={`sbs-course-page ${inter.className}`}>
      <nav className="sbs-top-nav" aria-label="Selfie to Brand Shoot navigation">
        <Link href="/" className={`sbs-logo ${cormorant.className}`}>
          SSELFIE
        </Link>
        <div className="sbs-top-links">
          <a href="#buyer-home">Home</a>
          <a href="#course-player">Course</a>
          <Link href={vaultHref}>Vault</Link>
        </div>
      </nav>

      <section id="buyer-home" className="sbs-buyer-home">
        <div className="sbs-home-copy">
          <p className="sbs-kicker">SELFIE TO BRAND SHOOT</p>
          <h1 className={cormorant.className}>{titlePrefix} course home.</h1>
          <p>
            A guided visual workflow for turning one clear selfie into an
            elevated AI brand shoot you can use in your content.
          </p>
          <CourseProgressBar />
          <div className="sbs-home-actions">
            <a href="#course-player" className="sbs-primary">
              Continue Where You Left Off
            </a>
            <Link href={vaultHref} className="sbs-secondary">
              Open The Vault
            </Link>
          </div>
        </div>
        <div className="sbs-home-board" aria-label="Course visual preview">
          {featuredCollections.slice(0, 3).map((collection, index) => (
            <figure key={collection.name} className={`sbs-home-image sbs-home-image-${index}`}>
              <Image
                src={collection.image}
                alt={`${collection.name} photoshoot preview`}
                fill
                priority={index === 0}
                sizes="(max-width: 768px) 72vw, 24vw"
                style={{ objectFit: "cover", objectPosition: "center top" }}
              />
              <figcaption>{collection.name}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="sbs-home-modules" aria-label="Course module overview">
        <div className="sbs-section-heading">
          <p className="sbs-kicker">YOUR SELFIE TO BRAND SHOOT PATH</p>
          <h2 className={cormorant.className}>Five steps. One first result.</h2>
        </div>
        <div className="sbs-module-card-grid">
          {modules.map((module) => (
            <ModuleCard key={module.number} module={module} vaultHref={vaultHref} />
          ))}
        </div>
        <ResourceQuickLinks vaultHref={vaultHref} />
      </section>

      <section id="course-player" className="sbs-course-player">
        <CourseSidebar vaultHref={vaultHref} />
        <article className="sbs-lesson-panel" aria-label="Module 1 lesson">
          <div className="sbs-mobile-player-progress">
            <CourseProgressBar />
          </div>
          <header className="sbs-lesson-hero">
            <div>
              <p className="sbs-kicker">MODULE 01</p>
              <h2 className={cormorant.className}>Start With One Selfie.</h2>
              <p>
                Choose the photo that gives AI the best chance to create a
                believable, elevated brand shoot that still looks like you.
              </p>
            </div>
            <div className="sbs-lesson-hero-image">
              <Image
                src={sourceSelfies[0].image}
                alt="Clear front-facing source selfie example"
                fill
                sizes="(max-width: 768px) 100vw, 28vw"
                style={{ objectFit: "cover", objectPosition: "center 38%" }}
              />
            </div>
          </header>

          <div className="sbs-mobile-module-list">
            <details>
              <summary>Course modules</summary>
              <nav>
                {modules.map((module) => (
                  <Link key={module.number} href={resolveHref(module.href, vaultHref)}>
                    <span>{module.number}</span>
                    {module.title}
                  </Link>
                ))}
              </nav>
            </details>
          </div>

          <LessonSection eyebrow="OUTCOME" title="What this module helps you do" open>
            <p>
              By the end of this module, you will have one strong source selfie
              and a clear reason why that image is good enough to use for your
              first AI brand shoot.
            </p>
          </LessonSection>

          <LessonSection eyebrow="VISUAL EXAMPLES" title="Good, okay, and bad source photos" open>
            <VisualExampleBlock />
          </LessonSection>

          <LessonSection eyebrow="DECIDE" title="Can I use this selfie?">
            <DecisionToolBlock />
          </LessonSection>

          <LessonSection id="source-selfie-checklist" eyebrow="CHECKLIST" title="Source Selfie Checklist">
            <ChecklistBlock />
          </LessonSection>

          <LessonSection eyebrow="SANDRA'S TASTE NOTE" title="Clear beats pretty">
            <div className="sbs-taste-note">
              <p>
                The goal is not to upload your prettiest selfie. The goal is to
                upload your clearest selfie. Pretty can happen later. Clarity
                comes first.
              </p>
            </div>
          </LessonSection>

          <LessonSection eyebrow="ACTION STEP" title="Choose one selfie to use">
            <div className="sbs-action-step">
              <p>
                Pick one clear front-facing or slight 3/4 selfie. Save it
                somewhere easy to find before you open the Vault or ChatGPT.
              </p>
              <a href="#module-2" className="sbs-primary">
                I Have My Selfie
              </a>
            </div>
          </LessonSection>

          <LessonSection id="troubleshooting" eyebrow="FIX" title="If your result looks fake, check this first">
            <TroubleshootingBlock />
          </LessonSection>

          <div className="sbs-module-next">
            <div>
              <p className="sbs-kicker">NEXT CTA</p>
              <h3 className={cormorant.className}>Continue to Choose Your Visual World.</h3>
              <p>
                The next step is choosing the aesthetic before you copy a prompt.
                That keeps the shoot intentional instead of random.
              </p>
            </div>
            <a href="#module-2" className="sbs-primary">
              Continue To Module 2
            </a>
          </div>

          <div className="sbs-placeholder-stack" aria-label="Future course modules">
            {modules.slice(1).map((module) => (
              <PlaceholderModule key={module.number} module={module} />
            ))}
          </div>

          <section id="mini-feed-planner" className="sbs-mini-planner">
            <div>
              <p className="sbs-kicker">RESOURCE PLACEHOLDER</p>
              <h3 className={cormorant.className}>3x3 Mini Feed Planner</h3>
              <p>
                This is the future planning space for turning one shoot into
                profile images, covers, stories, carousels, and offer visuals.
              </p>
            </div>
            <div className="sbs-mini-grid" aria-hidden="true">
              {Array.from({ length: 9 }).map((_, index) => (
                <span key={index} />
              ))}
            </div>
          </section>
        </article>
      </section>

      <section className="sbs-final-resources">
        <div>
          <p className="sbs-kicker">RESOURCES</p>
          <h2 className={cormorant.className}>Open what you need, when you need it.</h2>
        </div>
        <div className="sbs-final-actions">
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
          <a href="mailto:support@sselfie.ai" className="sbs-secondary">
            Email Support
          </a>
        </div>
      </section>

      <style>{`
        .sbs-course-page {
          min-height: 100vh;
          background: #F8FAFA;
          color: #0D0E10;
        }
        .sbs-top-nav {
          position: sticky;
          top: 0;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 16px clamp(18px, 4vw, 46px);
          background: rgba(248,250,250,0.94);
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
        .sbs-top-links,
        .sbs-home-actions,
        .sbs-final-actions {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .sbs-top-links a {
          color: #4F5052;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-decoration: none;
          text-transform: uppercase;
        }
        .sbs-kicker {
          margin: 0 0 14px;
          color: #818283;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.32em;
          line-height: 1.7;
          text-transform: uppercase;
        }
        .sbs-buyer-home {
          display: grid;
          grid-template-columns: minmax(0, 0.92fr) minmax(420px, 1.08fr);
          gap: clamp(28px, 5vw, 72px);
          align-items: center;
          max-width: 1280px;
          margin: 0 auto;
          padding: clamp(50px, 7vw, 92px) clamp(20px, 5vw, 64px);
        }
        .sbs-home-copy h1,
        .sbs-section-heading h2,
        .sbs-final-resources h2 {
          margin: 0 0 20px;
          color: #0D0E10;
          font-size: clamp(3.6rem, 7vw, 6.8rem);
          font-weight: 300;
          letter-spacing: -0.02em;
          line-height: 0.92;
        }
        .sbs-home-copy > p,
        .sbs-section-heading p,
        .sbs-final-resources p {
          max-width: 610px;
          margin: 0 0 28px;
          color: #4F5052;
          font-size: 16px;
          line-height: 1.85;
        }
        .sbs-primary,
        .sbs-secondary,
        .sbs-text-link {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          text-decoration: none;
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
        .sbs-text-link:hover,
        .sbs-top-links a:hover,
        .sbs-quick-links a:hover {
          opacity: 0.82;
          transform: translateY(-1px);
        }
        .sbs-course-progress {
          display: grid;
          gap: 10px;
          margin: 0 0 28px;
        }
        .sbs-progress-copy {
          display: flex;
          justify-content: space-between;
          gap: 18px;
          color: #818283;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .sbs-progress-copy strong {
          color: #282728;
          font-weight: 700;
        }
        .sbs-progress-track {
          height: 7px;
          overflow: hidden;
          background: rgba(197,198,200,0.35);
        }
        .sbs-progress-track span {
          display: block;
          width: 20%;
          height: 100%;
          background: #0D0E10;
        }
        .sbs-home-board {
          position: relative;
          min-height: clamp(500px, 60vw, 680px);
        }
        .sbs-home-image {
          position: absolute;
          overflow: hidden;
          margin: 0;
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.45);
          box-shadow: 0 24px 80px rgba(13,14,16,0.08);
        }
        .sbs-home-image figcaption,
        .sbs-example-image figcaption {
          position: absolute;
          left: 10px;
          right: 10px;
          bottom: 10px;
          padding: 8px 9px;
          background: rgba(13,14,16,0.62);
          color: #F8FAFA;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .sbs-home-image-0 {
          inset: 0 auto auto 8%;
          width: 48%;
          aspect-ratio: 4 / 5.4;
        }
        .sbs-home-image-1 {
          top: 12%;
          right: 0;
          width: 42%;
          aspect-ratio: 4 / 5.2;
        }
        .sbs-home-image-2 {
          left: 36%;
          bottom: 0;
          width: 38%;
          aspect-ratio: 4 / 5.1;
        }
        .sbs-home-modules,
        .sbs-final-resources {
          max-width: 1280px;
          margin: 0 auto;
          padding: clamp(46px, 6vw, 78px) clamp(20px, 5vw, 64px);
          border-top: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-section-heading {
          max-width: 720px;
          margin-bottom: 30px;
        }
        .sbs-section-heading h2,
        .sbs-final-resources h2 {
          font-size: clamp(2.8rem, 5.6vw, 5.2rem);
        }
        .sbs-module-card-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-module-card {
          display: grid;
          grid-template-rows: auto 1fr;
          background: #FFFFFF;
        }
        .sbs-module-card.is-locked {
          color: #4F5052;
        }
        .sbs-module-card-image {
          position: relative;
          aspect-ratio: 4 / 4.8;
          overflow: hidden;
          background: #F8FAFA;
        }
        .sbs-module-card-copy {
          display: grid;
          align-content: start;
          gap: 12px;
          padding: 18px;
        }
        .sbs-module-meta {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin: 0;
          color: #818283;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .sbs-module-meta span {
          color: #0D0E10;
        }
        .sbs-module-card h3,
        .sbs-sidebar-card h2,
        .sbs-lesson-hero h2,
        .sbs-lesson-section summary strong,
        .sbs-decision-tool h4,
        .sbs-module-next h3,
        .sbs-placeholder-module h3,
        .sbs-mini-planner h3,
        .sbs-example-copy h4 {
          margin: 0;
          color: #0D0E10;
          font-weight: 300;
          letter-spacing: -0.02em;
          line-height: 0.98;
        }
        .sbs-module-card h3 {
          font-size: clamp(1.8rem, 2.4vw, 2.7rem);
        }
        .sbs-module-card p:not(.sbs-module-meta),
        .sbs-lesson-hero p,
        .sbs-lesson-body p,
        .sbs-decision-tool p,
        .sbs-module-next p,
        .sbs-placeholder-module p,
        .sbs-mini-planner p,
        .sbs-example-copy p {
          margin: 0;
          color: #4F5052;
          font-size: 14px;
          line-height: 1.75;
        }
        .sbs-text-link {
          justify-self: start;
          min-height: 34px;
          margin-top: 4px;
          color: #0D0E10;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          border-bottom: 1px solid #0D0E10;
        }
        .sbs-quick-links {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 1px;
          margin-top: 18px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-quick-links a {
          min-height: 74px;
          display: flex;
          align-items: flex-end;
          padding: 14px;
          background: #FFFFFF;
          color: #282728;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.16em;
          line-height: 1.45;
          text-decoration: none;
          text-transform: uppercase;
          transition: opacity 0.18s ease, transform 0.18s ease;
        }
        .sbs-course-player {
          display: grid;
          grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
          gap: 24px;
          max-width: 1380px;
          margin: 0 auto;
          padding: clamp(34px, 5vw, 58px) clamp(16px, 4vw, 42px);
          border-top: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-course-sidebar {
          position: sticky;
          top: 78px;
          align-self: start;
          display: grid;
          gap: 12px;
        }
        .sbs-sidebar-card,
        .sbs-sidebar-modules,
        .sbs-lesson-panel,
        .sbs-final-resources {
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-sidebar-card {
          padding: 18px;
        }
        .sbs-sidebar-card h2 {
          margin-bottom: 18px;
          font-size: 2.6rem;
        }
        .sbs-sidebar-modules {
          display: grid;
        }
        .sbs-sidebar-modules a {
          display: grid;
          grid-template-columns: 38px minmax(0, 1fr);
          gap: 10px 12px;
          padding: 14px;
          border-bottom: 1px solid rgba(197,198,200,0.35);
          color: #4F5052;
          text-decoration: none;
        }
        .sbs-sidebar-modules a:last-child {
          border-bottom: 0;
        }
        .sbs-sidebar-modules a.is-active {
          background: #F8FAFA;
          color: #0D0E10;
        }
        .sbs-sidebar-modules span {
          grid-row: span 2;
          color: #818283;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
        }
        .sbs-sidebar-modules strong {
          font-size: 12px;
          line-height: 1.35;
        }
        .sbs-sidebar-modules small {
          color: #818283;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .sbs-course-sidebar .sbs-quick-links {
          grid-template-columns: 1fr;
          margin: 0;
        }
        .sbs-course-sidebar .sbs-quick-links a {
          min-height: 54px;
        }
        .sbs-lesson-panel {
          min-width: 0;
          padding: clamp(16px, 3vw, 32px);
        }
        .sbs-lesson-hero {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(260px, 0.42fr);
          gap: clamp(18px, 4vw, 42px);
          align-items: center;
          padding: clamp(18px, 4vw, 34px);
          background: #F8FAFA;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-lesson-hero h2 {
          margin-bottom: 16px;
          font-size: clamp(3rem, 6vw, 5.4rem);
        }
        .sbs-lesson-hero-image {
          position: relative;
          min-height: 430px;
          overflow: hidden;
          background: #FFFFFF;
        }
        .sbs-mobile-module-list {
          display: none;
        }
        .sbs-mobile-player-progress {
          display: none;
        }
        .sbs-lesson-section {
          margin-top: 14px;
          border: 1px solid rgba(197,198,200,0.35);
          background: #FFFFFF;
        }
        .sbs-lesson-section summary {
          cursor: pointer;
          display: grid;
          grid-template-columns: minmax(0, 0.28fr) minmax(0, 1fr);
          gap: 18px;
          align-items: baseline;
          padding: 18px;
          list-style: none;
        }
        .sbs-lesson-section summary::-webkit-details-marker {
          display: none;
        }
        .sbs-lesson-section summary span {
          color: #818283;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        .sbs-lesson-section summary strong {
          font-size: clamp(2rem, 3.6vw, 3.6rem);
        }
        .sbs-lesson-section[open] summary {
          border-bottom: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-lesson-body {
          padding: 18px;
        }
        .sbs-example-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .sbs-example-card {
          display: grid;
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-example-image-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1px;
          min-height: 330px;
          background: rgba(197,198,200,0.35);
        }
        .sbs-example-image-grid-1 {
          grid-template-columns: 1fr;
        }
        .sbs-example-image-grid-4 {
          grid-template-rows: repeat(2, minmax(0, 1fr));
        }
        .sbs-example-image {
          position: relative;
          min-height: 164px;
          margin: 0;
          overflow: hidden;
          background: #F8FAFA;
        }
        .sbs-example-image-grid-1 .sbs-example-image {
          min-height: 330px;
        }
        .sbs-example-copy {
          display: grid;
          gap: 13px;
          padding: 16px;
        }
        .sbs-example-eyebrow {
          margin: 0;
          color: #818283;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        .sbs-example-copy h4 {
          font-size: 2.2rem;
        }
        .sbs-trait-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .sbs-trait-list span {
          padding: 7px 8px;
          background: #F8FAFA;
          border: 1px solid rgba(197,198,200,0.35);
          color: #282728;
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .sbs-decision-tool {
          display: grid;
          grid-template-columns: minmax(0, 0.45fr) minmax(0, 0.55fr);
          gap: 24px;
          padding: clamp(18px, 3vw, 28px);
          background: #F8FAFA;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-decision-tool h4,
        .sbs-mini-planner h3 {
          margin-bottom: 14px;
          font-size: clamp(2.2rem, 4vw, 3.8rem);
        }
        .sbs-decision-list,
        .sbs-source-checklist {
          display: grid;
          gap: 1px;
          background: rgba(197,198,200,0.35);
        }
        .sbs-decision-list label,
        .sbs-source-checklist label {
          display: grid;
          grid-template-columns: 18px minmax(0, 1fr);
          gap: 10px;
          align-items: start;
          padding: 14px;
          background: #FFFFFF;
          color: #282728;
          font-size: 13px;
          line-height: 1.65;
        }
        .sbs-decision-list input,
        .sbs-source-checklist input {
          width: 15px;
          height: 15px;
          margin-top: 3px;
          accent-color: #0D0E10;
        }
        .sbs-source-checklist {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .sbs-taste-note {
          padding: clamp(20px, 3vw, 30px);
          background: #282728;
        }
        .sbs-taste-note p {
          color: #F8FAFA;
          font-size: clamp(1.3rem, 2.2vw, 1.8rem);
          line-height: 1.55;
        }
        .sbs-action-step {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 18px;
          align-items: center;
        }
        .sbs-trouble-list {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.35);
        }
        .sbs-trouble-list article {
          min-height: 170px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 16px;
          background: #FFFFFF;
        }
        .sbs-trouble-list span {
          color: #0D0E10;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          line-height: 1.45;
          text-transform: uppercase;
        }
        .sbs-module-next,
        .sbs-mini-planner {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 22px;
          align-items: end;
          margin-top: 14px;
          padding: clamp(20px, 4vw, 34px);
          background: #282728;
        }
        .sbs-module-next .sbs-kicker,
        .sbs-module-next p,
        .sbs-mini-planner .sbs-kicker,
        .sbs-mini-planner p {
          color: rgba(248,250,250,0.76);
        }
        .sbs-module-next h3,
        .sbs-mini-planner h3 {
          color: #F8FAFA;
        }
        .sbs-module-next .sbs-primary {
          background: #F8FAFA;
          color: #0D0E10;
        }
        .sbs-placeholder-stack {
          display: grid;
          gap: 10px;
          margin-top: 14px;
        }
        .sbs-placeholder-module {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 20px;
          align-items: center;
          padding: 18px;
          background: #F8FAFA;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-placeholder-module h3 {
          margin-bottom: 10px;
          font-size: clamp(2rem, 3.8vw, 3.4rem);
        }
        .sbs-placeholder-module > span {
          color: #818283;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .sbs-mini-planner {
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-mini-planner .sbs-kicker,
        .sbs-mini-planner h3,
        .sbs-mini-planner p {
          color: #0D0E10;
        }
        .sbs-mini-planner p {
          color: #4F5052;
        }
        .sbs-mini-grid {
          width: min(220px, 42vw);
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1px;
          background: rgba(197,198,200,0.45);
          border: 1px solid rgba(197,198,200,0.45);
        }
        .sbs-mini-grid span {
          aspect-ratio: 1;
          background: #F8FAFA;
        }
        .sbs-final-resources {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 26px;
          align-items: end;
          margin-bottom: 42px;
        }
        @media (max-width: 1180px) {
          .sbs-module-card-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .sbs-trouble-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 980px) {
          .sbs-buyer-home,
          .sbs-course-player,
          .sbs-lesson-hero,
          .sbs-decision-tool,
          .sbs-module-next,
          .sbs-mini-planner,
          .sbs-final-resources {
            grid-template-columns: 1fr;
          }
          .sbs-course-sidebar {
            display: none;
          }
          .sbs-mobile-module-list {
            display: block;
            margin-top: 14px;
          }
          .sbs-mobile-player-progress {
            display: block;
            margin-bottom: 14px;
            padding: 16px;
            background: #FFFFFF;
            border: 1px solid rgba(197,198,200,0.35);
          }
          .sbs-mobile-player-progress .sbs-course-progress {
            margin: 0;
          }
          .sbs-mobile-module-list details {
            background: #FFFFFF;
            border: 1px solid rgba(197,198,200,0.35);
          }
          .sbs-mobile-module-list summary {
            cursor: pointer;
            padding: 16px;
            color: #0D0E10;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            list-style: none;
          }
          .sbs-mobile-module-list summary::-webkit-details-marker {
            display: none;
          }
          .sbs-mobile-module-list nav {
            display: grid;
            border-top: 1px solid rgba(197,198,200,0.35);
          }
          .sbs-mobile-module-list a {
            display: flex;
            gap: 12px;
            padding: 13px 16px;
            color: #4F5052;
            border-bottom: 1px solid rgba(197,198,200,0.35);
            font-size: 12px;
            text-decoration: none;
          }
          .sbs-home-board {
            min-height: 500px;
          }
          .sbs-example-grid {
            grid-template-columns: 1fr;
          }
          .sbs-source-checklist {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .sbs-top-links {
            display: none;
          }
          .sbs-buyer-home,
          .sbs-home-modules,
          .sbs-course-player,
          .sbs-final-resources {
            padding-left: 14px;
            padding-right: 14px;
          }
          .sbs-home-copy h1 {
            font-size: clamp(3.1rem, 15vw, 4.8rem);
          }
          .sbs-home-actions,
          .sbs-final-actions {
            display: grid;
            grid-template-columns: 1fr;
          }
          .sbs-primary,
          .sbs-secondary {
            width: 100%;
          }
          .sbs-home-board {
            min-height: 430px;
          }
          .sbs-home-image-0 {
            left: 0;
            width: 58%;
          }
          .sbs-home-image-1 {
            top: 18%;
            width: 50%;
          }
          .sbs-home-image-2 {
            left: 30%;
            width: 52%;
          }
          .sbs-module-card-grid,
          .sbs-quick-links,
          .sbs-trouble-list {
            grid-template-columns: 1fr;
          }
          .sbs-module-card-image {
            aspect-ratio: 4 / 4.4;
          }
          .sbs-lesson-panel {
            padding: 12px;
          }
          .sbs-lesson-hero,
          .sbs-lesson-section summary,
          .sbs-action-step,
          .sbs-placeholder-module {
            grid-template-columns: 1fr;
          }
          .sbs-lesson-hero {
            padding: 16px;
          }
          .sbs-lesson-hero h2,
          .sbs-section-heading h2,
          .sbs-final-resources h2 {
            font-size: clamp(2.8rem, 13vw, 4.4rem);
          }
          .sbs-lesson-hero-image {
            min-height: 390px;
          }
          .sbs-lesson-section summary {
            gap: 10px;
            padding: 15px;
          }
          .sbs-lesson-body {
            padding: 14px;
          }
          .sbs-example-image-grid {
            min-height: auto;
          }
          .sbs-example-image {
            min-height: 245px;
          }
          .sbs-example-image-grid-1 .sbs-example-image {
            min-height: 390px;
          }
          .sbs-mini-grid {
            width: 100%;
          }
        }
      `}</style>
    </main>
  )
}
