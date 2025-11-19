"use client"

import { useState, forwardRef } from "react"
import { Star, ChevronLeft, ChevronRight } from 'lucide-react'

interface TestimonialCardProps {
  customerName: string
  testimonialText: string
  rating: number
  imageUrl?: string | null
  imageUrls?: string[]
  variant?: "light" | "dark"
  featured?: boolean
}

export const TestimonialCard = forwardRef<HTMLDivElement, TestimonialCardProps>(
  ({ customerName, testimonialText, rating, imageUrl, imageUrls, variant = "light", featured = false }, ref) => {
    const isDark = variant === "dark"
    const images = imageUrls && imageUrls.length > 0 ? imageUrls : imageUrl ? [imageUrl] : []
    const [currentIndex, setCurrentIndex] = useState(0)
    const hasMultipleImages = images.length > 1

    const handlePrevious = () => {
      setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
    }

    const handleNext = () => {
      setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
    }

    return (
      <div
        ref={ref}
        className={`w-full max-w-[470px] ${
          isDark ? "bg-stone-950" : "bg-white"
        } rounded-2xl overflow-hidden shadow-lg`}
      >
        <div className={`flex items-center gap-3 px-4 py-3 border-b ${
          isDark ? "border-stone-800" : "border-stone-100"
        }`}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-[2px]">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <span className="text-xs font-bold text-stone-950">S</span>
            </div>
          </div>
          <div>
            <p className={`text-sm font-semibold ${isDark ? "text-white" : "text-stone-950"}`}>sselfie</p>
            <p className={`text-xs ${isDark ? "text-stone-400" : "text-stone-500"}`}>Client Testimonial</p>
          </div>
        </div>

        {images.length > 0 ? (
          <div className="relative aspect-square bg-stone-100 group">
            <img
              src={images[currentIndex] || "/placeholder.svg"}
              alt={`${customerName}'s photo`}
              className="w-full h-full object-cover object-top"
            />

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center">
              <div className="font-serif text-3xl font-extralight tracking-[0.3em] uppercase text-white drop-shadow-lg">
                SSELFIE
              </div>
              <div className="text-[10px] tracking-[0.2em] uppercase font-light text-white/90 drop-shadow">
                sselfie.ai
              </div>
            </div>

            {/* Carousel navigation */}
            {hasMultipleImages && (
              <>
                <button
                  onClick={handlePrevious}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={20} className="text-stone-950" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  aria-label="Next image"
                >
                  <ChevronRight size={20} className="text-stone-950" />
                </button>

                {/* Carousel dots */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={`h-1.5 rounded-full transition-all ${
                        index === currentIndex ? "bg-white w-6" : "bg-white/50 w-1.5"
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>

                {/* Image counter */}
                <div className="absolute top-3 right-3 px-2 py-1 bg-stone-950/70 backdrop-blur-sm rounded-lg">
                  <span className="text-xs text-white font-medium">
                    {currentIndex + 1}/{images.length}
                  </span>
                </div>
              </>
            )}

            {featured && (
              <div className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full">
                <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-stone-950">
                  Featured
                </span>
              </div>
            )}
          </div>
        ) : (
          // Fallback if no images
          <div className="relative aspect-square bg-stone-100 flex items-center justify-center">
            <div className="text-center space-y-4 p-8">
              <div className="font-serif text-[80px] font-extralight tracking-[0.3em] uppercase text-stone-200">
                SSELFIE
              </div>
            </div>
          </div>
        )}

        <div className={`px-4 py-3 space-y-2 ${isDark ? "text-white" : "text-stone-950"}`}>
          {/* Rating stars */}
          <div className="flex gap-1">
            {[...Array(rating)].map((_, i) => (
              <Star key={i} className={`h-4 w-4 ${isDark ? "fill-yellow-400 text-yellow-400" : "fill-yellow-500 text-yellow-500"}`} />
            ))}
          </div>

          {/* Caption with customer name and testimonial */}
          <div className="text-sm">
            <span className="font-semibold">{customerName}</span>{" "}
            <span className={isDark ? "text-stone-300" : "text-stone-950"}>{testimonialText}</span>
          </div>

          <p className={`text-xs uppercase tracking-wide ${isDark ? "text-stone-500" : "text-stone-400"}`}>
            Just now
          </p>
        </div>
      </div>
    )
  }
)

TestimonialCard.displayName = "TestimonialCard"
