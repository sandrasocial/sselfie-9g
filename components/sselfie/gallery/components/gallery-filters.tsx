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
    { key: "favorited" as const, label: "Favourites" },
    { key: "feed" as const, label: "Feed" },
  ]

  return (
    <div className="mb-6">
      <div className="flex gap-2">
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => onContentFilterChange(filter.key)}
            className={`px-4 py-2.5 text-[11px] tracking-[0.2em] uppercase font-medium transition-all duration-200 rounded-lg ${
              contentFilter === filter.key
                ? "bg-stone-950 text-white"
                : "bg-stone-50 text-stone-700 hover:bg-stone-100 border border-stone-200/30"
            }`}
            style={{
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  )
}

