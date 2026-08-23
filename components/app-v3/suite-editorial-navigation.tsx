import type { LucideIcon } from "lucide-react"

import type { AppV3Section } from "@/lib/app-v3/navigation"

export interface SuiteEditorialNavItem {
  id: AppV3Section
  label: string
  icon: LucideIcon
}

interface SuiteEditorialNavigationProps {
  items: SuiteEditorialNavItem[]
  activeSection: AppV3Section
  onNavigate: (section: AppV3Section) => void
}

const METHOD = ["TAKE", "CREATE", "EDIT", "POST"] as const

export function SuiteEditorialNavigation({
  items,
  activeSection,
  onNavigate,
}: SuiteEditorialNavigationProps) {
  return (
    <>
      <aside className="suite-desktop-nav fixed inset-y-0 left-0 z-40 hidden w-[224px] flex-col bg-[color:var(--suite-night)] text-white lg:flex">
        <div className="border-b border-white/12 px-7 pb-7 pt-8">
          <span className="block font-serif text-[35px] font-light leading-none tracking-[-0.055em]">
            SSELFIE
          </span>
          <span className="mt-2 block text-[8px] uppercase tracking-[0.34em] text-white/48">
            Suite
          </span>
        </div>

        <nav className="flex flex-col py-4" aria-label="Suite">
          {items.map(item => {
            const active = item.id === activeSection
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={active ? "page" : undefined}
                className={`suite-desktop-nav-item relative flex min-h-[52px] items-center gap-3 px-7 text-left text-[10px] uppercase tracking-[0.16em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white ${
                  active
                    ? "suite-desktop-nav-item--active bg-white/[0.07] text-white"
                    : "text-white/62 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <Icon size={17} strokeWidth={active ? 2 : 1.5} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="mt-auto border-t border-white/12 px-7 py-7">
          <p className="text-[8px] uppercase tracking-[0.28em] text-white/38">The method</p>
          <ol className="mt-4 grid gap-2.5" aria-label="SSELFIE method">
            {METHOD.map((step, index) => (
              <li
                key={step}
                className="grid grid-cols-[22px_1fr] items-center text-[9px] uppercase tracking-[0.18em] text-white/58"
              >
                <span className="font-serif text-[12px] text-[color:var(--suite-accent)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </aside>

      <nav
        className="suite-bottom-nav fixed inset-x-0 bottom-0 z-40 w-full max-w-[100dvw] overscroll-x-none border-t border-white/12 bg-[color:var(--suite-night)] pb-[env(safe-area-inset-bottom)] [overflow-x:clip] lg:hidden"
        aria-label="Suite"
      >
        <div className="mx-auto flex max-w-3xl items-stretch justify-around px-2">
          {items.map(item => {
            const active = item.id === activeSection
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={`suite-bottom-nav-item flex min-h-[62px] flex-1 flex-col items-center justify-center gap-1 px-0.5 py-1.5 text-[9px] uppercase tracking-[0.08em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white ${
                  active
                    ? "suite-bottom-nav-item--active text-white"
                    : "text-white/58 hover:text-white"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.1 : 1.55} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
