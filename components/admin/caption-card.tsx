import { Card } from "@/components/ui/card"
import { Copy, Check, Trash2, Instagram } from "lucide-react"
import { useState } from "react"

interface CaptionCardProps {
  caption: {
    id: number
    captionText: string
    captionType: string
    hashtags: string[]
    hook: string
    imageDescription: string
    tone: string
    wordCount: number
    cta?: string
    createdAt: string
    fullCaption?: string
  }
  onDelete?: (id: number) => void
}

export default function CaptionCard({ caption, onDelete }: CaptionCardProps) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async () => {
    const fullCaption = caption.fullCaption || 
      `${caption.captionText}\n\n${caption.hashtags.join(' ')}`
    await navigator.clipboard.writeText(fullCaption)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const getCaptionTypeColor = (type: string) => {
    switch(type) {
      case 'storytelling': return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'educational': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'promotional': return 'bg-pink-50 text-pink-700 border-pink-200'
      case 'motivational': return 'bg-amber-50 text-amber-700 border-amber-200'
      default: return 'bg-stone-50 text-stone-700 border-stone-200'
    }
  }
  
  return (
    <Card className="border-stone-200 bg-white hover:shadow-lg transition-all duration-300">
      {/* Header */}
      <div className="p-5 border-b border-stone-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Instagram className="w-4 h-4 text-stone-600" />
            <span className="text-xs font-medium uppercase tracking-wider text-stone-600">
              Instagram Caption
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              title="Copy caption"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-stone-600" />
              )}
            </button>
            
            {onDelete && (
              <button
                onClick={() => onDelete(caption.id)}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete caption"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider border ${getCaptionTypeColor(caption.captionType)}`}>
            {caption.captionType}
          </span>
          <span className="text-xs text-stone-500">
            {caption.wordCount} words
          </span>
          <span className="text-xs text-stone-500">
            • {caption.tone}
          </span>
          {caption.hashtags.length > 0 && (
            <span className="text-xs text-stone-500">
              • {caption.hashtags.length} hashtags
            </span>
          )}
        </div>
      </div>
      
      {/* Photo Context */}
      <div className="px-5 pt-4 pb-2">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">
          Photo Context
        </div>
        <div className="text-sm text-stone-600 italic">
          {caption.imageDescription}
        </div>
      </div>
      
      {/* Hook */}
      {caption.hook && (
        <div className="px-5 py-3 bg-stone-50">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">
            Hook
          </div>
          <div className="text-base font-medium text-stone-900">
            {caption.hook}
          </div>
        </div>
      )}
      
      {/* Caption Text */}
      <div className="p-5">
        <div className="text-stone-800 leading-relaxed whitespace-pre-wrap" style={{fontFamily: 'Inter, sans-serif'}}>
          {caption.captionText}
        </div>
      </div>
      
      {/* Hashtags */}
      {caption.hashtags && caption.hashtags.length > 0 && (
        <div className="px-5 pb-4">
          <div className="flex flex-wrap gap-2">
            {caption.hashtags.map((tag, i) => (
              <span 
                key={i}
                className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* CTA Highlight */}
      {caption.cta && (
        <div className="px-5 pb-4 pt-2 border-t border-stone-100">
          <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">
            Call to Action
          </div>
          <div className="text-sm font-medium text-stone-800">
            {caption.cta}
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="px-5 pb-4 text-xs text-stone-400">
        Created {new Date(caption.createdAt).toLocaleDateString('en-US', {
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

