"use client"

import { Search, X } from "lucide-react"

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
    <div className="pt-6 pb-4">
      {/* Title - Hatton serif like Maya */}
      <h1
        style={{
          fontFamily: 'Hatton, Georgia, serif',
          fontSize: '28px',
          fontWeight: 300,
          letterSpacing: '0.3em',
          color: '#1C1917',
          textTransform: 'uppercase',
          marginBottom: '12px',
        }}
      >
        GALLERY
      </h1>

      {/* Stats - Inter Medium */}
      {stats && (
        <div className="flex items-center gap-4 mb-6 text-sm">
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              color: '#78716C',
            }}
          >
            {stats.totalGenerated || 0} photos
          </span>
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              color: '#78716C',
            }}
          >
            {stats.totalFavorites || stats.favorites || 0} favorites
          </span>
        </div>
      )}

      {/* Search & Sort Row */}
      <div className="flex gap-3">
        {/* Search Bar */}
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by description..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              fontWeight: 400,
            }}
            className="w-full pl-10 pr-10 py-2.5 bg-stone-100/50 border border-stone-200/30 rounded-lg text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-950/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as any)}
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            fontWeight: 500,
            letterSpacing: '0.02em',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2378716b' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 0.5rem center",
          }}
          className="px-4 py-2.5 bg-stone-100/50 border border-stone-200/30 rounded-lg text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-950/20 transition-all cursor-pointer appearance-none pr-8"
        >
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="favorites">Favorites</option>
        </select>

        {/* Select Button */}
        <button
          onClick={onSelectClick}
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}
          className="px-4 py-2.5 bg-stone-100/50 border border-stone-200/30 rounded-lg text-stone-700 hover:bg-stone-100/70 transition-all"
        >
          Select
        </button>
      </div>
    </div>
  )
}

