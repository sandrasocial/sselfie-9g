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
  what_to_say: "/academy/products/what_to_say",
  show_up: "/academy/products/show_up",
  get_paid: "/academy/products/get_paid",
  ai_photo_prompts: "/academy/products/ai_photo_prompts",
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
      className="stone-panel flex min-h-[180px] w-[200px] shrink-0 flex-col overflow-hidden rounded-2xl transition-all hover:bg-[rgba(175,170,162,0.16)] active:scale-[0.98]"
      style={{ minWidth: 200 }}
    >
      {/* Image area */}
      <div className="relative h-[88px] w-full overflow-hidden bg-[rgba(175,170,162,0.10)]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,rgba(240,237,232,0.14),rgba(175,170,162,0.06))]">
            <span className="font-serif text-2xl font-extralight tracking-wider uppercase text-white/35">
              {name.charAt(0)}
            </span>
          </div>
        )}
        {/* Badge */}
        <div className="stone-chip absolute right-1.5 top-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em] text-[#f0ede8]">
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
        <p className="mt-1 flex-1 line-clamp-2 text-[11px] font-light leading-snug text-[color:var(--color-smoke)]">
          {subText}
        </p>
        <span className="mt-auto pt-2 text-[11px] font-medium uppercase tracking-[0.15em] text-[color:var(--color-porcelain)] transition-colors">
          {ctaLabel} →
        </span>
      </div>
    </div>
  )
}
