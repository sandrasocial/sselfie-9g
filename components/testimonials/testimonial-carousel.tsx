"use client"

import { useEffect, useState, useRef } from "react"
import { TestimonialCard } from "./testimonial-card"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface Testimonial {
  id: number
  customer_name: string
  testimonial_text: string
  rating: number
  screenshot_url: string | null
  image_url_2: string | null
  image_url_3: string | null
  image_url_4: string | null
  collected_at: string
}

export default function TestimonialCarousel() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const response = await fetch("/api/testimonials/published")
        if (response.ok) {
          const data = await response.json()
          setTestimonials(data.testimonials || [])
        }
      } catch (error) {
        console.error("[v0] Error fetching testimonials:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchTestimonials()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (testimonials.length === 0) return null

  const prev = () => setCurrent((c) => (c === 0 ? testimonials.length - 1 : c - 1))
  const next = () => setCurrent((c) => (c === testimonials.length - 1 ? 0 : c + 1))

  // Swipe support
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (delta < -40) next()
    else if (delta > 40) prev()
    touchStartX.current = null
  }

  const testimonial = testimonials[current]
  const imageUrls = [
    testimonial.screenshot_url,
    testimonial.image_url_2,
    testimonial.image_url_3,
    testimonial.image_url_4,
  ].filter((url): url is string => Boolean(url))

  return (
    <div className="w-full flex flex-col items-center gap-5">
      {/* Card - single at a time, swipeable */}
      <div
        className="w-full max-w-[420px] mx-auto"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <TestimonialCard
          key={testimonial.id}
          customerName={testimonial.customer_name}
          testimonialText={testimonial.testimonial_text}
          rating={testimonial.rating}
          imageUrls={imageUrls}
          variant="light"
        />
      </div>

      {/* Controls - only shown when there's more than one */}
      {testimonials.length > 1 && (
        <div className="flex items-center gap-4">
          <button
            onClick={prev}
            aria-label="Previous testimonial"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: "rgba(175,170,162,0.15)",
              border: "1px solid rgba(195,190,182,0.25)",
              color: "#a8a49c",
            }}
          >
            <ChevronLeft size={16} />
          </button>

          {/* Dots */}
          <div className="flex gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Go to testimonial ${i + 1}`}
                className="rounded-full transition-all"
                style={{
                  width: i === current ? "20px" : "6px",
                  height: "6px",
                  background: i === current ? "#c8c4bb" : "rgba(195,190,182,0.3)",
                }}
              />
            ))}
          </div>

          <button
            onClick={next}
            aria-label="Next testimonial"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: "rgba(175,170,162,0.15)",
              border: "1px solid rgba(195,190,182,0.25)",
              color: "#a8a49c",
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Counter */}
      {testimonials.length > 1 && (
        <p
          className="text-[10px] uppercase tracking-[0.2em]"
          style={{ color: "#8a8780", fontFamily: "Inter, sans-serif" }}
        >
          {current + 1} / {testimonials.length}
        </p>
      )}
    </div>
  )
}
