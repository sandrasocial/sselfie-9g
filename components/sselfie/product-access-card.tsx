"use client"

import { useRouter } from "next/navigation"

/**
 * Product access card for "You Have Access" horizontal scroll.
 * Wireframe: ~140×180px, product image, name (UPPERCASE Cormorant 14px),
 * "You have access" badge, CTA (Obsidian, minimal, underline on hover).
 * Copy from docs/in-app-funnel/02-content-copy-2026-02-25.md Section 1.
 */
export type ProductAccessId = "what_to_say" | "show_up" | "get_paid" | "ai_photo_prompts"

export interface ProductAccessCardProps {
  productId: ProductAccessId
  /** Display name, e.g. "What To Say" */
  name: string
  /** Sub-text from copy doc */
  subText: string
  /** CTA button label from copy doc */
  ctaLabel: string
  /** Optional image URL; placeholder if missing */
  imageUrl?: string | null
}

const DEEP_LINKS: Record<ProductAccessId, string> = {
  what_to_say: "/studio?tab=feed-planner&product=what_to_say",
  show_up: "/studio?tab=maya&product=show_up",
  get_paid: "/studio?tab=account&product=get_paid",
  ai_photo_prompts: "/studio?tab=maya&product=ai_photo_prompts#maya/prompts",
}

export default function ProductAccessCard({
  productId,
  name,
  subText,
  ctaLabel,
  imageUrl,
}: ProductAccessCardProps) {
  const router = useRouter()
  const href = DEEP_LINKS[productId]

  const handleClick = () => {
    if (href) router.push(href)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          handleClick()
        }
      }}
      className="shrink-0 w-[140px] h-[180px] rounded border border-stone-200 bg-white overflow-hidden flex flex-col transition-all hover:border-stone-300 active:scale-[0.98]"
      style={{ minWidth: 140 }}
    >
      {/* Image area */}
      <div className="relative w-full h-[88px] bg-stone-100 overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200">
            <span className="font-serif text-2xl font-extralight tracking-wider uppercase text-stone-400">
              {name.charAt(0)}
            </span>
          </div>
        )}
        {/* Badge */}
        <div
          className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-sm text-[10px] font-normal tracking-wide uppercase"
          style={{
            background: "var(--color-whisper, #e5e5e5)",
            color: "var(--color-smoke, #666666)",
          }}
        >
          You have access
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-3">
        <h3
          className="font-serif text-[14px] font-extralight tracking-[0.02em] uppercase text-stone-950 leading-tight line-clamp-2"
          style={{ letterSpacing: "0.02em" }}
        >
          {name}
        </h3>
        <p className="text-[11px] font-light text-stone-600 leading-snug line-clamp-2 mt-1 flex-1">
          {subText}
        </p>
        <span className="text-[12px] font-light text-stone-950 mt-auto pt-2 border-b border-transparent hover:border-stone-950 transition-colors">
          {ctaLabel} →
        </span>
      </div>
    </div>
  )
}
