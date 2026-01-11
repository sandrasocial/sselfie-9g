"use client"

import { Mail, TrendingUp, Users, Calendar, BarChart3 } from 'lucide-react'

interface EmailQuickActionsProps {
  onAction: (action: string, prompt: string) => void
  disabled?: boolean
}

export default function EmailQuickActions({ onAction, disabled }: EmailQuickActionsProps) {
  const quickActions = [
    {
      label: "Welcome Email",
      icon: Mail,
      prompt: "Create a welcome email for new Studio members",
      category: "create"
    },
    {
      label: "Newsletter",
      icon: Mail,
      prompt: "Create a newsletter with updates and tips",
      category: "create"
    },
    {
      label: "Promotional",
      icon: TrendingUp,
      prompt: "Create a promotional email for a special offer",
      category: "create"
    },
    {
      label: "Check Status",
      icon: BarChart3,
      prompt: "Show me recent campaign performance",
      category: "status"
    },
    {
      label: "View Audience",
      icon: Users,
      prompt: "Show me my audience breakdown and segments",
      category: "audience"
    },
    {
      label: "Email Strategy",
      icon: Calendar,
      prompt: "What emails should I send this week? Give me a strategy.",
      category: "strategy"
    }
  ]

  return (
    <div>
      <div className="mb-3">
        <h3 className="text-xs uppercase tracking-wider text-stone-900 font-semibold mb-1">
          QUICK ACTIONS
        </h3>
        <p className="text-xs text-stone-500">
          Start with a common task
        </p>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => onAction(action.category, action.prompt)}
            disabled={disabled}
            className="flex items-center gap-2 px-3 py-2.5 bg-white border border-stone-300 rounded-lg hover:border-stone-900 hover:bg-stone-50 transition-all disabled:opacity-50 text-left min-h-[44px]"
          >
            <action.icon className="w-4 h-4 text-stone-700 shrink-0" />
            <span className="text-xs text-stone-700 font-medium">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

