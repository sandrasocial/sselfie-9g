/**
 * Convert AI SDK tool format to Anthropic format
 * Extracted from anthropic-direct-stream.ts for reuse
 */

import { zodToJsonSchema } from 'zod-to-json-schema'

/**
 * Convert Zod schema to Anthropic tool format
 */
function zodToAnthropicTool(name: string, description: string, schema: any) {
  const jsonSchema = zodToJsonSchema(schema, { target: 'openApi3' })
  
  return {
    name,
    description,
    input_schema: {
      type: 'object',
      properties: jsonSchema.properties || {},
      required: jsonSchema.required || [],
    },
  }
}

/**
 * Convert AI SDK tool format to Anthropic format
 */
export function convertToolsToAnthropicFormat(tools: Record<string, any>) {
  const anthropicTools: any[] = []
  
  for (const [name, tool] of Object.entries(tools)) {
    if (tool.parameters && tool.execute) {
      const anthropicTool = zodToAnthropicTool(
        name,
        tool.description || '',
        tool.parameters
      )
      anthropicTools.push(anthropicTool)
    }
  }
  
  return anthropicTools
}

/**
 * Convert messages from AI SDK format to Anthropic format
 */
export function convertMessagesToAnthropicFormat(messages: any[]) {
  return messages.map((msg) => {
    if (msg.role === 'user') {
      // Handle user messages - could be string or array of parts
      let content: any
      if (typeof msg.content === 'string') {
        content = msg.content
      } else if (Array.isArray(msg.content)) {
        content = msg.content.map((part: any) => {
          if (part.type === 'text') {
            return { type: 'text', text: part.text }
          } else if (part.type === 'image') {
            return { type: 'image', source: { type: 'url', url: part.image } }
          }
          return { type: 'text', text: String(part) }
        })
      } else {
        content = String(msg.content || '')
      }
      return { role: 'user' as const, content }
    } else if (msg.role === 'assistant') {
      // Handle assistant messages
      let content: any = []
      if (typeof msg.content === 'string') {
        content = [{ type: 'text', text: msg.content }]
      } else if (Array.isArray(msg.content)) {
        content = msg.content
          .filter((part: any) => part.type === 'text')
          .map((part: any) => ({ type: 'text', text: part.text || String(part) }))
      }
      
      // Handle tool calls if present
      if (msg.toolCalls && Array.isArray(msg.toolCalls)) {
        for (const toolCall of msg.toolCalls) {
          content.push({
            type: 'tool_use',
            id: toolCall.toolCallId || `tool_${Date.now()}`,
            name: toolCall.toolName,
            input: toolCall.args || {},
          })
        }
      }
      
      return { role: 'assistant' as const, content }
    }
    return null
  }).filter(Boolean)
}

