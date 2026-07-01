"use client"

// SSELFIE Studio 3.0 - quick-prompt chips (MAYA-REBUILD-05 Phase B).
// A tappable row of starter prompts shown before the conversation begins, so a user can
// get going in one tap. Adapted from the live Studio's quick-chips pattern, light skin.

interface QuickPromptsProps {
  prompts: string[]
  onSelect: (prompt: string) => void
  disabled?: boolean
}

export function QuickPrompts({ prompts, onSelect, disabled }: QuickPromptsProps) {
  if (prompts.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {prompts.map((p) => (
        <button
          key={p}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(p)}
          className="rounded-full border border-[#C5C6C8]/70 bg-white px-3 py-1.5 text-[12px] text-[#4F5052] transition-colors hover:border-[#0D0E10]/40 hover:text-[#0D0E10] disabled:opacity-40"
        >
          {p}
        </button>
      ))}
    </div>
  )
}
