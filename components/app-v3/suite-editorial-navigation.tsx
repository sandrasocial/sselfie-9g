import type { LucideIcon } from "lucide-react"

import type { AppV3Section } from "@/lib/app-v3/navigation"
import type { LearningDestination } from "@/lib/app-v3/learning-destinations"

export interface SuiteEditorialNavItem {
  id: AppV3Section
  label: string
  icon: LucideIcon
}

interface SuiteEditorialNavigationProps {
  items: SuiteEditorialNavItem[]
  activeSection: AppV3Section
  onNavigate: (section: AppV3Section) => void
  learningDestinations?: readonly LearningDestination[]
}

const METHOD = ["TAKE", "CREATE", "EDIT", "POST"] as const

export function SuiteEditorialNavigation({
  items,
  activeSection,
  onNavigate,
  learningDestinations = [],
}: SuiteEditorialNavigationProps) {
  return (
    <>
      <aside className="suite-desktop-nav fixed inset-y-0 left-0 z-40 hidden w-[224px] flex-col bg-[color:var(--suite-night)] text-white lg:flex">
        <div className="border-b border-white/12 px-7 pb-8 pt-9">
          <span className="block font-serif text-[35px] font-light leading-none tracking-[-0.055em]">
            SSELFIE
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

        {learningDestinations.length > 0 ? (
          <div className="border-t border-white/12 px-7 py-5">
            <p className="text-[8px] uppercase tracking-[0.28em] text-white/38">
              Learn &amp; practice
            </p>
            <div className="mt-3 grid gap-1">
              {learningDestinations.map(destination =>
                destination.href ? (
                  <a
                    key={destination.id}
                    href={destination.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex min-h-10 items-center justify-between gap-3 text-[10px] uppercase tracking-[0.12em] text-white/62 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <span>{destination.label}</span>
                    <span aria-hidden className="text-[color:var(--suite-accent)]">
                      ↗
                    </span>
                  </a>
                ) : (
                  <span
                    key={destination.id}
                    className="flex min-h-10 items-center justify-between gap-3 text-[10px] uppercase tracking-[0.12em] text-white/32"
                  >
                    <span>{destination.label}</span>
                    <span className="text-[8px] tracking-[0.1em]">Soon</span>
                  </span>
                )
              )}
            </div>
          </div>
        ) : null}

        <div className="mt-auto border-t border-white/12 px-7 py-6">
          <ol className="flex items-center justify-between gap-2" aria-label="SSELFIE method">
            {METHOD.map(step => (
              <li key={step} className="text-[7px] uppercase tracking-[0.13em] text-white/42">
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
                className={`suite-bottom-nav-item flex min-h-[68px] flex-1 flex-col items-center justify-center gap-1 px-0.5 py-1.5 text-[8px] uppercase tracking-[0.08em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white ${
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
