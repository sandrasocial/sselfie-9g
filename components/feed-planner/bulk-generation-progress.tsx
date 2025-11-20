"use client"

import { Check, Loader2 } from 'lucide-react'
import { Progress } from "@/components/ui/progress"

interface BulkGenerationProgressProps {
  progress: {
    total: number
    completed: number
    predictions: any[]
  } | null
}

export default function BulkGenerationProgress({ progress }: BulkGenerationProgressProps) {
  if (!progress) return null

  const percentage = (progress.completed / progress.total) * 100

  return (
    <div className="bg-white rounded-3xl shadow-2xl border border-stone-200 p-12 max-w-2xl w-full">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-full mb-6">
          {progress.completed === progress.total ? (
            <Check size={40} className="text-white" />
          ) : (
            <Loader2 size={40} className="text-white animate-spin" />
          )}
        </div>
        <h2 className="font-serif text-3xl font-light text-stone-950 mb-3">
          {progress.completed === progress.total ? "Feed Complete" : "Creating Your Feed"}
        </h2>
        <p className="text-lg text-stone-600">
          {progress.completed} of {progress.total} posts generated
        </p>
      </div>

      <Progress value={percentage} className="h-3 mb-6" />

      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: progress.total }).map((_, idx) => (
          <div
            key={idx}
            className={`aspect-square rounded-2xl border-2 transition-all ${
              idx < progress.completed
                ? "border-green-500 bg-green-50"
                : "border-stone-200 bg-stone-50"
            }`}
          >
            <div className="w-full h-full flex items-center justify-center">
              {idx < progress.completed ? (
                <Check size={24} className="text-green-600" />
              ) : (
                <Loader2 size={24} className="text-stone-400 animate-spin" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
