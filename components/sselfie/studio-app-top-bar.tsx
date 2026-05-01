"use client"

import { forwardRef, type ReactNode } from "react"
import { DesignClasses } from "@/lib/design-tokens"

export interface StudioAppTabItem {
  id: string
  label: string
}

export interface StudioAppMayaSubTabItem {
  id: "photos" | "plan" | "videos" | "training"
  label: string
}

interface StudioAppTopBarProps {
  tabs: StudioAppTabItem[]
  activeTab: string
  onTabChange: (id: string) => void
  isNewUser: boolean
  /** Maya: ≡ menu. Other tabs: Feeds + account menu, etc. */
  trailing?: ReactNode
  mayaSubTabs?: StudioAppMayaSubTabItem[]
  activeMayaSubTab?: StudioAppMayaSubTabItem["id"]
  onMayaSubTabChange?: (id: StudioAppMayaSubTabItem["id"]) => void
}

/**
 * Fixed primary navigation (Maya, Studio, Gallery, …) — mobile-first horizontal scroll.
 * Replaces the legacy bottom nav; height is observed into `--studio-app-header-height`.
 */
export const StudioAppTopBar = forwardRef<HTMLElement, StudioAppTopBarProps>(
  function StudioAppTopBar({
    tabs,
    activeTab,
    onTabChange,
    isNewUser,
    trailing,
    mayaSubTabs = [],
    activeMayaSubTab,
    onMayaSubTabChange,
  }, ref) {
    const showMayaSubTabs = activeTab === "maya" && mayaSubTabs.length > 0 && activeMayaSubTab && onMayaSubTabChange

    return (
      <header
        ref={ref}
        className="fixed top-0 left-0 right-0 z-[95] border-b pt-safe"
        style={{
          background: "rgba(237,233,226,0.88)",
          borderColor: "var(--app-glass-border)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
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
                      className={`relative touch-manipulation rounded-md px-2.5 sm:px-3 py-2 min-h-[44px] transition-all duration-200 ${
                        isActive ? "" : "hover:bg-[rgba(15,13,11,0.05)] active:scale-[0.98]"
                      } ${isGated ? "opacity-50" : ""}`}
                      aria-label={
                        isGated ? `${tab.label} — unlocks as you create with Maya` : `Open ${tab.label}`
                      }
                      aria-current={isActive ? "page" : undefined}
                    >
                      {isActive && (
                        <span
                          className="absolute inset-0 rounded-md pointer-events-none"
                          style={{
                            background: "var(--app-btn-primary-bg)",
                            border: "1px solid var(--app-btn-primary-bg)",
                          }}
                          aria-hidden
                        />
                      )}
                      <span
                        className={`relative z-10 block whitespace-nowrap text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.18em] ${
                          isActive ? "text-[color:var(--app-btn-primary-text)]" : "text-[color:var(--app-text-secondary)]"
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
            style={{ color: "var(--app-text-secondary)" }}
          >
            Create with Maya to unlock Gallery, Feed &amp; Academy
          </p>
        ) : null}
        {showMayaSubTabs ? (
          <div
            className="border-t px-3 pb-2 sm:px-4 md:px-6"
            style={{ borderColor: "var(--app-glass-border)" }}
          >
            <div
              className="flex gap-1 overflow-x-auto pt-2"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              aria-label="Maya sections"
            >
              {mayaSubTabs.map((tab) => {
                const isActive = activeMayaSubTab === tab.id

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onMayaSubTabChange(tab.id)}
                    className={`relative touch-manipulation rounded-md px-3 py-2 min-h-[40px] transition-all duration-200 ${
                      isActive ? "" : "hover:bg-[rgba(15,13,11,0.05)] active:scale-[0.98]"
                    }`}
                    aria-label={`${tab.label} Maya tab`}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {isActive ? (
                      <span
                        className="absolute inset-0 rounded-md pointer-events-none"
                        style={{
                          background: "var(--app-btn-primary-bg)",
                          border: "1px solid var(--app-btn-primary-bg)",
                        }}
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={`relative z-10 block whitespace-nowrap text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.18em] ${
                        isActive
                          ? "text-[color:var(--app-btn-primary-text)]"
                          : "text-[color:var(--app-text-secondary)]"
                      }`}
                    >
                      {tab.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </header>
    )
  },
)
