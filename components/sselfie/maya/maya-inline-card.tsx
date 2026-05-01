"use client"

import type React from "react"

import { cn } from "@/lib/utils"

interface MayaInlineCardProps {
  eyebrow: string
  title: string
  subtitle?: string
  aside?: React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
  className?: string
  /** plain = flat border, no gradient wash (welcome / editorial surfaces) */
  surface?: "default" | "plain"
  /** column = full-width primary CTA stack */
  actionsLayout?: "row" | "column"
}

export function MayaInlineCard({
  eyebrow,
  title,
  subtitle,
  aside,
  actions,
  children,
  className,
  surface = "default",
  actionsLayout = "row",
}: MayaInlineCardProps) {
  const isPlain = surface === "plain"

  return (
    <div
      className={cn(
        "relative mt-3 overflow-hidden",
        isPlain
          ? "rounded-[16px] border border-[color:var(--app-glass-border)] bg-[rgba(255,255,255,0.72)] p-5 shadow-[0_18px_50px_rgba(61,56,48,0.08)] sm:p-8"
          : "stone-panel rounded-[16px] p-4 sm:p-5",
        className,
      )}
    >
      {!isPlain ? (
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(118deg,rgba(255,255,255,0.52)_0%,rgba(244,240,230,0.24)_48%,rgba(196,181,160,0.16)_100%)] opacity-75" />
      ) : null}
      <div className="relative z-[1]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="label-small text-[color:var(--color-smoke)]">{eyebrow}</p>
            <h3
              className={cn(
                "mt-3 text-[color:var(--color-porcelain)]",
                isPlain
                  ? "text-2xl sm:text-[1.75rem] font-light tracking-[-0.02em] leading-snug normal-case"
                  : "text-[24px] uppercase tracking-[0.08em] sm:text-[30px]",
              )}
              style={{ fontFamily: "var(--font-display)", fontWeight: 300 }}
            >
              {title}
            </h3>
            {subtitle ? (
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[color:var(--text-accent)]">{subtitle}</p>
            ) : null}
          </div>
          {aside ? <div className="shrink-0">{aside}</div> : null}
        </div>

        {children ? <div className="mt-8">{children}</div> : null}
        {actions ? (
          <div
            className={cn(
              "mt-8",
              actionsLayout === "column" ? "flex flex-col gap-2 w-full max-w-md" : "flex flex-wrap gap-2.5",
            )}
          >
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function MayaInlinePill({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode
  tone?: "default" | "strong" | "muted"
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.18em]",
        tone === "strong"
          ? "border-[color:var(--app-btn-primary-bg)] bg-[color:var(--app-btn-primary-bg)] text-[color:var(--app-btn-primary-text)]"
          : tone === "muted"
            ? "border-[rgba(195,190,182,0.14)] bg-[rgba(175,170,162,0.06)] text-[color:var(--color-smoke)]"
            : "border-[rgba(195,190,182,0.22)] bg-[rgba(175,170,162,0.12)] text-[color:var(--text-accent)]",
        className,
      )}
    >
      {children}
    </span>
  )
}

export function MayaInlineAction({
  children,
  href,
  onClick,
  variant = "secondary",
  className,
}: {
  children: React.ReactNode
  href?: string
  onClick?: () => void
  variant?: "primary" | "secondary" | "ghost"
  className?: string
}) {
  const sharedClassName = cn(
    "inline-flex min-h-11 w-full sm:w-auto items-center justify-center border px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] transition-colors duration-200",
    variant === "primary"
      ? "rounded-md border-[color:var(--app-btn-primary-bg)] bg-[color:var(--app-btn-primary-bg)] text-[color:var(--app-btn-primary-text)] hover:opacity-90 active:scale-[0.99]"
      : variant === "ghost"
        ? "rounded-none border-0 border-b border-[color:var(--app-glass-border)] bg-transparent text-left justify-start text-[color:var(--app-text-secondary)] hover:text-[color:var(--app-text-primary)] py-3 min-h-0"
        : "rounded-md border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] text-[color:var(--app-text-primary)] hover:bg-[color:var(--app-btn-secondary-hover)]",
    className,
  )

  if (href) {
    return (
      <a href={href} className={sharedClassName}>
        {children}
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick} className={sharedClassName}>
      {children}
    </button>
  )
}
