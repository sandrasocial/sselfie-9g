"use client"

import { useState, useEffect } from "react"
import { Copy, Check } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { getCaptionTemplates, type CaptionTemplates } from "@/lib/feed-planner/caption-templates"

interface FeedCaptionTemplatesProps {
  businessType?: string
}

/**
 * Caption Templates Component for Free Feed Planner Users
 * 
 * Shows hardcoded caption templates organized by category
 * Allows users to copy templates to clipboard
 */
export default function FeedCaptionTemplates({ businessType }: FeedCaptionTemplatesProps) {
  const [copiedCaption, setCopiedCaption] = useState<number | null>(null)
  const [captionTemplates, setCaptionTemplates] = useState<CaptionTemplates | null>(null)

  useEffect(() => {
    setCaptionTemplates(getCaptionTemplates(businessType))
  }, [businessType])

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text)
    setCopiedCaption(id)
    setTimeout(() => setCopiedCaption(null), 2000)
    toast({
      title: "Copied!",
      description: "Caption template copied to clipboard",
    })
  }

  if (!captionTemplates) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-stone-500">Loading caption templates...</div>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-8 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2
            style={{ fontFamily: "'Times New Roman', serif" }}
            className="text-2xl sm:text-3xl md:text-4xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-3 sm:mb-4 text-stone-950"
          >
            Caption Templates
          </h2>
          <p className="text-xs sm:text-sm font-light text-stone-600 leading-relaxed max-w-2xl mx-auto px-4">
            Struggling with what to say? We've got you. Just copy these, fill in the blanks, and you're good to go!
          </p>
        </div>

        {/* Caption Categories */}
        <div className="space-y-8 sm:space-y-12">
          {Object.entries(captionTemplates).map(([category, templates]) => (
            <div key={category}>
              <h3 className="text-base sm:text-xl font-medium tracking-wider uppercase text-stone-950 mb-4 sm:mb-6 border-b border-stone-200 pb-2 sm:pb-3">
                {category === "cta" ? "Call to Action" : category.charAt(0).toUpperCase() + category.slice(1)} Captions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {templates.map((template) => (
                  <div key={template.id} className="bg-white border border-stone-200 p-4 sm:p-6 rounded-lg">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <h4 className="text-xs sm:text-sm font-medium tracking-wide text-stone-950">
                        {template.title}
                      </h4>
                      <button
                        onClick={() => copyToClipboard(template.template, template.id)}
                        className="p-2 hover:bg-stone-100 rounded-full transition-colors shrink-0"
                        title="Copy template"
                      >
                        {copiedCaption === template.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-stone-600" />
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] sm:text-xs font-light text-stone-600 leading-relaxed whitespace-pre-wrap">
                      {template.template}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
