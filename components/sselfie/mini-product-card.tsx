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
  /** Optional image URL */
  imageUrl?: string | null
  /** Currency symbol, default € */
  currency?: string
}

export default function MiniProductCard({
  productId,
  name,
  price,
  imageUrl,
  currency = "€",
}: MiniProductCardProps) {
  const href = `/academy/products/${productId}`

  return (
    <Link
      href={href}
      className="flex flex-col w-full max-w-[160px] h-[200px] rounded border border-stone-200 bg-white overflow-hidden transition-all hover:border-stone-300 active:scale-[0.98]"
    >
      {/* Image */}
      <div className="relative w-full h-[88px] bg-stone-100 overflow-hidden shrink-0">
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
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-2 min-h-0">
        <h3
          className="font-serif text-[14px] font-extralight tracking-[0.02em] uppercase text-stone-950 leading-tight line-clamp-2"
          style={{ letterSpacing: "0.02em" }}
        >
          {name}
        </h3>
        <p className="text-[12px] font-light text-stone-500 mt-1">
          {currency}{price}
        </p>
        <span className="text-[12px] font-light text-stone-950 mt-auto pt-2 border-b border-transparent hover:border-stone-950 transition-colors inline-flex self-start">
          Get it →
        </span>
      </div>
    </Link>
  )
}
