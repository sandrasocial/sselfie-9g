"use client"

import { Hash, TrendingUp, Copy, Check } from "lucide-react"
import { useState } from "react"

interface HashtagStrategyPanelProps {
  businessType?: string
}

export default function HashtagStrategyPanel({ businessType = "business" }: HashtagStrategyPanelProps) {
  const [copiedSet, setCopiedSet] = useState<string | null>(null)

  // Generate hashtag sets based on business type
  const hashtagSets = {
    trending: [
      "#personalbrand",
      "#contentcreator",
      "#entrepreneur",
      "#businessgrowth",
      "#socialmediatips",
      "#instagramstrategy",
      "#brandstrategy",
      "#digitalmarketing",
      "#onlinebusiness",
      "#creativeentrepreneur",
    ],
    niche: [
      `#${businessType.toLowerCase().replace(/\s+/g, "")}`,
      "#smallbusiness",
      "#solopreneur",
      "#businessowner",
      "#entrepreneurlife",
      "#hustlehard",
      "#businessmindset",
      "#successmindset",
      "#growyourbusiness",
      "#businesscoach",
    ],
    engagement: [
      "#instagramgrowth",
      "#socialmediamarketing",
      "#contentmarketing",
      "#digitalcreator",
      "#brandingphotography",
      "#visualidentity",
      "#branddesign",
      "#marketingstrategy",
      "#businesstips",
      "#entrepreneurtips",
    ],
  }

  const copyHashtags = (setName: string, hashtags: string[]) => {
    const hashtagString = hashtags.join(" ")
    navigator.clipboard.writeText(hashtagString)
    setCopiedSet(setName)
    setTimeout(() => setCopiedSet(null), 2000)
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Hash className="w-4 h-4 text-stone-600" />
          <h3 className="text-sm font-medium uppercase tracking-wider text-stone-600">Hashtag Strategy</h3>
        </div>
        <p className="text-xs text-stone-500 leading-relaxed">Rotate these sets across your posts for maximum reach</p>
      </div>

      {/* Hashtag Sets */}
      <div className="space-y-4">
        {Object.entries(hashtagSets).map(([setName, hashtags]) => (
          <div key={setName} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-stone-950 uppercase tracking-wider capitalize">
                  {setName}
                </span>
                {setName === "trending" && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 rounded-full">
                    <TrendingUp className="w-3 h-3 text-green-600" />
                    <span className="text-xs text-green-600 font-medium">Hot</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => copyHashtags(setName, hashtags)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-stone-600 hover:text-stone-950 transition-colors"
              >
                {copiedSet === setName ? (
                  <>
                    <Check className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {hashtags.slice(0, 10).map((tag) => (
                <span key={tag} className="px-2 py-1 bg-stone-50 text-xs text-stone-700 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="pt-4 border-t border-stone-200">
        <h4 className="text-xs font-medium text-stone-950 mb-2 uppercase tracking-wider">Pro Tips</h4>
        <ul className="space-y-1.5 text-xs text-stone-600">
          <li className="flex items-start gap-2">
            <span className="text-stone-400">•</span>
            <span>Use 20-30 hashtags per post for maximum reach</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-stone-400">•</span>
            <span>Mix high-volume and niche hashtags</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-stone-400">•</span>
            <span>Place hashtags in first comment for cleaner captions</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
