"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"

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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif font-extralight tracking-[0.15em] uppercase text-stone-950">
            Edit Profile
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs tracking-wider uppercase text-stone-600">
              Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="border-stone-300 focus:border-stone-500"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="text-xs tracking-wider uppercase text-stone-600">
              Bio
            </Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="border-stone-300 focus:border-stone-500 min-h-[100px]"
              placeholder="Tell us about yourself..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-xs tracking-wider uppercase text-stone-600">
              Location
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="border-stone-300 focus:border-stone-500"
              placeholder="City, Country"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram" className="text-xs tracking-wider uppercase text-stone-600">
              Instagram Handle
            </Label>
            <Input
              id="instagram"
              value={formData.instagram}
              onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
              className="border-stone-300 focus:border-stone-500"
              placeholder="@username"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="border-stone-300 text-stone-700 hover:bg-stone-50"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-stone-950 text-white hover:bg-stone-800">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
