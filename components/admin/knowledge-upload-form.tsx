"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const KNOWLEDGE_CATEGORIES = [
  { value: "brand_story", label: "Brand Story" },
  { value: "user_journey", label: "User Journey" },
  { value: "pricing", label: "Pricing & Offers" },
  { value: "voice_tone", label: "Voice & Tone" },
  { value: "content_guidelines", label: "Content Guidelines" },
  { value: "target_audience", label: "Target Audience" },
  { value: "competitor_info", label: "Competitor Information" },
  { value: "product_features", label: "Product Features" },
  { value: "business_strategy", label: "Business Strategy" },
]

export function KnowledgeUploadForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [category, setCategory] = useState("")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/admin/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          knowledge_type: "admin_uploaded",
          category,
          title,
          content,
          confidence_level: 1.0,
          related_tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      })

      if (!response.ok) throw new Error("Failed to save knowledge")

      // Reset form
      setCategory("")
      setTitle("")
      setContent("")
      setTags("")

      alert("Knowledge saved successfully!")
      window.location.reload()
    } catch (error) {
      console.error("Error saving knowledge:", error)
      alert("Failed to save knowledge")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="p-6 mb-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {KNOWLEDGE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., SSELFIE Brand Mission"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter detailed information about this topic. Be specific - this will be used by your admin agents to personalize their responses."
            rows={10}
            required
            className="resize-none"
          />
          <p className="text-sm text-muted-foreground">
            Examples: Brand story, user onboarding steps, pricing tiers, content voice guidelines
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="e.g., brand, mission, values"
          />
        </div>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Knowledge"}
        </Button>
      </form>
    </Card>
  )
}
