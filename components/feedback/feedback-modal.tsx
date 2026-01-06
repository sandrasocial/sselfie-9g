"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Bug, Lightbulb, Heart, MessageSquare, Loader2, Camera, X, Upload } from "lucide-react"

interface FeedbackModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userEmail?: string | null
  userName?: string | null
}

type FeedbackType = "bug" | "feature" | "testimonial" | "general" | "share_sselfies"

export function FeedbackModal({ open, onOpenChange, userId, userEmail, userName }: FeedbackModalProps) {
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null)
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const feedbackTypes = [
    {
      id: "share_sselfies" as FeedbackType,
      label: "Share Your SSELFIEs",
      description: "Got amazing results? Send me your best shots so I can show them off on social media!",
      icon: Camera,
    },
    {
      id: "bug" as FeedbackType,
      label: "Found a Bug",
      description: "Something not working right? Let me know so I can fix it!",
      icon: Bug,
    },
    {
      id: "feature" as FeedbackType,
      label: "Feature Idea",
      description: "Got a brilliant idea? I'd love to hear what would make this better for you.",
      icon: Lightbulb,
    },
    {
      id: "testimonial" as FeedbackType,
      label: "Share Your Love",
      description: "Loving SSELFIE? Your kind words mean the world to me!",
      icon: Heart,
    },
    {
      id: "general" as FeedbackType,
      label: "Just Chatting",
      description: "Want to say hi or share something on your mind?",
      icon: MessageSquare,
    },
  ]

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Limit to 4 images total
    if (uploadedImages.length + files.length > 4) {
      alert("You can upload up to 4 images maximum!")
      return
    }

    setIsUploading(true)

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/feedback/upload-image", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error("Upload failed")
        }

        const data = await response.json()
        return data.url
      })

      const urls = await Promise.all(uploadPromises)
      setUploadedImages([...uploadedImages, ...urls])
    } catch (error) {
      console.error("[v0] Error uploading images:", error)
      alert("Failed to upload images. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const removeImage = (indexToRemove: number) => {
    setUploadedImages(uploadedImages.filter((_, index) => index !== indexToRemove))
  }

  const handleSubmit = async () => {
    if (!selectedType || !subject.trim() || !message.trim()) return

    setIsSubmitting(true)

    // Generate requestId for end-to-end tracing
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    // Log user action started (client-side)
    console.log("[v0] User action started", {
      requestId,
      userId,
      action: "submit_feedback",
      feedbackType: selectedType,
      hasImages: uploadedImages.length > 0,
      imageCount: uploadedImages.length,
    })

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": requestId, // Pass requestId for tracing
        },
        body: JSON.stringify({
          userId,
          userEmail,
          userName,
          type: selectedType,
          subject: subject.trim(),
          message: message.trim(),
          images: uploadedImages, // Include uploaded images
        }),
      })

      if (response.ok) {
        setIsSuccess(true)
        setTimeout(() => {
          onOpenChange(false)
          // Reset after modal closes
          setTimeout(() => {
            setSelectedType(null)
            setSubject("")
            setMessage("")
            setUploadedImages([]) // Reset images
            setIsSuccess(false)
          }, 300)
        }, 2000)
      }
    } catch (error) {
      console.error("[v0] Error submitting feedback:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    setSelectedType(null)
    setSubject("")
    setMessage("")
    setUploadedImages([]) // Reset images on back
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white/95 backdrop-blur-xl border-stone-200 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 text-center">
            {selectedType ? "Send Message" : "Let's Chat"}
          </DialogTitle>
          <p className="text-sm text-stone-600 text-center leading-relaxed mt-2">
            Hey there. I'm Sandra, and I'd love to hear from you.
          </p>
        </DialogHeader>

        {isSuccess ? (
          <div className="py-12 text-center">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-stone-600" />
            </div>
            <h3 className="font-serif text-2xl font-extralight text-stone-950 mb-2 tracking-wide">Thank You</h3>
            <p className="text-sm text-stone-600 leading-relaxed max-w-md mx-auto">
              {selectedType === "share_sselfies"
                ? "Your SSELFIEs are gorgeous. I can't wait to share them on social media and show the world what's possible."
                : "I really appreciate you taking the time to share your thoughts. Your feedback helps make SSELFIE better for everyone."}
            </p>
            <p className="text-xs text-stone-400 mt-4">XoXo Sandra 💋</p>
          </div>
        ) : !selectedType ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            {feedbackTypes.map((type) => {
              const Icon = type.icon
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className="bg-stone-50 border border-stone-200 rounded-xl p-6 text-left hover:bg-stone-100 hover:border-stone-300 active:scale-[0.98] transition-all duration-200"
                >
                  <Icon className="text-stone-600 w-6 h-6 mb-3" strokeWidth={1.5} />
                  <h3 className="font-serif text-lg font-extralight text-stone-950 mb-2 tracking-wide">{type.label}</h3>
                  <p className="text-xs text-stone-600 leading-relaxed">{type.description}</p>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs tracking-[0.15em] uppercase text-stone-500 mb-2 block font-light">
                {selectedType === "share_sselfies"
                  ? "Upload Your SSELFIEs (up to 4 images)"
                  : "Upload Screenshots or Images (optional, up to 4)"}
              </label>
              <div className="space-y-3">
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {uploadedImages.map((url, index) => (
                      <div key={url} className="relative group">
                        <img
                          src={url || "/placeholder.svg"}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-stone-200"
                        />
                        <Button
                          onClick={() => removeImage(index)}
                          variant="ghost"
                          className="absolute top-2 right-2 w-6 h-6 p-0 bg-stone-950 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-stone-800"
                        >
                          <X className="w-4 h-4" strokeWidth={2} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {uploadedImages.length < 4 && (
                  <label
                    className={`border-2 border-dashed border-stone-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-stone-400 hover:bg-stone-50 transition-colors ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 text-stone-400 animate-spin mb-2" />
                    ) : (
                      <Upload className="w-8 h-8 text-stone-400 mb-2" strokeWidth={1.5} />
                    )}
                    <span className="text-xs text-stone-600 text-center font-light">
                      {isUploading ? "Uploading..." : "Click to upload or drag & drop"}
                    </span>
                    <span className="text-xs text-stone-400 mt-1 font-light">
                      {selectedType === "share_sselfies"
                        ? "Before & afters, favorites, any shots you love"
                        : "Screenshots, error messages, or anything visual"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                  </label>
                )}
              </div>
              {selectedType === "share_sselfies" && (
                <p className="text-xs text-stone-500 mt-2 font-light leading-relaxed">
                  I may feature your SSELFIEs on Instagram, TikTok, or other social media. By uploading, you're giving
                  me permission to share them.
                </p>
              )}
            </div>

            <div>
              <label className="text-xs tracking-[0.15em] uppercase text-stone-500 mb-2 block font-light">
                {selectedType === "share_sselfies" ? "Give it a fun caption" : "What's this about?"}
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={
                  selectedType === "share_sselfies"
                    ? "Something catchy like 'My glow up' or 'Before & after magic'"
                    : "Give it a quick title..."
                }
                className="bg-stone-50 border-stone-200 focus:border-stone-400 focus:ring-stone-400"
                maxLength={100}
              />
            </div>

            <div>
              <label className="text-xs tracking-[0.15em] uppercase text-stone-500 mb-2 block font-light">
                {selectedType === "share_sselfies" ? "Tell me the story" : "Tell me more"}
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  selectedType === "share_sselfies"
                    ? "What do you love about these SSELFIEs? What was your experience like? Any behind-the-scenes story?"
                    : "Share as much detail as you'd like. I read every single message personally."
                }
                className="bg-stone-50 border-stone-200 focus:border-stone-400 focus:ring-stone-400 min-h-[150px] resize-none"
                maxLength={1000}
              />
              <p className="text-xs text-stone-400 mt-1 text-right font-light">{message.length}/1000</p>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleBack}
                variant="outline"
                className="flex-1 border-stone-200 hover:bg-stone-100 bg-transparent text-stone-700"
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!subject.trim() || !message.trim() || isSubmitting}
                className="flex-1 bg-stone-950 hover:bg-stone-800 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send to Sandra"
                )}
              </Button>
            </div>

            <p className="text-xs text-stone-500 text-center leading-relaxed font-light">
              {selectedType === "share_sselfies"
                ? "Can't wait to see your gorgeous SSELFIEs. I'll reach out if I feature you."
                : "I personally read and respond to every message. You'll hear back from me soon."}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
