"use client"

import Link from "next/link"
import { ChevronLeft, Bot, Play, Pause } from "lucide-react"
import { AGENT_REGISTRY } from "@/lib/brand-engine"

export default function AgentsPage() {
  const agents = Object.values(AGENT_REGISTRY)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/admin/brand-engine"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Bot className="w-6 h-6 text-purple-600" />
              Agents
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Manage your Growth 6 AI agents
            </p>
          </div>
        </div>

        {/* Agents Grid */}
        <div className="grid gap-6">
          {agents.map((agent) => (
            <div
              key={agent.agentId}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {agent.name}
                  </h2>
                  <p className="text-gray-600 mt-1">{agent.description}</p>
                </div>
                <button
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                  onClick={() =>
                    alert("Agent run would be triggered via Make.com")
                  }
                >
                  <Play className="w-4 h-4" />
                  Run
                </button>
              </div>

              {/* Inputs & Outputs */}
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Inputs
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {agent.inputs.map((input) => (
                      <span
                        key={input}
                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                      >
                        {input}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Outputs
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {agent.outputs.map((output) => (
                      <span
                        key={output}
                        className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
                      >
                        {output}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Schedule */}
              {"schedule" in agent && agent.schedule && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-1">
                    Schedule
                  </h3>
                  <div className="text-sm text-gray-600">
                    {typeof agent.schedule === "object" ? (
                      <div className="space-y-1">
                        {Object.entries(agent.schedule).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium capitalize">{key}:</span>{" "}
                            {value}
                          </div>
                        ))}
                      </div>
                    ) : (
                      agent.schedule
                    )}
                  </div>
                </div>
              )}

              {/* System Prompt Preview */}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-purple-600 hover:text-purple-700">
                  View System Prompt
                </summary>
                <div className="mt-3 p-4 bg-gray-900 text-gray-100 rounded-lg text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{agent.systemPrompt}</pre>
                </div>
              </details>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="font-semibold text-blue-900 mb-2">
            About Agent Orchestration
          </h3>
          <p className="text-sm text-blue-800">
            Agents are orchestrated via Make.com scenarios. The "Run" buttons above
            are for manual testing. In production, agents run automatically based on
            their schedules or as part of workflows (weekly planning, daily planning,
            content creation).
          </p>
          <p className="text-sm text-blue-800 mt-2">
            To configure Make.com scenarios, see the implementation guide at{" "}
            <code className="bg-blue-100 px-2 py-0.5 rounded">
              /docs/BRAND_ENGINE_IMPLEMENTATION_GUIDE.md
            </code>
          </p>
        </div>
      </div>
    </div>
  )
}
