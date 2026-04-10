"use client"

import { forwardRef, type ReactNode } from "react"
import { DesignClasses } from "@/lib/design-tokens"

export interface StudioAppTabItem {
  id: string
  label: string
}

interface StudioAppTopBarProps {
  tabs: StudioAppTabItem[]
  activeTab: string
  onTabChange: (id: string) => void
  isNewUser: boolean
  /** Credits / Feeds / account menu — hidden on Maya (Maya has its own header actions). */
  trailing?: ReactNode
}

/**
 * Fixed primary navigation (Maya, Studio, Gallery, …) — mobile-first horizontal scroll.
 * Replaces the legacy bottom nav; height is observed into `--studio-app-header-height`.
 */
export const StudioAppTopBar = forwardRef<HTMLElement, StudioAppTopBarProps>(
  function StudioAppTopBar({ tabs, activeTab, onTabChange, isNewUser, trailing }, ref) {
    return (
      <header
        ref={ref}
        className={`fixed top-0 left-0 right-0 z-[95] border-b ${DesignClasses.border.stone} pt-safe`}
        style={{ background: "rgba(175,170,162,0.08)", backdropFilter: "blur(50px)" }}
        aria-label="Studio sections"
      >
        <div className={`${DesignClasses.spacing.paddingX.sm} py-2 sm:py-2.5`}>
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="min-w-0 flex-1 overflow-x-auto py-0.5"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <div className="flex gap-1 sm:gap-1.5 min-w-max pr-1">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id
                  const isGated =
                    isNewUser && ["studio", "gallery", "feed-planner", "academy"].includes(tab.id)

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => onTabChange(tab.id)}
                      className={`relative touch-manipulation rounded-xl px-2.5 sm:px-3 py-2 min-h-[40px] transition-all duration-200 ${
                        isActive ? "scale-[1.02]" : "hover:opacity-90 active:scale-[0.98]"
                      } ${isGated ? "opacity-50" : ""}`}
                      aria-label={
                        isGated ? `${tab.label} — unlocks as you create with Maya` : `Open ${tab.label}`
                      }
                      aria-current={isActive ? "page" : undefined}
                    >
                      {isActive && (
                        <span
                          className="absolute inset-0 rounded-xl pointer-events-none"
                          style={{
                            background: "rgba(175,170,162,0.18)",
                            border: "1px solid rgba(195,190,182,0.25)",
                          }}
                          aria-hidden
                        />
                      )}
                      <span
                        className={`relative z-10 block whitespace-nowrap text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.18em] ${
                          isActive ? "text-[#f0ede8]" : "text-[#8a8780]"
                        }`}
                      >
                        {tab.label}
                        {isGated ? (
                          <span className="ml-1 text-[8px] font-normal uppercase tracking-normal opacity-60">
                            soon
                          </span>
                        ) : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            {trailing ? (
              <div className="shrink-0 flex items-center gap-2 sm:gap-3">{trailing}</div>
            ) : null}
          </div>
        </div>
        {isNewUser ? (
          <p
            className="text-[10px] sm:text-xs text-center px-3 pb-2 leading-snug"
            style={{ color: "#8a8780" }}
          >
            Create with Maya to unlock Gallery, Feed &amp; Academy
          </p>
        ) : null}
      </header>
    )
  },
)
