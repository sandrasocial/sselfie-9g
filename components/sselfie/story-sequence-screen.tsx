"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

export default function StorySequenceScreen() {
  const [selectedStory, setSelectedStory] = useState(0)
  const stories = [1, 2, 3, 4, 5]

  return (
    <div className="h-full flex flex-col bg-stone-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-stone-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div>
            <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
              STORY SEQUENCE CREATOR
            </h2>
            <p className="text-sm text-stone-600 mt-1">Create cohesive Instagram Story sequences</p>
          </div>
          <button className="px-6 py-3 bg-stone-950 hover:bg-stone-800 text-white rounded-lg text-xs font-medium tracking-wider uppercase transition-all flex items-center gap-2">
            <Plus size={16} />
            NEW SEQUENCE
          </button>
        </div>
      </div>

      {/* Story Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-12 gap-6">
            {/* Story Thumbnails */}
            <div className="col-span-3">
              <h3 className="font-serif text-sm font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
                STORY SEQUENCE
              </h3>
              <div className="space-y-3">
                {stories.map((story, index) => (
                  <button
                    key={story}
                    onClick={() => setSelectedStory(index)}
                    className={`w-full aspect-[9/16] rounded-xl border-2 transition-all overflow-hidden ${
                      index === selectedStory
                        ? "border-stone-950 ring-2 ring-stone-950 ring-offset-2"
                        : "border-stone-200 hover:border-stone-300"
                    }`}
                  >
                    <div className="w-full h-full bg-stone-100 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl text-stone-300 mb-1">📱</div>
                        <div className="text-xs text-stone-600">Story {story}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Story Preview */}
            <div className="col-span-5">
              <h3 className="font-serif text-sm font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
                PREVIEW
              </h3>
              <div className="bg-white rounded-2xl border border-stone-200 p-4">
                <div className="aspect-[9/16] bg-stone-100 rounded-xl overflow-hidden relative">
                  {/* Story Progress Bars */}
                  <div className="absolute top-2 left-2 right-2 flex gap-1">
                    {stories.map((_, index) => (
                      <div
                        key={index}
                        className={`flex-1 h-0.5 rounded-full ${index === selectedStory ? "bg-white" : "bg-white/30"}`}
                      />
                    ))}
                  </div>

                  {/* Story Content */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl text-stone-300 mb-4">📸</div>
                      <p className="text-sm text-stone-600">Story {selectedStory + 1}</p>
                    </div>
                  </div>

                  {/* Story Footer */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3">
                      <p className="text-xs text-stone-950 font-medium">@sselfie</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Story Editor */}
            <div className="col-span-4">
              <h3 className="font-serif text-sm font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
                STORY DETAILS
              </h3>
              <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-stone-600 mb-2">TYPE</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Photo", "Video", "Text", "Poll"].map((type) => (
                      <button
                        key={type}
                        className="px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-medium tracking-wider uppercase transition-all"
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-stone-600 mb-2">
                    IMAGE
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button className="px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-medium tracking-wider uppercase transition-all">
                      GEN
                    </button>
                    <button className="px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-medium tracking-wider uppercase transition-all">
                      UPLOAD
                    </button>
                    <button className="px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-medium tracking-wider uppercase transition-all">
                      GALLERY
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-stone-600 mb-2">TEXT</label>
                  <textarea
                    placeholder="Enter story text..."
                    rows={3}
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-950 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-stone-600 mb-2">
                    STICKERS
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Poll", "Question", "Link", "Location"].map((sticker) => (
                      <button
                        key={sticker}
                        className="px-3 py-2 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-medium tracking-wider uppercase transition-all"
                      >
                        {sticker}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
