"use client"

import { useState, useEffect } from "react"
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
        <div className="text-sm text-white/60">Loading caption templates...</div>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-8 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
            className="text-2xl sm:text-3xl md:text-4xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-3 sm:mb-4 text-white"
          >
            Caption Templates
          </h2>
          <p className="text-xs sm:text-sm font-light text-white/65 leading-relaxed max-w-2xl mx-auto px-4">
            Struggling with what to say? We&apos;ve got you. Just copy these, fill in the blanks, and you&apos;re good to go!
          </p>
        </div>

        {/* Caption Categories */}
        <div className="space-y-8 sm:space-y-12">
          {Object.entries(captionTemplates).map(([category, templates]) => (
            <div key={category}>
              <h3 className="text-base sm:text-xl font-medium tracking-wider uppercase text-white mb-4 sm:mb-6 border-b border-white/15 pb-2 sm:pb-3">
                {category === "cta" ? "Call to Action" : category.charAt(0).toUpperCase() + category.slice(1)} Captions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {templates.map((template) => (
                  <div key={template.id} className="border border-white/15 bg-white/[0.04] backdrop-blur-[20px] p-4 sm:p-6 rounded-[20px]">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <h4 className="text-xs sm:text-sm font-medium tracking-wide text-white">
                        {template.title}
                      </h4>
                      <button
                        onClick={() => copyToClipboard(template.template, template.id)}
                        className="px-2.5 py-2 text-[10px] uppercase tracking-[0.2em] text-white/70 hover:bg-white/10 rounded-full transition-colors shrink-0 border border-white/15"
                        title="Copy template"
                      >
                        {copiedCaption === template.id ? "Done" : "Copy"}
                      </button>
                    </div>
                    <p className="text-[11px] sm:text-xs font-light text-white/70 leading-relaxed whitespace-pre-wrap">
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
