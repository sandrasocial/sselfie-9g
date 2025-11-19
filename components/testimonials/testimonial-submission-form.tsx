"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X, Star, Sparkles, Check } from 'lucide-react'

export function TestimonialSubmissionForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    testimonial: "",
    rating: 5,
  })
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) throw new Error("Upload failed")

        const data = await response.json()
        return data.url
      })

      const urls = await Promise.all(uploadPromises)
      setPhotos((prev) => [...prev, ...urls].slice(0, 4)) // Max 4 photos
    } catch (error) {
      console.error("Error uploading photos:", error)
      alert("Failed to upload photos. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.testimonial) {
      alert("Please fill in all required fields")
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch("/api/testimonials/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          photos,
        }),
      })

      if (!response.ok) throw new Error("Submission failed")

      setSubmitted(true)
    } catch (error) {
      console.error("Error submitting testimonial:", error)
      alert("Failed to submit testimonial. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Card className="border-stone-200 shadow-lg">
        <CardContent className="p-12 text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-stone-950 p-4">
              <Check className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-light text-stone-950 mb-4 tracking-wide">Thank You!</h2>
          <p className="text-stone-600 font-light leading-relaxed mb-6">
            Your story has been submitted successfully. Sandra will review it and reach out to you soon!
          </p>
          <p className="text-sm text-stone-500 font-light italic">
            Your testimonial will appear on the website once approved.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-stone-200 shadow-lg">
      <CardContent className="p-8 md:p-12">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Name & Email */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-light text-stone-700 mb-2 tracking-wider uppercase">
                Your Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your name"
                className="border-stone-300 focus:border-stone-950"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-light text-stone-700 mb-2 tracking-wider uppercase">
                Email Address *
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
                className="border-stone-300 focus:border-stone-950"
                required
              />
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-light text-stone-700 mb-3 tracking-wider uppercase">
              How would you rate your experience? *
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFormData({ ...formData, rating: star })}
                  className="group"
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= formData.rating
                        ? "fill-stone-950 text-stone-950"
                        : "fill-none text-stone-300 group-hover:text-stone-400"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <div>
            <label className="block text-sm font-light text-stone-700 mb-2 tracking-wider uppercase">
              Your Testimonial *
            </label>
            <Textarea
              value={formData.testimonial}
              onChange={(e) => setFormData({ ...formData, testimonial: e.target.value })}
              placeholder="Share your favorite part of SSELFIE, how it's helped you, or the transformation you've experienced..."
              className="border-stone-300 focus:border-stone-950 min-h-[180px] resize-none"
              required
            />
            <p className="text-xs text-stone-500 mt-2 font-light">
              Tip: Be authentic! Share what resonated with you most.
            </p>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-light text-stone-700 mb-3 tracking-wider uppercase">
              Add Your Favorite SSELFIE Photos (Optional)
            </label>

            {photos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                    <img src={photo || "/placeholder.svg"} alt={`SSELFIE ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-2 right-2 bg-stone-950 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photos.length < 4 && (
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-stone-300 rounded-lg p-8 cursor-pointer hover:border-stone-950 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploading}
                />
                {uploading ? (
                  <Sparkles className="h-8 w-8 text-stone-400 animate-spin mb-3" />
                ) : (
                  <Upload className="h-8 w-8 text-stone-400 mb-3" />
                )}
                <p className="text-sm text-stone-600 font-light text-center">
                  {uploading ? "Uploading..." : "Click to upload photos"}
                </p>
                <p className="text-xs text-stone-500 mt-1 font-light">
                  {photos.length > 0 ? `${4 - photos.length} more photos allowed` : "Up to 4 photos"}
                </p>
              </label>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={submitting || uploading}
            className="w-full bg-stone-950 hover:bg-stone-800 text-white py-6 text-sm tracking-wider uppercase"
          >
            {submitting ? "Submitting..." : "Share Your Story"}
          </Button>

          <p className="text-xs text-stone-500 text-center font-light">
            By submitting, you agree to let SSELFIE feature your testimonial and photos on the website.
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
