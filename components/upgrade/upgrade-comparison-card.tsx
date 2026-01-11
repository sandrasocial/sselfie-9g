"use client"

import { ArrowRight, Check } from "lucide-react"
import { getProductById } from "@/lib/products"

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
    credits: "200 credits / month",
    features: ["Unlimited trainings", "Full Maya access", "Academy + drops"],
  },
}

function formatPrice(cents: number, isSubscription: boolean) {
  const dollars = (cents / 100).toFixed(0)
  return isSubscription ? `$${dollars} / month` : `$${dollars} one-time`
}

function buildTierMeta(tierId: TierId): TierMeta {
  const base = BASE_TIER_META[tierId]
  const product = getProductById(tierId)

  const price = product ? formatPrice(product.priceInCents, product.type !== "one_time_session") : base.price || "$0"
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
    <div className="bg-white/70 backdrop-blur-2xl border border-stone-200/70 shadow-xl shadow-stone-900/10 rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-1">
          <p className="text-xs tracking-[0.15em] uppercase text-stone-500">Upgrade available</p>
          <h3 className="text-lg sm:text-xl font-serif font-extralight tracking-[0.25em] text-stone-900 uppercase">
            {target.name}
          </h3>
          <p className="text-sm text-stone-600">Move from {current.name} to {target.name}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 text-sm font-medium tracking-wider uppercase"
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
          if (!loading && onUpgrade) {
            onUpgrade()
          }
        }}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 text-white px-4 py-3 text-sm font-semibold tracking-[0.18em] uppercase hover:bg-stone-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
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
          ? "border-stone-900 bg-stone-900 text-white shadow-lg shadow-stone-900/20"
          : "border-stone-200 bg-white"
      }`}
    >
      <p className={`text-xs tracking-[0.15em] uppercase ${highlight ? "text-white/80" : "text-stone-500"}`}>
        {title}
      </p>
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold">{tier.name}</h4>
        <span className="text-sm font-medium">{tier.price}</span>
      </div>
      <p className={`text-sm ${highlight ? "text-white/80" : "text-stone-600"}`}>{tier.credits}</p>
      <ul className="space-y-1.5">
        {tier.features.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm">
            <Check size={14} className={highlight ? "text-white" : "text-stone-700"} />
            <span className={highlight ? "text-white/90" : "text-stone-700"}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
