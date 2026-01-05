"use client"

import { useEffect, useState } from "react"
import { TestimonialCard } from "./testimonial-card"

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

  if (testimonials.length === 0) {
    return null
  }

  // Duplicate testimonials for seamless loop
  const duplicatedTestimonials = [...testimonials, ...testimonials]

  return (
    <div className="relative overflow-hidden">
      <div className="flex animate-scroll gap-6">
        {duplicatedTestimonials.map((testimonial, index) => {
          const imageUrls = [
            testimonial.screenshot_url,
            testimonial.image_url_2,
            testimonial.image_url_3,
            testimonial.image_url_4,
          ].filter((url): url is string => url !== null && url !== undefined)

          return (
            <div key={`${testimonial.id}-${index}`} className="flex-shrink-0 w-[300px] sm:w-[400px]">
              <TestimonialCard
                customerName={testimonial.customer_name}
                testimonialText={testimonial.testimonial_text}
                rating={testimonial.rating}
                imageUrls={imageUrls}
                variant={index % 2 === 0 ? "light" : "dark"}
              />
            </div>
          )
        })}
      </div>
      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll {
          animation: scroll 60s linear infinite;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  )
}

