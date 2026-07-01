"use client"

// SSELFIE Studio 3.0 - inline card primitive (MAYA-REBUILD-05 Phase A).
// The premium card language from the live Studio (eyebrow, serif light title, subtitle,
// content slot, actions slot), reskinned to the /app light editorial palette. The base for
// concept, caption, and asset cards that render inline in Maya's thread.

import type { ReactNode } from "react"

interface InlineCardProps {
  eyebrow?: string
  title?: string
  subtitle?: string
  actions?: ReactNode
  children?: ReactNode
  className?: string
}

export function InlineCard({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
  className,
}: InlineCardProps) {
  const hasHeader = Boolean(eyebrow || title || subtitle)
  return (
    <div
      className={`min-w-0 max-w-full overflow-hidden rounded-[8px] border border-[#C5C6C8]/60 bg-white [overflow-x:clip] ${className ?? ""}`}
    >
      <div className="min-w-0 p-5">
        {hasHeader && (
          <div className="min-w-0 break-words [overflow-wrap:anywhere]">
            {eyebrow && (
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#818283]">{eyebrow}</p>
            )}
            {title && (
              <h3 className="mt-2 font-serif text-[22px] font-light leading-tight text-[#0D0E10]">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-2 text-[14px] leading-relaxed text-[#4F5052]">{subtitle}</p>
            )}
          </div>
        )}
        {children && (
          <div className={`min-w-0 max-w-full ${hasHeader ? "mt-4" : ""}`}>{children}</div>
        )}
        {actions && <div className="mt-5 flex min-w-0 max-w-full flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  )
}
