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
  children,
}: {
  firstName?: string | null
  modules: CourseModuleMeta[]
  children: ReactNode
}) {
  const total = modules.length
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
  }

  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>
}

/* ---------------------------------- Hero --------------------------------- */

export function ResumeHero({ serifClass }: { serifClass: string }) {
  const { hydrated, firstName, percent, completedCount, total, nextModule, goToModule } = useCourse()

  const allDone = hydrated && completedCount >= total
  const started = hydrated && completedCount > 0

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
  const { modules, isComplete, nextModule, goToModule, hydrated } = useCourse()
  return (
    <ol className="sbs2-path">
      {modules.map(module => {
        const done = hydrated && isComplete(module.number)
        const current = hydrated && !done && nextModule?.number === module.number
        return (
          <li key={module.number}>
            <button
              type="button"
              className={`sbs2-path-card${done ? " is-done" : ""}${current ? " is-current" : ""}`}
              onClick={() => goToModule(module.number)}
            >
              <span className="sbs2-path-num">
                {done ? <Check /> : pad(module.number)}
              </span>
              <span className="sbs2-path-copy">
                <strong>{module.title}</strong>
                <small>{module.outcome}</small>
              </span>
              <span className="sbs2-path-status">
                {done ? "Done" : current ? "Start here" : "Open"}
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
  const { openModule, setOpenModule, isComplete, markComplete, hydrated } = useCourse()
  const open = openModule === number
  const done = hydrated && isComplete(number)

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
        <p className="sbs2-eyebrow">YOUR VISUAL WORLD</p>
        <p>
          You haven&apos;t saved your Signature Visual World yet. Fill it in inside Module 2 and it
          will appear here so every shoot stays in the same world.
        </p>
        <a href="#module-2" className="sbs2-text-link">
          Go to the builder
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
      <p className="sbs2-eyebrow">YOUR SAVED VISUAL WORLD</p>
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
      <p className="sbs2-recap-note">Keep every image in this world before you try another direction.</p>
    </div>
  )
}

/* -------------------------------- helpers -------------------------------- */

function pad(n: number) {
  return String(n).padStart(2, "0")
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
