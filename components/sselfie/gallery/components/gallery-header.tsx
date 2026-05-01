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
    <div className="mx-4 mt-4 rounded-[16px] border border-[color:var(--app-glass-border)] bg-[rgba(255,255,255,0.74)] px-4 pt-6 pb-4 shadow-[0_18px_50px_rgba(61,56,48,0.08)] backdrop-blur-[18px] sm:mx-6">
      <p className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.5em] text-[color:var(--app-text-secondary)] mb-2">Maya</p>
      <h1 className="mb-3 text-[28px] font-['Cormorant_Garamond'] font-light text-[color:var(--app-text-primary)]">
        Your visual library
      </h1>
      <p className="mb-4 text-sm text-[color:var(--app-text-secondary)]">Your personal brand images, all in one place.</p>

      {stats && (
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-[4px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--app-text-secondary)]">
            {stats.totalGenerated || 0} photos
          </span>
          <span className="rounded-[4px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--app-text-secondary)]">
            {stats.totalFavorites || stats.favorites || 0} saved
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onViewModeChange("moodboard")}
          className={`rounded-[6px] border px-4 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors ${
            viewMode === "moodboard"
              ? "border-[color:var(--app-btn-primary-bg)] bg-[color:var(--app-btn-primary-bg)] text-[color:var(--app-btn-primary-text)]"
              : "border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] text-[color:var(--app-text-secondary)] hover:text-[color:var(--app-text-primary)]"
          }`}
        >
          Moodboard
        </button>
        <button
          onClick={() => onViewModeChange("grid")}
          className={`rounded-[6px] border px-4 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors ${
            viewMode === "grid"
              ? "border-[color:var(--app-btn-primary-bg)] bg-[color:var(--app-btn-primary-bg)] text-[color:var(--app-btn-primary-text)]"
              : "border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] text-[color:var(--app-text-secondary)] hover:text-[color:var(--app-text-primary)]"
          }`}
        >
          Grid
        </button>
        <button
          onClick={onToggleRefine}
          className={`rounded-[6px] border px-4 py-2 text-[11px] uppercase tracking-[0.18em] transition-colors ${
            showRefine
              ? "border-[color:var(--app-btn-primary-bg)] bg-[color:var(--app-btn-primary-bg)] text-[color:var(--app-btn-primary-text)]"
              : "border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] text-[color:var(--app-text-secondary)] hover:text-[color:var(--app-text-primary)]"
          }`}
        >
          Refine
        </button>

        <button
          onClick={onSelectClick}
          className="rounded-[6px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[color:var(--app-text-secondary)] transition-colors hover:text-[color:var(--app-text-primary)]"
        >
          Select
        </button>
      </div>

      {showRefine && (
        <div className="mt-4 rounded-[12px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] p-3">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-[0.2em] text-[color:var(--app-text-secondary)] pointer-events-none">
                Find
              </span>
              <input
                type="text"
                placeholder="Find a look, mood, or idea"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-14 pr-12 py-2.5 rounded-[8px] border border-[color:var(--app-input-border)] bg-[color:var(--app-input-bg)] text-[color:var(--app-text-primary)] placeholder:text-[color:var(--app-text-muted)] backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-[color:var(--app-focus-ring)] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--app-text-secondary)] hover:text-[color:var(--app-text-primary)] transition-colors"
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
              className="px-4 py-2.5 rounded-[8px] border border-[color:var(--app-input-border)] bg-[rgba(255,255,255,0.62)] text-[color:var(--app-text-primary)] backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-[color:var(--app-focus-ring)] transition-all cursor-pointer appearance-none pr-8 text-[12px] font-medium"
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
