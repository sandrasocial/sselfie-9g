/**
 * Core Agent System Types
 * Defines the foundational types for the new agent architecture
 */

export type AgentRole =
  | "content_researcher"
  | "brand_strategist"
  | "caption_writer"
  | "visual_stylist"
  | "email_marketer"
  | "admin_assistant"
  | "analytics_advisor"

export interface AgentConfig {
  id: string
  name: string
  role: AgentRole
  model: string
  temperature?: number
  maxTokens?: number
  systemPrompt: string
  tools?: AgentTool[]
}

export interface AgentTool {
  name: string
  description: string
  parameters: Record<string, any>
  execute: (params: any) => Promise<any>
}

export interface AgentContext {
  userId: string
  sessionId: string
  userProfile?: UserProfile
  conversationHistory?: Message[]
  metadata?: Record<string, any>
}

export interface UserProfile {
  name?: string
  brandVoice?: string
  targetAudience?: string
  contentPillars?: string[]
  instagramHandle?: string
  businessType?: string
}

export interface Message {
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  metadata?: Record<string, any>
}

export interface AgentResponse {
  content: string
  toolCalls?: ToolCall[]
  metadata?: Record<string, any>
  nextAction?: string
}

export interface ToolCall {
  toolName: string
  parameters: Record<string, any>
  result?: any
}

export interface WorkflowStep {
  id: string
  agentRole: AgentRole
  input: any
  output?: any
  status: "pending" | "in_progress" | "completed" | "failed"
  error?: string
}

export interface Workflow {
  id: string
  name: string
  steps: WorkflowStep[]
  currentStep: number
  status: "pending" | "in_progress" | "completed" | "failed"
  createdAt: Date
  completedAt?: Date
}
