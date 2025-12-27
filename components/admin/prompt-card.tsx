"use client"

import { Card } from "@/components/ui/card"
import { Copy, Check, Trash2, Sparkles, Tag } from "lucide-react"
import { useState } from "react"

interface PromptCardProps {
  prompt: {
    id: number
    title: string
    promptText: string
    category: string
    season: string
    style: string
    mood: string
    tags: string[]
    useCase: string
    createdAt: string
  }
  onDelete?: (id: number) => void
}

export default function PromptCard({ prompt, onDelete }: PromptCardProps) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt.promptText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const getCategoryColor = (category: string) => {
    switch(category) {
      case 'fashion': return 'bg-pink-50 text-pink-700 border-pink-200'
      case 'lifestyle': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'seasonal': return 'bg-green-50 text-green-700 border-green-200'
      case 'editorial': return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'brand': return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'wellness': return 'bg-teal-50 text-teal-700 border-teal-200'
      default: return 'bg-stone-50 text-stone-700 border-stone-200'
    }
  }
  
  return (
    <Card className="border-stone-200 bg-white hover:shadow-lg transition-all duration-300">
      {/* Header */}
      <div className="p-5 border-b border-stone-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-stone-600" />
            <span className="text-xs font-medium uppercase tracking-wider text-stone-600">
              Maya Prompt
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              title="Copy prompt"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-stone-600" />
              )}
            </button>
            
            {onDelete && (
              <button
                onClick={() => onDelete(prompt.id)}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete prompt"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            )}
          </div>
        </div>
        
        <h3 className="text-lg font-medium text-stone-900 mb-3">
          {prompt.title}
        </h3>
        
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider border ${getCategoryColor(prompt.category)}`}>
            {prompt.category}
          </span>
          <span className="px-2 py-1 rounded text-xs bg-stone-100 text-stone-700">
            {prompt.season}
          </span>
          <span className="px-2 py-1 rounded text-xs bg-stone-100 text-stone-700">
            {prompt.style}
          </span>
        </div>
      </div>
      
      {/* Mood */}
      <div className="px-5 pt-4 pb-2">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">
          Mood
        </div>
        <div className="text-sm font-medium text-stone-900">
          {prompt.mood}
        </div>
      </div>
      
      {/* Prompt Text */}
      <div className="p-5 bg-stone-50">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">
          Prompt
        </div>
        <div className="text-sm text-stone-800 leading-relaxed font-mono bg-white p-3 rounded border border-stone-200">
          {prompt.promptText}
        </div>
      </div>
      
      {/* Use Case */}
      <div className="px-5 py-4">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">
          When to Use
        </div>
        <div className="text-sm text-stone-700">
          {prompt.useCase}
        </div>
      </div>
      
      {/* Tags */}
      {prompt.tags && prompt.tags.length > 0 && (
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-3 h-3 text-stone-500" />
            <div className="text-xs uppercase tracking-wider text-stone-500">
              Tags
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {prompt.tags.map((tag, i) => (
              <span 
                key={i}
                className="px-2 py-1 rounded text-xs bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="px-5 pb-4 text-xs text-stone-400 border-t border-stone-100 pt-3">
        Created {new Date(prompt.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
    </Card>
  )
}

