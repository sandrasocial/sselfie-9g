"use client"

interface GalleryFiltersProps {
  contentFilter: "photos" | "videos" | "favorited" | "feed"
  onContentFilterChange: (filter: "photos" | "videos" | "favorited" | "feed") => void
}

export function GalleryFilters({
  contentFilter,
  onContentFilterChange,
}: GalleryFiltersProps) {
  const filters = [
    { key: "photos" as const, label: "All photos" },
    { key: "videos" as const, label: "Reels" },
    { key: "feed" as const, label: "Feed picks" },
    { key: "favorited" as const, label: "Saved" },
  ]

  return (
    <div className="mx-4 mb-4 rounded-[12px] border border-[color:var(--app-glass-border)] bg-[rgba(255,255,255,0.70)] px-3 py-2 shadow-[0_12px_32px_rgba(61,56,48,0.06)] backdrop-blur-[18px] sm:mx-6">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => onContentFilterChange(filter.key)}
            className={`whitespace-nowrap rounded-[6px] px-3 py-1 text-[11px] uppercase tracking-[0.18em] transition-colors duration-200 border ${
              contentFilter === filter.key
                ? "bg-[color:var(--app-btn-primary-bg)] border-[color:var(--app-btn-primary-bg)] text-[color:var(--app-btn-primary-text)]"
                : "bg-[color:var(--app-btn-secondary-bg)] border-[color:var(--app-glass-border)] text-[color:var(--app-text-secondary)] hover:text-[color:var(--app-text-primary)]"
            }`}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  )
}
