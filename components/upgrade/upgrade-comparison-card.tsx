"use client"

import { ArrowRight, Check } from "lucide-react"
import { formatPriceFromCents, getProductById } from "@/lib/products"
import { trackCTAClick } from "@/lib/analytics"

type TierId = "one_time_session" | "sselfie_studio_membership"

interface TierMeta {
  name: string
  price: string
  credits: string
  features: string[]
}

const BASE_TIER_META: Record<TierId, Omit<TierMeta, "price" | "credits"> & Partial<Pick<TierMeta, "price" | "credits">>> = {
  one_time_session: {
    name: "One-Time Session",
    price: "$49 one-time",
    credits: "50 credits",
    features: ["One photoshoot", "All photo styles", "High-res downloads"],
  },
  sselfie_studio_membership: {
    name: "Creator Studio",
    credits: "100 credits / month",
    features: ["Unlimited trainings", "Full Maya access", "Academy + drops"],
  },
}

function buildTierMeta(tierId: TierId): TierMeta {
  const base = BASE_TIER_META[tierId]
  const product = getProductById(tierId)

  const price = product
    ? `${formatPriceFromCents(product.priceInCents)}${product.type === "one_time_session" ? " one-time" : " / month"}`
    : base.price || "$0"
  const credits =
    product?.credits && product.credits > 0
      ? `${product.credits} credits${product.type === "one_time_session" ? "" : " / month"}`
      : base.credits || ""

  return {
    name: base.name,
    price,
    credits,
    features: base.features,
  }
}

interface UpgradeComparisonCardProps {
  currentTier: TierId
  targetTier: TierId
  onUpgrade: () => void
  onClose?: () => void
  loading?: boolean
  showAllTiers?: boolean
}

export function UpgradeComparisonCard({
  currentTier,
  targetTier,
  onUpgrade,
  onClose,
  loading = false,
  showAllTiers = false,
}: UpgradeComparisonCardProps) {
  const current = buildTierMeta(currentTier)
  const target = buildTierMeta(targetTier)
  const oneTime = buildTierMeta("one_time_session")
  const studio = buildTierMeta("sselfie_studio_membership")

  return (
    <div className="bg-[rgba(175,170,162,0.15)] backdrop-blur-[70px] border border-[rgba(195,190,182,0.25)] rounded-3xl p-5 sm:p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-1">
          <p className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.5em] text-[#8a8780]">Upgrade available</p>
          <h3 className="font-['Cormorant_Garamond'] font-light text-lg sm:text-xl tracking-wide text-[#f0ede8] uppercase">
            {target.name}
          </h3>
          <p className="text-sm text-[#8a8780]">Move from {current.name} to {target.name}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[#8a8780] hover:text-[#f0ede8] text-sm font-medium tracking-wider uppercase transition-colors"
          >
            Close
          </button>
        )}
      </div>

      {showAllTiers ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TierSummary title="One-Time" tier={oneTime} highlight={currentTier === "one_time_session"} />
          <TierSummary title="Creator Studio" tier={studio} highlight={currentTier === "sselfie_studio_membership"} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TierSummary title="Current plan" tier={current} highlight={false} />
          <TierSummary title="Upgrade to" tier={target} highlight />
        </div>
      )}

      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          console.log("[UPGRADE-CARD] Upgrade button clicked")
          trackCTAClick("upgrade_comparison_card", "Upgrade now", "/checkout")
          if (!loading && onUpgrade) {
            onUpgrade()
          }
        }}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 bg-[#c8c4bb] text-[#0d0c0b] font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[#f0ede8] transition-colors disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
      >
        {loading ? "Upgrading..." : "Upgrade now"}
        {!loading && <ArrowRight size={16} />}
      </button>
    </div>
  )
}

function TierSummary({ title, tier, highlight }: { title: string; tier: TierMeta; highlight?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-4 space-y-2 ${
        highlight
          ? "border-[#a8a49c] bg-[rgba(168,164,156,0.15)]"
          : "border-[rgba(195,190,182,0.20)] bg-[rgba(175,170,162,0.06)]"
      }`}
    >
      <p className={`font-['Inter'] font-medium text-[10px] tracking-[0.5em] uppercase ${highlight ? "text-[#a8a49c]" : "text-[#8a8780]"}`}>
        {title}
      </p>
      <div className="flex items-center justify-between">
        <h4 className={`text-base font-medium ${highlight ? "text-[#f0ede8]" : "text-[#f0ede8]"}`}>{tier.name}</h4>
        <span className={`text-sm ${highlight ? "text-[#c8c4bb]" : "text-[#8a8780]"}`}>{tier.price}</span>
      </div>
      <p className={`text-sm ${highlight ? "text-[#a8a49c]" : "text-[#8a8780]"}`}>{tier.credits}</p>
      <ul className="space-y-1.5">
        {tier.features.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm">
            <Check size={14} className={highlight ? "text-[#a8a49c]" : "text-[#8a8780]"} />
            <span className={highlight ? "text-[#f0ede8]" : "text-[#8a8780]"}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
