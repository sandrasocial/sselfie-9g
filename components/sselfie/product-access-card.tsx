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
      className="shrink-0 w-[200px] min-h-[180px] rounded-2xl border border-white/15 bg-[rgba(255,255,255,0.07)] overflow-hidden flex flex-col backdrop-blur-xl transition-all hover:border-white/20 hover:bg-[rgba(255,255,255,0.1)] active:scale-[0.98]"
      style={{ minWidth: 200 }}
    >
      {/* Image area */}
      <div className="relative w-full h-[88px] bg-[rgba(255,255,255,0.07)] overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[rgba(255,255,255,0.08)] to-[rgba(255,255,255,0.04)]">
            <span className="font-serif text-2xl font-extralight tracking-wider uppercase text-white/30">
              {name.charAt(0)}
            </span>
          </div>
        )}
        {/* Badge */}
        <div
          className="absolute top-1.5 right-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium tracking-[0.15em] uppercase"
          style={{
            background: "rgba(34, 197, 94, 0.12)",
            border: "1px solid rgba(34, 197, 94, 0.25)",
            color: "rgba(134, 239, 172, 0.9)",
          }}
        >
          You have access
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-3">
        <h3
          className="font-serif text-[14px] font-extralight tracking-[0.08em] uppercase text-white leading-tight line-clamp-2"
          style={{ letterSpacing: "0.02em" }}
        >
          {name}
        </h3>
        <p className="text-[11px] font-light text-white/50 leading-snug line-clamp-2 mt-1 flex-1">
          {subText}
        </p>
        <span className="text-[11px] font-medium tracking-[0.15em] uppercase text-white/80 mt-auto pt-2 transition-colors">
          {ctaLabel} →
        </span>
      </div>
    </div>
  )
}
