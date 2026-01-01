"use client"

import { Search, X } from "lucide-react"
import { DesignClasses } from "@/lib/design-tokens"

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
    <div className="pt-3 sm:pt-4">
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-extralight tracking-[0.2em] sm:tracking-[0.3em] text-stone-950 uppercase mb-2">
            Gallery
          </h1>
          {stats && (
            <div className="flex items-center gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 font-light">{stats.totalGenerated || 0}</span>
                <span className="text-stone-400">photos</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 font-light">{stats.totalFavorites || stats.favorites || 0}</span>
                <span className="text-stone-400">favorites</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSelectClick}
            className={`px-3 sm:px-4 py-2 ${DesignClasses.typography.label.uppercase} bg-stone-100/50 ${DesignClasses.border.stone} ${DesignClasses.radius.sm} hover:bg-stone-100/70 transition-all duration-200 min-h-[36px] sm:min-h-[40px]`}
          >
            Select
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search by description..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full pl-10 pr-10 py-2 ${DesignClasses.typography.body.medium} bg-stone-100/50 ${DesignClasses.border.stone} ${DesignClasses.radius.md} focus:outline-none focus:ring-2 focus:ring-stone-950/20 transition-all`}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as any)}
          className={`px-3 py-2 ${DesignClasses.typography.body.small} bg-stone-100/50 ${DesignClasses.border.stone} ${DesignClasses.radius.md} focus:outline-none focus:ring-2 focus:ring-stone-950/20 transition-all appearance-none pr-8`}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 0.5rem center",
          }}
        >
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="favorites">Favorites First</option>
        </select>
      </div>
    </div>
  )
}

