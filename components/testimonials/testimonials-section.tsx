"use client"

import { useEffect, useState } from "react"
import { Star } from 'lucide-react'
import Link from 'next/link'

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

export function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/testimonials/published")
      .then((res) => res.json())
      .then((data) => {
        setTestimonials(data.testimonials || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading || testimonials.length === 0) return null

  return (
    <section className="py-20 bg-gradient-to-b from-white to-stone-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-serif text-5xl md:text-6xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
            Love Stories
          </h2>
          <p className="text-lg text-stone-600 font-light max-w-2xl mx-auto leading-relaxed">
            Real women. Real results. Real confidence.
          </p>
        </div>

        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 max-w-7xl mx-auto space-y-6">
          {testimonials.map((testimonial) => {
            const images = [
              testimonial.screenshot_url,
              testimonial.image_url_2,
              testimonial.image_url_3,
              testimonial.image_url_4,
            ].filter(Boolean) as string[]

            return (
              <div
                key={testimonial.id}
                className="break-inside-avoid bg-white border border-stone-200 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
              >
                {images.length > 0 && (
                  <div className="relative">
                    {images.length === 1 ? (
                      <img
                        src={images[0] || "/placeholder.svg"}
                        alt={`${testimonial.customer_name}'s SSELFIE`}
                        className="w-full h-80 object-cover"
                      />
                    ) : (
                      <div className="grid grid-cols-2 gap-1 p-1">
                        {images.slice(0, 4).map((url, idx) => (
                          <img
                            key={idx}
                            src={url || "/placeholder.svg"}
                            alt={`${testimonial.customer_name}'s SSELFIE ${idx + 1}`}
                            className="w-full h-40 object-cover rounded-lg"
                          />
                        ))}
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex gap-0.5">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-stone-950 text-stone-950" />
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-6">
                  {images.length === 0 && (
                    <div className="flex gap-0.5 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-stone-950 text-stone-950" />
                      ))}
                    </div>
                  )}

                  <p className="text-stone-700 font-light leading-relaxed mb-6 text-balance">
                    &quot;{testimonial.testimonial_text}&quot;
                  </p>

                  <div className="pt-4 border-t border-stone-200">
                    <p className="font-serif text-base font-light text-stone-950 tracking-wide">
                      {testimonial.customer_name}
                    </p>
                    <p className="text-xs text-stone-500 font-light uppercase tracking-wider mt-1">
                      SSELFIE Studio
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-16 text-center">
          <Link
            href="/share-your-story"
            className="inline-block px-8 py-4 bg-stone-950 text-white rounded-xl font-light tracking-wider uppercase hover:bg-stone-800 transition-colors"
          >
            Share Your Story
          </Link>
        </div>
      </div>
    </section>
  )
}
