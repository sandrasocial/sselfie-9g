"use client"

interface WorkbenchResultCardProps {
  imageUrl?: string
  status?: 'ready' | 'processing' | 'error'
  resolution?: '1K' | '2K' | '4K'
  creditsUsed?: number
  onUseInBox?: (boxNumber: 1 | 2 | 3) => void
}

export default function WorkbenchResultCard({
  imageUrl,
  status = 'ready',
  resolution,
  creditsUsed,
  onUseInBox
}: WorkbenchResultCardProps) {
  if (status === 'processing') {
    return (
      <div className="bg-white/50 backdrop-blur-xl border border-white/70 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-16 h-16 bg-stone-100 rounded-lg flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-stone-900">Generating...</p>
            <p className="text-xs text-stone-500">This may take a moment</p>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <p className="text-sm text-red-700">Generation failed. Please try again.</p>
      </div>
    )
  }

  if (!imageUrl) {
    return null
  }

  return (
    <div className="bg-white/80 backdrop-blur-md border border-stone-200/80 rounded-2xl p-6 sm:p-8 space-y-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-serif font-extralight tracking-[0.2em] text-stone-950 uppercase">Result</h3>
        {resolution && (
          <span className="text-xs font-light tracking-[0.1em] text-stone-500 uppercase">{resolution}</span>
        )}
      </div>
      
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-stone-50 to-stone-100/50 border border-stone-200/60 shadow-[0_8px_24px_rgba(0,0,0,0.08)] group">
        <img
          src={imageUrl}
          alt="Studio Pro generation"
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3">
          <span className="px-3 py-1 bg-stone-950/90 backdrop-blur-sm text-white text-[10px] font-light tracking-[0.15em] uppercase rounded-lg">
            Studio Pro
          </span>
        </div>
        {creditsUsed && (
          <div className="absolute top-3 right-3">
            <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-stone-700 text-[10px] font-light tracking-[0.1em] uppercase rounded-lg border border-stone-200/60">
              {creditsUsed} credits
            </span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        <button
          onClick={() => window.open(imageUrl, '_blank')}
          className="flex-1 px-6 py-3 bg-stone-950 text-white rounded-xl font-light text-sm tracking-[0.15em] uppercase hover:bg-stone-900 active:scale-[0.98] transition-all duration-300 touch-manipulation shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.16)]"
        >
          Download
        </button>
      </div>
      
      {onUseInBox && (
        <div className="pt-4 border-t border-stone-200/60">
          <p className="text-xs font-light tracking-[0.1em] text-stone-600 uppercase mb-3">Use in Box:</p>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((boxNum) => (
              <button
                key={boxNum}
                onClick={() => onUseInBox(boxNum as 1 | 2 | 3)}
                className="px-4 py-2.5 text-xs font-light tracking-[0.1em] uppercase bg-stone-50/80 hover:bg-stone-100/80 border border-stone-200/60 hover:border-stone-300/80 rounded-xl transition-all duration-200 touch-manipulation active:scale-95"
              >
                Box {boxNum}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}



