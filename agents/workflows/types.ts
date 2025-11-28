/**
 * Workflow System Types
 * Multi-agent workflow orchestration
 */

import type { AgentRole, AgentContext } from "../core/types"

export interface WorkflowDefinition {
  id: string
  name: string
  description: string
  steps: WorkflowStepDefinition[]
}

export interface WorkflowStepDefinition {
  id: string
  agentRole: AgentRole
  description: string
  inputMapping?: (previousOutputs: any[]) => any
  outputMapping?: (stepOutput: any) => any
}

export interface WorkflowExecution {
  workflowId: string
  executionId: string
  status: "pending" | "running" | "completed" | "failed"
  currentStepIndex: number
  steps: WorkflowStepExecution[]
  context: AgentContext
  startedAt: Date
  completedAt?: Date
  error?: string
}

export interface WorkflowStepExecution {
  stepId: string
  agentRole: AgentRole
  status: "pending" | "running" | "completed" | "failed"
  input?: any
  output?: any
  startedAt?: Date
  completedAt?: Date
  error?: string
}
