"use client"

interface FeedStrategyPanelProps {
  feedData: any
}

export default function FeedStrategyPanel({ feedData }: FeedStrategyPanelProps) {
  return (
    <div className="space-y-6">
      
      {/* Strategy Overview */}
      <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl p-6 shadow-xl shadow-stone-900/5">
        <h3 className="font-serif text-lg sm:text-xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] text-stone-900 uppercase mb-4">
          Feed Strategy
        </h3>
        <p className="text-sm font-light text-stone-600 leading-relaxed">
          {feedData.feedLayout?.feed_story || feedData.feed_story || "Your feed is designed to showcase your brand authentically"}
        </p>
      </div>

      {/* Grid Pattern */}
      <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl p-6 shadow-xl shadow-stone-900/5">
        <h3 className="font-serif text-lg sm:text-xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] text-stone-900 uppercase mb-4">
          Grid Pattern
        </h3>
        <div className="space-y-4">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase font-light text-stone-400 mb-2">Pattern</p>
            <p className="text-sm font-light text-stone-900">{feedData.feedLayout?.layout_type || feedData.layout_type || "Balanced Mix"}</p>
          </div>
          <div>
            <p className="text-xs tracking-[0.2em] uppercase font-light text-stone-400 mb-2">Visual Rhythm</p>
            <p className="text-sm font-light text-stone-600 leading-relaxed">
              {feedData.feedLayout?.visual_rhythm || feedData.visual_rhythm || "Dynamic flow with varied composition"}
            </p>
          </div>
        </div>
      </div>

      {/* Bio */}
      {feedData.bio && (
        <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl p-6 shadow-xl shadow-stone-900/5">
          <h3 className="font-serif text-lg sm:text-xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] text-stone-900 uppercase mb-4">
            Instagram Bio
          </h3>
          <p className="text-sm font-light text-stone-600 leading-relaxed whitespace-pre-wrap">
            {feedData.bio.bio_text}
          </p>
        </div>
      )}

      {/* Color Palette */}
      {(feedData.feedLayout?.color_palette || feedData.color_palette) && (
        <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl p-6 shadow-xl shadow-stone-900/5">
          <h3 className="font-serif text-lg sm:text-xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] text-stone-900 uppercase mb-4">
            Color Palette
          </h3>
          <div className="flex gap-2">
            {Object.values(feedData.feedLayout?.color_palette || feedData.color_palette).slice(0, 5).map((color: any, idx) => (
              <div
                key={idx}
                className="w-10 h-10 rounded-lg border border-stone-200 shadow-sm"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Hashtags */}
      {((feedData.feedLayout?.hashtags || feedData.hashtags) && (feedData.feedLayout?.hashtags || feedData.hashtags).length > 0) && (
        <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl p-6 shadow-xl shadow-stone-900/5">
          <h3 className="font-serif text-lg sm:text-xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] text-stone-900 uppercase mb-4">
            Hashtags
          </h3>
          <div className="flex flex-wrap gap-2">
            {(feedData.feedLayout?.hashtags || feedData.hashtags).slice(0, 10).map((tag: string, idx: number) => (
              <span
                key={idx}
                className="px-3 py-1.5 bg-white/60 backdrop-blur-xl border border-stone-200 text-stone-700 text-xs rounded-lg font-light tracking-wider"
              >
                {tag.startsWith('#') ? tag : `#${tag}`}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
