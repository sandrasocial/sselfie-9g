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
    { key: "photos" as const, label: "Photos" },
    { key: "videos" as const, label: "Videos" },
    { key: "feed" as const, label: "Feed" },
    { key: "favorited" as const, label: "Favourited" },
  ]

  return (
    <div className="mb-4 border-b border-white/10 px-3">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => onContentFilterChange(filter.key)}
            className={`whitespace-nowrap border-b-2 px-2 py-3 text-[11px] uppercase tracking-[0.28em] transition-colors duration-200 ${
              contentFilter === filter.key
                ? "border-white text-white"
                : "border-transparent text-white/45 hover:text-white/70"
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
