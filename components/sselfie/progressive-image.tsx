"use client"

import { useState, useEffect } from "react"

interface ProgressiveImageProps {
  src: string
  alt: string
  className?: string
  thumbnailSrc?: string
  onLoad?: () => void
}

export function ProgressiveImage({ src, alt, className = "", thumbnailSrc, onLoad }: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [currentSrc, setCurrentSrc] = useState(thumbnailSrc || src)

  useEffect(() => {
    const img = new Image()
    img.src = src
    img.onload = () => {
      setCurrentSrc(src)
      setIsLoaded(true)
      onLoad?.()
    }
  }, [src, onLoad])

  return (
    <div className="relative w-full h-full">
      <img
        src={currentSrc || "/placeholder.svg"}
        alt={alt}
        className={`${className} transition-all duration-500 ${isLoaded ? "blur-0 opacity-100" : "blur-md opacity-70"}`}
        loading="lazy"
      />
      {!isLoaded && <div className="absolute inset-0 bg-stone-200/50 animate-pulse" />}
    </div>
  )
}
