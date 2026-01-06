/**
 * Tool Executor
 * Executes tools by name and returns results
 */

import type { ToolResult } from '../types'
import { logAdminError } from '@/lib/admin-error-log'

// This will be populated by the tools index
const toolHandlers = new Map<string, (input: any) => Promise<ToolResult>>()

export function registerToolHandler(name: string, handler: (input: any) => Promise<ToolResult>) {
  toolHandlers.set(name, handler)
}

export async function executeTool(
  toolName: string,
  toolInput: any
): Promise<ToolResult> {
  const handler = toolHandlers.get(toolName)

  if (!handler) {
    return {
      success: false,
      error: `Tool not found: ${toolName}`
    }
  }

  try {
    return await handler(toolInput)
  } catch (error) {
    console.error(`[Alex] Tool execution error for ${toolName}:`, error)
    
    // Log to admin error radar
    await logAdminError({
      toolName: `alex-tool:${toolName}`,
      error: error instanceof Error ? error : new Error(String(error)),
      context: {
        toolInput: typeof toolInput === 'object' ? JSON.stringify(toolInput) : String(toolInput),
      },
    }).catch(() => {
      // Ignore logging errors - don't break tool execution
    })
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tool execution failed'
    }
  }
}

export function getAllToolNames(): string[] {
  return Array.from(toolHandlers.keys())
}

