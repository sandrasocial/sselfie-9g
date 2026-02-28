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
      <DialogContent className="border border-[color:var(--glass-border)] bg-[color:var(--color-obsidian)]/95 text-[color:var(--color-porcelain)] backdrop-blur-[20px] sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="display-header text-2xl font-light text-[color:var(--color-porcelain)]">
            Edit Profile
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-[11px] font-medium uppercase tracking-[0.35em] text-[color:var(--color-smoke)]">
              Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-12 border-white/15 bg-white/6 text-[color:var(--color-whisper)] placeholder:text-[color:var(--color-smoke)] focus:border-white/30"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="text-[11px] font-medium uppercase tracking-[0.35em] text-[color:var(--color-smoke)]">
              Bio
            </Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="min-h-[100px] border-white/15 bg-white/6 text-[color:var(--color-whisper)] placeholder:text-[color:var(--color-smoke)] focus:border-white/30"
              placeholder="Tell us about yourself..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-[11px] font-medium uppercase tracking-[0.35em] text-[color:var(--color-smoke)]">
              Location
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="h-12 border-white/15 bg-white/6 text-[color:var(--color-whisper)] placeholder:text-[color:var(--color-smoke)] focus:border-white/30"
              placeholder="City, Country"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram" className="text-[11px] font-medium uppercase tracking-[0.35em] text-[color:var(--color-smoke)]">
              Instagram Handle
            </Label>
            <Input
              id="instagram"
              value={formData.instagram}
              onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
              className="h-12 border-white/15 bg-white/6 text-[color:var(--color-whisper)] placeholder:text-[color:var(--color-smoke)] focus:border-white/30"
              placeholder="@username"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="border-white/20 bg-white/5 text-[color:var(--color-whisper)] hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="border border-white/20 bg-white/10 font-medium uppercase tracking-[0.2em] text-[color:var(--color-porcelain)] hover:bg-white/15"
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
