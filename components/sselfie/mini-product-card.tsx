"use client"

import Link from "next/link"

/**
 * Mini product card for "Get More" 2-column grid.
 * Wireframe: 160×200px, product image, name (Cormorant 14px UPPERCASE),
 * price badge (Smoke 12px Inter), "Get it →" CTA (Obsidian, minimal).
 * Links to public /academy/products/[id].
 */
export interface MiniProductCardProps {
  productId: string
  name: string
  price: number
  href: string
  /** Optional image URL */
  imageUrl?: string | null
  /** Currency symbol, default € */
  currency?: string
}

export default function MiniProductCard({
  productId,
  name,
  price,
  href,
  imageUrl,
  currency = "€",
}: MiniProductCardProps) {
  return (
    <Link
      href={href}
      data-product-id={productId}
      className="stone-panel flex h-[200px] w-full max-w-[160px] flex-col overflow-hidden rounded-[12px] transition-all hover:bg-[color:var(--app-glass-bg)] active:scale-[0.98]"
    >
      {/* Image */}
      <div className="relative h-[88px] w-full shrink-0 overflow-hidden bg-[color:var(--app-btn-secondary-bg)]">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(15,13,11,0.04))]">
            <span className="font-serif text-2xl font-extralight tracking-wider uppercase text-[color:var(--app-text-muted)]">
              {name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-2 min-h-0">
        <h3
          className="font-serif text-[14px] font-extralight tracking-[0.02em] uppercase text-[color:var(--app-text-primary)] leading-tight line-clamp-2"
          style={{ letterSpacing: "0.02em" }}
        >
          {name}
        </h3>
        <p className="mt-1 text-[12px] font-light text-[color:var(--app-text-secondary)]">
          {currency}
          {price}
        </p>
        <span className="mt-auto inline-flex self-start pt-2 text-[12px] font-light text-[color:var(--app-text-primary)] transition-colors">
          Get it →
        </span>
      </div>
    </Link>
  )
}
