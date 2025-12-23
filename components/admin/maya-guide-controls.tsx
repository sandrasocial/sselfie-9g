"use client"

import { useState, useEffect } from "react"
import { Plus, FolderOpen, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface Guide {
  id: number
  title: string
  category: string
  status?: string | null
  page_slug?: string | null
}

interface MayaGuideControlsProps {
  userId: string
  selectedGuideId: number | null
  selectedGuideCategory: string | null
  onGuideChange: (id: number | null, category: string | null) => void
}

export default function MayaGuideControls({
  userId,
  selectedGuideId,
  selectedGuideCategory,
  onGuideChange,
}: MayaGuideControlsProps) {
  const [guides, setGuides] = useState<Guide[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setIsMounted(true)
    loadGuides()
  }, [])

  const loadGuides = async () => {
    try {
      // ✅ CORRECTED: Use the correct API endpoint
      const response = await fetch("/api/admin/prompt-guides/list")
      if (response.ok) {
        const data = await response.json()
        setGuides(data.guides || [])
      }
    } catch (error) {
      console.error("Error loading guides:", error)
      toast({
        title: "Failed to load guides",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateNewGuide = async () => {
    const title = prompt("Enter guide title:")
    if (!title) return

    const category = prompt("Enter category (e.g., Luxury, Wellness, Fashion):")
    if (!category) return

    try {
      const response = await fetch("/api/admin/prompt-guides/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          category,
          description: "" // Optional, can be empty
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setGuides([...guides, data.guide])
        onGuideChange(data.guide.id, data.guide.category)
        toast({ title: "Guide created!" })
      }
    } catch (error) {
      toast({ title: "Failed to create guide", variant: "destructive" })
    }
  }

  return (
    <div className="bg-white border-b border-stone-200 p-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        {/* Guide Label */}
        <div className="flex items-center gap-2 text-sm text-stone-600">
          <FolderOpen size={16} />
          <span className="font-medium">Active Guide:</span>
        </div>

        {/* Guide Selector */}
        {isMounted ? (
          <Select
            value={selectedGuideId?.toString() || "none"}
            onValueChange={(value) => {
              if (value === "none") {
                onGuideChange(null, null)
              } else {
                const guide = guides.find(g => g.id.toString() === value)
                if (guide) {
                  onGuideChange(guide.id, guide.category)
                }
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder="Select a guide..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No guide selected</SelectItem>
              {guides.map((guide) => (
                <SelectItem key={guide.id} value={guide.id.toString()}>
                  {guide.title} ({guide.category})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="w-full sm:w-64 h-9 rounded-md border border-stone-200 bg-white flex items-center px-3 text-sm text-stone-500">
            Loading...
          </div>
        )}

        {/* New Guide Button */}
        <Button
          onClick={handleCreateNewGuide}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Plus size={16} />
          New Guide
        </Button>

        {/* Preview Guide Button */}
        {selectedGuideId && (
          <Button
            onClick={() => {
              const guide = guides.find(g => g.id === selectedGuideId)
              if (!guide) return

              // If published page exists, open public preview; otherwise fallback to builder
              if (guide.page_slug) {
                window.open(`/prompt-guides/${guide.page_slug}`, "_blank")
              } else {
                window.open(`/admin/prompt-guide-builder?guideId=${guide.id}`, "_blank")
              }
            }}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Eye size={16} />
            Preview
          </Button>
        )}

        {/* Selected Guide Info */}
        {selectedGuideId && (
          <div className="w-full sm:w-auto sm:ml-auto text-sm text-stone-500">
            Prompts will be saved to: <span className="font-medium text-stone-900">
              {guides.find(g => g.id === selectedGuideId)?.title}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
