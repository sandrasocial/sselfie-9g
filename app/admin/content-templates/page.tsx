"use client"

import { useEffect, useState } from "react"
import { FileText, Copy, Check, ChevronDown, ChevronRight } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import ReactMarkdown from "react-markdown"

interface Template {
  filename: string
  content: string
}

export default function ContentTemplatesPage() {
  const [templates, setTemplates] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set())
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/admin/content-templates")
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || {})
        // Expand first template by default
        const firstTemplate = Object.keys(data.templates || {})[0]
        if (firstTemplate) {
          setExpandedTemplates(new Set([firstTemplate]))
        }
      }
    } catch (error) {
      console.error("Error fetching templates:", error)
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleTemplate = (filename: string) => {
    const newExpanded = new Set(expandedTemplates)
    if (newExpanded.has(filename)) {
      newExpanded.delete(filename)
    } else {
      newExpanded.add(filename)
    }
    setExpandedTemplates(newExpanded)
  }

  const copyToClipboard = async (content: string, filename: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedTemplate(filename)
      toast({
        title: "Copied!",
        description: "Template copied to clipboard",
      })
      setTimeout(() => setCopiedTemplate(null), 2000)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      })
    }
  }

  const formatFilename = (filename: string) => {
    return filename
      .replace(".md", "")
      .replace(/-/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-stone-600">Loading templates...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1
            className="text-3xl md:text-4xl font-['Times_New_Roman'] font-extralight tracking-[0.3em] uppercase text-stone-950 mb-4"
          >
            Instagram Content Templates
          </h1>
          <p className="text-stone-600 leading-relaxed">
            Ready-to-use content templates for your Instagram strategy. Click any template to expand and copy.
          </p>
        </div>

        <div className="space-y-4">
          {Object.entries(templates).map(([filename, content]) => {
            const isExpanded = expandedTemplates.has(filename)
            const isCopied = copiedTemplate === filename

            return (
              <div
                key={filename}
                className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => toggleTemplate(filename)}
                  className="w-full flex items-center justify-between p-6 hover:bg-stone-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <FileText className="w-5 h-5 text-stone-600" />
                    <h2 className="text-lg font-medium text-stone-950">
                      {formatFilename(filename)}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        copyToClipboard(content, filename)
                      }}
                      className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                      title="Copy template"
                    >
                      {isCopied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-stone-600" />
                      )}
                    </button>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-stone-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-stone-600" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-stone-200 p-6 bg-stone-50">
                    <div className="prose prose-stone max-w-none">
                      <ReactMarkdown
                        components={{
                          h1: ({ node, ...props }) => (
                            <h1
                              className="text-2xl font-['Times_New_Roman'] font-light text-stone-950 mb-4 mt-0 tracking-wide"
                              {...props}
                            />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2
                              className="text-xl font-['Times_New_Roman'] font-light text-stone-950 mb-3 mt-6 tracking-wide"
                              {...props}
                            />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3
                              className="text-lg font-medium text-stone-950 mb-2 mt-4"
                              {...props}
                            />
                          ),
                          h4: ({ node, ...props }) => (
                            <h4
                              className="text-base font-medium text-stone-950 mb-2 mt-3"
                              {...props}
                            />
                          ),
                          p: ({ node, ...props }) => (
                            <p className="text-base text-stone-700 leading-relaxed mb-4" {...props} />
                          ),
                          strong: ({ node, ...props }) => (
                            <strong className="font-medium text-stone-950" {...props} />
                          ),
                          em: ({ node, ...props }) => (
                            <em className="italic text-stone-700" {...props} />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className="list-disc pl-6 mb-4 space-y-2 text-stone-700" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="list-decimal pl-6 mb-4 space-y-2 text-stone-700" {...props} />
                          ),
                          li: ({ node, ...props }) => (
                            <li className="text-base leading-relaxed" {...props} />
                          ),
                          code: ({ node, inline, ...props }: any) => {
                            if (inline) {
                              return (
                                <code
                                  className="text-sm bg-stone-200 text-stone-900 px-1.5 py-0.5 rounded font-mono"
                                  {...props}
                                />
                              )
                            }
                            return (
                              <code
                                className="block text-sm bg-stone-900 text-stone-100 p-4 rounded-lg overflow-x-auto font-mono"
                                {...props}
                              />
                            )
                          },
                          pre: ({ node, ...props }) => (
                            <pre className="bg-stone-900 text-stone-100 p-4 rounded-lg overflow-x-auto mb-4" {...props} />
                          ),
                          blockquote: ({ node, ...props }) => (
                            <blockquote
                              className="border-l-4 border-stone-300 pl-4 italic text-stone-600 my-4"
                              {...props}
                            />
                          ),
                          hr: ({ node, ...props }) => (
                            <hr className="border-stone-200 my-6" {...props} />
                          ),
                          a: ({ node, ...props }) => (
                            <a className="text-stone-950 underline hover:text-stone-700" {...props} />
                          ),
                        }}
                      >
                        {content}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-12 p-6 bg-stone-100 rounded-xl border border-stone-200">
          <h3 className="text-lg font-medium text-stone-950 mb-2">Quick Tips</h3>
          <ul className="space-y-2 text-sm text-stone-600">
            <li>• Fill in the brackets [like this] with your specific details</li>
            <li>• Customize hashtags based on your niche</li>
            <li>• Use SSELFIE Feed Planner to create matching images</li>
            <li>• Track performance using the metrics tracker template</li>
            <li>• Batch create content on Sundays (2-hour workflow)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
























