import { cn } from "@/lib/utils"

type ProductBadgeProps = {
  label: string
  icon?: string
  onClick?: () => void
}

export default function ProductBadge({ label, icon = "🎁", onClick }: ProductBadgeProps) {
  const Tag = onClick ? "button" : "div"

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/80 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-stone-700",
        "shadow-sm transition-colors",
        onClick ? "hover:bg-white hover:text-stone-900" : "",
      )}
      aria-label={label}
      title={label}
    >
      <span className="text-sm leading-none">{icon}</span>
      <span className="font-medium">{label}</span>
    </Tag>
  )
}
