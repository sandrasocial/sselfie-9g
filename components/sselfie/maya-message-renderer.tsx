"use client"

import { useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MayaMessageRendererProps {
  content: string
  isUser: boolean
}

export function MayaMessageRenderer({ content, isUser }: MayaMessageRendererProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null)

  // Detect content type based on keywords
  const isCaption = /caption|hook|cta|story|value/i.test(content) && content.includes("**")
  const isStrategy = /strategy|growth|engagement|algorithm/i.test(content)
  const isHookFormula = /hook.*:/i.test(content) || content.includes("Hook-Story-Value-CTA")

  const copyToClipboard = async (text: string, identifier: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedText(identifier)
    setTimeout(() => setCopiedText(null), 2000)
  }

  // Extract copyable sections (text between certain markers or code blocks)
  const extractCopyableSections = (text: string) => {
    const sections: { label: string; content: string }[] = []

    // Extract content in quotes
    const quoteMatches = text.match(/"([^"]+)"/g)
    if (quoteMatches) {
      quoteMatches.forEach((match, i) => {
        sections.push({
          label: `Caption ${i + 1}`,
          content: match.replace(/"/g, ""),
        })
      })
    }

    return sections
  }

  const copyableSections = extractCopyableSections(content)

  return (
    <div className="space-y-3">
      {/* Render markdown content with custom styling */}
      <div className="prose prose-sm prose-stone max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ node, ...props }) => (
              <h1
                className={`text-lg font-serif font-light tracking-wide mt-4 mb-2 ${isUser ? "text-white" : "text-stone-950"}`}
                {...props}
              />
            ),
            h2: ({ node, ...props }) => (
              <h2
                className={`text-base font-serif font-light tracking-wide mt-3 mb-2 ${isUser ? "text-white" : "text-stone-900"}`}
                {...props}
              />
            ),
            h3: ({ node, ...props }) => (
              <h3
                className={`text-sm font-serif font-medium tracking-wide mt-2 mb-1 ${isUser ? "text-white" : "text-stone-800"}`}
                {...props}
              />
            ),

            strong: ({ node, ...props }) => (
              <strong className={`font-semibold ${isUser ? "text-white" : "text-stone-950"}`} {...props} />
            ),

            // Lists with better spacing
            ul: ({ node, ...props }) => <ul className="space-y-1.5 my-2 list-disc list-inside" {...props} />,
            ol: ({ node, ...props }) => <ol className="space-y-1.5 my-2 list-decimal list-inside" {...props} />,
            li: ({ node, ...props }) => (
              <li className={`text-sm leading-relaxed ${isUser ? "text-white/90" : "text-stone-700"}`} {...props} />
            ),

            blockquote: ({ node, ...props }) => (
              <blockquote
                className={`border-l-4 pl-4 py-2 my-3 rounded-r-lg italic ${
                  isUser
                    ? "border-white/40 bg-white/10 text-white/80"
                    : "border-stone-300 bg-stone-50/50 text-stone-600"
                }`}
                {...props}
              />
            ),

            // Horizontal rules
            hr: ({ node, ...props }) => (
              <hr className={`my-4 ${isUser ? "border-white/20" : "border-stone-200"}`} {...props} />
            ),

            p: ({ node, ...props }) => (
              <p className={`text-sm leading-relaxed mb-2 ${isUser ? "text-white" : "text-stone-700"}`} {...props} />
            ),

            code: ({ node, className, children, ...props }) => {
              const isBlock = className?.includes("language-")
              if (isBlock) {
                return (
                  <div className="relative">
                    <code
                      className={`block rounded-lg p-3 text-xs font-mono overflow-x-auto ${
                        isUser ? "bg-white/10 text-white/90" : "bg-stone-100 text-stone-800"
                      }`}
                      {...props}
                    >
                      {children}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-2 right-2"
                      onClick={() => copyToClipboard(String(children), "code-block")}
                    >
                      {copiedText === "code-block" ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                )
              }
              return (
                <code
                  className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                    isUser ? "bg-white/10 text-white/90" : "bg-stone-100 text-stone-800"
                  }`}
                  {...props}
                >
                  {children}
                </code>
              )
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      {/* Special styling for captions - copyable cards */}
      {isCaption && copyableSections.length > 0 && (
        <div className="space-y-2 mt-4">
          <p className="text-xs font-medium text-stone-500 tracking-wide uppercase">Quick Copy</p>
          {copyableSections.map((section, i) => (
            <div
              key={i}
              className="bg-gradient-to-br from-stone-50 to-white border border-stone-200 rounded-xl p-3 relative group"
            >
              <p className="text-xs font-medium text-stone-500 mb-1.5">{section.label}</p>
              <p className="text-sm text-stone-700 leading-relaxed">{section.content}</p>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => copyToClipboard(section.content, `section-${i}`)}
              >
                {copiedText === `section-${i}` ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Visual badge for Hook-Story-Value-CTA framework */}
      {isHookFormula && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {["Hook", "Story", "Value", "CTA"].map((step) => (
            <span
              key={step}
              className="px-2 py-1 bg-stone-900 text-white text-xs font-medium rounded-full tracking-wide"
            >
              {step}
            </span>
          ))}
        </div>
      )}

      {/* Strategy badge */}
      {isStrategy && !isHookFormula && (
        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-stone-100 rounded-full mt-2">
          <span className="text-xs font-medium text-stone-600 tracking-wide">Instagram Strategy</span>
        </div>
      )}
    </div>
  )
}
