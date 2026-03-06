"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import LoadingSpinner from "./loading-spinner"

interface EditProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentData: {
    name: string
    bio: string | null
    location: string | null
    instagram: string | null
  }
  onSuccess: () => void
}

export default function EditProfileDialog({ open, onOpenChange, currentData, onSuccess }: EditProfileDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: currentData.name,
    bio: currentData.bio || "",
    location: currentData.location || "",
    instagram: currentData.instagram || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        onSuccess()
        onOpenChange(false)
      } else {
        console.error("[v0] Failed to update profile")
      }
    } catch (error) {
      console.error("[v0] Error updating profile:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-[rgba(195,190,182,0.25)] bg-[rgba(28,27,25,0.97)] text-[#f0ede8] backdrop-blur-[50px] sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="font-['Cormorant_Garamond'] font-light text-2xl text-[#f0ede8]">
            Edit Profile
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="font-['Inter'] text-[10px] font-medium uppercase tracking-[0.5em] text-[#8a8780]">
              Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-12 border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] text-[#f0ede8] placeholder:text-[#8a8780] focus:border-[rgba(195,190,182,0.50)]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="font-['Inter'] text-[10px] font-medium uppercase tracking-[0.5em] text-[#8a8780]">
              Bio
            </Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="min-h-[100px] border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] text-[#f0ede8] placeholder:text-[#8a8780] focus:border-[rgba(195,190,182,0.50)]"
              placeholder="Tell us about yourself..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="font-['Inter'] text-[10px] font-medium uppercase tracking-[0.5em] text-[#8a8780]">
              Location
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="h-12 border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] text-[#f0ede8] placeholder:text-[#8a8780] focus:border-[rgba(195,190,182,0.50)]"
              placeholder="City, Country"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram" className="font-['Inter'] text-[10px] font-medium uppercase tracking-[0.5em] text-[#8a8780]">
              Instagram Handle
            </Label>
            <Input
              id="instagram"
              value={formData.instagram}
              onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
              className="h-12 border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] text-[#f0ede8] placeholder:text-[#8a8780] focus:border-[rgba(195,190,182,0.50)]"
              placeholder="@username"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="border-[rgba(195,190,182,0.25)] bg-transparent text-[#8a8780] hover:bg-[rgba(175,170,162,0.10)] hover:text-[#f0ede8]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-[#c8c4bb] text-[#0d0c0b] font-['Inter'] font-medium uppercase tracking-[0.15em] text-xs px-6 py-3 rounded-full hover:bg-[#f0ede8] transition-colors border-0"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
