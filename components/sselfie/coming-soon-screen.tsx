import type React from "react"
interface ComingSoonScreenProps {
  title: string
  description: string
  icon?: React.ReactNode
}

export default function ComingSoonScreen({ title, description, icon }: ComingSoonScreenProps) {
  return (
    <div className="flex items-center justify-center min-h-[600px] bg-stone-50">
      <div className="text-center max-w-md px-6">
        {icon && <div className="mb-6 flex justify-center text-stone-300">{icon}</div>}
        <h2 className="text-3xl font-light text-stone-950 mb-4 tracking-tight">{title}</h2>
        <p className="text-stone-600 leading-relaxed">{description}</p>
        <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 bg-stone-100 rounded-full">
          <div className="w-2 h-2 bg-stone-400 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-stone-600 tracking-wider uppercase">Coming Soon</span>
        </div>
      </div>
    </div>
  )
}
