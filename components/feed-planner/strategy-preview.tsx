"use client"

import { Loader2 } from "lucide-react"

interface StrategyPreviewProps {
  strategy: {
    gridPattern: string
    visualRhythm: string
    posts: Array<{
      position: number
      type: string
      description: string
      purpose: string
      tone: 'warm' | 'cool'
      generationMode: 'classic' | 'pro'
    }>
    totalCredits: number
  }
  onApprove: () => void
  onAdjust: () => void
  isCreating?: boolean
}

export default function StrategyPreview({ strategy, onApprove, onAdjust, isCreating = false }: StrategyPreviewProps) {
  // Stone color palette only (consistent with concept cards)
  const getStoneColor = (type: string): string => {
    // Use subtle stone colors for visual distinction
    const stoneColors: Record<string, string> = {
      portrait: '#F5F5F4', // stone-100
      carousel: '#E7E5E4', // stone-200
      quote: '#D6D3D1', // stone-300
      infographic: '#D6D3D1', // stone-300
      object: '#E7E5E4', // stone-200
      flatlay: '#F5F5F4', // stone-100
    }
    return stoneColors[type] || '#F5F5F4' // Default to stone-100
  }
  
  const classicCount = strategy.posts.filter(p => p.generationMode === 'classic').length
  const proCount = strategy.posts.filter(p => p.generationMode === 'pro').length
  
  // Group posts by type for breakdown
  const groupPostsByType = (posts: typeof strategy.posts) => {
    const groups: Record<string, number> = {}
    posts.forEach(post => {
      const type = post.type
      groups[type] = (groups[type] || 0) + 1
    })
    return groups
  }
  
  return (
    <div className="max-w-2xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 
          className="text-2xl font-serif text-stone-900"
          style={{
            fontFamily: 'Hatton, Georgia, serif',
            fontWeight: 300,
            letterSpacing: '0.05em',
          }}
        >
          Your Feed Strategy
        </h2>
        <p className="text-stone-600 text-base">
          Preview your 9-post feed before generation
        </p>
      </div>
      
      {/* Large 3x3 Grid - Clean Stone Design */}
      <div className="grid grid-cols-3 gap-2 bg-stone-100 p-4 rounded-2xl border border-stone-200">
        {strategy.posts
          .sort((a, b) => a.position - b.position)
          .map(post => (
          <div
            key={post.position}
            className="aspect-square rounded-xl relative overflow-hidden bg-gradient-to-br from-stone-50 to-stone-100 border border-stone-200"
          >
            {/* Subtle background pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="w-full h-full" style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(0 0 0) 1px, transparent 0)',
                backgroundSize: '16px 16px'
              }}></div>
            </div>
            
            {/* Position Number */}
            <div className="absolute top-2 left-2 w-6 h-6 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-xs font-medium text-stone-900 shadow-sm border border-stone-200">
              {post.position}
            </div>
            
            {/* Pro Mode Badge */}
            {post.generationMode === 'pro' && (
              <div className="absolute top-2 right-2 bg-stone-900 text-white text-[10px] px-2 py-1 rounded-full uppercase tracking-wider font-medium">
                Pro
              </div>
            )}
            
            {/* Post Type Badge - Centered, Clean */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/90 backdrop-blur-sm border border-stone-200 rounded-full px-4 py-2 shadow-sm">
                <span className="text-xs font-medium text-stone-900 tracking-wider uppercase">
                  {post.type}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Strategy Description */}
      <div className="space-y-3 text-sm text-stone-600 leading-relaxed">
        <p>{strategy.gridPattern}</p>
        <p>{strategy.visualRhythm}</p>
      </div>
      
      {/* Post Type Breakdown */}
      <div className="bg-stone-50 rounded-xl p-4 space-y-3">
        <h3 
          className="text-xs uppercase tracking-wide text-stone-500 font-medium"
          style={{
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Post Breakdown
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {Object.entries(groupPostsByType(strategy.posts)).map(([type, count]) => (
            <div key={type} className="flex justify-between items-center">
              <span className="text-stone-700 capitalize">{type}</span>
              <span className="text-stone-900 font-medium">{count} posts</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Credit Cost - PROMINENT */}
      <div className="bg-white rounded-xl p-6 border-2 border-stone-900 space-y-3">
        <h3 
          className="text-xs uppercase tracking-wide text-stone-500 font-medium"
          style={{
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Credit Cost
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-stone-700">
              Classic Mode ({classicCount} posts @ 1 credit)
            </span>
            <span className="text-stone-900 font-medium">{classicCount}</span>
          </div>
          {proCount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-stone-700">
                Pro Mode ({proCount} posts @ 2 credits)
              </span>
              <span className="text-stone-900 font-medium">{proCount * 2}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold pt-2 border-t border-stone-200">
            <span className="text-stone-900">Total Credits</span>
            <span className="text-stone-900 text-xl">{strategy.totalCredits}</span>
          </div>
        </div>
      </div>
      
      {/* Actions - Larger, More Prominent */}
      <div className="flex gap-4">
        <button
          onClick={onAdjust}
          disabled={isCreating}
          className="flex-1 px-6 py-4 border-2 border-stone-300 rounded-xl font-medium hover:bg-stone-50 transition-colors text-stone-700 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Adjust Strategy
        </button>
        <button
          onClick={onApprove}
          disabled={isCreating}
          className="flex-1 px-6 py-4 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Creating Feed...</span>
            </>
          ) : (
            `Generate Feed (${strategy.totalCredits} credits)`
          )}
        </button>
      </div>
    </div>
  )
}

