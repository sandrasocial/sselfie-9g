"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Copy, Check, Calendar, Loader2, Sparkles, History, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { WritingAssistantHistory } from "./writing-assistant-history"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const CONTENT_PILLARS = [
  { 
    id: 'prompts_examples', 
    name: 'Prompts with Examples', 
    type: 'carousel',
    description: 'Educational carousel content showcasing SSELFIE prompts with real examples',
    suggestedDay: 'Monday'
  },
  { 
    id: 'sselfie_features', 
    name: 'SSELFIE Features & Updates', 
    type: 'reel_or_carousel',
    description: 'Platform updates, new features, tips and tricks for using SSELFIE Studio',
    suggestedDay: 'Wednesday'
  },
  { 
    id: 'visibility_freedom', 
    name: 'Visibility = Financial Freedom', 
    type: 'reel',
    description: 'Core message content about strategic visibility, transformation stories, success mindset',
    suggestedDay: 'Tuesday'
  },
  { 
    id: 'behind_scenes', 
    name: 'Behind the Scenes', 
    type: 'reel_or_story',
    description: 'Authentic journey content, building in public, challenges and wins, daily life',
    suggestedDay: 'Friday'
  }
]

const OUTPUT_TYPES = [
  'Caption',
  'Text Overlay',
  'Reel Voiceover',
  'Hashtags',
  'Hook'
]

const CHARACTER_LIMITS = {
  Caption: 2200,
  'Text Overlay': 100,
  'Reel Voiceover': 1000,
  Hook: 60,
  Hashtags: 30 // 30 hashtags max
}

const QUICK_TEMPLATES = {
  prompts_examples: [
    "Write a carousel caption for my Chanel luxury prompt collection with 10 professional prompts",
    "Create hooks for an ALO workout prompt carousel (need 5 hook options)",
    "Write text overlays for a Travel prompt carousel (8 slides)"
  ],
  sselfie_features: [
    "Announce new Maya Pro Mode feature with smart image selection",
    "Write reel voiceover for Quick Generate feature demo",
    "Create caption celebrating 10,000 users milestone"
  ],
  visibility_freedom: [
    "Share my transformation story from invisible single mom to SSELFIE founder",
    "Write about why visibility equals economic power for women entrepreneurs",
    "Create motivational reel about being your own main character"
  ],
  behind_scenes: [
    "Share today's win: fixed a major bug in the platform",
    "Real talk about balancing motherhood and building a startup",
    "Behind the scenes of creating new prompt collections"
  ]
}

interface GeneratedContent {
  content: string
  hashtags: string[]
  suggestedDate: string
  pillarName: string
  outputType: string
}

export function WritingAssistant() {
  const [selectedPillar, setSelectedPillar] = useState<string>('prompts_examples')
  const [selectedOutputType, setSelectedOutputType] = useState<string>('Caption')
  const [userInput, setUserInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  const [copied, setCopied] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [generatedContent])

  const handleGenerate = async () => {
    if (!userInput.trim()) {
      toast({
        title: "Input Required",
        description: "Please describe what you need",
        variant: "destructive"
      })
      return
    }

    setIsGenerating(true)
    setGeneratedContent(null)

    try {
      const response = await fetch("/api/admin/writing-assistant/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pillar: selectedPillar,
          outputType: selectedOutputType,
          userInput: userInput.trim(),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to generate content")
      }

      const data = await response.json()
      setGeneratedContent(data)
      setUserInput("")
    } catch (error: any) {
      console.error("[v0] Error generating content:", error)
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate content. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async () => {
    if (!generatedContent) return

    const fullText = `${generatedContent.content}\n\n${generatedContent.hashtags.map(tag => `#${tag}`).join(' ')}`
    
    try {
      await navigator.clipboard.writeText(fullText)
      setCopied(true)
      toast({
        title: "Copied!",
        description: "Content copied to clipboard",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      })
    }
  }

  const saveToDatabase = async () => {
    if (!generatedContent) return

    try {
      const response = await fetch("/api/admin/writing-assistant/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pillar: selectedPillar,
          outputType: selectedOutputType,
          content: generatedContent.content,
          hashtags: generatedContent.hashtags,
          suggestedDate: generatedContent.suggestedDate,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save content")
      }

      toast({
        title: "Saved!",
        description: "Content saved to database",
      })
    } catch (error: any) {
      console.error("[v0] Error saving content:", error)
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save content",
        variant: "destructive"
      })
    }
  }

  const exportToMarkdown = () => {
    if (!generatedContent) return

    const markdown = `# ${generatedContent.pillarName} - ${generatedContent.outputType}

**Suggested Date:** ${generatedContent.suggestedDate}

## Content

${generatedContent.content}

## Hashtags

${generatedContent.hashtags.map(tag => `#${tag}`).join(' ')}

---
*Generated by SSELFIE Studio Writing Assistant*`

    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    // Sanitize filename - remove special characters
    const sanitizedName = generatedContent.pillarName.replace(/[^a-z0-9]/gi, '-').toLowerCase()
    a.download = `${sanitizedName}-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
    
    toast({
      title: "Exported!",
      description: "Content exported as Markdown file",
    })
  }

  const exportToNotion = async () => {
    if (!generatedContent) return

    // Format for Notion - copy to clipboard
    const notionText = `${generatedContent.content}\n\nHashtags: ${generatedContent.hashtags.map(tag => `#${tag}`).join(' ')}\n\nSuggested: ${generatedContent.suggestedDate}`

    try {
      await navigator.clipboard.writeText(notionText)
      toast({
        title: "Copied for Notion!",
        description: "Paste into Notion to save",
      })
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      })
    }
  }

  const selectedPillarData = CONTENT_PILLARS.find(p => p.id === selectedPillar)

  return (
    <div className="flex flex-col h-full bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-stone-700" />
            <h2 className="text-xl font-semibold text-stone-900">Writing Assistant</h2>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="w-4 h-4 mr-2" />
            {showHistory ? 'Hide' : 'View'} History
          </Button>
        </div>

        {/* Selectors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-stone-700 mb-2 block">
              Content Pillar
            </label>
            <Select value={selectedPillar} onValueChange={setSelectedPillar}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select content pillar" />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_PILLARS.map(pillar => (
                  <SelectItem key={pillar.id} value={pillar.id}>
                    {pillar.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-stone-700 mb-2 block">
              Output Type
            </label>
            <Select value={selectedOutputType} onValueChange={setSelectedOutputType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select output type" />
              </SelectTrigger>
              <SelectContent>
                {OUTPUT_TYPES.map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!generatedContent && !isGenerating && (
          <div className="text-center text-stone-500 py-12">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-stone-300" />
            <p className="text-sm">
              Describe what you need and I'll write it in Sandra's voice
            </p>
          </div>
        )}

        {isGenerating && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
            <span className="ml-3 text-stone-600">Generating content...</span>
          </div>
        )}

        {generatedContent && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Content Pillar Badge */}
              <div className="flex items-center gap-2">
                <Badge variant="outline">{generatedContent.pillarName}</Badge>
                <Badge variant="outline">{generatedContent.outputType}</Badge>
                <Badge variant="outline">
                  <Calendar className="w-3 h-3 mr-1" />
                  {generatedContent.suggestedDate}
                </Badge>
              </div>

              {/* Instagram Preview (for Captions only) */}
              {generatedContent.outputType === 'Caption' && (
                <div className="bg-white border border-stone-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-500" />
                    <div>
                      <p className="text-sm font-semibold">sselfiestudio</p>
                      <p className="text-xs text-stone-500">Instagram Preview</p>
                    </div>
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap mb-3">
                    {generatedContent.content.split('\n').slice(0, 3).join('\n')}
                    {generatedContent.content.split('\n').length > 3 && (
                      <span className="text-stone-500">... more</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {generatedContent.hashtags.slice(0, 5).map((tag, i) => (
                      <span key={i} className="text-xs text-blue-600">#{tag}</span>
                    ))}
                    {generatedContent.hashtags.length > 5 && (
                      <span className="text-xs text-stone-500">+{generatedContent.hashtags.length - 5} more</span>
                    )}
                  </div>
                </div>
              )}

              {/* Actual Content */}
              <div className="bg-white border border-stone-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-stone-900">Generated Content</h3>
                  <div className="flex items-center gap-4">
                    {/* Character Counter */}
                    <span className={`text-xs font-medium ${
                      (CHARACTER_LIMITS[generatedContent.outputType as keyof typeof CHARACTER_LIMITS] && 
                       generatedContent.content.length > CHARACTER_LIMITS[generatedContent.outputType as keyof typeof CHARACTER_LIMITS])
                        ? 'text-red-600'
                        : 'text-stone-500'
                    }`}>
                      {generatedContent.content.length} / {CHARACTER_LIMITS[generatedContent.outputType as keyof typeof CHARACTER_LIMITS] || 'N/A'} chars
                    </span>
                  </div>
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap bg-stone-50 p-3 rounded">
                  {generatedContent.content}
                </div>
              </div>

              {/* Hashtags */}
              {generatedContent.hashtags.length > 0 && (
                <div className="bg-white border border-stone-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-stone-900">Hashtags</h3>
                    <span className="text-xs font-medium text-stone-500">
                      {generatedContent.hashtags.length} / 30
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {generatedContent.hashtags.map((tag, i) => (
                      <Badge key={i} variant="secondary">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                  className="flex-1"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={saveToDatabase}
                  variant="outline"
                  className="flex-1"
                >
                  Save
                </Button>

                {/* Export Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Download className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={exportToMarkdown}>
                      Export as Markdown
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportToNotion}>
                      Copy for Notion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Character Limit Warning */}
              {CHARACTER_LIMITS[generatedContent.outputType as keyof typeof CHARACTER_LIMITS] &&
               generatedContent.content.length > CHARACTER_LIMITS[generatedContent.outputType as keyof typeof CHARACTER_LIMITS] && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-800">
                    ⚠️ Content exceeds {generatedContent.outputType} character limit. Consider shortening before posting.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-stone-200">
        {/* Quick Templates */}
        {QUICK_TEMPLATES[selectedPillar as keyof typeof QUICK_TEMPLATES] && (
          <div className="px-4 py-3 bg-stone-50 border-b border-stone-200">
            <label className="text-xs font-medium text-stone-700 mb-2 block">
              Quick Start Templates
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_TEMPLATES[selectedPillar as keyof typeof QUICK_TEMPLATES].map((template, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => setUserInput(template)}
                  className="text-xs"
                >
                  {template.slice(0, 50)}...
                </Button>
              ))}
            </div>
          </div>
        )}
        
        <div className="p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleGenerate()
            }}
            className="flex gap-2"
          >
            <Textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Describe what you need... (e.g., 'Write a caption for a carousel about prompt examples', 'Create a reel voiceover for my transformation story')"
            className="min-h-[100px] resize-none"
            disabled={isGenerating}
          />
          <Button
            type="submit"
            disabled={isGenerating || !userInput.trim()}
            className="self-end"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
        </div>
      </div>

      {/* History Panel - Shows when showHistory is true */}
      {showHistory && (
        <div className="border-t border-stone-200 bg-stone-50">
          <WritingAssistantHistory />
        </div>
      )}
    </div>
  )
}
