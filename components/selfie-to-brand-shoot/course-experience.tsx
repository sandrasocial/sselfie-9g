"use client"

/**
 * Personalization + progress layer for the Selfie to Brand Shoot course.
 *
 * Everything here is client-side so the course feels like it knows the learner:
 *  - "Continue where you left off, {name}" resume hero
 *  - a thin progress bar + completion checkmarks
 *  - one open module at a time (calm progressive disclosure)
 *  - a recap that resurfaces the learner's own saved Signature Visual World
 *
 * Progress is stored in localStorage (no backend needed). The saved visual world
 * is read from the existing /api/selfie-to-brand-shoot/visual-code endpoint so a
 * learner's Module 2 answers reappear in Modules 3-5.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import type { CourseBrandStrategy } from "@/lib/selfie-to-brand-shoot/brand-strategy"

const STORAGE_KEY = "sbs:progress:v1"

export type CourseModuleMeta = {
  number: number
  title: string
  outcome: string
}

type ProgressState = {
  completed: number[]
  total: number
}

type CourseContextValue = {
  hydrated: boolean
  total: number
  completed: Set<number>
  openModule: number
  firstName: string | null
  modules: CourseModuleMeta[]
  completedCount: number
  percent: number
  nextModule: CourseModuleMeta | null
  isComplete: (n: number) => boolean
  setOpenModule: (n: number) => void
  goToModule: (n: number) => void
  markComplete: (n: number, next?: number) => void
  reopen: (n: number) => void
  // Step 0 gate
  locked: boolean
  hasBrandStrategy: boolean
  brandStrategyHref: string
}

const CourseContext = createContext<CourseContextValue | null>(null)

function useCourse() {
  const ctx = useContext(CourseContext)
  if (!ctx) throw new Error("Course components must be used inside CourseExperienceProvider")
  return ctx
}

function readStored(): number[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ProgressState
    if (Array.isArray(parsed?.completed)) {
      return parsed.completed.filter(n => typeof n === "number")
    }
  } catch {
    /* ignore */
  }
  return []
}

function scrollToModule(n: number) {
  if (typeof document === "undefined") return
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const el = document.getElementById(`module-${n}`)
      el?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  })
}

export function CourseExperienceProvider({
  firstName = null,
  modules,
  hasBrandStrategy = true,
  brandStrategyHref = "/academy/access/brand-strategy",
  children,
}: {
  firstName?: string | null
  modules: CourseModuleMeta[]
  hasBrandStrategy?: boolean
  brandStrategyHref?: string
  children: ReactNode
}) {
  const total = modules.length
  const locked = !hasBrandStrategy
  const [hydrated, setHydrated] = useState(false)
  const [completed, setCompleted] = useState<Set<number>>(new Set())
  // Module 1 is open on first paint (matches SSR) so content is visible without JS.
  const [openModule, setOpenModuleState] = useState(1)

  // Hydrate from localStorage and land the learner on their first incomplete module.
  useEffect(() => {
    const stored = readStored()
    const set = new Set(stored)
    setCompleted(set)
    let next = modules.find(m => !set.has(m.number))?.number
    if (!next) next = modules[modules.length - 1]?.number ?? 1
    setOpenModuleState(next)
    setHydrated(true)
  }, [modules])

  const persist = useCallback(
    (set: Set<number>) => {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ completed: Array.from(set).sort((a, b) => a - b), total })
        )
      } catch {
        /* ignore */
      }
    },
    [total]
  )

  const setOpenModule = useCallback((n: number) => setOpenModuleState(n), [])

  const goToModule = useCallback(
    (n: number) => {
      setOpenModuleState(n)
      scrollToModule(n)
    },
    []
  )

  const markComplete = useCallback(
    (n: number, next?: number) => {
      setCompleted(prev => {
        const set = new Set(prev)
        set.add(n)
        persist(set)
        return set
      })
      if (next) {
        setOpenModuleState(next)
        scrollToModule(next)
      }
    },
    [persist]
  )

  const reopen = useCallback((n: number) => {
    setCompleted(prev => {
      const set = new Set(prev)
      set.delete(n)
      persist(set)
      return set
    })
    setOpenModuleState(n)
  }, [persist])

  // Delegated handler: any in-page anchor that lands inside a collapsed module
  // should open that module first, then smooth-scroll to the target.
  const openRef = useRef(setOpenModuleState)
  openRef.current = setOpenModuleState
  useEffect(() => {
    function onClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null
      const anchor = target?.closest('a[href^="#"]') as HTMLAnchorElement | null
      if (!anchor) return
      const id = anchor.getAttribute("href")?.slice(1)
      if (!id) return
      const dest = document.getElementById(id)
      if (!dest) return
      const panel = dest.closest("[data-module-panel]") as HTMLElement | null
      if (panel) {
        const num = Number(panel.getAttribute("data-module-number"))
        if (num) openRef.current(num)
      }
      event.preventDefault()
      requestAnimationFrame(() => {
        requestAnimationFrame(() =>
          dest.scrollIntoView({ behavior: "smooth", block: "start" })
        )
      })
    }
    document.addEventListener("click", onClick)
    return () => document.removeEventListener("click", onClick)
  }, [])

  const completedCount = completed.size
  const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0
  const nextModule = useMemo(
    () => modules.find(m => !completed.has(m.number)) ?? null,
    [modules, completed]
  )

  const value: CourseContextValue = {
    hydrated,
    total,
    completed,
    openModule,
    firstName,
    modules,
    completedCount,
    percent,
    nextModule,
    isComplete: (n: number) => completed.has(n),
    setOpenModule,
    goToModule,
    markComplete,
    reopen,
    locked,
    hasBrandStrategy,
    brandStrategyHref,
  }

  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>
}

/* ---------------------------------- Hero --------------------------------- */

export function ResumeHero({ serifClass }: { serifClass: string }) {
  const {
    hydrated,
    firstName,
    percent,
    completedCount,
    total,
    nextModule,
    goToModule,
    locked,
    brandStrategyHref,
  } = useCourse()

  const allDone = hydrated && completedCount >= total
  const started = hydrated && completedCount > 0

  // Locked: the only next step is finishing the Brand Strategy (Step 0).
  if (locked) {
    const hi = firstName ? `First, ${firstName}.` : "First things first."
    return (
      <div className="sbs2-resume">
        <p className="sbs2-eyebrow">STEP 0 · YOUR BRAND STRATEGY</p>
        <h2 className={`sbs2-resume-title ${serifClass}`}>{hi}</h2>
        <p className="sbs2-resume-sub">
          Build your brand strategy before the course. It tells Maya who you help, what you
          stand for, and how you sound, so every look, prompt, and post is built around you.
        </p>
        <div className="sbs2-progress" aria-label="Course progress">
          <div className="sbs2-progress-head">
            <span>Progress</span>
            <strong>Step 0 of {total + 1}</strong>
          </div>
          <div className="sbs2-progress-track" aria-hidden="true">
            <span style={{ width: "0%" }} />
          </div>
        </div>
        <a href={brandStrategyHref} className="sbs2-btn sbs2-btn-primary">
          Build my brand strategy
        </a>
      </div>
    )
  }

  let eyebrow = "YOUR COURSE"
  let actionLabel = "Start Module 1"
  if (allDone) {
    eyebrow = "COURSE COMPLETE"
    actionLabel = "Revisit Module 1"
  } else if (started) {
    eyebrow = "CONTINUE WHERE YOU LEFT OFF"
    actionLabel = nextModule ? `Continue: Module ${pad(nextModule.number)}` : "Continue"
  }

  const greeting = firstName
    ? allDone
      ? `You did it, ${firstName}.`
      : started
        ? `Welcome back, ${firstName}.`
        : `Let's begin, ${firstName}.`
    : allDone
      ? "You did it."
      : started
        ? "Welcome back."
        : "Let's begin."

  return (
    <div className="sbs2-resume">
      <p className="sbs2-eyebrow">{eyebrow}</p>
      <h2 className={`sbs2-resume-title ${serifClass}`}>{greeting}</h2>
      <p className="sbs2-resume-sub">
        {allDone
          ? "Every step is done. Your brand shoot is ready to become content."
          : nextModule
            ? `Next up: ${nextModule.title}.`
            : "Turn one selfie into an elevated AI brand shoot, one calm step at a time."}
      </p>

      <div className="sbs2-progress" aria-label="Course progress">
        <div className="sbs2-progress-head">
          <span>Progress</span>
          <strong>
            {hydrated ? `${completedCount} of ${total} complete` : `${total} modules`}
          </strong>
        </div>
        <div className="sbs2-progress-track" aria-hidden="true">
          <span style={{ width: `${hydrated ? percent : 0}%` }} />
        </div>
      </div>

      <button
        type="button"
        className="sbs2-btn sbs2-btn-primary"
        onClick={() => goToModule(nextModule?.number ?? 1)}
      >
        {actionLabel}
      </button>
    </div>
  )
}

/* ------------------------------- Path map -------------------------------- */

export function CoursePathMap() {
  const { modules, isComplete, nextModule, goToModule, hydrated, locked, hasBrandStrategy, brandStrategyHref } =
    useCourse()
  return (
    <ol className="sbs2-path">
      {/* Step 0 — Brand Strategy (server truth, not localStorage) */}
      <li>
        <a
          href={hasBrandStrategy ? "#step-0" : brandStrategyHref}
          className={`sbs2-path-card${hasBrandStrategy ? " is-done" : " is-current"}`}
        >
          <span className="sbs2-path-num">{hasBrandStrategy ? <Check /> : "0"}</span>
          <span className="sbs2-path-copy">
            <strong>Your Brand Strategy</strong>
            <small>The foundation that personalizes everything. Included in your course.</small>
          </span>
          <span className="sbs2-path-status">{hasBrandStrategy ? "Done" : "Start here"}</span>
        </a>
      </li>
      {modules.map(module => {
        const done = !locked && hydrated && isComplete(module.number)
        const current = !locked && hydrated && !done && nextModule?.number === module.number
        return (
          <li key={module.number}>
            <button
              type="button"
              className={`sbs2-path-card${done ? " is-done" : ""}${current ? " is-current" : ""}${locked ? " is-locked" : ""}`}
              onClick={() => (locked ? undefined : goToModule(module.number))}
              aria-disabled={locked}
            >
              <span className="sbs2-path-num">
                {done ? <Check /> : locked ? <Lock /> : pad(module.number)}
              </span>
              <span className="sbs2-path-copy">
                <strong>{module.title}</strong>
                <small>{module.outcome}</small>
              </span>
              <span className="sbs2-path-status">
                {locked ? "Locked" : done ? "Done" : current ? "Start here" : "Open"}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

/* ----------------------------- Module panel ------------------------------ */

export function ModulePanel({
  number,
  eyebrow,
  title,
  outcome,
  time,
  image,
  imagePosition = "center",
  children,
  next,
  nextLabel,
  serifClass,
}: {
  number: number
  eyebrow: string
  title: string
  outcome: string
  time: string
  image?: ReactNode
  imagePosition?: string
  children: ReactNode
  next?: { number: number; title: string } | null
  nextLabel?: string
  serifClass: string
}) {
  const {
    openModule,
    setOpenModule,
    isComplete,
    markComplete,
    hydrated,
    locked,
    brandStrategyHref,
  } = useCourse()
  const open = !locked && openModule === number
  const done = !locked && hydrated && isComplete(number)

  if (locked) {
    return (
      <section
        id={`module-${number}`}
        className="sbs2-module is-locked"
        data-module-panel=""
        data-module-number={number}
        aria-label={`Module ${pad(number)}: ${title} (locked)`}
      >
        <div className="sbs2-module-head is-locked">
          <span className="sbs2-module-num">
            <Lock />
          </span>
          <span className="sbs2-module-headcopy">
            <span className="sbs2-eyebrow">{eyebrow}</span>
            <span className={`sbs2-module-title ${serifClass}`}>{title}</span>
            <span className="sbs2-module-outcome">{outcome}</span>
          </span>
          <span className="sbs2-module-meta">
            <a href={brandStrategyHref} className="sbs2-module-unlock">
              Unlock
            </a>
          </span>
        </div>
      </section>
    )
  }

  return (
    <section
      id={`module-${number}`}
      className={`sbs2-module${open ? " is-open" : ""}${done ? " is-done" : ""}`}
      data-module-panel=""
      data-module-number={number}
      aria-label={`Module ${pad(number)}: ${title}`}
    >
      <button
        type="button"
        className="sbs2-module-head"
        aria-expanded={open}
        onClick={() => setOpenModule(open ? -1 : number)}
      >
        <span className="sbs2-module-num">{done ? <Check /> : pad(number)}</span>
        <span className="sbs2-module-headcopy">
          <span className="sbs2-eyebrow">
            {eyebrow}
            {done ? " · Completed" : ""}
          </span>
          <span className={`sbs2-module-title ${serifClass}`}>{title}</span>
          <span className="sbs2-module-outcome">{outcome}</span>
        </span>
        <span className="sbs2-module-meta">
          <span className="sbs2-module-time">{time}</span>
          <span className="sbs2-module-caret" aria-hidden="true" />
        </span>
      </button>

      {open ? (
        <div className="sbs2-module-body">
          {image ? (
            <div
              className="sbs2-module-cover"
              style={{ ["--cover-pos" as string]: imagePosition }}
            >
              {image}
            </div>
          ) : null}

          <div className="sbs2-module-content">{children}</div>

          <div className="sbs2-module-foot">
            <button
              type="button"
              className="sbs2-btn sbs2-btn-primary"
              onClick={() => markComplete(number, next?.number)}
            >
              {nextLabel ?? (next ? "Mark complete & continue" : "Mark course complete")}
            </button>
            {next ? (
              <span className="sbs2-foot-next">
                Next: <strong>{next.title}</strong>
              </span>
            ) : (
              <span className="sbs2-foot-next">You&apos;ve reached the final step.</span>
            )}
          </div>
        </div>
      ) : (
        <div className="sbs2-module-collapsed">
          <span>{done ? "Completed" : outcome}</span>
          <span className="sbs2-module-open-hint">{done ? "Reopen" : "Open module"}</span>
        </div>
      )}
    </section>
  )
}

/* ------------------------- Block (inline lesson) ------------------------- */

export function Block({
  id,
  eyebrow,
  title,
  children,
  serifClass,
}: {
  id?: string
  eyebrow: string
  title: string
  children: ReactNode
  serifClass: string
}) {
  return (
    <section id={id} className="sbs2-block">
      <div className="sbs2-block-head">
        <p className="sbs2-eyebrow">{eyebrow}</p>
        <h3 className={`sbs2-block-title ${serifClass}`}>{title}</h3>
      </div>
      <div className="sbs2-block-body">{children}</div>
    </section>
  )
}

/* ------------------------- Signature world recap ------------------------- */

type SavedVisualCode = {
  signatureVisualWorld?: string
  mainColors?: string
  lighting?: string
  desiredFeeling?: string
}

export function SignatureWorldRecap({ serifClass }: { serifClass: string }) {
  const [code, setCode] = useState<SavedVisualCode | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/selfie-to-brand-shoot/visual-code")
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled) return
        if (data?.visualCode) setCode(data.visualCode as SavedVisualCode)
        setLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!loaded) return null

  const world = code?.signatureVisualWorld?.trim()

  if (!world) {
    return (
      <div className="sbs2-recap sbs2-recap-empty">
        <p className="sbs2-eyebrow">YOUR LOOK</p>
        <p>
          You haven&apos;t chosen your look yet. Pick one in Module 2 and it will appear here, so
          every shoot stays in the same look.
        </p>
        <a href="#module-2" className="sbs2-text-link">
          Choose your look
        </a>
      </div>
    )
  }

  const details = [
    code?.mainColors?.trim() ? { label: "Colors", value: code.mainColors.trim() } : null,
    code?.lighting?.trim() ? { label: "Lighting", value: code.lighting.trim() } : null,
    code?.desiredFeeling?.trim() ? { label: "Feeling", value: code.desiredFeeling.trim() } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>

  return (
    <div className="sbs2-recap">
      <p className="sbs2-eyebrow">YOUR SAVED LOOK</p>
      <p className={`sbs2-recap-world ${serifClass}`}>{world}</p>
      {details.length > 0 ? (
        <dl className="sbs2-recap-grid">
          {details.map(detail => (
            <div key={detail.label}>
              <dt>{detail.label}</dt>
              <dd>{detail.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <p className="sbs2-recap-note">Keep every image in this look before you try another one.</p>
    </div>
  )
}

/* ------------------------------- Look picker ----------------------------- */

export type LookCode = {
  signatureVisualWorld: string
  mainColors: string
  lighting: string
  wardrobeDirection: string
  backgroundWorld: string
  emotionalSignal: string
  desiredFeeling: string
  repeatRules: string
  avoidRules: string
  firstShootDirection: string
}

export type LookOption = {
  name: string
  swatches: string[]
  feeling: string
  chooseIf: string
  hero: string
  code: LookCode
}

const FINE_TUNE_FIELDS: Array<{ key: keyof LookCode; label: string }> = [
  { key: "signatureVisualWorld", label: "Look name" },
  { key: "mainColors", label: "Colors" },
  { key: "lighting", label: "Lighting" },
  { key: "wardrobeDirection", label: "Wardrobe" },
  { key: "backgroundWorld", label: "Backgrounds" },
  { key: "emotionalSignal", label: "Signal" },
  { key: "desiredFeeling", label: "What people feel" },
  { key: "repeatRules", label: "What I repeat" },
  { key: "avoidRules", label: "What I avoid" },
  { key: "firstShootDirection", label: "First shoot idea" },
]

export function LookPicker({
  options,
  serifClass,
}: {
  options: LookOption[]
  serifClass: string
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [code, setCode] = useState<LookCode | null>(null)
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [tuning, setTuning] = useState(false)

  // Preselect from a previously saved look.
  useEffect(() => {
    let cancelled = false
    fetch("/api/selfie-to-brand-shoot/visual-code")
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled || !data?.visualCode) return
        const saved = data.visualCode as Partial<LookCode>
        const name = saved.signatureVisualWorld?.trim()
        if (name) {
          setSelected(name)
          setCode({ ...emptyLookCode, ...saved } as LookCode)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  async function save(next: LookCode, pickedName: string) {
    setSelected(pickedName)
    setCode(next)
    setStatus("saving")
    try {
      const res = await fetch("/api/selfie-to-brand-shoot/visual-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visualCode: next }),
      })
      if (!res.ok) throw new Error()
      setStatus("saved")
      window.dispatchEvent(new CustomEvent("sbs:look-saved"))
    } catch {
      setStatus("error")
    }
  }

  function pick(option: LookOption) {
    save(option.code, option.name)
  }

  return (
    <div className="sbs2-lookpicker">
      <div className="sbs2-look-grid">
        {options.map(option => {
          const isOn = selected === option.name
          return (
            <button
              key={option.name}
              type="button"
              className={`sbs2-look-card${isOn ? " is-selected" : ""}`}
              aria-pressed={isOn}
              onClick={() => pick(option)}
            >
              <span className="sbs2-look-img">
                <img src={option.hero} alt={`${option.name} look`} loading="lazy" />
                <span className="sbs2-look-check" aria-hidden="true">
                  <Check />
                </span>
              </span>
              <span className="sbs2-look-body">
                <span className="sbs2-look-swatches" aria-hidden="true">
                  {option.swatches.map((hex, i) => (
                    <span key={`${option.name}-${i}`} style={{ background: hex }} />
                  ))}
                </span>
                <span className={`sbs2-look-name ${serifClass}`}>{option.name}</span>
                <span className="sbs2-look-feeling">{option.feeling}</span>
                <span className="sbs2-look-choose">
                  <em>Choose this if</em> {option.chooseIf}
                </span>
                <span className="sbs2-look-cta">{isOn ? "Your look ✓" : "Choose this look"}</span>
              </span>
            </button>
          )
        })}
      </div>

      {selected ? (
        <div className="sbs2-look-saved" aria-live="polite">
          <p>
            <strong>{selected}</strong> is your look.{" "}
            {status === "saving"
              ? "Saving…"
              : status === "error"
                ? "Could not save — try again."
                : "Saved. Maya uses this in Module 3."}
          </p>
          <button type="button" className="sbs2-text-link" onClick={() => setTuning(t => !t)}>
            {tuning ? "Hide fine-tune" : "Fine-tune your look"}
          </button>
        </div>
      ) : (
        <p className="sbs2-look-hint">Tap a look to make it yours. You can fine-tune it after.</p>
      )}

      {tuning && code ? (
        <div className="sbs2-look-tune">
          {FINE_TUNE_FIELDS.map(field => (
            <label key={field.key}>
              <span>{field.label}</span>
              <textarea
                rows={2}
                value={code[field.key] || ""}
                onChange={event =>
                  setCode(current =>
                    current ? { ...current, [field.key]: event.target.value } : current
                  )
                }
              />
            </label>
          ))}
          <div className="sbs2-look-tune-foot">
            <button
              type="button"
              className="sbs2-btn sbs2-btn-primary"
              onClick={() => code && save(code, code.signatureVisualWorld || selected || "")}
              disabled={status === "saving"}
            >
              {status === "saving" ? "Saving" : "Save changes"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const emptyLookCode: LookCode = {
  signatureVisualWorld: "",
  mainColors: "",
  lighting: "",
  wardrobeDirection: "",
  backgroundWorld: "",
  emotionalSignal: "",
  desiredFeeling: "",
  repeatRules: "",
  avoidRules: "",
  firstShootDirection: "",
}

/* ------------------------------- Step 0 gate ----------------------------- */

export function Step0Panel({
  brandStrategy,
  serifClass,
}: {
  brandStrategy: CourseBrandStrategy | null
  serifClass: string
}) {
  const { hasBrandStrategy, brandStrategyHref } = useCourse()

  if (!hasBrandStrategy || !brandStrategy) {
    return (
      <section id="step-0" className="sbs2-step0" data-module-panel="" data-module-number="0">
        <div className="sbs2-step0-head">
          <span className="sbs2-step0-num">0</span>
          <div>
            <p className="sbs2-eyebrow">STEP 0 · INCLUDED IN YOUR COURSE</p>
            <h2 className={`sbs2-step0-title ${serifClass}`}>Start with your brand strategy</h2>
          </div>
        </div>
        <p className="sbs2-step0-copy">
          This is the foundation. Your brand strategy tells the course who you help, what you want
          to be known for, and how you sound, so your look, your prompts, and your first week of
          content are all built around you, not a template. Finish it once and the whole course
          unlocks, personalized.
        </p>
        <ul className="sbs2-step0-list">
          <li>Who you help and what you want to be known for</li>
          <li>Your content pillars and positioning</li>
          <li>Your voice, so captions sound like you</li>
        </ul>
        <a href={brandStrategyHref} className="sbs2-btn sbs2-btn-primary">
          Build my brand strategy
        </a>
        <p className="sbs2-step0-note">It takes a few minutes. Then Modules 1 to 5 open up.</p>
      </section>
    )
  }

  const pillarNames = brandStrategy.pillars.map(p => p.name).filter(Boolean).slice(0, 4)
  const facts = [
    brandStrategy.targetAudience ? { label: "Who you help", value: brandStrategy.targetAudience } : null,
    brandStrategy.positioning[0] ? { label: "Your positioning", value: brandStrategy.positioning[0] } : null,
    brandStrategy.voice.tone ? { label: "Your voice", value: brandStrategy.voice.tone } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>

  return (
    <section id="step-0" className="sbs2-step0 is-done" data-module-panel="" data-module-number="0">
      <div className="sbs2-step0-head">
        <span className="sbs2-step0-num is-done">
          <Check />
        </span>
        <div>
          <p className="sbs2-eyebrow">STEP 0 · COMPLETE</p>
          <h2 className={`sbs2-step0-title ${serifClass}`}>Your brand strategy is set</h2>
        </div>
      </div>
      <p className="sbs2-step0-copy">
        The course is now built around this. Every look, prompt, and post below is tied to your
        strategy.
      </p>
      {facts.length > 0 ? (
        <dl className="sbs2-recap-grid">
          {facts.map(f => (
            <div key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {pillarNames.length > 0 ? (
        <div className="sbs2-step0-pillars">
          <span className="sbs2-eyebrow">YOUR CONTENT PILLARS</span>
          <div className="sbs2-pillar-chips">
            {pillarNames.map(name => (
              <span key={name}>{name}</span>
            ))}
          </div>
        </div>
      ) : null}
      <a href={brandStrategyHref} className="sbs2-text-link">
        View full strategy
      </a>
    </section>
  )
}

/* --------------------- Personalized content plan (Mod 5) ----------------- */

export function PersonalizedContentPlan({
  brandStrategy,
  serifClass,
}: {
  brandStrategy: CourseBrandStrategy | null
  serifClass: string
}) {
  const [lookName, setLookName] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () =>
      fetch("/api/selfie-to-brand-shoot/visual-code")
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (cancelled) return
          const name = data?.visualCode?.signatureVisualWorld?.trim()
          setLookName(name || null)
        })
        .catch(() => {})
    load()
    const onSaved = () => load()
    window.addEventListener("sbs:look-saved", onSaved)
    return () => {
      cancelled = true
      window.removeEventListener("sbs:look-saved", onSaved)
    }
  }, [])

  const lookAdj = lookName || "signature"
  const audience = brandStrategy?.targetAudience?.trim()
  const positioning = brandStrategy?.positioning?.[0]?.trim()
  const phrases = brandStrategy?.voice.phrases ?? []
  const starters = brandStrategy?.captionStarters ?? []
  const pillars = brandStrategy?.pillars ?? []

  // Build 7 days from the learner's real pillars when we have them, so the plan is
  // genuinely theirs — not a generic template.
  const days = buildSevenDays({ lookAdj, audience, positioning, pillars, starters, phrases })

  return (
    <div className="sbs2-plan">
      {brandStrategy ? (
        <p className="sbs2-plan-intro">
          Built from your brand strategy and your <strong>{lookAdj}</strong> look. Post these in
          order. Each one already knows who you help and how you sound.
        </p>
      ) : (
        <p className="sbs2-plan-intro">
          A 7-day plan for your <strong>{lookAdj}</strong> look. Finish your brand strategy to make
          every caption sound like you.
        </p>
      )}

      <ol className="sbs2-plan-days">
        {days.map((d, i) => (
          <li key={i} className="sbs2-plan-day">
            <div className="sbs2-plan-daytop">
              <span className="sbs2-plan-daynum">Day {i + 1}</span>
              <span className={`sbs2-plan-daytitle ${serifClass}`}>{d.title}</span>
              <span className="sbs2-plan-use">{d.use}</span>
            </div>
            <div className="sbs2-plan-caption">
              <span className="sbs2-eyebrow">Caption starter</span>
              <p>{d.caption}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

type PlanInput = {
  lookAdj: string
  audience?: string
  positioning?: string
  pillars: CourseBrandStrategy["pillars"]
  starters: string[]
  phrases: string[]
}

function buildSevenDays(input: PlanInput) {
  const { lookAdj, audience, positioning, pillars, starters, phrases } = input
  const who = audience ? `the ${audience.toLowerCase()}` : "the people you help"
  const voiceLine = phrases[0] || positioning || ""

  // Fixed spine (profile / story) plus pillar-driven days for the middle of the week.
  const spine = [
    {
      title: "Reintroduce yourself",
      use: `Lead with your clearest ${lookAdj} identity image.`,
      caption: positioning
        ? `New season, same mission. ${positioning} If we haven't met, here's what I do and who it's for.`
        : `New visual chapter. Here's who I am and who I help: ${who}.`,
    },
    {
      title: "The before/after story",
      use: `Share your source selfie and the ${lookAdj} result.`,
      caption: `I started with one normal selfie and built my ${lookAdj} look from it. ${
        voiceLine ? voiceLine : "The goal wasn't perfect. It was recognizable."
      }`,
    },
  ]

  const pillarDays = (pillars.length > 0 ? pillars : []).slice(0, 3).map((pillar, idx) => ({
    title: pillar.name,
    use: `A ${lookAdj} image that fits "${pillar.name}".${idx === 0 ? " Make it your strongest." : ""}`,
    caption:
      pillar.postIdeas[0]
        ? `${pillar.postIdeas[0]}${starters[idx] ? ` ${starters[idx]}` : ""}`
        : pillar.description ||
          `Teach one thing ${who} needs to hear about ${pillar.name.toLowerCase()}.`,
  }))

  // If no pillars, fall back to three solid, specific content days.
  const fallbackMiddle = [
    {
      title: "Teach one thing",
      use: `Use a ${lookAdj} image with room for a headline.`,
      caption:
        starters[0] ||
        `One thing I wish ${who} knew: you don't need a studio. You need one clear look you can repeat.`,
    },
    {
      title: "Show the work",
      use: `A lifestyle ${lookAdj} image (laptop, coffee, real life).`,
      caption: starters[1] || `Behind the scenes of how I actually do this, not the highlight reel.`,
    },
    {
      title: "Make the offer",
      use: `Your most confident ${lookAdj} image, one clear CTA.`,
      caption:
        starters[2] ||
        `If your photos feel random, start with one look you can repeat. When you're ready, here's your next step.`,
    },
  ]

  const middle = pillarDays.length >= 3 ? pillarDays : [...pillarDays, ...fallbackMiddle].slice(0, 3)

  const close = [
    {
      title: "The about-me post",
      use: `A softer, closer ${lookAdj} image.`,
      caption: positioning
        ? `The story behind why I do this. ${positioning} It took me longer than I'd admit to get here.`
        : `The story behind the woman these photos are starting to show. Here's what changed.`,
    },
    {
      title: "Feed refresh",
      use: `Place your top 3 ${lookAdj} images so the profile feels like one person.`,
      caption: `Your feed doesn't need to be perfect. It should feel like the same woman lives there. Mine finally does.`,
    },
  ]

  return [...spine, ...middle, ...close].slice(0, 7)
}

/* -------------------------------- helpers -------------------------------- */

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function Lock() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" fill="none">
      <rect x="3.2" y="7" width="9.6" height="6.4" rx="1.4" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.2 7V5.3a2.8 2.8 0 0 1 5.6 0V7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none">
      <path
        d="M3.5 8.5l3 3 6-7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
