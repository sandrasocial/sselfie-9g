import Image from "next/image"
import {
  ArrowRight,
  BookOpen,
  Camera,
  Folder,
  Grid2X2,
  MessageCircle,
  Plus,
  Send,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react"

import { BOLD_EDITORIAL_COLORS, BOLD_EDITORIAL_GUARDRAILS } from "@/lib/brand/bold-editorial-tokens"
import {
  EditorialButton,
  EditorialEyebrow,
  EditorialHeadline,
  EditorialRule,
  EditorialStageNav,
  EditorialWordmark,
} from "./bold-editorial-primitives"
import styles from "./bold-editorial-proof.module.css"

const suiteActions = [
  {
    label: "AI SELFIE",
    image: "/images/brand/bold-editorial-suite/suite-editorial-studio-power-v1.png",
    alt: "Sandra in sculptural black tailoring in a concrete studio",
  },
  {
    label: "EDIT A PHOTO",
    image: "/images/brand/bold-editorial-suite/suite-editorial-white-shirt-v1.png",
    alt: "Sandra in a crisp white shirt in directional studio light",
  },
  {
    label: "BUILD A POST",
    image: "/images/brand/bold-editorial-suite/suite-editorial-street-v1.png",
    alt: "Sandra walking through the city in a black tailored coat",
  },
] as const

const recentProjects = [
  {
    label: "Studio power",
    meta: "AI SELFIE · 8 PHOTOS",
    image: "/images/brand/bold-editorial-suite/suite-editorial-studio-power-v1.png",
  },
  {
    label: "White shirt story",
    meta: "POST · READY",
    image: "/images/brand/bold-editorial-suite/suite-editorial-white-shirt-v1.png",
  },
  {
    label: "City campaign",
    meta: "EDIT · IN PROGRESS",
    image: "/images/brand/bold-editorial-suite/suite-editorial-street-v1.png",
  },
  {
    label: "Café after dark",
    meta: "POST · READY",
    image: "/images/brand/bold-editorial-suite/suite-editorial-cafe-lace-v1.jpeg",
  },
  {
    label: "Mirror in mono",
    meta: "SELFIE · SAVED",
    image: "/images/brand/bold-editorial-suite/suite-editorial-mirror-mono-v1.jpeg",
  },
  {
    label: "Stone street",
    meta: "EDIT · 6 VERSIONS",
    image: "/images/brand/bold-editorial-suite/suite-editorial-street-mono-v1.jpeg",
  },
  {
    label: "City with Milo",
    meta: "POST · DRAFT",
    image: "/images/brand/bold-editorial-suite/suite-editorial-city-dog-v1.jpeg",
  },
  {
    label: "Think bigger",
    meta: "CAMPAIGN · 4 ASSETS",
    image: "/images/brand/bold-editorial-suite/suite-editorial-think-bigger-v1.jpeg",
  },
  {
    label: "Window light",
    meta: "PHOTO · SELECTED",
    image: "/images/brand/bold-editorial-suite/suite-editorial-turtleneck-light-v1.jpeg",
  },
] as const

const palette = [
  ["Editorial Ink", BOLD_EDITORIAL_COLORS.ink],
  ["Carbon", BOLD_EDITORIAL_COLORS.carbon],
  ["Chalk", BOLD_EDITORIAL_COLORS.chalk],
  ["Paper", BOLD_EDITORIAL_COLORS.paper],
  ["Concrete", BOLD_EDITORIAL_COLORS.concrete],
  ["Silver", BOLD_EDITORIAL_COLORS.silver],
  ["Slate", BOLD_EDITORIAL_COLORS.slate],
  ["Oxblood", BOLD_EDITORIAL_COLORS.oxblood],
] as const

function ProofHeader({ number, title, note }: { number: string; title: string; note: string }) {
  return (
    <header className={styles.proofHeader}>
      <p className={styles.proofNumber}>{number}</p>
      <div>
        <h2>{title}</h2>
        <p>{note}</p>
      </div>
      <span>DESKTOP + MOBILE</span>
    </header>
  )
}

function SuiteDesktopProof() {
  return (
    <div className={styles.suiteDesktop} aria-label="Suite desktop proof">
      <aside className={styles.suiteRail}>
        <EditorialWordmark className={styles.railWordmark} />
        <nav aria-label="Suite proof navigation">
          <a href="#suite-proof">
            <Grid2X2 aria-hidden="true" size={16} /> HOME
          </a>
          <a href="#suite-proof">
            <Camera aria-hidden="true" size={16} /> TAKE
          </a>
          <a className={styles.railActive} href="#suite-proof" aria-current="page">
            <Sparkles aria-hidden="true" size={16} /> CREATE
          </a>
          <a href="#suite-proof">
            <SlidersHorizontal aria-hidden="true" size={16} /> EDIT
          </a>
          <a href="#suite-proof">
            <Send aria-hidden="true" size={16} /> POST
          </a>
        </nav>
        <div className={styles.railSecondary}>
          <a href="#suite-proof">
            <Folder aria-hidden="true" size={16} /> PROJECTS
          </a>
          <a href="#suite-proof">
            <BookOpen aria-hidden="true" size={16} /> LEARN
          </a>
        </div>
        <div className={styles.railMaya}>
          <span className={styles.mayaDot} />
          <div>
            <strong>MAYA</strong>
            <small>Your creative partner</small>
          </div>
          <ArrowRight aria-hidden="true" size={14} />
        </div>
      </aside>

      <div className={styles.suiteCanvas}>
        <div className={styles.suiteTopline}>
          <EditorialStageNav />
          <span>250 CREDITS</span>
        </div>

        <section className={styles.suiteHero}>
          <div className={styles.suiteHeroCopy}>
            <EditorialEyebrow>CREATE · YOUR VISUAL STUDIO</EditorialEyebrow>
            <h1>
              Create something
              <br />
              worth posting.
            </h1>
            <p>Start with the photo. Maya helps you turn it into the next useful thing.</p>
          </div>
          <div className={styles.suiteHeroImage}>
            <Image
              src="/images/brand/bold-editorial-suite/suite-editorial-studio-power-v1.png"
              alt="Editorial portrait of Sandra in black tailoring and architectural light"
              fill
              sizes="(max-width: 1000px) 45vw, 600px"
              priority
            />
            <span>01 / SELECTED</span>
          </div>
        </section>

        <section className={styles.actionGrid} aria-label="Create actions">
          {suiteActions.map((action, index) => (
            <article key={action.label} className={styles.actionCard}>
              <Image src={action.image} alt={action.alt} fill sizes="280px" />
              <span className={styles.actionNumber}>{String(index + 1).padStart(2, "0")}</span>
              <div className={styles.actionLabel}>
                <strong>{action.label}</strong>
                <ArrowRight aria-hidden="true" size={17} />
              </div>
            </article>
          ))}
        </section>

        <section className={styles.recentSection}>
          <div className={styles.sectionLabel}>
            <span>CONTINUE YOUR WORK</span>
            <span>VIEW ALL →</span>
          </div>
          <div className={styles.recentGrid}>
            {recentProjects.map(project => (
              <article key={project.label}>
                <div className={styles.recentImage}>
                  <Image src={project.image} alt="" fill sizes="180px" />
                </div>
                <strong>{project.label}</strong>
                <small>{project.meta}</small>
              </article>
            ))}
            <button type="button" aria-label="Start a new project" className={styles.newProject}>
              <Plus aria-hidden="true" size={24} strokeWidth={1.3} />
              <span>NEW PROJECT</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

function SuiteMobileProof() {
  return (
    <div className={styles.phoneFrame} aria-label="Suite mobile proof">
      <div className={styles.phoneTopbar}>
        <button type="button" aria-label="Open navigation">
          <span />
          <span />
        </button>
        <EditorialWordmark />
        <span className={styles.creditMark}>250</span>
      </div>
      <div className={styles.phoneHero}>
        <Image
          src="/images/brand/bold-editorial-suite/suite-editorial-studio-power-v1.png"
          alt="Editorial portrait of Sandra in black tailoring and architectural light"
          fill
          sizes="370px"
        />
        <div>
          <span>CREATE · 01</span>
          <h2>Create something worth posting.</h2>
        </div>
      </div>
      <EditorialStageNav />
      <div className={styles.phoneBody}>
        <p className={styles.phoneLabel}>WHAT ARE WE MAKING?</p>
        <div className={styles.phoneActions}>
          {suiteActions.map((action, index) => (
            <button type="button" key={action.label}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{action.label}</strong>
              <ArrowRight aria-hidden="true" size={15} />
            </button>
          ))}
        </div>
        <div className={styles.mobileMaya}>
          <div className={styles.mobileMayaIcon}>
            <MessageCircle aria-hidden="true" size={17} />
          </div>
          <div>
            <strong>MAYA</strong>
            <p>I’ll help you choose the strongest next move.</p>
          </div>
          <ArrowRight aria-hidden="true" size={16} />
        </div>
      </div>
    </div>
  )
}

function MarketingDesktopProof() {
  return (
    <div className={styles.marketingDesktop} aria-label="Marketing desktop proof">
      <header className={styles.marketingNav}>
        <EditorialWordmark />
        <nav>
          <a href="#marketing-proof">THE METHOD</a>
          <a href="#marketing-proof">THE SUITE</a>
          <a href="#marketing-proof">LEARN</a>
        </nav>
        <span>START HERE →</span>
      </header>
      <div className={styles.marketingGrid}>
        <section className={styles.marketingCopy}>
          <EditorialEyebrow>SELFIES + AI SELFIES</EditorialEyebrow>
          <h2>
            Your selfie
            <br />
            is the opening.
          </h2>
          <p>
            Take the photo. Create the AI version. Edit it until it feels like you. Post it with
            purpose.
          </p>
          <EditorialButton accent>START WITH ONE SELFIE</EditorialButton>
          <div className={styles.methodLine}>
            {BOLD_EDITORIAL_GUARDRAILS.method.map((step, index) => (
              <span key={step}>
                <small>{String(index + 1).padStart(2, "0")}</small>
                {step}
              </span>
            ))}
          </div>
        </section>
        <div className={styles.marketingPhotos}>
          <div className={styles.marketingPhotoMain}>
            <Image
              src="/images/selfie-guide/mirror-sunglasses-blazer.jpg"
              alt="Sandra making an editorial mirror selfie in a black blazer"
              fill
              sizes="600px"
            />
            <span>REAL SELFIE · 01</span>
          </div>
          <div className={styles.marketingPhotoSecondary}>
            <Image
              src="/images/suite-personal-brand-grid/post-01-founder-black.jpg"
              alt="Editorial AI-selfie result of Sandra in black tailoring"
              fill
              sizes="300px"
            />
            <span>AI SELFIE · 02</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MarketingMobileProof() {
  return (
    <div className={styles.marketingMobile} aria-label="Marketing mobile proof">
      <header>
        <EditorialWordmark />
        <span>MENU</span>
      </header>
      <div className={styles.marketingMobilePhoto}>
        <Image
          src="/images/selfie-guide/mirror-sunglasses-blazer.jpg"
          alt="Sandra making an editorial mirror selfie in a black blazer"
          fill
          sizes="370px"
        />
        <span>SELFIE · 01</span>
      </div>
      <section>
        <EditorialEyebrow>SELFIES + AI SELFIES</EditorialEyebrow>
        <h2>Your selfie is the opening.</h2>
        <p>Take it. Create with it. Edit it. Post it.</p>
        <EditorialButton accent>START HERE</EditorialButton>
      </section>
      <EditorialStageNav active="TAKE" />
    </div>
  )
}

export function BoldEditorialProof({ emailHtml }: { emailHtml: string }) {
  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <EditorialWordmark />
          <span>DESIGN FOUNDATION · 2026-08-23</span>
        </div>
        <div className={styles.pageHeaderCopy}>
          <EditorialEyebrow>APPROVAL REFERENCE · NOT LIVE</EditorialEyebrow>
          <h1>Bold Editorial Studio</h1>
          <p>
            One brand system for Suite, marketing, and email. Selfies stay central. Maya supports
            the work. Oxblood marks intent—not decoration.
          </p>
        </div>
      </header>

      <section className={styles.foundationSection} aria-labelledby="foundation-title">
        <div className={styles.foundationIntro}>
          <EditorialEyebrow>00 · FOUNDATION</EditorialEyebrow>
          <EditorialHeadline className={styles.foundationHeadline}>
            Strong enough to be recognized.
            <br />
            Quiet enough to use.
          </EditorialHeadline>
          <p>
            The signature is the real four-stage method used as structure: TAKE, CREATE, EDIT, POST.
            The design stays disciplined everywhere else.
          </p>
        </div>

        <div className={styles.paletteGrid}>
          {palette.map(([name, value]) => (
            <article key={name}>
              <span style={{ backgroundColor: value }} />
              <strong>{name}</strong>
              <code>{value}</code>
            </article>
          ))}
        </div>

        <EditorialRule />

        <div className={styles.typeGrid}>
          <article>
            <EditorialEyebrow>DISPLAY · CORMORANT GARAMOND</EditorialEyebrow>
            <p className={styles.typeDisplay}>Selfies are the opening.</p>
          </article>
          <article>
            <EditorialEyebrow>UI + BODY · MANROPE</EditorialEyebrow>
            <p className={styles.typeBody}>
              Clear controls, human labels, and enough contrast to know what happens next.
            </p>
            <div className={styles.buttonRow}>
              <EditorialButton>PRIMARY ACTION</EditorialButton>
              <EditorialButton accent>SELECTED ACTION</EditorialButton>
              <EditorialButton secondary>SECONDARY</EditorialButton>
            </div>
          </article>
        </div>
      </section>

      <section id="suite-proof" className={styles.proofSection}>
        <ProofHeader
          number="01"
          title="Suite proof"
          note="A visual studio organized around the real SSELFIE method—not a dashboard of features."
        />
        <div className={styles.proofPair}>
          <div className={styles.desktopProofWrap}>
            <SuiteDesktopProof />
          </div>
          <SuiteMobileProof />
        </div>
      </section>

      <section id="marketing-proof" className={styles.proofSection}>
        <ProofHeader
          number="02"
          title="Marketing proof"
          note="The same visual DNA, translated into a clear selfie-first promise instead of app chrome."
        />
        <div className={styles.proofPair}>
          <div className={styles.desktopProofWrap}>
            <MarketingDesktopProof />
          </div>
          <MarketingMobileProof />
        </div>
      </section>

      <section className={styles.proofSection}>
        <ProofHeader
          number="03"
          title="Email proof"
          note="An actual table-based, inline-style email expression—not a web layout pretending to be email."
        />
        <div className={styles.emailPair}>
          <div>
            <span>640PX DESKTOP</span>
            <iframe
              className={styles.emailDesktop}
              title="Bold Editorial email desktop proof"
              srcDoc={emailHtml}
              loading="lazy"
            />
          </div>
          <div>
            <span>375PX MOBILE</span>
            <iframe
              className={styles.emailMobile}
              title="Bold Editorial email mobile proof"
              srcDoc={emailHtml}
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <footer className={styles.pageFooter}>
        <EditorialWordmark />
        <p>FOUNDATION PROOF · PRIVATE ADMIN REFERENCE · NO LIVE SURFACES CHANGED</p>
      </footer>
    </main>
  )
}
