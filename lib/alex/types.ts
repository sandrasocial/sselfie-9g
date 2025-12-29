/**
 * Shared TypeScript types for Alex system
 */

export interface ToolDefinition {
  type: 'function'
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

export interface ToolHandler<TInput = any, TOutput = any> {
  (input: TInput): Promise<ToolResult<TOutput>>
}

export interface ToolResult<T = any> {
  success: boolean
  data?: T
  error?: string
  errorType?: string
  suggestion?: string
  email_preview_data?: EmailPreview
  message?: string
  displayCard?: boolean
  [key: string]: any
}

export interface EmailPreview {
  purpose: string
  from: string
  to: string
  subject: string
  html: string
  html_preview?: string
  preview_text?: string
  preview?: string
  created_at?: string
  status?: 'draft' | 'sent' | 'scheduled'
  sequenceName?: string
  sequenceEmails?: any[]
  isSequence?: boolean
}

export interface Tool<TInput = any, TOutput = any> {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
  execute: ToolHandler<TInput, TOutput>
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool' | 'system'
  content: string | MessageContent[] | any
  id?: string
}

export interface MessageContent {
  type: 'text' | 'tool_use' | 'tool_result' | 'image'
  text?: string
  tool_use_id?: string
  id?: string
  name?: string
  input?: any
  content?: any
  image?: string | { url: string }
  result?: any
}

export interface UserContext {
  userId: string
  userEmail?: string
}

export interface AdminAgentChat {
  id: number
  admin_user_id: string
  chat_title: string
  agent_mode: string | null
  created_at: Date
  updated_at: Date
  last_activity: Date
}

export interface AdminAgentMessage {
  id: number
  chat_id: number
  role: 'user' | 'assistant'
  content: string
  email_preview_data?: any | null
  created_at: Date
  parts?: any[]
}

