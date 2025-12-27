"use client"

import { Card } from "@/components/ui/card"
import { Calendar, Copy, Check, Trash2, Instagram, Mail } from "lucide-react"
import { useState } from "react"

interface CalendarPost {
  date: string
  day: string
  pillar: string
  contentType: string
  topic: string
  hook?: string
  platform: string
  notes?: string
}

interface CalendarCardProps {
  calendar: {
    id: number
    title: string
    duration: string
    startDate: string
    endDate: string
    platform: string
    contentPillars: string[]
    posts: CalendarPost[]
    totalPosts: number
    specialFocus?: string
    createdAt: string
  }
  onDelete?: (id: number) => void
}

export default function CalendarCard({ calendar, onDelete }: CalendarCardProps) {
  const [copied, setCopied] = useState(false)
  const [expandedPost, setExpandedPost] = useState<number | null>(null)
  
  const handleCopy = async () => {
    // Format calendar as text
    const calendarText = `${calendar.title}\n${calendar.startDate} to ${calendar.endDate}\n\n` +
      calendar.posts.map((post, i) => 
        `${i + 1}. ${post.date} (${post.day}) - ${post.pillar}\n` +
        `   ${post.contentType}: ${post.topic}\n` +
        (post.hook ? `   Hook: ${post.hook}\n` : '') +
        (post.notes ? `   Notes: ${post.notes}\n` : '')
      ).join('\n')
    
    await navigator.clipboard.writeText(calendarText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const getPlatformIcon = (platform: string) => {
    if (platform === 'instagram') return <Instagram className="w-4 h-4" />
    if (platform === 'email') return <Mail className="w-4 h-4" />
    return <Calendar className="w-4 h-4" />
  }
  
  const getPlatformColor = (platform: string) => {
    switch(platform) {
      case 'instagram': return 'bg-pink-50 text-pink-700 border-pink-200'
      case 'email': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'both': return 'bg-purple-50 text-purple-700 border-purple-200'
      default: return 'bg-stone-50 text-stone-700 border-stone-200'
    }
  }
  
  const getPillarColor = (pillar: string) => {
    const colors: Record<string, string> = {
      'Future Self Visualization': 'bg-purple-100 text-purple-800',
      'Visibility Made Simple': 'bg-blue-100 text-blue-800',
      'SSELFIE Studio in Action': 'bg-pink-100 text-pink-800',
      'Proof of Concept': 'bg-green-100 text-green-800',
      'System & Strategy': 'bg-amber-100 text-amber-800',
      'Real Talk': 'bg-orange-100 text-orange-800',
      'Authority': 'bg-indigo-100 text-indigo-800'
    }
    return colors[pillar] || 'bg-stone-100 text-stone-800'
  }
  
  return (
    <Card className="border-stone-200 bg-white hover:shadow-lg transition-all duration-300">
      {/* Header */}
      <div className="p-5 border-b border-stone-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-stone-600" />
            <span className="text-xs font-medium uppercase tracking-wider text-stone-600">
              Content Calendar
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              title="Copy calendar"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-stone-600" />
              )}
            </button>
            
            {onDelete && (
              <button
                onClick={() => onDelete(calendar.id)}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete calendar"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            )}
          </div>
        </div>
        
        <h3 className="text-lg font-medium text-stone-900 mb-2">
          {calendar.title}
        </h3>
        
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider border flex items-center gap-1 ${getPlatformColor(calendar.platform)}`}>
            {getPlatformIcon(calendar.platform)}
            <span>{calendar.platform}</span>
          </span>
          <span className="text-xs text-stone-500">
            {calendar.totalPosts} posts
          </span>
          <span className="text-xs text-stone-500">
            • {new Date(calendar.startDate).toLocaleDateString()} - {new Date(calendar.endDate).toLocaleDateString()}
          </span>
        </div>
        
        {calendar.specialFocus && (
          <div className="mt-3 text-sm text-stone-700">
            <span className="font-medium">Focus:</span> {calendar.specialFocus}
          </div>
        )}
      </div>
      
      {/* Content Pillars */}
      <div className="p-5 bg-stone-50 border-b border-stone-100">
        <div className="text-xs uppercase tracking-wider text-stone-500 mb-2">
          Content Pillars
        </div>
        <div className="flex flex-wrap gap-2">
          {calendar.contentPillars.map((pillar, i) => (
            <span 
              key={i}
              className={`px-2 py-1 rounded text-xs font-medium ${getPillarColor(pillar)}`}
            >
              {pillar}
            </span>
          ))}
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div className="p-5 max-h-96 overflow-y-auto">
        <div className="space-y-3">
          {calendar.posts.map((post, index) => (
            <div 
              key={index}
              className="border border-stone-200 rounded-lg p-3 hover:border-stone-300 transition-colors cursor-pointer"
              onClick={() => setExpandedPost(expandedPost === index ? null : index)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-medium text-stone-900">
                      {new Date(post.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                    <span className="text-xs text-stone-500">
                      {post.day}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${getPillarColor(post.pillar)}`}>
                      {post.pillar}
                    </span>
                  </div>
                  
                  <div className="text-sm font-medium text-stone-900 mb-1">
                    {post.topic}
                  </div>
                  
                  {expandedPost === index && (
                    <div className="mt-2 space-y-2">
                      <div className="text-xs text-stone-600">
                        <span className="font-medium">Type:</span> {post.contentType}
                      </div>
                      
                      {post.hook && (
                        <div className="text-xs text-stone-600 bg-stone-50 p-2 rounded">
                          <span className="font-medium">Hook:</span> {post.hook}
                        </div>
                      )}
                      
                      {post.notes && (
                        <div className="text-xs text-stone-600">
                          <span className="font-medium">Notes:</span> {post.notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-stone-400">
                  {post.contentType}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Footer */}
      <div className="px-5 pb-4 text-xs text-stone-400">
        Created {new Date(calendar.createdAt).toLocaleDateString('en-US', {
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

