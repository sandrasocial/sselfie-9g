"use client"

import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react"
import { DesignClasses } from "@/lib/design-tokens"

export interface StudioAppTabItem {
  id: string
  label: string
  /** When true the tab is visible but clicking it triggers a toast instead of navigation */
  locked?: boolean
  /** Human-readable reason shown in the toast when a locked tab is clicked */
  lockMessage?: string
}

export interface StudioAppMayaSubTabItem {
  id: "photos" | "plan" | "videos" | "training"
  label: string
}

interface StudioAppTopBarProps {
  tabs: StudioAppTabItem[]
  activeTab: string
  onTabChange: (id: string) => void
  /** @deprecated Use per-tab `locked` prop instead */
  isNewUser?: boolean
  /** Maya: ≡ menu. Other tabs: Feeds + account menu, etc. */
  trailing?: ReactNode
  mayaSubTabs?: StudioAppMayaSubTabItem[]
  activeMayaSubTab?: StudioAppMayaSubTabItem["id"]
  onMayaSubTabChange?: (id: StudioAppMayaSubTabItem["id"]) => void
}

/**
 * Fixed primary navigation (Maya, Studio, Gallery, …) - mobile-first horizontal scroll.
 * Replaces the legacy bottom nav; height is observed into `--studio-app-header-height`.
 */
export const StudioAppTopBar = forwardRef<HTMLElement, StudioAppTopBarProps>(
  function StudioAppTopBar({
    tabs,
    activeTab,
    onTabChange,
    trailing,
    mayaSubTabs = [],
    activeMayaSubTab,
    onMayaSubTabChange,
  }, ref) {
    const showMayaSubTabs = activeTab === "maya" && mayaSubTabs.length > 0 && activeMayaSubTab && onMayaSubTabChange
    const [isMayaSubnavOpen, setIsMayaSubnavOpen] = useState(false)
    const headerRef = useRef<HTMLElement | null>(null)

    const setHeaderRef = (node: HTMLElement | null) => {
      headerRef.current = node

      if (typeof ref === "function") {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
    }

    useEffect(() => {
      if (!isMayaSubnavOpen) return

      const handlePointerDown = (event: PointerEvent) => {
        const target = event.target
        if (target instanceof Node && headerRef.current?.contains(target)) return
        setIsMayaSubnavOpen(false)
      }

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setIsMayaSubnavOpen(false)
        }
      }

      document.addEventListener("pointerdown", handlePointerDown)
      document.addEventListener("keydown", handleKeyDown)

      return () => {
        document.removeEventListener("pointerdown", handlePointerDown)
        document.removeEventListener("keydown", handleKeyDown)
      }
    }, [isMayaSubnavOpen])

    const handlePrimaryTabClick = (tab: StudioAppTabItem) => {
      if (tab.id === "maya" && showMayaSubTabs) {
        if (activeTab !== "maya") {
          onTabChange(tab.id)
          setIsMayaSubnavOpen(true)
          return
        }
        setIsMayaSubnavOpen((open) => !open)
        return
      }

      setIsMayaSubnavOpen(false)
      onTabChange(tab.id)
    }

    const handleMayaSubTabClick = (id: StudioAppMayaSubTabItem["id"]) => {
      onMayaSubTabChange?.(id)
      setIsMayaSubnavOpen(false)
    }

    return (
      <header
        ref={setHeaderRef}
        className="fixed top-0 left-0 right-0 z-[95] border-b pt-safe"
        style={{
          background: "color-mix(in srgb, var(--color-porcelain) 88%, transparent)",
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
                  const isLocked = !!tab.locked
                  const isMaya = tab.id === "maya"

                  return (
                    <div
                      key={tab.id}
                      className="relative"
                    >
                      <button
                        type="button"
                        onClick={() => handlePrimaryTabClick(tab)}
                        className={`relative touch-manipulation rounded-md px-2.5 sm:px-3 py-2 min-h-[44px] transition-all duration-200 ${
                          isActive ? "" : "hover:bg-[rgba(15,13,11,0.05)] active:scale-[0.98]"
                        } ${isLocked ? "opacity-40" : ""}`}
                        aria-label={
                          isLocked
                            ? `${tab.label} - ${tab.lockMessage ?? "requires an upgrade"}`
                            : `Open ${tab.label}`
                        }
                        aria-current={isActive ? "page" : undefined}
                        aria-expanded={isMaya && showMayaSubTabs ? isMayaSubnavOpen : undefined}
                        aria-haspopup={isMaya && showMayaSubTabs ? "menu" : undefined}
                      >
                        {isActive && !isLocked && (
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
                          className={`relative z-10 flex items-center gap-1 whitespace-nowrap text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.18em] ${
                            isActive && !isLocked
                              ? "text-[color:var(--app-btn-primary-text)]"
                              : "text-[color:var(--app-text-secondary)]"
                          }`}
                        >
                          {tab.label}
                          {isLocked ? (
                            <svg
                              width="8"
                              height="9"
                              viewBox="0 0 8 9"
                              fill="none"
                              aria-hidden
                              className="opacity-70 shrink-0"
                            >
                              <rect x="1" y="4" width="6" height="5" rx="0.5" fill="currentColor" />
                              <path
                                d="M2.5 4V3a1.5 1.5 0 0 1 3 0v1"
                                stroke="currentColor"
                                strokeWidth="1.1"
                                fill="none"
                                strokeLinecap="round"
                              />
                            </svg>
                          ) : null}
                        </span>
                      </button>

                    </div>
                  )
                })}
              </div>
            </div>
            {trailing ? (
              <div className="shrink-0 flex items-center gap-2 sm:gap-3">{trailing}</div>
            ) : null}
          </div>
        </div>
        {showMayaSubTabs && isMayaSubnavOpen ? (
          <div
            className="absolute left-3 top-[calc(100%+8px)] z-[130] w-[min(88vw,360px)] rounded-[18px] border bg-[color:var(--app-glass-bg)] p-2 shadow-[var(--app-shadow-soft)] backdrop-blur-[20px] sm:left-4 md:left-6"
            style={{ borderColor: "var(--app-glass-border)" }}
            role="menu"
            aria-label="Maya sections"
            onMouseEnter={() => setIsMayaSubnavOpen(true)}
          >
            <div className="grid gap-1">
              {mayaSubTabs.map((subTab) => {
                const isSubActive = activeMayaSubTab === subTab.id

                return (
                  <button
                    key={subTab.id}
                    type="button"
                    onClick={() => handleMayaSubTabClick(subTab.id)}
                    className={`relative touch-manipulation rounded-[12px] px-4 py-3 text-left transition-all duration-200 ${
                      isSubActive ? "" : "hover:bg-[rgba(15,13,11,0.05)] active:scale-[0.98]"
                    }`}
                    role="menuitem"
                    aria-current={isSubActive ? "page" : undefined}
                  >
                    {isSubActive ? (
                      <span
                        className="absolute inset-0 rounded-[12px] pointer-events-none"
                        style={{
                          background: "var(--app-btn-primary-bg)",
                          border: "1px solid var(--app-btn-primary-bg)",
                        }}
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={`relative z-10 block whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.18em] ${
                        isSubActive
                          ? "text-[color:var(--app-btn-primary-text)]"
                          : "text-[color:var(--app-text-secondary)]"
                      }`}
                    >
                      {subTab.label}
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
