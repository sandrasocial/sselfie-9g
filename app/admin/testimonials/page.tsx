"use client"

import { useState, useEffect } from "react"
import { Loader2, CheckCircle, Clock, Star, ImageIcon, ThumbsUp, ThumbsDown } from 'lucide-react'
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface Testimonial {
  id: number
  customer_name: string
  customer_email: string
  testimonial_text: string
  testimonial_type: string
  source: string
  rating: number
  screenshot_url: string | null
  image_url_2: string | null
  image_url_3: string | null
  image_url_4: string | null
  sentiment: string
  is_featured: boolean
  is_published: boolean
  collected_at: string
  created_at: string
  updated_at: string
}

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>("pending")

  useEffect(() => {
    fetchTestimonials()
  }, [filterStatus])

  const fetchTestimonials = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus === "pending") params.set("published", "false")
      if (filterStatus === "published") params.set("published", "true")

      const response = await fetch(`/api/admin/testimonials?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setTestimonials(data.testimonials || [])
      }
    } catch (error) {
      console.error("Error fetching testimonials:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateTestimonial = async (id: number, updates: Partial<Testimonial>) => {
    try {
      const response = await fetch("/api/admin/testimonials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      })

      if (response.ok) {
        fetchTestimonials()
      }
    } catch (error) {
      console.error("Error updating testimonial:", error)
    }
  }

  const getImages = (testimonial: Testimonial) => {
    return [
      testimonial.screenshot_url,
      testimonial.image_url_2,
      testimonial.image_url_3,
      testimonial.image_url_4,
    ].filter(Boolean) as string[]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-950" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-4xl font-extralight tracking-[0.3em] uppercase text-stone-950">
              Testimonials
            </h1>
            <p className="text-sm text-stone-600 mt-2 font-light">Manage and approve customer testimonials</p>
          </div>
          <Link
            href="/admin"
            className="px-6 py-3 bg-stone-950 text-white rounded-xl text-sm tracking-wider uppercase hover:bg-stone-800 transition-colors font-light"
          >
            Back to Admin
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-6 mb-6 border border-stone-200">
          <div className="flex gap-4 items-center flex-wrap">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-stone-200 rounded-lg text-sm bg-white"
            >
              <option value="all">All Testimonials</option>
              <option value="pending">Pending Approval</option>
              <option value="published">Published</option>
            </select>
            <span className="text-sm text-stone-500 ml-auto font-light">{testimonials.length} testimonials</span>
          </div>
        </div>

        <div className="space-y-4">
          {testimonials.map((testimonial) => {
            const images = getImages(testimonial)

            return (
              <div
                key={testimonial.id}
                className="bg-white rounded-2xl p-6 border border-stone-200 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div>{testimonial.is_published ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Clock className="w-5 h-5 text-amber-500" />}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-light uppercase tracking-wider ${
                            testimonial.is_published ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {testimonial.is_published ? "Published" : "Pending"}
                        </span>
                        {testimonial.is_featured && (
                          <span className="px-3 py-1 rounded-lg text-xs font-light uppercase tracking-wider bg-stone-900 text-white">
                            Featured
                          </span>
                        )}
                        <span className="text-xs text-stone-500 font-light">
                          {new Date(testimonial.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <div className="flex gap-1 mb-3">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-stone-950 text-stone-950" />
                        ))}
                      </div>

                      <h3 className="font-serif text-xl font-extralight text-stone-950 mb-2 tracking-wide">
                        {testimonial.customer_name}
                      </h3>
                      <p className="text-sm text-stone-600 leading-relaxed mb-3 font-light">
                        {testimonial.testimonial_text}
                      </p>

                      {images.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
                          {images.map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="group">
                              <img
                                src={url || "/placeholder.svg"}
                                alt={`SSELFIE ${idx + 1}`}
                                className="w-full h-32 object-cover rounded-lg border border-stone-200 group-hover:border-stone-400 transition-colors"
                              />
                            </a>
                          ))}
                        </div>
                      )}

                      <div className="text-xs text-stone-500 font-light">
                        <span className="font-medium">Email:</span> {testimonial.customer_email}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-col">
                    {!testimonial.is_published ? (
                      <>
                        <Button
                          onClick={() => updateTestimonial(testimonial.id, { is_published: true })}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <ThumbsUp className="w-3 h-3 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => updateTestimonial(testimonial.id, { is_published: false })}
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50"
                        >
                          <ThumbsDown className="w-3 h-3 mr-2" />
                          Reject
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => updateTestimonial(testimonial.id, { is_featured: !testimonial.is_featured })}
                          size="sm"
                          variant="outline"
                          className="border-stone-300 hover:bg-stone-100"
                        >
                          {testimonial.is_featured ? "Unfeature" : "Feature"}
                        </Button>
                        <Button
                          onClick={() => updateTestimonial(testimonial.id, { is_published: false })}
                          size="sm"
                          variant="outline"
                          className="border-stone-300 hover:bg-stone-100"
                        >
                          Unpublish
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {testimonials.length === 0 && (
          <div className="text-center py-12">
            <ImageIcon className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-500 font-light">
              {filterStatus === "pending" ? "No pending testimonials" : "No testimonials yet"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
