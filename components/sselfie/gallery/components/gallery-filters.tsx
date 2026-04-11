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
    <div className="mx-4 mb-4 rounded-[22px] stone-panel px-3 py-2 sm:mx-6">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => onContentFilterChange(filter.key)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em] transition-colors duration-200 border ${
              contentFilter === filter.key
                ? "bg-[rgba(175,170,162,0.20)] border-[rgba(195,190,182,0.40)] text-[#f0ede8]"
                : "bg-[rgba(175,170,162,0.08)] border-[rgba(195,190,182,0.20)] text-[#8a8780] hover:text-[#a8a49c]"
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
