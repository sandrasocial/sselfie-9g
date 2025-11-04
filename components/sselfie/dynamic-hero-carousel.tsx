"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface HeroImage {
  id: number
  image_url: string
  prompt: string
  description: string | null
  category: string
  created_at: string
}

interface DynamicHeroCarouselProps {
  images: HeroImage[]
  userName: string
}

export function DynamicHeroCarousel({ images, userName }: DynamicHeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  useEffect(() => {
    if (!isAutoPlaying || images.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [isAutoPlaying, images.length])

  const goToPrevious = () => {
    setIsAutoPlaying(false)
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const goToNext = () => {
    setIsAutoPlaying(false)
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  if (images.length === 0) {
    return (
      <div className="relative h-[30vh] sm:h-[35vh] md:h-[40vh] overflow-hidden -mx-4 sm:-mx-6 md:-mx-8 -mt-4 sm:-mt-6">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/618-TVCuZVG8V6R2Bput7pX8V06bCHRXGx-KiEHLMVJx8qGrf7hZT6zRgx93bcBkj.png"
          alt="Studio workspace"
          className="w-full h-full object-cover object-top"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/70" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xs sm:text-sm tracking-[0.3em] uppercase font-light text-white/80 mb-4">Welcome Back</p>
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-['Times_New_Roman'] font-extralight tracking-[0.3em] sm:tracking-[0.4em] text-white uppercase leading-none mb-3">
              {userName}
            </h1>
            <p className="text-sm sm:text-base font-light text-white/80 tracking-wider">Your Creative Studio</p>
          </div>
        </div>
      </div>
    )
  }

  const currentImage = images[currentIndex]

  return (
    <div className="relative h-[30vh] sm:h-[35vh] md:h-[40vh] overflow-hidden -mx-4 sm:-mx-6 md:-mx-8 -mt-4 sm:-mt-6 group">
      {/* Image */}
      <div className="relative w-full h-full">
        {images.map((image, index) => (
          <img
            key={image.id}
            src={image.image_url || "/placeholder.svg"}
            alt={image.description || image.category}
            className={`absolute inset-0 w-full h-full object-cover object-top transition-opacity duration-1000 ${
              index === currentIndex ? "opacity-100" : "opacity-0"
            }`}
            loading={index === 0 ? "eager" : "lazy"}
          />
        ))}
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/70" />

      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center px-6">
          <p className="text-xs sm:text-sm tracking-[0.3em] uppercase font-light text-white/80 mb-4">Welcome Back</p>
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-['Times_New_Roman'] font-extralight tracking-[0.3em] sm:tracking-[0.4em] text-white uppercase leading-none mb-3">
            {userName}
          </h1>
          <p className="text-sm sm:text-base font-light text-white/80 tracking-wider">{currentImage.category}</p>
        </div>
      </div>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/80 backdrop-blur-xl rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white hover:scale-110 active:scale-95"
            aria-label="Previous image"
          >
            <ChevronLeft size={20} className="text-stone-900" strokeWidth={1.5} />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 bg-white/80 backdrop-blur-xl rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white hover:scale-110 active:scale-95"
            aria-label="Next image"
          >
            <ChevronRight size={20} className="text-stone-900" strokeWidth={1.5} />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index)
                setIsAutoPlaying(false)
              }}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex ? "bg-white w-6" : "bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
