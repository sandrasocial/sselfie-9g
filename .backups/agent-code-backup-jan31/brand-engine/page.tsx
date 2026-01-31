"use client"

import { useState } from "react"
import Link from "next/link"
import { AdminNav } from "@/components/admin/admin-nav"
import {
  Brain,
  Radio,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Zap,
  Target,
  Sparkles,
  RefreshCw,
  Play,
} from "lucide-react"

/**
 * Brand Engine Admin Dashboard
 *
 * NOTE: Currently using MOCK DATA for demonstration.
 * To activate real AI agents, see setup guide below.
 */

type AgentStatus = "idle" | "running" | "completed" | "error"

type AgentCard = {
  id: string
  name: string
  description: string
  status: AgentStatus
  lastRun?: string
  nextRun?: string
  icon: React.ReactNode
}

const GROWTH_6_AGENTS: AgentCard[] = [
  {
    id: "brand_reasoner",
    name: "Brand Reasoner",
    description: "Strategic brain - decides what matters and what to post",
    status: "idle",
    lastRun: "2 hours ago",
    nextRun: "Tomorrow 7:00 AM",
    icon: <Brain className="w-5 h-5" />,
  },
  {
    id: "competitor_intel",
    name: "Competitor Intel",
    description: "Tracks competitors and reports patterns",
    status: "idle",
    lastRun: "Yesterday",
    nextRun: "Friday 4:00 PM",
    icon: <Target className="w-5 h-5" />,
  },
  {
    id: "experiment_planner",
    name: "Experiment Planner",
    description: "Turns insights into 2-3 weekly tests",
    status: "idle",
    lastRun: "3 days ago",
    nextRun: "Sunday 7:00 PM",
    icon: <Zap className="w-5 h-5" />,
  },
  {
    id: "voice_copy",
    name: "Voice & Copy",
    description: "Writes captions, hooks, scripts in your voice",
    status: "idle",
    lastRun: "Today",
    nextRun: "On demand",
    icon: <Sparkles className="w-5 h-5" />,
  },
  {
    id: "creative_director",
    name: "Creative Director",
    description: "Content angles, visual concepts, creative briefs",
    status: "idle",
    lastRun: "Today",
    nextRun: "On demand",
    icon: <Sparkles className="w-5 h-5" />,
  },
  {
    id: "scheduler",
    name: "Scheduler",
    description: "Cross-platform repurposing and calendar",
    status: "idle",
    lastRun: "Yesterday",
    nextRun: "Sunday 8:00 PM",
    icon: <Calendar className="w-5 h-5" />,
  },
]

const DATA_SOURCES = [
  {
    id: "brand_brain",
    name: "Brand Brain",
    description: "Identity, voice, offers, rules",
    path: "/admin/brand-engine/brain",
    icon: <Brain className="w-5 h-5" />,
    status: "synced",
    lastUpdated: "v329.1.2026",
  },
  {
    id: "signals",
    name: "Signals",
    description: "Trends, competitors, culture",
    path: "/admin/brand-engine/signals",
    icon: <Radio className="w-5 h-5" />,
    status: "mock_data",
    lastUpdated: "Mock data",
  },
  {
    id: "performance",
    name: "Performance",
    description: "Insights, tests, results",
    path: "/admin/brand-engine/performance",
    icon: <BarChart3 className="w-5 h-5" />,
    status: "mock_data",
    lastUpdated: "Mock data",
  },
]

function StatusBadge({ status }: { status: AgentStatus | string }) {
  const styles = {
    idle: "text-stone-500",
    running: "text-blue-600",
    completed: "text-green-600",
    error: "text-red-600",
    synced: "text-green-600",
    needs_update: "text-amber-600",
    mock_data: "text-stone-400",
  }

  const icons = {
    idle: <Clock className="w-3 h-3" />,
    running: <RefreshCw className="w-3 h-3 animate-spin" />,
    completed: <CheckCircle className="w-3 h-3" />,
    error: <AlertCircle className="w-3 h-3" />,
    synced: <CheckCircle className="w-3 h-3" />,
    needs_update: <AlertCircle className="w-3 h-3" />,
    mock_data: <AlertCircle className="w-3 h-3" />,
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs tracking-wider uppercase ${styles[status as keyof typeof styles] || styles.idle}`}
    >
      {icons[status as keyof typeof icons]}
      {status.replace("_", " ")}
    </span>
  )
}

export default function BrandEngineDashboard() {
  const [isRunning, setIsRunning] = useState(false)
  const [showSetupGuide, setShowSetupGuide] = useState(false)

  const runWeeklyEngine = async () => {
    setIsRunning(true)
    // This would trigger the Make.com webhook (not set up yet)
    setTimeout(() => {
      setIsRunning(false)
      alert("Make.com scenarios not configured yet. See setup guide below.")
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />
      <div className="max-w-6xl mx-auto p-6 sm:p-8">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase mb-2">
                Brand Engine
              </h1>
              <p className="text-xs sm:text-sm text-stone-600">
                Your private AI brand operating system
              </p>
            </div>
            <Link
              href="/admin"
              className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-600 hover:text-stone-950 transition-colors border-b border-stone-300 pb-1"
            >
              ← Back
            </Link>
          </div>
          
          {/* Setup Notice */}
          <div className="bg-amber-50 border border-amber-200 p-4 sm:p-6 rounded-none mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-amber-900 tracking-wide uppercase mb-1">
                  Using Mock Data
                </h3>
                <p className="text-xs text-amber-800 mb-3">
                  The Brand Engine is installed but not yet activated. Currently showing placeholder data to demonstrate structure.
                </p>
                <button
                  onClick={() => setShowSetupGuide(!showSetupGuide)}
                  className="text-xs tracking-[0.15em] uppercase text-amber-900 hover:text-amber-700 transition-colors border-b border-amber-400 pb-1"
                >
                  {showSetupGuide ? "Hide" : "Show"} Setup Guide →
                </button>
              </div>
            </div>
            
            {showSetupGuide && (
              <div className="mt-4 pt-4 border-t border-amber-200 space-y-3">
                <p className="text-xs text-amber-900 font-medium tracking-wide uppercase">To Activate Real AI Agents:</p>
                <ol className="space-y-2 text-xs text-amber-800">
                  <li>1. Import Make.com scenarios from <code className="bg-amber-100 px-2 py-0.5">/lib/brand-engine/automations/make-scenarios.json</code></li>
                  <li>2. Configure OpenAI API key in Make.com</li>
                  <li>3. Set your app URL in Make.com variables</li>
                  <li>4. Test the "Weekly Planning Engine" scenario</li>
                  <li>5. Full guide: <code className="bg-amber-100 px-2 py-0.5">/docs/BRAND_ENGINE_IMPLEMENTATION_GUIDE.md</code></li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Today's Focus Card */}
        <div className="bg-white border border-stone-200 p-6 sm:p-8 rounded-none mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase">
              Today's Focus
            </h2>
            <span className="text-xs text-stone-500 tracking-wider">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="bg-stone-50 border border-stone-200 p-4 sm:p-6 rounded-none mb-4">
            <p className="text-sm text-stone-900">
              Run the engine weekly, publish first case study + demo walkthrough, close 1-2 pilot clients
            </p>
            <p className="text-xs text-stone-600 mt-2">
              Time budget: 10-15 hours this week
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-none">
              <p className="text-[10px] text-stone-500 uppercase tracking-[0.15em] mb-2">
                Post Today (Mock)
              </p>
              <p className="text-xs text-stone-900">Identity pillar Reel + 3 Stories</p>
            </div>
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-none">
              <p className="text-[10px] text-stone-500 uppercase tracking-[0.15em] mb-2">
                CTA Focus
              </p>
              <p className="text-xs text-stone-900">Comment 'ENGINE' to apply</p>
            </div>
          </div>
        </div>

        {/* Data Sources */}
        <div className="mb-8">
          <h2 className="text-lg font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase mb-6">
            Data Sources
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DATA_SOURCES.map((source) => (
              <Link
                key={source.id}
                href={source.path}
                className="group bg-white border border-stone-200 p-5 rounded-none hover:border-stone-400 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-stone-600 group-hover:text-stone-900 transition-colors">
                    {source.icon}
                  </div>
                  <StatusBadge status={source.status} />
                </div>
                <h3 className="text-sm font-medium text-stone-950 tracking-wide uppercase mb-1">
                  {source.name}
                </h3>
                <p className="text-xs text-stone-600 mb-3">{source.description}</p>
                <p className="text-[10px] text-stone-400 tracking-wider uppercase">
                  {source.lastUpdated}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* Agents Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase">
              Growth 6 Agents
            </h2>
            <Link
              href="/admin/brand-engine/agents"
              className="text-xs tracking-[0.15em] uppercase text-stone-600 hover:text-stone-950 transition-colors border-b border-stone-300 pb-1"
            >
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {GROWTH_6_AGENTS.map((agent) => (
              <div
                key={agent.id}
                className="bg-white border border-stone-200 p-5 rounded-none"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-stone-600">{agent.icon}</div>
                  <StatusBadge status={agent.status} />
                </div>
                <h3 className="text-sm font-medium text-stone-950 tracking-wide uppercase mb-1">
                  {agent.name}
                </h3>
                <p className="text-xs text-stone-600 mb-4">{agent.description}</p>
                <div className="pt-3 border-t border-stone-200 flex justify-between text-[10px] text-stone-400 tracking-wider uppercase">
                  <span>Last: {agent.lastRun}</span>
                  <span>Next: {agent.nextRun}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity (Mock) */}
        <div className="bg-white border border-stone-200 p-6 sm:p-8 rounded-none">
          <h2 className="text-lg font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase mb-6">
            Recent Activity (Mock Data)
          </h2>
          <div className="space-y-4">
            {[
              { action: "Weekly Brief generated", agent: "Brand Reasoner", time: "Not yet active", status: "mock" },
              { action: "Caption drafts created", agent: "Voice & Copy", time: "Not yet active", status: "mock" },
              { action: "Competitor report ready", agent: "Competitor Intel", time: "Not yet active", status: "mock" },
              { action: "Experiment suggested", agent: "Experiment Planner", time: "Not yet active", status: "mock" },
            ].map((activity, i) => (
              <div key={i} className="flex items-start justify-between py-3 border-b border-stone-100 last:border-0">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-stone-300 mt-1.5" />
                  <div>
                    <p className="text-xs text-stone-900">{activity.action}</p>
                    <p className="text-[10px] text-stone-500 mt-0.5 tracking-wider uppercase">{activity.agent}</p>
                  </div>
                </div>
                <span className="text-[10px] text-stone-400 tracking-wider uppercase">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
