/**
 * Streaming logic for Alex chat
 */

import { Anthropic } from '@anthropic-ai/sdk'
import { ALEX_CONSTANTS } from './constants'
import type { ChatMessage } from './types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

export async function* streamChatCompletion(
  systemPrompt: string,
  messages: ChatMessage[],
  tools: any[]
) {
  const stream = await anthropic.messages.stream({
    model: ALEX_CONSTANTS.MODEL,
    max_tokens: ALEX_CONSTANTS.MAX_TOKENS,
    system: systemPrompt,
    messages: messages as any,
    tools: tools as any
  })

  for await (const event of stream) {
    yield event
  }
}

