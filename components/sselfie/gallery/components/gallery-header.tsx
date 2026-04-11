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
  viewMode: "moodboard" | "grid"
  onViewModeChange: (mode: "moodboard" | "grid") => void
  showRefine: boolean
  onToggleRefine: () => void
}

export function GalleryHeader({
  stats,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  onSelectClick,
  viewMode,
  onViewModeChange,
  showRefine,
  onToggleRefine,
}: GalleryHeaderProps) {
  return (
    <div className="mx-4 mt-4 rounded-[28px] stone-panel px-4 pt-6 pb-4 sm:mx-6">
      <p className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.5em] text-[#8a8780] mb-2">Maya</p>
      <h1 className="mb-3 text-[28px] font-['Cormorant_Garamond'] font-light text-[#f0ede8]">
        Your visual library
      </h1>
      <p className="mb-4 text-sm text-[#a8a49c]">Your personal brand images, all in one place.</p>

      {stats && (
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] px-3 py-1 font-medium text-[#8a8780]">
            {stats.totalGenerated || 0} photos
          </span>
          <span className="rounded-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] px-3 py-1 font-medium text-[#8a8780]">
            {stats.totalFavorites || stats.favorites || 0} saved
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onViewModeChange("moodboard")}
          className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors ${
            viewMode === "moodboard"
              ? "border-[rgba(195,190,182,0.4)] bg-[rgba(175,170,162,0.2)] text-[#f0ede8]"
              : "border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.08)] text-[#8a8780] hover:text-[#f0ede8]"
          }`}
        >
          Moodboard
        </button>
        <button
          onClick={() => onViewModeChange("grid")}
          className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors ${
            viewMode === "grid"
              ? "border-[rgba(195,190,182,0.4)] bg-[rgba(175,170,162,0.2)] text-[#f0ede8]"
              : "border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.08)] text-[#8a8780] hover:text-[#f0ede8]"
          }`}
        >
          Grid
        </button>
        <button
          onClick={onToggleRefine}
          className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors ${
            showRefine
              ? "border-[rgba(195,190,182,0.4)] bg-[rgba(175,170,162,0.2)] text-[#f0ede8]"
              : "border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.08)] text-[#8a8780] hover:text-[#f0ede8]"
          }`}
        >
          Refine
        </button>

        <button
          onClick={onSelectClick}
          className="rounded-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.08)] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[#8a8780] transition-colors hover:text-[#f0ede8]"
        >
          Select
        </button>
      </div>

      {showRefine && (
        <div className="mt-4 rounded-2xl border border-[rgba(195,190,182,0.2)] bg-[rgba(175,170,162,0.06)] p-3">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.2em] text-[#8a8780] pointer-events-none">
                Find
              </span>
              <input
                type="text"
                placeholder="Find a look, mood, or idea"
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
              onChange={(e) => {
                const value = e.target.value as "date-desc" | "date-asc" | "favorites"
                onSortChange(value)
              }}
              className="px-4 py-2.5 rounded-lg border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] text-[#a8a49c] backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-[rgba(195,190,182,0.30)] transition-all cursor-pointer appearance-none pr-8 text-[12px] font-medium stone-chip"
            >
              <option value="date-desc">New first</option>
              <option value="date-asc">Old first</option>
              <option value="favorites">Saved first</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
