"use client"

import { useState, useEffect } from "react"

interface ProAssetGalleryProps {
  onSelectImage?: (imageUrl: string) => void
  onReuseAdapt?: (generation: any) => void
}

export default function ProAssetGallery({ onSelectImage, onReuseAdapt }: ProAssetGalleryProps) {
  const [generations, setGenerations] = useState<any[]>([])
  const [selectedWorkflowType, setSelectedWorkflowType] = useState<string>('all')
  const [selectedGeneration, setSelectedGeneration] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadGenerations()
  }, [selectedWorkflowType])

  const loadGenerations = async () => {
    setLoading(true)
    try {
      const url = selectedWorkflowType === 'all'
        ? '/api/studio-pro/generations?limit=30'
        : `/api/studio-pro/generations?limit=30&workflowType=${selectedWorkflowType}`
      
      const response = await fetch(url, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setGenerations(data.generations || [])
      }
    } catch (error) {
      console.error('Failed to load generations:', error)
    } finally {
      setLoading(false)
    }
  }

  const workflowTypes = [
    { id: 'all', label: 'All' },
    { id: 'edit-image', label: 'Edits' },
    { id: 'reuse-adapt', label: 'Reused' },
    { id: 'carousel', label: 'Carousels' },
    { id: 'reel-cover', label: 'Reel Covers' },
  ]

  const handleImageClick = (generation: any) => {
    setSelectedGeneration(generation)
  }

  const handleReuseAdapt = () => {
    if (selectedGeneration && onReuseAdapt) {
      onReuseAdapt(selectedGeneration)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-stone-600 text-sm">Loading gallery...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-stone-50 to-white">
      {/* Header */}
      <div className="border-b border-stone-200/60 p-6">
        <h2 className="text-lg font-serif font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
          Recent Work
        </h2>

        {/* Filter */}
        <div className="flex gap-2">
          {workflowTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedWorkflowType(type.id)}
              className={`px-4 py-2 rounded-xl text-sm transition-all ${
                selectedWorkflowType === type.id
                  ? 'bg-stone-900 text-white'
                  : 'bg-white/80 backdrop-blur-xl border border-stone-200/60 text-stone-700 hover:border-stone-300'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {generations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-stone-600">No generations yet. Create something to see it here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {generations.map((gen) => (
              <button
                key={gen.id}
                onClick={() => handleImageClick(gen)}
                className="relative aspect-square rounded-xl overflow-hidden border border-stone-200/60 bg-white/80 backdrop-blur-xl hover:border-stone-900 transition-all group"
              >
                <img
                  src={gen.image_url}
                  alt={`Generation ${gen.id}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-stone-950/0 group-hover:bg-stone-950/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="text-white text-xs font-medium px-3 py-1.5 bg-stone-900/80 backdrop-blur-sm rounded-lg">
                    View
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedGeneration && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setSelectedGeneration(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-stone-200/60">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-stone-950">
                  {selectedGeneration.generation_type}
                </h3>
                <button
                  onClick={() => setSelectedGeneration(null)}
                  className="w-8 h-8 flex items-center justify-center text-stone-600 hover:text-stone-900 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {selectedGeneration.edit_instruction && (
                <p className="text-sm text-stone-600 mb-2">
                  <span className="font-medium">Edit:</span> {selectedGeneration.edit_instruction}
                </p>
              )}
            </div>

            <div className="p-6">
              <img
                src={selectedGeneration.image_url}
                alt="Generation"
                className="w-full rounded-lg mb-4"
              />

              <div className="flex gap-3">
                <a
                  href={selectedGeneration.image_url}
                  download
                  className="flex-1 px-4 py-2.5 bg-stone-900 text-white text-sm font-semibold rounded-xl hover:bg-stone-800 transition-colors text-center"
                >
                  Download
                </a>
                {onReuseAdapt && (
                  <button
                    onClick={handleReuseAdapt}
                    className="flex-1 px-4 py-2.5 bg-white/80 backdrop-blur-xl border border-stone-200/60 text-stone-700 text-sm font-semibold rounded-xl hover:border-stone-300 transition-colors"
                  >
                    Reuse / Adapt
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

































