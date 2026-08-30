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

import { SSELFIE_NOIR_GLASS_COLORS } from "@/lib/brand/bold-editorial-tokens"
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
  ["Obsidian", SSELFIE_NOIR_GLASS_COLORS.obsidian],
  ["Graphite", SSELFIE_NOIR_GLASS_COLORS.graphite],
  ["Pearl", SSELFIE_NOIR_GLASS_COLORS.pearl],
  ["Paper", SSELFIE_NOIR_GLASS_COLORS.paper],
  ["Cool Mist", SSELFIE_NOIR_GLASS_COLORS.coolMist],
  ["Concrete", SSELFIE_NOIR_GLASS_COLORS.concrete],
  ["Silver", SSELFIE_NOIR_GLASS_COLORS.silver],
  ["Steel", SSELFIE_NOIR_GLASS_COLORS.steel],
  ["Slate", SSELFIE_NOIR_GLASS_COLORS.slate],
  ["Pearl Neon", SSELFIE_NOIR_GLASS_COLORS.pearlNeon],
] as const

const vaultMarketingSteps = ["ADD A SELFIE", "CHOOSE A LOOK", "MAYA CREATES", "SAVE IT"] as const

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

function MarketingDesktopProof({ priceLabel }: { priceLabel: string }) {
  return (
    <div className={styles.marketingDesktop} aria-label="Marketing desktop proof">
      <header className={styles.marketingNav}>
        <div className={styles.marketingNavBrand}>
          <EditorialWordmark />
          <span className={styles.marketingNeon} aria-hidden="true">
            Worth posting.
            <i />
          </span>
        </div>
        <nav>
          <a href="#marketing-proof">VAULT MAYA</a>
          <a href="#marketing-proof">HOW IT WORKS</a>
          <a href="#marketing-proof">THE SUITE</a>
        </nav>
        <span>START WITH MY SELFIE →</span>
      </header>
      <div className={styles.marketingGrid}>
        <section className={styles.marketingCopy}>
          <EditorialEyebrow>VAULT MAYA · SELFIE TO PHOTO</EditorialEyebrow>
          <h2>
            One selfie.
            <br />
            Choose a look.
          </h2>
          <p>
            Upload one clear selfie, choose the photo you want to create, and let Maya do the
            prompting for you.
          </p>
          <EditorialButton accent>
            START WITH MY SELFIE · {priceLabel.toUpperCase()}
          </EditorialButton>
          <div className={styles.checkoutProof}>
            <span>CHECKOUT HANDOFF</span>
            <strong>{priceLabel} · 30 photo creations each month</strong>
            <small>Cancel anytime · existing SUITE members are protected from paying twice</small>
          </div>
          <div className={styles.methodLine}>
            {vaultMarketingSteps.map((step, index) => (
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
              src="/images/vault-maya/proof/img-7880-bw-editorial.webp"
              alt="Black-and-white Vault Maya result created from Sandra's selfie"
              fill
              sizes="600px"
            />
            <span>MAYA RESULT · 01</span>
          </div>
          <div className={styles.marketingPhotoSecondary}>
            <Image
              src="/images/vault-maya/proof/img-2534-original-selfie.webp"
              alt="Sandra's original selfie used for the Vault Maya result"
              fill
              sizes="300px"
            />
            <span>ORIGINAL SELFIE</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MarketingMobileProof({ priceLabel }: { priceLabel: string }) {
  return (
    <div className={styles.marketingMobile} aria-label="Marketing mobile proof">
      <header>
        <EditorialWordmark />
        <span className={styles.marketingNeon} aria-hidden="true">
          Worth posting.
          <i />
        </span>
        <span>MENU</span>
      </header>
      <div className={styles.marketingMobilePhoto}>
        <Image
          src="/images/vault-maya/proof/img-7880-bw-editorial.webp"
          alt="Black-and-white Vault Maya result created from Sandra's selfie"
          fill
          sizes="370px"
        />
        <span>VAULT MAYA RESULT · 01</span>
        <figure className={styles.marketingMobileOriginal}>
          <Image
            src="/images/vault-maya/proof/img-2534-original-selfie.webp"
            alt="Sandra's original selfie used for the Vault Maya result"
            fill
            sizes="110px"
          />
          <figcaption>ORIGINAL SELFIE</figcaption>
        </figure>
      </div>
      <section>
        <EditorialEyebrow>VAULT MAYA · SELFIE TO PHOTO</EditorialEyebrow>
        <h2>One selfie. Choose a look.</h2>
        <p>Maya makes the photo. No prompt to copy. Nothing else to figure out.</p>
        <EditorialButton accent>START WITH MY SELFIE · {priceLabel.toUpperCase()}</EditorialButton>
        <small className={styles.mobileCheckoutTerms}>
          30 photo creations each month · cancel anytime
        </small>
      </section>
      <EditorialStageNav active="CREATE" />
    </div>
  )
}

/**
 * Current private cross-channel reference for SSELFIE Noir Glass.
 * The legacy file name remains to avoid a disruptive path rename.
 */
export function SselfieNoirGlassProof({
  emailHtml,
  priceLabel,
}: {
  emailHtml: string
  priceLabel: string
}) {
  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <EditorialWordmark />
          <span>DESIGN AUTHORITY · APPROVED 2026-08-27</span>
        </div>
        <div className={styles.pageHeaderCopy}>
          <EditorialEyebrow>APPROVAL REFERENCE · NOT LIVE</EditorialEyebrow>
          <h1>SSELFIE Noir Glass</h1>
          <p>
            One brand system for Suite, marketing, and email. Selfies stay central. Maya supports
            the work. Obsidian carries action; Pearl Neon marks selection and rare brand moments.
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
          <article className={styles.signatureSpecimen}>
            <EditorialEyebrow>SIGNATURE · ALLURA · BRAND MOMENTS ONLY</EditorialEyebrow>
            <p>Worth posting.</p>
            <small>
              Pearl Neon may appear on black brand moments, selected visual work, and compact
              wayfinding. Never use it for body copy or ordinary controls.
            </small>
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
          note="The real Vault Maya promise and checkout handoff, translated into the approved channel palette."
        />
        <div className={styles.proofPair}>
          <div className={styles.desktopProofWrap}>
            <MarketingDesktopProof priceLabel={priceLabel} />
          </div>
          <MarketingMobileProof priceLabel={priceLabel} />
        </div>
      </section>

      <section id="email-proof" className={styles.proofSection}>
        <ProofHeader
          number="03"
          title="Email proof"
          note="The real transactional membership welcome, rendered through the proposed channel palette without changing the sending template."
        />
        <div className={styles.emailPair}>
          <div>
            <span>640PX DESKTOP</span>
            <iframe
              className={styles.emailDesktop}
              title="SSELFIE Noir Glass email desktop proof"
              srcDoc={emailHtml}
              loading="lazy"
            />
          </div>
          <div>
            <span>375PX MOBILE</span>
            <iframe
              className={styles.emailMobile}
              title="SSELFIE Noir Glass email mobile proof"
              srcDoc={emailHtml}
              loading="lazy"
            />
          </div>
        </div>
      </section>

      <footer className={styles.pageFooter}>
        <EditorialWordmark />
        <p>CURRENT DESIGN REFERENCE · PRIVATE ADMIN VIEW · SSELFIE NOIR GLASS</p>
      </footer>
    </main>
  )
}

/** @deprecated Use SselfieNoirGlassProof. */
export const BoldEditorialProof = SselfieNoirGlassProof
