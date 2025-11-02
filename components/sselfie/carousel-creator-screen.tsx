"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"

export default function CarouselCreatorScreen() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const slides = ["Hook", "Value", "Story", "Proof", "CTA"]

  return (
    <div className="h-full flex flex-col bg-stone-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-stone-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div>
            <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
              CAROUSEL CREATOR
            </h2>
            <p className="text-sm text-stone-600 mt-1">Design multi-slide carousel posts</p>
          </div>
          <button className="px-6 py-3 bg-stone-950 hover:bg-stone-800 text-white rounded-lg text-xs font-medium tracking-wider uppercase transition-all flex items-center gap-2">
            <Plus size={16} />
            NEW CAROUSEL
          </button>
        </div>
      </div>

      {/* Carousel Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Instagram Carousel Preview */}
          <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
            <div className="max-w-md mx-auto">
              <div className="aspect-square bg-stone-100 rounded-lg mb-4 flex items-center justify-center relative">
                <button
                  onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                  disabled={currentSlide === 0}
                  className="absolute left-4 p-2 bg-white/80 rounded-full hover:bg-white disabled:opacity-50"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="text-center">
                  <div className="text-6xl text-stone-300 mb-4">📸</div>
                  <p className="text-sm text-stone-600">Slide {currentSlide + 1} Preview</p>
                  <p className="text-xs text-stone-400 mt-2">{slides[currentSlide]}</p>
                </div>
                <button
                  onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
                  disabled={currentSlide === slides.length - 1}
                  className="absolute right-4 p-2 bg-white/80 rounded-full hover:bg-white disabled:opacity-50"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              <div className="flex justify-center gap-1">
                {slides.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentSlide ? "bg-stone-950" : "bg-stone-300"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Slide Editor */}
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <h3 className="font-serif text-lg font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
              SLIDE EDITOR
            </h3>
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {slides.map((slide, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`flex-shrink-0 px-4 py-3 rounded-lg border-2 transition-all ${
                    index === currentSlide
                      ? "border-stone-950 bg-stone-50"
                      : "border-stone-200 bg-white hover:border-stone-300"
                  }`}
                >
                  <div className="text-xs font-medium text-stone-950 mb-1">Slide {index + 1}</div>
                  <div className="text-xs text-stone-600">{slide}</div>
                </button>
              ))}
            </div>

            {/* Slide Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-stone-600 mb-2">IMAGE</label>
                <div className="flex gap-2">
                  <button className="flex-1 px-4 py-3 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-medium tracking-wider uppercase transition-all">
                    GENERATE
                  </button>
                  <button className="flex-1 px-4 py-3 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-medium tracking-wider uppercase transition-all">
                    UPLOAD
                  </button>
                  <button className="flex-1 px-4 py-3 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-medium tracking-wider uppercase transition-all">
                    GALLERY
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium tracking-wider uppercase text-stone-600 mb-2">
                  TEXT OVERLAY
                </label>
                <input
                  type="text"
                  placeholder="Enter text for this slide..."
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-950"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-stone-600 mb-2">
                    POSITION
                  </label>
                  <select className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-950">
                    <option>Top</option>
                    <option>Center</option>
                    <option>Bottom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium tracking-wider uppercase text-stone-600 mb-2">
                    STYLE
                  </label>
                  <select className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-950">
                    <option>Bold</option>
                    <option>Minimal</option>
                    <option>Elegant</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
