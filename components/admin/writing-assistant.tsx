"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Copy, Check, Calendar, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const CONTENT_PILLARS = [
  { id: 'prompts', name: 'Prompts with Examples', type: 'carousel' },
  { id: 'story', name: 'My Story & Journey', type: 'reel_or_carousel' },
  { id: 'future_self', name: 'Visualize Your Future Self', type: 'reel' },
  { id: 'photoshoot', name: 'Brand Photoshoot Series', type: 'carousel' }
]

const OUTPUT_TYPES = [
  'Caption',
  'Text Overlay',
  'Reel Voiceover',
  'Hashtags',
  'Hook'
]

interface GeneratedContent {
  content: string
  hashtags: string[]
  suggestedDate: string
  pillarName: string
  outputType: string
}

export function WritingAssistant() {
  const [selectedPillar, setSelectedPillar] = useState<string>('prompts')
  const [selectedOutputType, setSelectedOutputType] = useState<string>('Caption')
  const [userInput, setUserInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  const [copied, setCopied] = useState(false)
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

  const selectedPillarData = CONTENT_PILLARS.find(p => p.id === selectedPillar)

  return (
    <div className="flex flex-col h-full bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-stone-700" />
          <h2 className="text-xl font-semibold text-stone-900">Writing Assistant</h2>
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
          <div className="bg-white rounded-lg p-6 border border-stone-200 shadow-sm">
            {/* Main Content */}
            <div className="prose prose-sm max-w-none mb-4">
              <div className="whitespace-pre-wrap text-stone-900">
                {generatedContent.content}
              </div>
            </div>

            {/* Hashtags */}
            {generatedContent.hashtags.length > 0 && (
              <div className="text-sm text-stone-600 mb-4 pb-4 border-b border-stone-200">
                {generatedContent.hashtags.map(tag => (
                  <span key={tag} className="mr-2">#{tag}</span>
                ))}
              </div>
            )}

            {/* Calendar Block */}
            <div className="bg-stone-50 p-4 rounded mb-4 border border-stone-200">
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-stone-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-stone-900 mb-1">📅 Suggested Schedule:</p>
                  <p className="text-sm text-stone-700">
                    {generatedContent.suggestedDate} - {generatedContent.pillarName}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
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
                    Copy to Clipboard
                  </>
                )}
              </Button>
              <Button
                onClick={saveToDatabase}
                variant="outline"
                className="flex-1"
              >
                Save to Database
              </Button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-stone-200 p-4">
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
  )
}
