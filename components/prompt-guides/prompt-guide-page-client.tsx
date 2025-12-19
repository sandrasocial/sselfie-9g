"use client"

import { useState, useEffect } from "react"
import { X, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import PromptEmailCapture from "./prompt-email-capture"

interface PromptGuidePageClientProps {
  page: {
    id: number
    title: string
    welcome_message: string | null
    upsell_text: string | null
    upsell_link: string | null
    email_list_tag: string | null
  }
  items: Array<{
    id: number
    concept_title: string | null
    prompt_text: string
    image_url: string | null
  }>
  hasAccessToken: boolean
  emailListTag: string | null
}

export default function PromptGuidePageClient({
  page,
  items,
  hasAccessToken,
  emailListTag,
}: PromptGuidePageClientProps) {
  const [showEmailModal, setShowEmailModal] = useState(!hasAccessToken)
  const [copiedPromptId, setCopiedPromptId] = useState<number | null>(null)

  const copyToClipboard = async (text: string, itemId: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedPromptId(itemId)
      setTimeout(() => setCopiedPromptId(null), 2000)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  const handleEmailSuccess = () => {
    setShowEmailModal(false)
    // Set cookie via API to persist access
    fetch("/api/prompt-guide/set-access-cookie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: page.id }),
    }).catch(console.error)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Email Capture Modal */}
      {showEmailModal && (
        <PromptEmailCapture
          onSuccess={handleEmailSuccess}
          onClose={() => setShowEmailModal(false)}
          emailListTag={emailListTag}
          pageId={page.id}
        />
      )}

      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <h1 className="font-serif text-4xl md:text-5xl font-extralight tracking-[0.3em] uppercase text-stone-950 mb-6">
          {page.title}
        </h1>
        {page.welcome_message && (
          <div
            className="prose prose-stone max-w-none text-stone-700 font-light leading-relaxed"
            dangerouslySetInnerHTML={{ __html: page.welcome_message }}
          />
        )}
      </div>

      {/* Prompts Grid - Two Column */}
      <div className="max-w-6xl mx-auto px-4 pb-32">
        {items.map((item) => (
          <PromptCard
            key={item.id}
            id={item.id}
            image={item.image_url}
            title={item.concept_title || "Untitled Concept"}
            prompt={item.prompt_text}
            onCopy={() => copyToClipboard(item.prompt_text, item.id)}
            isCopied={copiedPromptId === item.id}
          />
        ))}
      </div>

      {/* Sticky Upsell CTA */}
      {page.upsell_text && page.upsell_link && (
        <div className="fixed bottom-0 inset-x-0 bg-stone-950 text-white p-4 z-50">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm font-light text-center sm:text-left">{page.upsell_text}</p>
            <Button
              asChild
              className="bg-white text-stone-950 hover:bg-stone-100 whitespace-nowrap"
            >
              <a href={page.upsell_link} target="_blank" rel="noopener noreferrer">
                Get SSELFIE Studio
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

interface PromptCardProps {
  id: number
  image: string | null
  title: string
  prompt: string
  onCopy: () => void
  isCopied: boolean
}

function PromptCard({ image, title, prompt, onCopy, isCopied }: PromptCardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 border-b border-stone-200 pb-12 last:border-b-0">
      {/* Left: Image */}
      <div className="relative" style={{ aspectRatio: "2/3" }}>
        {image ? (
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <div className="w-full h-full bg-stone-100 rounded-lg flex items-center justify-center">
            <span className="text-stone-400 text-sm font-light">No image</span>
          </div>
        )}
      </div>

      {/* Right: Title + Prompt */}
      <div className="flex flex-col justify-center">
        <h3 className="font-serif text-2xl md:text-3xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
          {title}
        </h3>
        <pre className="bg-stone-50 p-4 rounded-lg text-sm overflow-x-auto font-mono text-stone-700 mb-4 whitespace-pre-wrap">
          {prompt}
        </pre>
        <Button
          onClick={onCopy}
          className="w-full sm:w-auto bg-stone-950 text-white hover:bg-stone-800"
          size="sm"
        >
          {isCopied ? (
            <>
              <Check size={16} className="mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy size={16} className="mr-2" />
              Copy Prompt
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
