"use client"

import { useState, useEffect } from "react"

interface Agent {
  name: string
  metadata: {
    name: string
    version?: string
    description?: string
  }
}

interface AgentSelectProps {
  value?: string
  onChange: (agentName: string) => void
  agents?: Agent[]
  disabled?: boolean
}

export default function AgentSelect({ value, onChange, agents, disabled }: AgentSelectProps) {
  const [agentList, setAgentList] = useState<Agent[]>([])

  useEffect(() => {
    if (agents) {
      setAgentList(agents)
    } else {
      // Fetch agents if not provided
      fetch("/api/admin/agents/run")
        .then((res) => res.json())
        .then((data) => {
          if (data.metadata) {
            setAgentList(
              data.metadata.map((item: { name: string; metadata: any }) => ({
                name: item.name,
                metadata: item.metadata,
              })),
            )
          }
        })
        .catch(console.error)
    }
  }, [agents])

  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm text-stone-950 font-light focus:outline-none focus:border-stone-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <option value="">Select an agent...</option>
      {agentList.map((agent) => (
        <option key={agent.name} value={agent.name}>
          {agent.name}
        </option>
      ))}
    </select>
  )
}

