"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { DesignClasses } from "@/lib/design-tokens"

interface GalleryFiltersProps {
  contentFilter: "all" | "photos" | "videos"
  onContentFilterChange: (filter: "all" | "photos" | "videos") => void
  selectedCategory: string
  onCategoryChange: (category: string) => void
}

export function GalleryFilters({
  contentFilter,
  onContentFilterChange,
  selectedCategory,
  onCategoryChange,
}: GalleryFiltersProps) {
  const categoryScrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)

  useEffect(() => {
    const handleScroll = () => {
      if (categoryScrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = categoryScrollRef.current
        setShowLeftArrow(scrollLeft > 10)
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10)
      }
    }

    const scrollContainer = categoryScrollRef.current
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll)
      handleScroll()
    }

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener("scroll", handleScroll)
      }
    }
  }, [selectedCategory])

  const scrollCategory = (direction: "left" | "right") => {
    if (categoryScrollRef.current) {
      const scrollAmount = 200
      categoryScrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  const categories = [
    { key: "all", label: "All" },
    { key: "favorited", label: "Favorited" },
    { key: "close-up", label: "Close-Up" },
    { key: "half-body", label: "Half-Body" },
    { key: "full-body", label: "Full-Body" },
    { key: "scenery", label: "Scenery" },
    { key: "flatlay", label: "Flatlay" },
  ]

  return (
    <div className={`bg-stone-100/40 ${DesignClasses.radius.lg} ${DesignClasses.spacing.padding.md} ${DesignClasses.border.stone}`}>
      <div className="flex gap-2 mb-4 pb-4 border-b border-stone-200/40">
        {[
          { key: "all", label: "All Content" },
          { key: "photos", label: "Photos" },
          { key: "videos", label: "Videos" },
        ].map((filter) => (
          <button
            key={filter.key}
            onClick={() => onContentFilterChange(filter.key as "all" | "photos" | "videos")}
            className={`px-3 sm:px-4 py-2 text-[10px] sm:text-xs tracking-[0.15em] uppercase font-light border border-stone-200/40 rounded-full transition-all duration-200 whitespace-nowrap flex-shrink-0 min-h-[36px] sm:min-h-[40px] ${
              contentFilter === filter.key ? "bg-stone-950 text-white" : "bg-stone-50 hover:bg-stone-100"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="relative">
        {showLeftArrow && (
          <button
            onClick={() => scrollCategory("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-stone-950 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        {showRightArrow && (
          <button
            onClick={() => scrollCategory("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-stone-950 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
          >
            <ChevronRight size={16} />
          </button>
        )}
        <div
          ref={categoryScrollRef}
          className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide relative"
          style={{
            maskImage:
              showLeftArrow || showRightArrow
                ? "linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)"
                : "none",
            WebkitMaskImage:
              showLeftArrow || showRightArrow
                ? "linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)"
                : "none",
          }}
        >
          {categories.map((category) => (
            <button
              key={category.key}
              onClick={() => onCategoryChange(category.key)}
              className={`px-3 sm:px-4 py-2 text-[10px] sm:text-xs tracking-[0.15em] uppercase font-light border border-stone-200/40 rounded-full transition-all duration-200 whitespace-nowrap flex-shrink-0 min-h-[36px] sm:min-h-[40px] ${
                selectedCategory === category.key ? "bg-stone-950 text-white" : "bg-stone-50 hover:bg-stone-100"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

