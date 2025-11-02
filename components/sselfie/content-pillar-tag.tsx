"use client"

import { Target, Lightbulb, User, Gift } from "lucide-react"

interface ContentPillarTagProps {
  pillar: "education" | "inspiration" | "personal" | "promotion"
  size?: "sm" | "md"
}

const pillarConfig = {
  education: {
    icon: Target,
    label: "Education",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  inspiration: {
    icon: Lightbulb,
    label: "Inspiration",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  personal: {
    icon: User,
    label: "Personal",
    className: "bg-pink-50 text-pink-700 border-pink-200",
  },
  promotion: {
    icon: Gift,
    label: "Promotion",
    className: "bg-green-50 text-green-700 border-green-200",
  },
}

export function ContentPillarTag({ pillar, size = "sm" }: ContentPillarTagProps) {
  const config = pillarConfig[pillar]
  const Icon = config.icon
  const sizeClasses = size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium border ${config.className} ${sizeClasses}`}
    >
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </span>
  )
}
