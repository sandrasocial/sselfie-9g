"use client"

import { useState, useEffect } from "react"
import { Loader2, CheckCircle, Clock, Star, ImageIcon, ThumbsUp, ThumbsDown, Eye, Plus, Upload, X, Edit2 } from 'lucide-react'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { TestimonialCard } from "@/components/testimonials/testimonial-card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

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
  const [previewTestimonial, setPreviewTestimonial] = useState<Testimonial | null>(null)
  const [previewVariant, setPreviewVariant] = useState<"light" | "dark">("light")
  const [showManualUpload, setShowManualUpload] = useState(false)
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null)
  const [editForm, setEditForm] = useState({
    customer_name: "",
    testimonial_text: "",
    rating: 5,
    screenshot_url: null as string | null,
    image_url_2: null as string | null,
    image_url_3: null as string | null,
    image_url_4: null as string | null,
  })
  const [manualForm, setManualForm] = useState({
    customer_name: "",
    customer_email: "",
    testimonial_text: "",
    rating: 5,
    screenshot_url: null as string | null,
    image_url_2: null as string | null,
    image_url_3: null as string | null,
    image_url_4: null as string | null,
    source: "email"
  })
  const [uploadingImage, setUploadingImage] = useState<number | null>(null)
  const [uploadingEditImage, setUploadingEditImage] = useState<number | null>(null)

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
        setEditingTestimonial(null)
      }
    } catch (error) {
      console.error("Error updating testimonial:", error)
    }
  }

  const handleManualSubmit = async () => {
    try {
      const response = await fetch("/api/testimonials/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manualForm),
      })

      if (response.ok) {
        setShowManualUpload(false)
        setManualForm({
          customer_name: "",
          customer_email: "",
          testimonial_text: "",
          rating: 5,
          screenshot_url: null,
          image_url_2: null,
          image_url_3: null,
          image_url_4: null,
          source: "email"
        })
        fetchTestimonials()
      }
    } catch (error) {
      console.error("Error submitting manual testimonial:", error)
    }
  }

  const handleManualImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, imageKey: 'screenshot_url' | 'image_url_2' | 'image_url_3' | 'image_url_4') => {
    const file = e.target.files?.[0]
    if (!file) return

    const imageIndex = imageKey === 'screenshot_url' ? 1 : parseInt(imageKey.replace('image_url_', ''))
    setUploadingImage(imageIndex)

    try {
      const formData = new FormData()
      formData.append("file", file)

      console.log('[v0] Uploading image:', {
        key: imageKey,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      })

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      console.log('[v0] Upload response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('[v0] Upload successful, URL:', data.url)
        setManualForm(prev => ({ ...prev, [imageKey]: data.url }))
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[v0] Upload failed:', {
          status: response.status,
          error: errorData
        })
        alert(`Upload failed: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('[v0] Upload exception:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setUploadingImage(null)
    }
  }

  const handleRemoveManualImage = (imageKey: 'screenshot_url' | 'image_url_2' | 'image_url_3' | 'image_url_4') => {
    setManualForm(prev => ({ ...prev, [imageKey]: null }))
  }

  const handleEditClick = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial)
    setEditForm({
      customer_name: testimonial.customer_name,
      testimonial_text: testimonial.testimonial_text,
      rating: testimonial.rating,
      screenshot_url: testimonial.screenshot_url,
      image_url_2: testimonial.image_url_2,
      image_url_3: testimonial.image_url_3,
      image_url_4: testimonial.image_url_4,
    })
  }

  const handleSaveEdit = () => {
    if (editingTestimonial) {
      updateTestimonial(editingTestimonial.id, editForm)
    }
  }

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, imageKey: 'screenshot_url' | 'image_url_2' | 'image_url_3' | 'image_url_4') => {
    const file = e.target.files?.[0]
    if (!file) return

    const imageIndex = imageKey === 'screenshot_url' ? 1 : parseInt(imageKey.replace('image_url_', ''))
    setUploadingEditImage(imageIndex)

    try {
      const formData = new FormData()
      formData.append("file", file)

      console.log('[v0] Uploading edit image:', {
        key: imageKey,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      })

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      console.log('[v0] Upload response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('[v0] Upload successful, URL:', data.url)
        setEditForm(prev => ({ ...prev, [imageKey]: data.url }))
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[v0] Upload failed:', {
          status: response.status,
          error: errorData
        })
        alert(`Upload failed: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('[v0] Upload exception:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setUploadingEditImage(null)
    }
  }

  const handleRemoveEditImage = (imageKey: 'screenshot_url' | 'image_url_2' | 'image_url_3' | 'image_url_4') => {
    setEditForm(prev => ({ ...prev, [imageKey]: null }))
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
    <div className="min-h-screen bg-stone-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
          <div>
            <h1 className="font-serif text-2xl md:text-4xl font-extralight tracking-[0.3em] uppercase text-stone-950">
              Testimonials
            </h1>
            <p className="text-xs md:text-sm text-stone-600 mt-2 font-light">Manage and approve customer testimonials</p>
          </div>
          <div className="flex gap-2 md:gap-3">
            <Button
              onClick={() => setShowManualUpload(true)}
              className="px-4 md:px-6 py-2 md:py-3 bg-stone-950 text-white rounded-xl text-xs md:text-sm tracking-wider uppercase hover:bg-stone-800 transition-colors font-light"
            >
              <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Manual Upload</span>
              <span className="sm:hidden">Add</span>
            </Button>
            <Link
              href="/admin"
              className="px-4 md:px-6 py-2 md:py-3 bg-white border border-stone-200 text-stone-950 rounded-xl text-xs md:text-sm tracking-wider uppercase hover:bg-stone-50 transition-colors font-light inline-flex items-center"
            >
              Back
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-6 mb-4 md:mb-6 border border-stone-200">
          <div className="flex gap-4 items-center flex-wrap">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 md:px-4 py-2 border border-stone-200 rounded-lg text-xs md:text-sm bg-white flex-1 md:flex-initial"
            >
              <option value="all">All Testimonials</option>
              <option value="pending">Pending Approval</option>
              <option value="published">Published</option>
            </select>
            <span className="text-xs md:text-sm text-stone-500 font-light">{testimonials.length} testimonials</span>
          </div>
        </div>

        <div className="space-y-4">
          {testimonials.map((testimonial) => {
            const images = getImages(testimonial)

            return (
              <div
                key={testimonial.id}
                className="bg-white rounded-2xl p-4 md:p-6 border border-stone-200 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-3 md:gap-4 flex-1">
                    <div className="mt-1">{testimonial.is_published ? <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-500" /> : <Clock className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 md:gap-3 mb-3 flex-wrap">
                        <span
                          className={`px-2 md:px-3 py-1 rounded-lg text-xs font-light uppercase tracking-wider ${
                            testimonial.is_published ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {testimonial.is_published ? "Published" : "Pending"}
                        </span>
                        {testimonial.is_featured && (
                          <span className="px-2 md:px-3 py-1 rounded-lg text-xs font-light uppercase tracking-wider bg-stone-900 text-white">
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
                          <Star key={i} className="h-3 w-3 md:h-4 md:w-4 fill-stone-950 text-stone-950" />
                        ))}
                      </div>

                      <h3 className="font-serif text-lg md:text-xl font-extralight text-stone-950 mb-2 tracking-wide">
                        {testimonial.customer_name}
                      </h3>
                      <p className="text-xs md:text-sm text-stone-600 leading-relaxed mb-3 font-light break-words">
                        {testimonial.testimonial_text}
                      </p>

                      {images.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 my-4">
                          {images.map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="group">
                              <img
                                src={url || "/placeholder.svg"}
                                alt={`SSELFIE ${idx + 1}`}
                                className="w-full h-24 md:h-32 object-cover rounded-lg border border-stone-200 group-hover:border-stone-400 transition-colors"
                              />
                            </a>
                          ))}
                        </div>
                      )}

                      <div className="text-xs text-stone-500 font-light break-all">
                        <span className="font-medium">Email:</span> {testimonial.customer_email}
                      </div>
                    </div>
                  </div>

                  <div className="flex md:flex-col gap-2 flex-wrap md:flex-nowrap">
                    <Button
                      onClick={() => setPreviewTestimonial(testimonial)}
                      size="sm"
                      variant="outline"
                      className="border-stone-300 hover:bg-stone-100 flex-1 md:flex-initial text-xs"
                    >
                      <Eye className="w-3 h-3 mr-1 md:mr-2" />
                      <span className="hidden sm:inline">Preview</span>
                    </Button>
                    <Button
                      onClick={() => handleEditClick(testimonial)}
                      size="sm"
                      variant="outline"
                      className="border-stone-300 hover:bg-stone-100 flex-1 md:flex-initial text-xs"
                    >
                      <Edit2 className="w-3 h-3 mr-1 md:mr-2" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    {!testimonial.is_published ? (
                      <>
                        <Button
                          onClick={() => updateTestimonial(testimonial.id, { is_published: true })}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white flex-1 md:flex-initial text-xs"
                        >
                          <ThumbsUp className="w-3 h-3 mr-1 md:mr-2" />
                          <span className="hidden sm:inline">Approve</span>
                        </Button>
                        <Button
                          onClick={() => updateTestimonial(testimonial.id, { is_published: false })}
                          size="sm"
                          variant="outline"
                          className="border-red-300 text-red-600 hover:bg-red-50 flex-1 md:flex-initial text-xs"
                        >
                          <ThumbsDown className="w-3 h-3 mr-1 md:mr-2" />
                          <span className="hidden sm:inline">Reject</span>
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => updateTestimonial(testimonial.id, { is_featured: !testimonial.is_featured })}
                          size="sm"
                          variant="outline"
                          className="border-stone-300 hover:bg-stone-100 flex-1 md:flex-initial text-xs"
                        >
                          {testimonial.is_featured ? "Unfeature" : "Feature"}
                        </Button>
                        <Button
                          onClick={() => updateTestimonial(testimonial.id, { is_published: false })}
                          size="sm"
                          variant="outline"
                          className="border-stone-300 hover:bg-stone-100 flex-1 md:flex-initial text-xs"
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

      <Dialog open={!!previewTestimonial} onOpenChange={() => setPreviewTestimonial(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-extralight tracking-[0.3em] uppercase">
              Testimonial Preview
            </DialogTitle>
            <p className="text-sm text-stone-600 font-light">How this will appear on social media and landing page</p>
          </DialogHeader>
          {previewTestimonial && (
            <div className="space-y-6 pb-6">
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={() => setPreviewVariant("light")}
                  size="sm"
                  variant={previewVariant === "light" ? "default" : "outline"}
                  className="text-xs"
                >
                  Light
                </Button>
                <Button
                  onClick={() => setPreviewVariant("dark")}
                  size="sm"
                  variant={previewVariant === "dark" ? "default" : "outline"}
                  className="text-xs"
                >
                  Dark
                </Button>
              </div>
              <div className="max-w-md mx-auto">
                <TestimonialCard
                  customerName={previewTestimonial.customer_name}
                  testimonialText={previewTestimonial.testimonial_text}
                  rating={previewTestimonial.rating}
                  imageUrls={getImages(previewTestimonial)}
                  variant={previewVariant}
                  featured={previewTestimonial.is_featured}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showManualUpload} onOpenChange={setShowManualUpload}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-extralight tracking-[0.3em] uppercase">
              Manual Testimonial Upload
            </DialogTitle>
            <p className="text-sm text-stone-600 font-light">Add testimonials from emails or personal messages</p>
          </DialogHeader>
          <div className="space-y-4 pb-6">
            <div>
              <Label htmlFor="name" className="text-xs uppercase tracking-wider text-stone-600 font-light">Customer Name</Label>
              <Input
                id="name"
                value={manualForm.customer_name}
                onChange={(e) => setManualForm(prev => ({ ...prev, customer_name: e.target.value }))}
                placeholder="Enter customer name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-stone-600 font-light">Customer Email</Label>
              <Input
                id="email"
                type="email"
                value={manualForm.customer_email}
                onChange={(e) => setManualForm(prev => ({ ...prev, customer_email: e.target.value }))}
                placeholder="customer@example.com"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="testimonial" className="text-xs uppercase tracking-wider text-stone-600 font-light">Testimonial Text</Label>
              <Textarea
                id="testimonial"
                value={manualForm.testimonial_text}
                onChange={(e) => setManualForm(prev => ({ ...prev, testimonial_text: e.target.value }))}
                placeholder="Enter their testimonial..."
                rows={4}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="rating" className="text-xs uppercase tracking-wider text-stone-600 font-light">Rating</Label>
              <select
                id="rating"
                value={manualForm.rating}
                onChange={(e) => setManualForm(prev => ({ ...prev, rating: parseInt(e.target.value) }))}
                className="mt-1 w-full px-3 py-2 border border-stone-200 rounded-lg"
              >
                <option value={5}>5 Stars</option>
                <option value={4}>4 Stars</option>
                <option value={3}>3 Stars</option>
                <option value={2}>2 Stars</option>
                <option value={1}>1 Star</option>
              </select>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wider text-stone-600 font-light mb-3 block">
                Customer Images (Up to 4)
              </Label>
              <div className="grid grid-cols-2 gap-4">
                {(['screenshot_url', 'image_url_2', 'image_url_3', 'image_url_4'] as const).map((key, index) => {
                  const imageUrl = manualForm[key]
                  const imageIndex = key === 'screenshot_url' ? 1 : parseInt(key.replace('image_url_', ''))
                  
                  return (
                    <div key={key} className="space-y-2">
                      <p className="text-xs text-stone-500 font-light">Image {imageIndex}</p>
                      {imageUrl ? (
                        <div className="relative w-full h-32">
                          <img 
                            src={imageUrl || "/placeholder.svg"} 
                            alt={`Customer ${imageIndex}`} 
                            className="w-full h-full object-cover rounded-lg border border-stone-200" 
                          />
                          <button
                            onClick={() => handleRemoveManualImage(key)}
                            className="absolute -top-2 -right-2 bg-stone-950 text-white rounded-full p-1 hover:bg-stone-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleManualImageUpload(e, key)}
                            disabled={uploadingImage === imageIndex}
                            className="text-xs"
                          />
                          {uploadingImage === imageIndex && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
                              <Loader2 className="w-4 h-4 animate-spin text-stone-500" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <Label htmlFor="source" className="text-xs uppercase tracking-wider text-stone-600 font-light">Source</Label>
              <select
                id="source"
                value={manualForm.source}
                onChange={(e) => setManualForm(prev => ({ ...prev, source: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-stone-200 rounded-lg"
              >
                <option value="email">Email</option>
                <option value="dm">Direct Message</option>
                <option value="instagram">Instagram</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleManualSubmit}
                disabled={!manualForm.customer_name || !manualForm.testimonial_text}
                className="flex-1 bg-stone-950 hover:bg-stone-800"
              >
                <Upload className="w-4 h-4 mr-2" />
                Submit Testimonial
              </Button>
              <Button
                onClick={() => setShowManualUpload(false)}
                variant="outline"
                className="border-stone-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingTestimonial} onOpenChange={() => setEditingTestimonial(null)}>
        <DialogContent className="max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl md:text-2xl font-extralight tracking-[0.3em] uppercase">
              Edit Testimonial
            </DialogTitle>
            <p className="text-xs md:text-sm text-stone-600 font-light">Make changes before approving</p>
          </DialogHeader>
          {editingTestimonial && (
            <div className="space-y-4 pb-6">
              <div>
                <Label htmlFor="edit-name" className="text-xs uppercase tracking-wider text-stone-600 font-light">Customer Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.customer_name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, customer_name: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-testimonial" className="text-xs uppercase tracking-wider text-stone-600 font-light">Testimonial Text</Label>
                <Textarea
                  id="edit-testimonial"
                  value={editForm.testimonial_text}
                  onChange={(e) => setEditForm(prev => ({ ...prev, testimonial_text: e.target.value }))}
                  rows={5}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-rating" className="text-xs uppercase tracking-wider text-stone-600 font-light">Rating</Label>
                <select
                  id="edit-rating"
                  value={editForm.rating}
                  onChange={(e) => setEditForm(prev => ({ ...prev, rating: parseInt(e.target.value) }))}
                  className="mt-1 w-full px-3 py-2 border border-stone-200 rounded-lg"
                >
                  <option value={5}>5 Stars</option>
                  <option value={4}>4 Stars</option>
                  <option value={3}>3 Stars</option>
                  <option value={2}>2 Stars</option>
                  <option value={1}>1 Star</option>
                </select>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-wider text-stone-600 font-light mb-3 block">Customer Images</Label>
                <div className="grid grid-cols-2 gap-4">
                  {(['screenshot_url', 'image_url_2', 'image_url_3', 'image_url_4'] as const).map((key, index) => {
                    const imageUrl = editForm[key]
                    const imageIndex = key === 'screenshot_url' ? 1 : parseInt(key.replace('image_url_', ''))
                    
                    return (
                      <div key={key} className="space-y-2">
                        <p className="text-xs text-stone-500 font-light">Image {imageIndex}</p>
                        {imageUrl ? (
                          <div className="relative w-full h-32">
                            <img 
                              src={imageUrl || "/placeholder.svg"} 
                              alt={`Customer ${imageIndex}`} 
                              className="w-full h-full object-cover rounded-lg border border-stone-200" 
                            />
                            <button
                              onClick={() => handleRemoveEditImage(key)}
                              className="absolute -top-2 -right-2 bg-stone-950 text-white rounded-full p-1 hover:bg-stone-800"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleEditImageUpload(e, key)}
                              disabled={uploadingEditImage === imageIndex}
                              className="text-xs"
                            />
                            {uploadingEditImage === imageIndex && (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg">
                                <Loader2 className="w-4 h-4 animate-spin text-stone-500" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-stone-950 hover:bg-stone-800"
                >
                  Save Changes
                </Button>
                <Button
                  onClick={() => setEditingTestimonial(null)}
                  variant="outline"
                  className="border-stone-300"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
