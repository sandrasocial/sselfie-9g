"use client"

import { useState } from "react"
import PromptBuilderChat from "./prompt-builder-chat"

type Mode = "image-prompts" | "writing-assistant"

interface PromptGuideBuilderClientProps {
  userId: string
}

export default function PromptGuideBuilderClient({ userId }: PromptGuideBuilderClientProps) {
  const [mode, setMode] = useState<Mode>("image-prompts")

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex gap-2 border-b border-stone-200">
        <button
          onClick={() => setMode("image-prompts")}
          className={`px-6 py-3 text-sm tracking-wider uppercase transition-all font-light ${
            mode === "image-prompts"
              ? "border-b-2 border-stone-950 text-stone-950"
              : "text-stone-500 hover:text-stone-950"
          }`}
        >
          Image Prompts
        </button>
        <button
          onClick={() => setMode("writing-assistant")}
          className={`px-6 py-3 text-sm tracking-wider uppercase transition-all font-light ${
            mode === "writing-assistant"
              ? "border-b-2 border-stone-950 text-stone-950"
              : "text-stone-500 hover:text-stone-950"
          }`}
        >
          Writing Assistant
        </button>
      </div>

      {/* Main Content Area */}
      {mode === "image-prompts" ? (
        <PromptBuilderChat userId={userId} />
      ) : (
        <div className="bg-white border border-stone-200 rounded-xl p-8">
          <div className="space-y-4">
            <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
              Writing Assistant Mode
            </h2>
            <p className="text-sm text-stone-600 font-light leading-relaxed">
              Content creation tool for captions, overlays, and hashtags will appear here.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
