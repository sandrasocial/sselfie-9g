"use client"

interface MayaUpsellCardProps {
  eyebrow: string
  description: string
  ctaLabel?: string
  dismissLabel?: string
  onUpgrade: () => void
  onDismiss: () => void
}

export default function MayaUpsellCard({
  eyebrow,
  description,
  ctaLabel = "Upgrade to Studio — includes everything →",
  dismissLabel = "Not now",
  onUpgrade,
  onDismiss,
}: MayaUpsellCardProps) {
  return (
    <div className="rounded-2xl border border-[rgba(195,190,182,0.20)] bg-[rgba(175,170,162,0.10)] backdrop-blur-[20px] p-4">
      <p
        className="text-[11px] tracking-[0.18em] uppercase text-[#f0ede8]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {eyebrow}
      </p>
      <p className="mt-2 text-sm text-[#8a8780]">{description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onUpgrade}
          className="text-[11px] uppercase tracking-[0.16em] text-[#f0ede8] hover:text-[#c8c4bb] transition-colors"
        >
          {ctaLabel}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="text-[11px] uppercase tracking-[0.16em] text-[#8a8780] hover:text-[#f0ede8] transition-colors"
        >
          {dismissLabel}
        </button>
      </div>
    </div>
  )
}
