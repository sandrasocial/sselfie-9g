"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import ReactMarkdown, { type Components } from "react-markdown"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { extractImageMarker, parseSelfieGuideChapters, type SelfieGuideChapter } from "@/lib/selfie-guide/experience"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
})

const MAYA_GALLERY_IMAGES = [
  {
    src: "/images/selfie-guide/feed-post-1.png",
    alt: "Before and after comparison showing Sandra's selfie enhanced with AI to create professional brand photography",
    caption: "Original selfie -> AI-enhanced brand photo",
    width: 1856,
    height: 2304,
  },
  {
    src: "/images/selfie-guide/feed-post-3.png",
    alt: "Sandra's brand photo with consistent editorial style and cohesive aesthetic",
    caption: "Consistent editorial vibe",
    width: 1856,
    height: 2304,
  },
  {
    src: "/images/selfie-guide/feed-post-5.png",
    alt: "Professional portrait of Sandra with warm, approachable expression and polished editorial style",
    caption: "Warm + approachable (but still polished)",
    width: 1856,
    height: 2304,
  },
  {
    src: "/images/selfie-guide/feed-post-7.png",
    alt: "Sandra's brand photo balancing professional quality with natural, authentic presence",
    caption: "Professional without being stiff",
    width: 1856,
    height: 2304,
  },
  {
    src: "/images/selfie-guide/parisian-cafe-tranquility.png",
    alt: "AI-generated brand photo of Sandra in Parisian cafe setting with editorial aesthetic",
    caption: "AI-generated scene that still feels like me",
    width: 2048,
    height: 2048,
  },
] as const

type VisualSpec = {
  label: string
  caption: string
  src?: string
  alt?: string
}

const VISUAL_LIBRARY: Record<string, VisualSpec> = {
  "iphone-settings-mockup.png": {
    label: "SETTINGS CHEAT SHEET",
    caption: "Your iPhone camera settings in 60 seconds. These three changes make a bigger difference than any filter.",
    src: "/images/selfie-guide/iphone-settings-mockup.png",
    alt: "Collage of iPhone camera settings steps from the original selfie guide showing menu toggles and recommended setup",
  },
  "window-lighting-setup.png": {
    label: "THE WINDOW TECHNIQUE",
    caption: "Face the light, stand 3 feet back, shoot. That's it.",
    src: "/images/selfie-guide/window-lighting-setup.png",
    alt: "Example of window lighting setup with subject standing beside a window facing natural light",
  },
  "lighting-comparison-grid.png": {
    label: "LIGHTING COMPARISON",
    caption: "Same face, same phone, four totally different outcomes. Light changes everything.",
    src: "/images/selfie-guide/lighting-comparison-grid.png",
    alt: "Four-panel lighting comparison showing window light, golden hour, ring light, and cloudy day examples",
  },
  "angle-comparison-grid.png": {
    label: "ANGLE GUIDE",
    caption: "15 degrees above eye level. Remember this number.",
    src: "/images/selfie-guide/angle-comparison-grid.png",
    alt: "Three selfie angle examples comparing side angle, eye level, and slightly high angle camera positions",
  },
  "pose-guide-grid.png": {
    label: "NATURAL POSES",
    caption: "Four poses that work for everyone. Try all four and keep your top two.",
    src: "/images/selfie-guide/pose-guide-grid.png",
    alt: "Grid of four natural portrait pose variations for selfie practice",
  },
  "editing-before-after.png": {
    label: "EDITING BEFORE & AFTER",
    caption: "Small edits are enough. Keep your face real and your style consistent.",
    src: "/images/selfie-guide/editing-before-after.png",
    alt: "Before and after selfie editing comparison showing subtle improvements in light and contrast",
  },
}

function getPlainText(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(getPlainText).join("")
  if (node && typeof node === "object" && "props" in node) {
    const maybeChildren = (node as { props?: { children?: unknown } }).props?.children
    return getPlainText(maybeChildren)
  }
  return ""
}

function MayaGallery() {
  return (
    <div className="maya-gallery" aria-label="AI-enhanced selfie examples">
      <div className="maya-grid">
        {MAYA_GALLERY_IMAGES.map((image) => (
          <figure key={image.src} className="visual-card">
            <div className="visual-image-wrap">
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                sizes="(max-width: 700px) 100vw, (max-width: 1200px) 40vw, 320px"
                className="visual-image"
              />
            </div>
            <figcaption>{image.caption}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

function FeedPreview() {
  return (
    <figure className="feed-preview">
      <div className="feed-preview-image-wrap">
        <Image
          src="/images/selfie-guide/img-editorial-dark.png"
          alt="Instagram feed grid preview showing nine cohesive brand photos with consistent editorial style"
          width={1536}
          height={2752}
          sizes="(max-width: 700px) 100vw, 720px"
          className="feed-preview-image"
        />
      </div>
      <figcaption>This is what a cohesive feed looks like when your visuals follow one strategy.</figcaption>
    </figure>
  )
}

function MissingVisual({ spec }: { spec: VisualSpec }) {
  return (
    <figure className="teaching-visual">
      <div className="teaching-label">{spec.label}</div>
      <div className="missing-visual">
        <p>Visual block ready</p>
        <span>{spec.caption}</span>
      </div>
      <figcaption className="teaching-caption">Image placeholder active. Upload final visual to replace this block.</figcaption>
    </figure>
  )
}

function normalizeChapterTitle(value: string): string {
  const text = String(value || "").trim()
  if (!text) return "Chapter"
  return text
}

interface SelfieGuideExperienceProps {
  firstName: string
  guideMarkdown: string
}

export default function SelfieGuideExperience({ firstName, guideMarkdown }: SelfieGuideExperienceProps) {
  const chapters = useMemo(() => {
    const parsed = parseSelfieGuideChapters(guideMarkdown)
    if (parsed.length > 0) return parsed
    return [
      {
        id: "guide-1",
        title: "Guide",
        markdown: guideMarkdown,
      },
    ] satisfies SelfieGuideChapter[]
  }, [guideMarkdown])

  const [activeChapterIndex, setActiveChapterIndex] = useState(0)
  const currentChapter = chapters[Math.min(activeChapterIndex, Math.max(chapters.length - 1, 0))]
  const progressPercent = chapters.length > 1 ? Math.round(((activeChapterIndex + 1) / chapters.length) * 100) : 100

  useEffect(() => {
    const hash = window.location.hash.replace("#", "")
    if (!hash) return
    const index = chapters.findIndex((chapter) => chapter.id === hash)
    if (index >= 0) setActiveChapterIndex(index)
  }, [chapters])

  useEffect(() => {
    const target = chapters[activeChapterIndex]
    if (!target) return
    window.history.replaceState(null, "", `#${target.id}`)
  }, [activeChapterIndex, chapters])

  const markdownComponents = useMemo<Components>(
    () => ({
      h1: ({ children }) => <h1 className={`guide-h1 ${cormorant.className}`}>{children}</h1>,
      h2: ({ children }) => <h2 className={`guide-h2 ${cormorant.className}`}>{children}</h2>,
      h3: ({ children }) => <h3 className={`guide-h3 ${cormorant.className}`}>{children}</h3>,
      p: ({ children }) => {
        const text = getPlainText(children).replace(/\s+/g, " ").trim()
        const imageMarker = extractImageMarker(text)

        if (!imageMarker) {
          return <p className="guide-p">{children}</p>
        }

        if (imageMarker === "feed-post-1.png") {
          return <MayaGallery />
        }

        if (imageMarker === "img-editorial-dark.png") {
          return <FeedPreview />
        }

        const spec = VISUAL_LIBRARY[imageMarker]
        if (!spec) {
          return (
            <MissingVisual
              spec={{
                label: "VISUAL SECTION",
                caption: "This guide step references a visual block.",
              }}
            />
          )
        }

        if (!spec.src || !spec.alt) {
          return <MissingVisual spec={spec} />
        }

        return (
          <figure className="teaching-visual">
            <div className="teaching-label">{spec.label}</div>
            <div className="teaching-image-wrap">
              <Image
                src={spec.src}
                alt={spec.alt}
                width={1200}
                height={800}
                sizes="(max-width: 700px) 100vw, 900px"
                className="teaching-image"
              />
            </div>
            <figcaption className="teaching-caption">{spec.caption}</figcaption>
          </figure>
        )
      },
      ul: ({ children }) => <ul className="guide-ul">{children}</ul>,
      ol: ({ children }) => <ol className="guide-ol">{children}</ol>,
      li: ({ children }) => <li className="guide-li">{children}</li>,
      hr: () => <hr className="guide-hr" />,
      a: ({ href, children }) => {
        const resolvedHref = href || "#"
        return (
          <a href={resolvedHref} className="guide-link">
            {children}
          </a>
        )
      },
    }),
    [],
  )

  return (
    <main className={`guide-shell ${inter.className}`}>
      <header className="guide-header">
        <a href="https://sselfie.ai" className={`logo ${cormorant.className}`}>
          SSELFIE
        </a>
        <span className="header-label">INTERACTIVE SELFIE GUIDE</span>
      </header>

      <section className="hero-card">
        <p className="hero-label">Created for</p>
        <h1 className={`hero-title ${cormorant.className}`}>{firstName}</h1>
        <p className="hero-copy">Tap through chapter by chapter. Apply one action before moving to the next.</p>
        <div className="progress-wrap" aria-label="Guide progress">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="progress-copy">
            Chapter {activeChapterIndex + 1} of {chapters.length}
          </span>
        </div>
      </section>

      <section className="experience-layout">
        <aside className="chapter-rail" aria-label="Guide chapters">
          {chapters.map((chapter, index) => (
            <button
              key={chapter.id}
              type="button"
              className={`chapter-pill ${index === activeChapterIndex ? "is-active" : ""}`}
              onClick={() => setActiveChapterIndex(index)}
            >
              <span className="chapter-pill-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="chapter-pill-title">{normalizeChapterTitle(chapter.title)}</span>
            </button>
          ))}
        </aside>

        <article className="chapter-card" id={currentChapter.id}>
          <div className="chapter-head">
            <span className="chapter-kicker">Now reading</span>
            <h2 className={`chapter-title ${cormorant.className}`}>{normalizeChapterTitle(currentChapter.title)}</h2>
          </div>
          <ReactMarkdown components={markdownComponents}>{currentChapter.markdown}</ReactMarkdown>

          <div className="chapter-controls">
            <button
              type="button"
              className="control-btn"
              disabled={activeChapterIndex === 0}
              onClick={() => setActiveChapterIndex((prev) => Math.max(prev - 1, 0))}
            >
              Previous Chapter
            </button>
            <button
              type="button"
              className="control-btn is-primary"
              onClick={() => setActiveChapterIndex((prev) => Math.min(prev + 1, chapters.length - 1))}
            >
              {activeChapterIndex === chapters.length - 1 ? "Finish Guide" : "Next Chapter"}
            </button>
          </div>
        </article>
      </section>

      <section className="funnel-card">
        <p className="funnel-kicker">Next steps</p>
        <h3 className={`funnel-title ${cormorant.className}`}>From freebie to full brand system</h3>
        <ol className="funnel-steps">
          <li>Complete this guide and practice your next 10 selfies.</li>
          <li>Unlock your personalized EUR 17 Brand Strategy.</li>
          <li>Join Studio Membership to generate with Maya every week.</li>
        </ol>
        <div className="funnel-ctas">
          <Link href="/brand-strategy" className="cta-primary">
            Get EUR 17 Brand Strategy
          </Link>
          <Link href="/checkout/membership" className="cta-secondary">
            Join Membership
          </Link>
          <Link href="/studio?tab=maya" className="cta-tertiary">
            Open Maya in Studio
          </Link>
        </div>
      </section>

      <style jsx>{`
        :global(html, body) {
          background: #0d0c0b;
        }

        .guide-shell {
          --stone-black: #0d0c0b;
          --stone-surface: #1c1b19;
          --stone-mid: #2e2c29;
          --stone-text: #f0ede8;
          --stone-muted: #8a8780;
          --stone-accent: #a8a49c;
          --stone-pale: #c8c4bb;
          min-height: 100vh;
          background: radial-gradient(circle at 20% 10%, rgba(200, 196, 187, 0.08), transparent 45%), #0d0c0b;
          color: var(--stone-text);
          padding-bottom: 60px;
        }

        .guide-header {
          position: sticky;
          top: 0;
          z-index: 50;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid rgba(175, 170, 162, 0.2);
          backdrop-filter: blur(28px);
          background: rgba(13, 12, 11, 0.84);
        }

        .logo {
          color: var(--stone-text);
          text-decoration: none;
          text-transform: uppercase;
          letter-spacing: 0.3em;
          font-size: 16px;
        }

        .header-label {
          font-size: 10px;
          letter-spacing: 0.32em;
          color: var(--stone-muted);
          text-transform: uppercase;
        }

        .hero-card,
        .experience-layout,
        .funnel-card {
          width: min(1180px, calc(100% - 32px));
          margin: 18px auto 0;
        }

        .hero-card,
        .chapter-card,
        .chapter-pill,
        .funnel-card {
          border: 1px solid rgba(195, 190, 182, 0.25);
          background: rgba(175, 170, 162, 0.1);
          backdrop-filter: blur(56px);
        }

        .hero-card {
          padding: 26px;
          border-radius: 22px;
        }

        .hero-label {
          margin: 0;
          font-size: 10px;
          letter-spacing: 0.46em;
          text-transform: uppercase;
          color: var(--stone-muted);
        }

        .hero-title {
          margin: 10px 0 8px;
          font-size: clamp(38px, 6vw, 68px);
          line-height: 1;
          text-transform: uppercase;
          font-weight: 300;
        }

        .hero-copy {
          margin: 0;
          color: var(--stone-muted);
          line-height: 1.8;
          font-size: 15px;
        }

        .progress-wrap {
          margin-top: 16px;
        }

        .progress-track {
          width: 100%;
          height: 8px;
          border-radius: 999px;
          background: rgba(175, 170, 162, 0.18);
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #a8a49c 0%, #c8c4bb 100%);
          transition: width 0.3s ease;
        }

        .progress-copy {
          display: inline-block;
          margin-top: 10px;
          font-size: 10px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: var(--stone-muted);
        }

        .experience-layout {
          display: grid;
          grid-template-columns: 300px minmax(0, 1fr);
          gap: 16px;
          align-items: start;
        }

        .chapter-rail {
          position: sticky;
          top: 84px;
          display: grid;
          gap: 8px;
          max-height: calc(100vh - 104px);
          overflow: auto;
          padding-right: 4px;
        }

        .chapter-pill {
          text-align: left;
          border-radius: 14px;
          padding: 10px 12px;
          display: grid;
          gap: 4px;
          cursor: pointer;
        }

        .chapter-pill-index {
          font-size: 10px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--stone-muted);
        }

        .chapter-pill-title {
          font-size: 13px;
          color: var(--stone-text);
          line-height: 1.4;
        }

        .chapter-pill.is-active {
          background: rgba(200, 196, 187, 0.24);
        }

        .chapter-card {
          border-radius: 22px;
          padding: clamp(20px, 3.3vw, 38px);
        }

        .chapter-head {
          padding-bottom: 16px;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(175, 170, 162, 0.2);
        }

        .chapter-kicker {
          font-size: 10px;
          letter-spacing: 0.34em;
          text-transform: uppercase;
          color: var(--stone-muted);
        }

        .chapter-title {
          margin: 9px 0 0;
          font-size: clamp(30px, 4.2vw, 54px);
          text-transform: uppercase;
          font-weight: 300;
          line-height: 1.06;
        }

        .guide-h1 {
          margin: 0 0 18px;
          font-size: clamp(33px, 4.7vw, 58px);
          text-transform: uppercase;
          line-height: 1.05;
          font-weight: 300;
        }

        .guide-h2 {
          margin: 34px 0 14px;
          font-size: clamp(27px, 3.8vw, 44px);
          line-height: 1.08;
          text-transform: uppercase;
          font-weight: 300;
        }

        .guide-h3 {
          margin: 24px 0 8px;
          font-size: clamp(21px, 2.8vw, 30px);
          line-height: 1.12;
          font-weight: 300;
        }

        .guide-p {
          margin: 0;
          font-size: 15px;
          line-height: 1.86;
          color: rgba(240, 237, 232, 0.9);
        }

        .guide-p + .guide-p,
        .guide-p + .guide-ul,
        .guide-p + .guide-ol,
        .guide-ul + .guide-p,
        .guide-ol + .guide-p,
        .guide-ul + .guide-ul,
        .guide-ol + .guide-ol {
          margin-top: 12px;
        }

        .guide-ul,
        .guide-ol {
          margin: 0;
          padding-left: 1.2rem;
          color: rgba(240, 237, 232, 0.86);
          line-height: 1.78;
        }

        .guide-li {
          margin: 3px 0;
        }

        .guide-hr {
          border: 0;
          border-top: 1px solid rgba(175, 170, 162, 0.2);
          margin: 28px 0;
        }

        .guide-link {
          color: var(--stone-pale);
          text-underline-offset: 3px;
        }

        .maya-gallery {
          margin: 20px 0;
        }

        .maya-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .visual-card,
        .teaching-visual {
          margin: 0;
          border: 1px solid rgba(175, 170, 162, 0.2);
          background: rgba(28, 27, 25, 0.55);
          overflow: hidden;
        }

        .visual-card:last-child {
          grid-column: 1 / -1;
        }

        .visual-image-wrap,
        .teaching-image-wrap {
          line-height: 0;
          background: #1c1b19;
        }

        .visual-image,
        .teaching-image {
          width: 100%;
          height: auto;
          display: block;
        }

        .visual-card figcaption,
        .teaching-caption {
          padding: 10px 12px 12px;
          font-size: 13px;
          color: rgba(240, 237, 232, 0.72);
          line-height: 1.6;
        }

        .feed-preview {
          margin: 18px 0;
        }

        .feed-preview-image-wrap {
          border: 1px solid rgba(175, 170, 162, 0.2);
          padding: 8px;
          background: rgba(28, 27, 25, 0.55);
        }

        .feed-preview-image {
          width: 100%;
          max-width: 680px;
          height: auto;
          display: block;
          margin: 0 auto;
        }

        .feed-preview figcaption {
          margin-top: 8px;
          font-size: 13px;
          color: rgba(240, 237, 232, 0.68);
          font-style: italic;
          text-align: center;
        }

        .teaching-label {
          padding: 10px 12px;
          font-size: 9px;
          letter-spacing: 0.42em;
          text-transform: uppercase;
          color: rgba(240, 237, 232, 0.52);
          border-bottom: 1px solid rgba(175, 170, 162, 0.18);
        }

        .missing-visual {
          padding: 24px 18px;
          text-align: left;
          border-top: 1px solid rgba(175, 170, 162, 0.18);
        }

        .missing-visual p {
          margin: 0;
          font-size: 12px;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(240, 237, 232, 0.5);
        }

        .missing-visual span {
          display: block;
          margin-top: 8px;
          color: rgba(240, 237, 232, 0.82);
          line-height: 1.7;
          font-size: 14px;
        }

        .chapter-controls {
          margin-top: 28px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .control-btn {
          border: 1px solid rgba(195, 190, 182, 0.32);
          background: rgba(175, 170, 162, 0.08);
          color: var(--stone-text);
          padding: 12px 18px;
          border-radius: 999px;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.2em;
          cursor: pointer;
        }

        .control-btn:disabled {
          opacity: 0.45;
          cursor: default;
        }

        .control-btn.is-primary {
          background: var(--stone-pale);
          border-color: var(--stone-pale);
          color: #0d0c0b;
        }

        .funnel-card {
          border-radius: 22px;
          padding: 26px;
          margin-top: 18px;
        }

        .funnel-kicker {
          margin: 0;
          font-size: 10px;
          letter-spacing: 0.44em;
          text-transform: uppercase;
          color: var(--stone-muted);
        }

        .funnel-title {
          margin: 8px 0 10px;
          font-size: clamp(28px, 3.8vw, 44px);
          font-weight: 300;
          line-height: 1.08;
          text-transform: uppercase;
        }

        .funnel-steps {
          margin: 0;
          padding-left: 1.2rem;
          color: rgba(240, 237, 232, 0.86);
          line-height: 1.75;
        }

        .funnel-ctas {
          margin-top: 18px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .cta-primary,
        .cta-secondary,
        .cta-tertiary {
          border-radius: 999px;
          padding: 12px 16px;
          text-decoration: none;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 0.18em;
        }

        .cta-primary {
          background: var(--stone-pale);
          color: #0d0c0b;
        }

        .cta-secondary,
        .cta-tertiary {
          border: 1px solid rgba(195, 190, 182, 0.32);
          color: var(--stone-text);
          background: rgba(175, 170, 162, 0.08);
        }

        @media (max-width: 980px) {
          .experience-layout {
            grid-template-columns: 1fr;
          }

          .chapter-rail {
            position: static;
            max-height: none;
            display: flex;
            gap: 8px;
            overflow: auto;
            padding-bottom: 4px;
          }

          .chapter-pill {
            min-width: 190px;
          }
        }

        @media (max-width: 720px) {
          .guide-header {
            padding: 18px 16px;
          }

          .header-label {
            display: none;
          }

          .hero-card,
          .experience-layout,
          .funnel-card {
            width: calc(100% - 20px);
          }

          .hero-card,
          .chapter-card,
          .funnel-card {
            padding: 18px;
            border-radius: 16px;
          }

          .chapter-pill {
            min-width: 168px;
            padding: 8px 10px;
          }

          .chapter-pill-title {
            font-size: 12px;
            line-height: 1.3;
          }

          .guide-p,
          .guide-ul,
          .guide-ol {
            font-size: 14px;
            line-height: 1.7;
          }

          .guide-h2 {
            margin-top: 24px;
          }

          .teaching-label {
            letter-spacing: 0.26em;
            font-size: 8px;
          }

          .visual-card figcaption,
          .teaching-caption,
          .feed-preview figcaption {
            font-size: 12px;
            line-height: 1.5;
          }

          .maya-grid {
            grid-template-columns: 1fr;
          }

          .visual-card:last-child {
            grid-column: auto;
          }

          .chapter-controls {
            gap: 8px;
          }

          .control-btn {
            width: 100%;
            text-align: center;
          }

          .funnel-ctas {
            gap: 8px;
          }

          .cta-primary,
          .cta-secondary,
          .cta-tertiary {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </main>
  )
}
