"use client"

interface FeedWelcomeScreenProps {
  onStart: () => void
}

export default function FeedWelcomeScreen({ onStart }: FeedWelcomeScreenProps) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#FDFCFA] p-6">
      <div className="max-w-lg w-full space-y-8 text-center">
        {/* Header */}
        <div className="space-y-3">
          <h1 
            className="text-3xl font-serif text-stone-900"
            style={{
              fontFamily: 'Hatton, Georgia, serif',
              fontWeight: 300,
              letterSpacing: '0.05em',
            }}
          >
            Create Your Dream Instagram Feed
          </h1>
          <p className="text-stone-600 leading-relaxed text-base">
            Maya will guide you through creating a strategic, 
            cohesive feed that drives growth
          </p>
        </div>
        
        {/* What You'll Get */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 space-y-3 text-left">
          <h3 
            className="text-sm uppercase tracking-wide text-stone-500 font-medium"
            style={{
              fontFamily: 'Inter, sans-serif',
            }}
          >
            What You'll Get
          </h3>
          <div className="space-y-3 text-sm text-stone-700">
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-stone-900 rounded-full mt-2 flex-shrink-0"></div>
              <span className="leading-relaxed">9 professional photos optimized for Instagram</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-stone-900 rounded-full mt-2 flex-shrink-0"></div>
              <span className="leading-relaxed">Strategic captions and hashtags for each post</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-stone-900 rounded-full mt-2 flex-shrink-0"></div>
              <span className="leading-relaxed">Recommended posting schedule</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 bg-stone-900 rounded-full mt-2 flex-shrink-0"></div>
              <span className="leading-relaxed">Complete feed strategy document</span>
            </div>
          </div>
        </div>
        
        {/* Cost & Time */}
        <div className="flex gap-4 justify-center text-sm text-stone-600 items-center">
          <div>
            <span className="font-medium text-stone-900">9-14 credits</span>
            <span className="text-stone-500"> • Cost</span>
          </div>
          <div className="w-px h-4 bg-stone-200"></div>
          <div>
            <span className="font-medium text-stone-900">~10 minutes</span>
            <span className="text-stone-500"> • Generation time</span>
          </div>
        </div>
        
        {/* CTA */}
        <button
          onClick={onStart}
          className="w-full px-6 py-4 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors"
          style={{
            fontFamily: 'Inter, sans-serif',
          }}
        >
          Start Creating
        </button>
      </div>
    </div>
  )
}

