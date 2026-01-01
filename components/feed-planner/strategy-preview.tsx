"use client"

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
}

export default function StrategyPreview({ strategy, onApprove, onAdjust }: StrategyPreviewProps) {
  // Color mapping for post types and tones
  const getColorForType = (type: string, tone: string): string => {
    // Warm tones: cream, beige, warm white
    // Cool tones: sage, blue-gray, cool white
    const warmColors: Record<string, string> = {
      portrait: '#F5F1ED', // cream
      object: '#E8E3DD', // beige
      flatlay: '#FDFCFA', // warm white
      carousel: '#E5D5C8', // warm stone
      quote: '#D4C4B8', // warm taupe
      infographic: '#C9B8A8', // warm brown
    }
    const coolColors: Record<string, string> = {
      portrait: '#E5E8E5', // sage
      object: '#D4D9DC', // blue-gray
      flatlay: '#F5F7F7', // cool white
      carousel: '#D0D8DC', // cool blue
      quote: '#C4CFD4', // cool gray
      infographic: '#B8C4C9', // cool blue-gray
    }
    
    const colors = tone === 'warm' ? warmColors : coolColors
    return colors[type] || colors.portrait
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
      
      {/* Large 3x3 Color-Coded Grid */}
      <div className="grid grid-cols-3 gap-2 bg-white p-4 rounded-2xl border border-stone-200">
        {strategy.posts
          .sort((a, b) => a.position - b.position)
          .map(post => (
          <div
            key={post.position}
            className="aspect-square rounded-xl relative overflow-hidden border-2 border-stone-200"
            style={{ backgroundColor: getColorForType(post.type, post.tone) }}
          >
            {/* Position Number */}
            <div className="absolute top-2 left-2 w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs font-medium text-stone-900 shadow-sm">
              {post.position}
            </div>
            
            {/* Pro Mode Badge */}
            {post.generationMode === 'pro' && (
              <div className="absolute top-2 right-2 bg-stone-900 text-white text-[10px] px-2 py-1 rounded-full uppercase tracking-wider font-medium">
                Pro
              </div>
            )}
            
            {/* Post Type Label with Description */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
              <p className="text-white text-xs font-medium capitalize mb-0.5">
                {post.type}
              </p>
              <p className="text-white/80 text-[10px] truncate leading-tight">
                {post.description}
              </p>
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
          className="flex-1 px-6 py-4 border-2 border-stone-300 rounded-xl font-medium hover:bg-stone-50 transition-colors text-stone-700"
          style={{
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Adjust Strategy
        </button>
        <button
          onClick={onApprove}
          className="flex-1 px-6 py-4 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors"
          style={{
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Generate Feed ({strategy.totalCredits} credits)
        </button>
      </div>
    </div>
  )
}

