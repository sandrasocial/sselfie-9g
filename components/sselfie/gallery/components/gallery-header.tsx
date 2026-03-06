"use client"

interface GalleryHeaderProps {
  stats?: {
    totalGenerated?: number
    totalFavorites?: number
    favorites?: number // Legacy support
  }
  searchQuery: string
  onSearchChange: (query: string) => void
  sortBy: "date-desc" | "date-asc" | "favorites"
  onSortChange: (sort: "date-desc" | "date-asc" | "favorites") => void
  onSelectClick: () => void
}

export function GalleryHeader({
  stats,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  onSelectClick,
}: GalleryHeaderProps) {
  return (
    <div className="pt-6 pb-4 bg-[rgba(175,170,162,0.08)] backdrop-blur-[50px] border-b border-[rgba(195,190,182,0.15)] px-4">
      <p className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.5em] text-[#8a8780] mb-2">Gallery</p>
      <h1 className="mb-3 text-[28px] font-['Cormorant_Garamond'] font-light text-[#f0ede8]">
        Your Photos
      </h1>

      {stats && (
        <div className="flex items-center gap-4 mb-6 text-sm">
          <span className="font-medium text-[#8a8780]">
            {stats.totalGenerated || 0} photos
          </span>
          <span className="font-medium text-[#8a8780]">
            {stats.totalFavorites || stats.favorites || 0} favorites
          </span>
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.2em] text-[#8a8780] pointer-events-none">
            Find
          </span>
          <input
            type="text"
            placeholder="Search by description..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-14 pr-12 py-2.5 rounded-lg border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] text-[#f0ede8] placeholder:text-[#8a8780] backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-[rgba(195,190,182,0.30)] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a8780] hover:text-[#f0ede8] transition-colors"
              aria-label="Clear search"
            >
              <span className="text-[10px] uppercase tracking-[0.2em]">Clear</span>
            </button>
          )}
        </div>

        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as any)}
          className="px-4 py-2.5 rounded-lg border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] text-[#a8a49c] backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-[rgba(195,190,182,0.30)] transition-all cursor-pointer appearance-none pr-8 text-[12px] font-medium"
        >
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="favorites">Favorites</option>
        </select>

        <button
          onClick={onSelectClick}
          className="px-4 py-2.5 rounded-lg border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] text-[#a8a49c] backdrop-blur-xl hover:bg-[rgba(175,170,162,0.18)] transition-all text-[11px] font-medium uppercase tracking-[0.15em]"
        >
          Select
        </button>
      </div>
    </div>
  )
}
