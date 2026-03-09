"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
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

// ─── Image libraries ────────────────────────────────────────────────────────

const MAYA_GALLERY_IMAGES = [
  {
    src: "/images/selfie-guide/feed-post-1.png",
    alt: "Before and after comparison showing Sandra's selfie enhanced with AI to create professional brand photography",
    caption: "Original selfie → AI-enhanced brand photo",
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

type ChallengeDay = {
  day: string
  title: string
  description: string
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

const SEVEN_DAY_CHALLENGE_DAYS: ChallengeDay[] = [
  {
    day: "Day 1",
    title: "Window Light Selfie",
    description: "Take one selfie using natural window light. No ring light. Just you and a window.",
  },
  {
    day: "Day 2",
    title: "Rule of Thirds",
    description: "Turn on your grid. Frame your eyes on the top third line. Take 5 shots.",
  },
  {
    day: "Day 3",
    title: "High Angle Test",
    description: "Hold your phone 15 degrees above eye level. Slightly tilt your chin down. Take 3 shots.",
  },
  {
    day: "Day 4",
    title: "Editing Pass",
    description: "Take your best selfie from days 1-3. Apply only light and warmth adjustments. No filters.",
  },
  {
    day: "Day 5",
    title: "Confidence Shot",
    description: "Take a selfie while doing something you love. No posing. Just do the thing.",
  },
  {
    day: "Day 6",
    title: "Caption Writing",
    description: "Write 3 different captions for your day 5 photo. Short, medium, and story format.",
  },
  {
    day: "Day 7",
    title: "Post It",
    description: "Choose your best selfie from this week. Write a caption. Post it. You're done.",
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPlainText(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(getPlainText).join("")
  if (node && typeof node === "object" && "props" in node) {
    const maybeChildren = (node as { props?: { children?: unknown } }).props?.children
    return getPlainText(maybeChildren)
  }
  return ""
}

function parseChecklistItem(value: string): string | null {
  const text = String(value || "").replace(/\s+/g, " ").trim()
  const match = text.match(/^\[\s\]\s*(.+)$/)
  return match?.[1]?.trim() || null
}

function normalizeChapterTitle(value: string): string {
  return String(value || "").trim() || "Chapter"
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MayaGallery() {
  return (
    <div className="sg-maya-gallery" aria-label="AI-enhanced selfie examples">
      <div className="sg-maya-grid">
        {MAYA_GALLERY_IMAGES.map((image) => (
          <figure key={image.src} className="sg-visual-card">
            <div className="sg-visual-img-wrap">
              <Image
                src={image.src}
                alt={image.alt}
                width={image.width}
                height={image.height}
                sizes="(max-width: 700px) 50vw, (max-width: 1200px) 25vw, 240px"
                className="sg-visual-img"
              />
            </div>
            <figcaption className="sg-visual-cap">{image.caption}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}

function FeedPreview() {
  return (
    <figure className="sg-feed-preview">
      <div className="sg-feed-img-wrap">
        <Image
          src="/images/selfie-guide/img-editorial-dark.png"
          alt="Instagram feed grid preview showing nine cohesive brand photos with consistent editorial style"
          width={1536}
          height={2752}
          sizes="(max-width: 700px) 100vw, 640px"
          className="sg-feed-img"
        />
      </div>
      <figcaption className="sg-feed-cap">This is what a cohesive feed looks like when your visuals follow one strategy.</figcaption>
    </figure>
  )
}

function SevenDayChallenge() {
  const [completedDays, setCompletedDays] = useState<Set<number>>(() => new Set())

  return (
    <section className="sg-challenge" aria-label="7-day challenge tracker">
      <div className="sg-challenge-grid">
        {SEVEN_DAY_CHALLENGE_DAYS.map((item, index) => {
          const dayNumber = index + 1
          const isComplete = completedDays.has(dayNumber)
          return (
            <button
              key={item.day}
              type="button"
              className={`sg-challenge-card${isComplete ? " is-done" : ""}`}
              onClick={() => {
                setCompletedDays((prev) => {
                  const next = new Set(prev)
                  if (next.has(dayNumber)) next.delete(dayNumber)
                  else next.add(dayNumber)
                  return next
                })
              }}
              aria-pressed={isComplete}
              aria-label={`Mark ${item.day} as ${isComplete ? "incomplete" : "complete"}`}
            >
              <span className="sg-challenge-day">{isComplete ? "✓ " : ""}{item.day}</span>
              <h4 className={`sg-challenge-title ${cormorant.className}`}>{item.title}</h4>
              <p className="sg-challenge-copy">{item.description}</p>
            </button>
          )
        })}
      </div>
    </section>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SelfieGuideExperienceProps {
  firstName: string
  guideMarkdown: string
}

export default function SelfieGuideExperience({ firstName, guideMarkdown }: SelfieGuideExperienceProps) {
  const chapters = useMemo(() => {
    const parsed = parseSelfieGuideChapters(guideMarkdown)
    if (parsed.length > 0) return parsed
    return [{ id: "guide-1", title: "Guide", markdown: guideMarkdown }] satisfies SelfieGuideChapter[]
  }, [guideMarkdown])

  const [activeChapterIndex, setActiveChapterIndex] = useState(0)
  const [checkedChecklistItems, setCheckedChecklistItems] = useState<Set<string>>(() => new Set())
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const currentChapter = chapters[Math.min(activeChapterIndex, Math.max(chapters.length - 1, 0))]
  const progressPercent = chapters.length > 1 ? Math.round(((activeChapterIndex + 1) / chapters.length) * 100) : 100
  const showSevenDayChallenge = /7[-\s]?day|challenge/i.test(currentChapter.title)

  useEffect(() => {
    const hash = window.location.hash.replace("#", "")
    if (!hash) return
    const index = chapters.findIndex((ch) => ch.id === hash)
    if (index >= 0) setActiveChapterIndex(index)
  }, [chapters])

  useEffect(() => {
    const target = chapters[activeChapterIndex]
    if (!target) return
    window.history.replaceState(null, "", `#${target.id}`)
  }, [activeChapterIndex, chapters])

  function goToChapter(index: number) {
    setActiveChapterIndex(index)
    setSidebarOpen(false)
    contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const markdownComponents = useMemo<Components>(
    () => ({
      h1: ({ children }) => <h1 className={`sg-ph1 ${cormorant.className}`}>{children}</h1>,
      h2: ({ children }) => <h2 className={`sg-ph2 ${cormorant.className}`}>{children}</h2>,
      h3: ({ children }) => <h3 className="sg-ph3">{children}</h3>,
      p: ({ children }) => {
        const text = getPlainText(children).replace(/\s+/g, " ").trim()
        const imageMarker = extractImageMarker(text)
        if (!imageMarker) return <p className="sg-pp">{children}</p>
        if (imageMarker === "feed-post-1.png") return <MayaGallery />
        if (imageMarker === "img-editorial-dark.png") return <FeedPreview />
        const spec = VISUAL_LIBRARY[imageMarker]
        if (!spec) return (
          <figure className="sg-teach">
            <div className="sg-teach-label">VISUAL SECTION</div>
            <div className="sg-teach-placeholder"><span>Visual coming soon</span></div>
          </figure>
        )
        if (!spec.src || !spec.alt) return (
          <figure className="sg-teach">
            <div className="sg-teach-label">{spec.label}</div>
            <div className="sg-teach-placeholder"><span>{spec.caption}</span></div>
          </figure>
        )
        const isGrid = /comparison|grid|pose/i.test(imageMarker)
        return (
          <figure className="sg-teach">
            <div className="sg-teach-label">{spec.label}</div>
            <div className="sg-teach-img-wrap">
              <Image src={spec.src} alt={spec.alt} width={1200} height={isGrid ? 1200 : 800} sizes="(max-width: 700px) 100vw, 860px" className="sg-teach-img" />
            </div>
            <figcaption className="sg-teach-cap">{spec.caption}</figcaption>
          </figure>
        )
      },
      ul: ({ children }) => <ul className="sg-ul">{children}</ul>,
      ol: ({ children }) => <ol className="sg-ol">{children}</ol>,
      li: ({ children }) => {
        const plainText = getPlainText(children)
        const checklistText = parseChecklistItem(plainText)
        if (!checklistText) return <li className="sg-li">{children}</li>
        const isChecked = checkedChecklistItems.has(checklistText)
        return (
          <li className={`sg-li sg-check-li${isChecked ? " is-done" : ""}`}>
            <button
              type="button"
              className="sg-check-btn"
              onClick={() => setCheckedChecklistItems((prev) => {
                const next = new Set(prev)
                if (next.has(checklistText)) next.delete(checklistText)
                else next.add(checklistText)
                return next
              })}
              aria-pressed={isChecked}
              aria-label={`Mark "${checklistText}" as ${isChecked ? "incomplete" : "complete"}`}
            >
              <span className={`sg-check-box${isChecked ? " is-done" : ""}`} aria-hidden />
              <span className={`sg-check-label${isChecked ? " is-done" : ""}`}>{checklistText}</span>
            </button>
          </li>
        )
      },
      blockquote: ({ children }) => <blockquote className="sg-quote">{children}</blockquote>,
      hr: () => <hr className="sg-hr" />,
      a: ({ href, children }) => <a href={href || "#"} className="sg-link">{children}</a>,
    }),
    [checkedChecklistItems],
  )

  return (
    <div className={`sg ${inter.className}`}>

      {/* ── Mobile header ── */}
      <header className="sg-mob-header">
        <a href="https://sselfie.ai" className={`sg-mob-logo ${cormorant.className}`}>SSELFIE</a>
        <button
          type="button"
          className="sg-hamburger"
          onClick={() => setSidebarOpen((v) => !v)}
          aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={sidebarOpen}
        >
          <span className={`sg-ham-line${sidebarOpen ? " is-open" : ""}`} />
          <span className={`sg-ham-line${sidebarOpen ? " is-open" : ""}`} />
          <span className={`sg-ham-line${sidebarOpen ? " is-open" : ""}`} />
        </button>
      </header>

      {/* ── Sidebar ── */}
      <aside className={`sg-sidebar${sidebarOpen ? " is-open" : ""}`} aria-label="Guide navigation">
        <div className="sg-sidebar-top">
          <a href="https://sselfie.ai" className={`sg-sidebar-logo ${cormorant.className}`}>SSELFIE</a>
          <p className="sg-sidebar-label">INTERACTIVE SELFIE GUIDE</p>
        </div>

        <div className="sg-sidebar-progress">
          <p className={`sg-for ${cormorant.className}`}>{firstName}</p>
          <div className="sg-prog-track" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100}>
            <div className="sg-prog-fill" style={{ width: `${progressPercent}%` }} />
          </div>
          <span className="sg-prog-label">CHAPTER {activeChapterIndex + 1} OF {chapters.length}</span>
        </div>

        <nav className="sg-chapter-nav" aria-label="Chapters">
          {chapters.map((chapter, index) => (
            <button
              key={chapter.id}
              type="button"
              className={`sg-ch-btn${index === activeChapterIndex ? " is-active" : ""}`}
              onClick={() => goToChapter(index)}
            >
              <span className="sg-ch-num">{String(index + 1).padStart(2, "0")}</span>
              <span className="sg-ch-name">{normalizeChapterTitle(chapter.title)}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Sidebar overlay (mobile) ── */}
      {sidebarOpen && (
        <div className="sg-overlay" onClick={() => setSidebarOpen(false)} aria-hidden />
      )}

      {/* ── Main ── */}
      <main className="sg-main">

        {/* Hero */}
        <section className="sg-hero" aria-label="Guide hero">
          <div className="sg-hero-bg">
            <Image
              src="/images/selfie-guide/img-editorial-dark.png"
              alt="Sandra in editorial portrait"
              fill
              priority
              sizes="100vw"
              className="sg-hero-img"
            />
          </div>
          <div className="sg-hero-overlay" />
          <div className="sg-hero-content">
            <p className="sg-eyebrow">Selfie Guide · 2026 Edition</p>
            <h1 className={`sg-hero-title ${cormorant.className}`}>
              One Good Selfie<br />Can Build Your Brand
            </h1>
            <p className={`sg-hero-for ${cormorant.className}`}>Built for {firstName}</p>
            <button
              type="button"
              className="sg-hero-cta"
              onClick={() => contentRef.current?.scrollIntoView({ behavior: "smooth" })}
            >
              START READING
            </button>
          </div>
        </section>

        {/* Chapter content */}
        <div className="sg-content" ref={contentRef} id="chapters">
          <div className="sg-chapter-head">
            <span className="sg-eyebrow">NOW READING</span>
            <h2 className={`sg-chapter-title ${cormorant.className}`}>
              {normalizeChapterTitle(currentChapter.title)}
            </h2>
          </div>

          <div className="sg-prose">
            <ReactMarkdown components={markdownComponents}>{currentChapter.markdown}</ReactMarkdown>
            {showSevenDayChallenge ? <SevenDayChallenge /> : null}
          </div>

          <div className="sg-nav-btns">
            <button
              type="button"
              className="sg-nav-btn"
              disabled={activeChapterIndex === 0}
              onClick={() => goToChapter(Math.max(activeChapterIndex - 1, 0))}
            >
              ← PREVIOUS
            </button>
            <button
              type="button"
              className="sg-nav-btn is-next"
              onClick={() => goToChapter(Math.min(activeChapterIndex + 1, chapters.length - 1))}
            >
              {activeChapterIndex === chapters.length - 1 ? "FINISH GUIDE" : "NEXT →"}
            </button>
          </div>
        </div>

        {/* Funnel */}
        <section className="sg-funnel">
          <p className="sg-eyebrow">WHAT'S NEXT</p>
          <h3 className={`sg-funnel-title ${cormorant.className}`}>A Great Selfie Is Just The Beginning</h3>
          <p className="sg-funnel-copy">
            Here's the thing. You've got the selfie. Now you need a system.
          </p>
          <p className="sg-funnel-copy">
            The women I see actually building audiences aren't winging it. They know who they're talking to, what to say, and how to turn one photo into a week of content that sounds like them — not like they're trying too hard.
          </p>
          <p className="sg-funnel-copy sg-funnel-copy--strong">
            That's what the €17 Brand Strategy gives you.
          </p>
          <div className="sg-funnel-ctas">
            <Link href="/brand-strategy" className="sg-cta-primary">Get the €17 Brand Strategy</Link>
            <Link href="/checkout/membership" className="sg-cta-ghost">Join Studio Membership</Link>
          </div>
        </section>

      </main>

      <style jsx global>{`
        html, body { background: #0d0c0b; }
      `}</style>

      <style jsx global>{`
        /* ── Tokens ── */
        .sg {
          --bg: #0d0c0b;
          --surface: #181714;
          --border: rgba(195, 190, 182, 0.16);
          --text: #f0ede8;
          --muted: #8a8780;
          --stone: #a8a49c;
          --pale: #c8c4bb;
          --sidebar-w: 260px;
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
        }

        /* ── Mobile header ── */
        .sg-mob-header {
          display: none;
          position: fixed;
          top: 0; left: 0; right: 0;
          z-index: 100;
          height: 56px;
          padding: 0 20px;
          align-items: center;
          justify-content: space-between;
          background: rgba(13,12,11,0.92);
          border-bottom: 1px solid var(--border);
          backdrop-filter: blur(20px);
        }
        .sg-mob-logo {
          color: var(--text);
          text-decoration: none;
          letter-spacing: 0.3em;
          font-size: 15px;
          text-transform: uppercase;
        }
        .sg-hamburger {
          display: flex;
          flex-direction: column;
          gap: 5px;
          padding: 6px;
          background: transparent;
          border: 0;
          cursor: pointer;
        }
        .sg-ham-line {
          display: block;
          width: 22px;
          height: 1px;
          background: var(--pale);
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .sg-ham-line.is-open:nth-child(1) { transform: translateY(6px) rotate(45deg); }
        .sg-ham-line.is-open:nth-child(2) { opacity: 0; }
        .sg-ham-line.is-open:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }

        /* ── Sidebar ── */
        .sg-sidebar {
          position: fixed;
          top: 0; left: 0; bottom: 0;
          width: var(--sidebar-w);
          background: var(--surface);
          border-right: 1px solid var(--border);
          z-index: 80;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .sg-sidebar-top {
          padding: 28px 20px 16px;
          border-bottom: 1px solid var(--border);
        }
        .sg-sidebar-logo {
          color: var(--text);
          text-decoration: none;
          letter-spacing: 0.32em;
          font-size: 15px;
          text-transform: uppercase;
          display: block;
        }
        .sg-sidebar-label {
          margin: 8px 0 0;
          font-size: 9px;
          letter-spacing: 0.38em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .sg-sidebar-progress {
          padding: 20px;
          border-bottom: 1px solid var(--border);
        }
        .sg-for {
          margin: 0 0 14px;
          font-size: clamp(22px, 2vw, 28px);
          font-weight: 300;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          line-height: 1;
          color: var(--text);
        }
        .sg-prog-track {
          width: 100%;
          height: 2px;
          background: rgba(175, 170, 162, 0.2);
          border-radius: 999px;
          overflow: hidden;
        }
        .sg-prog-fill {
          height: 100%;
          background: var(--pale);
          border-radius: 999px;
          transition: width 0.4s ease;
        }
        .sg-prog-label {
          display: block;
          margin-top: 8px;
          font-size: 9px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .sg-chapter-nav {
          flex: 1;
          padding: 8px 10px 24px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .sg-ch-btn {
          display: flex;
          align-items: baseline;
          gap: 10px;
          padding: 9px 10px;
          text-align: left;
          background: transparent;
          border: 0;
          border-radius: 8px;
          cursor: pointer;
          width: 100%;
          transition: background 0.15s ease;
        }
        .sg-ch-btn:hover { background: rgba(195, 190, 182, 0.08); }
        .sg-ch-btn.is-active { background: rgba(195, 190, 182, 0.14); }
        .sg-ch-num {
          font-size: 9px;
          letter-spacing: 0.28em;
          color: var(--muted);
          flex-shrink: 0;
        }
        .sg-ch-name {
          font-size: 12px;
          color: var(--text);
          line-height: 1.4;
        }
        .sg-ch-btn.is-active .sg-ch-name { color: var(--pale); }

        /* ── Overlay ── */
        .sg-overlay {
          position: fixed;
          inset: 0;
          background: rgba(13,12,11,0.6);
          z-index: 70;
          backdrop-filter: blur(4px);
        }

        /* ── Main ── */
        .sg-main {
          margin-left: var(--sidebar-w);
          min-height: 100vh;
        }

        /* ── Hero ── */
        .sg-hero {
          position: relative;
          height: 100vh;
          min-height: 580px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }
        .sg-hero-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .sg-hero-img {
          object-fit: cover;
          object-position: center 15%;
        }
        .sg-hero-overlay {
          position: absolute;
          inset: 0;
          z-index: 1;
          background: linear-gradient(
            to bottom,
            rgba(13,12,11,0.0) 0%,
            rgba(13,12,11,0.15) 35%,
            rgba(13,12,11,0.7) 65%,
            rgba(13,12,11,0.97) 100%
          );
        }
        .sg-hero-content {
          position: relative;
          z-index: 2;
          padding: clamp(32px, 5vw, 64px) clamp(32px, 5vw, 72px);
          max-width: 820px;
        }
        .sg-eyebrow {
          margin: 0 0 16px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.42em;
          text-transform: uppercase;
          color: var(--stone);
        }
        .sg-hero-title {
          margin: 0;
          font-size: clamp(38px, 5.5vw, 72px);
          font-weight: 300;
          line-height: 1.02;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: var(--text);
        }
        .sg-hero-for {
          margin: 14px 0 0;
          font-size: clamp(16px, 2vw, 22px);
          font-weight: 300;
          font-style: italic;
          color: var(--stone);
          letter-spacing: 0.06em;
        }
        .sg-hero-cta {
          margin-top: 28px;
          display: inline-block;
          padding: 13px 22px;
          background: var(--pale);
          color: #0d0c0b;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          border: 0;
          border-radius: 999px;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }
        .sg-hero-cta:hover { opacity: 0.85; }

        /* ── Chapter content ── */
        .sg-content {
          padding: 60px clamp(28px, 5vw, 80px) 48px;
          max-width: 900px;
        }
        .sg-chapter-head {
          margin-bottom: 36px;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--border);
        }
        .sg-chapter-head .sg-eyebrow {
          margin-bottom: 12px;
        }
        .sg-chapter-title {
          margin: 0;
          font-size: clamp(32px, 4.5vw, 56px);
          font-weight: 300;
          line-height: 1.04;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          color: var(--text);
        }

        /* ── Prose ── */
        .sg-prose { max-width: 680px; }
        .sg-ph1 {
          margin: 0 0 20px;
          font-size: clamp(28px, 4vw, 48px);
          font-weight: 300;
          text-transform: uppercase;
          line-height: 1.05;
          color: var(--text);
        }
        .sg-ph2 {
          margin: 40px 0 16px;
          font-size: clamp(22px, 3vw, 36px);
          font-weight: 300;
          text-transform: uppercase;
          line-height: 1.08;
          color: var(--text);
        }
        .sg-ph3 {
          margin: 28px 0 10px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: var(--stone);
        }
        .sg-pp {
          margin: 0 0 14px;
          font-size: 15px;
          font-weight: 300;
          line-height: 1.9;
          color: rgba(240, 237, 232, 0.82);
        }
        .sg-pp strong { color: var(--text); font-weight: 400; }
        .sg-quote {
          margin: 28px 0;
          padding: 0 0 0 22px;
          border-left: 2px solid var(--pale);
        }
        .sg-quote .sg-pp {
          margin: 0;
          font-size: 17px;
          font-style: italic;
          line-height: 1.76;
          color: rgba(240, 237, 232, 0.92);
        }
        .sg-ul, .sg-ol {
          margin: 0;
          padding-left: 1.3rem;
          color: rgba(240, 237, 232, 0.8);
          line-height: 1.82;
          font-size: 15px;
          font-weight: 300;
        }
        .sg-li { margin: 4px 0; }
        .sg-check-li { list-style: none; margin: 8px 0; padding-left: 0; }
        .sg-check-btn {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          text-align: left;
          padding: 0;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
          font: inherit;
          width: 100%;
          line-height: 1.82;
        }
        .sg-check-box {
          width: 17px;
          height: 17px;
          margin-top: 3px;
          flex-shrink: 0;
          border: 1px solid rgba(195, 190, 182, 0.3);
          border-radius: 3px;
          position: relative;
          transition: background 0.18s ease, border-color 0.18s ease;
        }
        .sg-check-box::after {
          content: "";
          position: absolute;
          left: 5px; top: 2px;
          width: 4px; height: 8px;
          border-right: 1.5px solid #0d0c0b;
          border-bottom: 1.5px solid #0d0c0b;
          transform: rotate(45deg);
          opacity: 0;
          transition: opacity 0.18s ease;
        }
        .sg-check-box.is-done { background: var(--pale); border-color: var(--pale); }
        .sg-check-box.is-done::after { opacity: 1; }
        .sg-check-label { color: rgba(240, 237, 232, 0.84); }
        .sg-check-label.is-done { text-decoration: line-through; color: var(--muted); }
        .sg-hr { border: 0; border-top: 1px solid var(--border); margin: 32px 0; }
        .sg-link { color: var(--pale); text-underline-offset: 3px; }

        /* ── Teaching visuals ── */
        .sg-teach {
          margin: 28px 0;
          border: 1px solid var(--border);
          background: rgba(28, 27, 25, 0.6);
          border-radius: 4px;
          overflow: hidden;
        }
        .sg-teach-label {
          padding: 9px 14px;
          font-size: 9px;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: var(--muted);
          border-bottom: 1px solid var(--border);
        }
        .sg-teach-img-wrap { line-height: 0; }
        .sg-teach-img { width: 100%; height: auto; display: block; }
        .sg-teach-cap {
          padding: 10px 14px 12px;
          font-size: 13px;
          color: rgba(240, 237, 232, 0.65);
          line-height: 1.62;
        }
        .sg-teach-placeholder {
          padding: 28px 14px;
          color: var(--muted);
          font-size: 13px;
          line-height: 1.6;
        }

        /* ── Maya gallery ── */
        .sg-maya-gallery { margin: 28px 0; }
        .sg-maya-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .sg-visual-card {
          margin: 0;
          border: 1px solid var(--border);
          background: rgba(28, 27, 25, 0.55);
          border-radius: 4px;
          overflow: hidden;
        }
        .sg-visual-card:last-child { grid-column: span 2; }
        .sg-visual-img-wrap { line-height: 0; }
        .sg-visual-img { width: 100%; height: auto; display: block; }
        .sg-visual-cap {
          padding: 9px 12px 11px;
          font-size: 12px;
          color: rgba(240, 237, 232, 0.6);
          line-height: 1.5;
        }

        /* ── Feed preview ── */
        .sg-feed-preview { margin: 28px 0; }
        .sg-feed-img-wrap {
          border: 1px solid var(--border);
          padding: 6px;
          background: rgba(28, 27, 25, 0.55);
          border-radius: 4px;
        }
        .sg-feed-img { width: 100%; max-width: 600px; height: auto; display: block; margin: 0 auto; }
        .sg-feed-cap {
          margin-top: 10px;
          font-size: 13px;
          color: rgba(240, 237, 232, 0.6);
          font-style: italic;
          text-align: center;
          line-height: 1.6;
        }

        /* ── 7-day challenge ── */
        .sg-challenge {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid var(--border);
        }
        .sg-challenge-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        .sg-challenge-card {
          text-align: left;
          border: 1px solid var(--border);
          background: transparent;
          border-radius: 6px;
          padding: 14px 12px;
          cursor: pointer;
          color: var(--text);
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .sg-challenge-card:hover { border-color: rgba(195, 190, 182, 0.35); }
        .sg-challenge-card.is-done {
          border-color: rgba(200, 196, 187, 0.4);
          background: rgba(200, 196, 187, 0.08);
        }
        .sg-challenge-day {
          display: block;
          font-size: 9px;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 8px;
        }
        .sg-challenge-title {
          margin: 0 0 8px;
          font-size: 18px;
          font-weight: 300;
          line-height: 1.12;
          text-transform: uppercase;
          color: var(--text);
        }
        .sg-challenge-copy {
          margin: 0;
          font-size: 13px;
          color: rgba(240, 237, 232, 0.72);
          line-height: 1.65;
        }

        /* ── Chapter nav buttons ── */
        .sg-nav-btns {
          display: flex;
          gap: 10px;
          margin-top: 48px;
          padding-top: 28px;
          border-top: 1px solid var(--border);
        }
        .sg-nav-btn {
          padding: 12px 20px;
          border: 1px solid rgba(195, 190, 182, 0.28);
          background: transparent;
          color: var(--text);
          font-size: 10px;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          border-radius: 999px;
          cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .sg-nav-btn:hover { border-color: rgba(195, 190, 182, 0.5); background: rgba(195, 190, 182, 0.06); }
        .sg-nav-btn:disabled { opacity: 0.35; cursor: default; }
        .sg-nav-btn.is-next { background: var(--pale); border-color: var(--pale); color: #0d0c0b; }
        .sg-nav-btn.is-next:hover { opacity: 0.88; }

        /* ── Funnel ── */
        .sg-funnel {
          padding: 48px clamp(28px, 5vw, 80px) 80px;
          border-top: 1px solid var(--border);
          max-width: 900px;
        }
        .sg-funnel .sg-eyebrow { margin-bottom: 14px; }
        .sg-funnel-title {
          margin: 0 0 16px;
          font-size: clamp(26px, 3.5vw, 44px);
          font-weight: 300;
          text-transform: uppercase;
          line-height: 1.06;
          color: var(--text);
        }
        .sg-funnel-copy {
          margin: 0 0 16px;
          font-size: 15px;
          font-weight: 300;
          line-height: 1.9;
          color: rgba(240, 237, 232, 0.78);
          max-width: 540px;
        }
        .sg-funnel-copy--strong {
          color: var(--text);
          font-weight: 400;
          margin-bottom: 28px;
        }
        .sg-funnel-ctas {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .sg-cta-primary, .sg-cta-ghost {
          padding: 12px 18px;
          border-radius: 999px;
          text-decoration: none;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          transition: opacity 0.2s ease;
        }
        .sg-cta-primary { background: var(--pale); color: #0d0c0b; }
        .sg-cta-primary:hover { opacity: 0.85; }
        .sg-cta-ghost { border: 1px solid rgba(195, 190, 182, 0.3); color: var(--text); }
        .sg-cta-ghost:hover { border-color: rgba(195, 190, 182, 0.55); }

        /* ── Responsive ── */
        @media (max-width: 1100px) {
          .sg-challenge-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 900px) {
          .sg-sidebar {
            transform: translateX(-100%);
            transition: transform 0.26s cubic-bezier(.4,0,.2,1);
          }
          .sg-sidebar.is-open { transform: translateX(0); }
          .sg-mob-header { display: flex; }
          .sg-main { margin-left: 0; padding-top: 56px; }
          .sg-challenge-grid { grid-template-columns: repeat(2, 1fr); }
          .sg-maya-grid { grid-template-columns: repeat(2, 1fr); }
          .sg-visual-card:last-child { grid-column: 1 / -1; }
        }
        @media (max-width: 560px) {
          .sg-hero-content { padding: 28px 20px 32px; }
          .sg-content, .sg-funnel { padding-left: 20px; padding-right: 20px; }
          .sg-challenge-grid { grid-template-columns: 1fr; }
          .sg-nav-btns { flex-direction: column; }
          .sg-nav-btn { width: 100%; text-align: center; }
          .sg-funnel-ctas { flex-direction: column; }
          .sg-cta-primary, .sg-cta-ghost { width: 100%; text-align: center; }
        }
      `}</style>
    </div>
  )
}
