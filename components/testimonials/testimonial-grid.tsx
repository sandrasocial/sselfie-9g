"use client"

import { useEffect, useState } from "react"
import { TestimonialCard } from "./testimonial-card"
import { Loader2 } from 'lucide-react'

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

export default function TestimonialGrid() {
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
        <Loader2 className="w-8 h-8 animate-spin text-stone-500" />
      </div>
    )
  }

  if (testimonials.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm font-light tracking-wider uppercase text-stone-500">No testimonials yet</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
      {testimonials.map((testimonial, index) => {
        const imageUrls = [
          testimonial.screenshot_url,
          testimonial.image_url_2,
          testimonial.image_url_3,
          testimonial.image_url_4,
        ].filter((url): url is string => url !== null && url !== undefined)

        return (
          <div key={testimonial.id} className="rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
            <TestimonialCard
              customerName={testimonial.customer_name}
              testimonialText={testimonial.testimonial_text}
              rating={testimonial.rating}
              imageUrls={imageUrls}
              variant={index % 3 === 1 ? "dark" : "light"}
              featured={index === 0}
            />
          </div>
        )
      })}
    </div>
  )
}
