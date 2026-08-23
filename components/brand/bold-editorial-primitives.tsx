import type { ReactNode } from "react"
import { ArrowRight } from "lucide-react"

import styles from "./bold-editorial-primitives.module.css"

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function EditorialWordmark({ className }: { className?: string }) {
  return <span className={cx(styles.wordmark, className)}>SSELFIE</span>
}

export function EditorialEyebrow({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <p className={cx(styles.eyebrow, className)}>{children}</p>
}

export function EditorialHeadline({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <h2 className={cx(styles.headline, className)}>{children}</h2>
}

export function EditorialButton({
  children,
  accent = false,
  secondary = false,
  className,
}: {
  children: ReactNode
  accent?: boolean
  secondary?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      className={cx(secondary ? styles.buttonSecondary : styles.button, className)}
      data-accent={accent ? "true" : undefined}
    >
      {children}
      <ArrowRight aria-hidden="true" size={14} strokeWidth={1.7} />
    </button>
  )
}

export function EditorialStageNav({ active = "CREATE" }: { active?: string }) {
  const stages = ["TAKE", "CREATE", "EDIT", "POST"]

  return (
    <ol className={styles.stages} aria-label="SSELFIE method">
      {stages.map((stage, index) => (
        <li
          key={stage}
          className={cx(styles.stage, stage === active && styles.stageActive)}
          aria-current={stage === active ? "step" : undefined}
        >
          <span className={styles.stageNumber}>{String(index + 1).padStart(2, "0")}</span>
          {stage}
        </li>
      ))}
    </ol>
  )
}

export function EditorialRule() {
  return <hr className={styles.rule} />
}
