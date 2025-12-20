/**
 * useProModeChat Hook
 * 
 * Chat state management for Pro Mode.
 * Handles message sending, receiving, and [GENERATE_CONCEPTS] trigger detection.
 */

'use client'

import { useState, useCallback, useRef } from 'react'
import type { ImageLibrary } from '@/lib/maya/pro/category-system'

const API_BASE = '/api/maya/pro/chat'

export interface ProModeMessage {
  id: string
  role: 'user' | 'maya'
  content: string
  timestamp: string
  imageUrl?: string
  conceptsGenerated?: boolean
}

export interface GenerateConceptsTrigger {
  detected: boolean
  essenceWords?: string
  messageId?: string
}

interface UseProModeChatReturn {
  messages: ProModeMessage[]
  isLoading: boolean
  error: string | null
  sendMessage: (content: string, imageUrl?: string) => Promise<void>
  clearMessages: () => void
  lastTrigger: GenerateConceptsTrigger | null
  resetTrigger: () => void
}

/**
 * Generate unique message ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Detect [GENERATE_CONCEPTS] trigger in message content
 */
function detectGenerateConceptsTrigger(content: string): GenerateConceptsTrigger | null {
  // Look for [GENERATE_CONCEPTS] trigger pattern
  const triggerPattern = /\[GENERATE_CONCEPTS\]\s*(.+?)(?:\n|$)/i
  const match = content.match(triggerPattern)

  if (match) {
    const essenceWords = match[1]?.trim()
    return {
      detected: true,
      essenceWords: essenceWords || undefined,
    }
  }

  return null
}

/**
 * Clean content by removing trigger markers (for display)
 */
function cleanMessageContent(content: string): string {
  // Remove [GENERATE_CONCEPTS] trigger and essence words for display
  return content
    .replace(/\[GENERATE_CONCEPTS\]\s*[^\n]*/gi, '')
    .trim()
}

/**
 * useProModeChat Hook
 * 
 * Manages chat state, message sending, and trigger detection for Pro Mode.
 */
export function useProModeChat(
  imageLibrary?: ImageLibrary
): UseProModeChatReturn {
  const [messages, setMessages] = useState<ProModeMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastTrigger, setLastTrigger] = useState<GenerateConceptsTrigger | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * Send message to Pro Mode chat API
   */
  const sendMessage = useCallback(
    async (content: string, imageUrl?: string) => {
      if (!content.trim() && !imageUrl) {
        return
      }

      setIsLoading(true)
      setError(null)

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController()

      // Add user message to state immediately
      const userMessage: ProModeMessage = {
        id: generateMessageId(),
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString(),
        imageUrl,
      }

      setMessages((prev) => [...prev, userMessage])

      try {
        // Prepare request body
        const requestBody = {
          message: content.trim(),
          imageUrl,
          imageLibrary: imageLibrary || {
            selfies: [],
            products: [],
            people: [],
            vibes: [],
            intent: '',
          },
          chatHistory: messages.map((msg) => ({
            role: msg.role,
            content: msg.content,
            imageUrl: msg.imageUrl,
          })),
        }

        // Send request to Pro Mode chat API
        const response = await fetch(API_BASE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          throw new Error(`Chat API error: ${response.statusText}`)
        }

        // Handle streaming response
        if (!response.body) {
          throw new Error('No response body')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let mayaMessageId = generateMessageId()
        let mayaContent = ''
        let buffer = ''

        // Create Maya message placeholder
        const mayaMessage: ProModeMessage = {
          id: mayaMessageId,
          role: 'maya',
          content: '',
          timestamp: new Date().toISOString(),
        }

        setMessages((prev) => [...prev, mayaMessage])

        // Stream response
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                continue
              }

              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  mayaContent += parsed.content

                  // Update Maya message with accumulated content
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === mayaMessageId
                        ? {
                            ...msg,
                            content: mayaContent,
                          }
                        : msg
                    )
                  )
                }
              } catch (parseError) {
                // If not JSON, treat as plain text
                mayaContent += data
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === mayaMessageId
                      ? {
                          ...msg,
                          content: mayaContent,
                        }
                      : msg
                  )
                )
              }
            } else if (line.trim()) {
              // Plain text line
              mayaContent += line + '\n'
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === mayaMessageId
                    ? {
                        ...msg,
                        content: mayaContent,
                      }
                    : msg
                )
              )
            }
          }
        }

        // Final update with cleaned content
        const finalContent = mayaContent.trim()
        const cleanedContent = cleanMessageContent(finalContent)

        // Detect [GENERATE_CONCEPTS] trigger
        const trigger = detectGenerateConceptsTrigger(finalContent)

        if (trigger) {
          setLastTrigger({
            ...trigger,
            messageId: mayaMessageId,
          })
        }

        // Update final message
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === mayaMessageId
              ? {
                  ...msg,
                  content: cleanedContent || finalContent, // Use cleaned if available, otherwise original
                  conceptsGenerated: trigger?.detected || false,
                }
              : msg
          )
        )
      } catch (err: any) {
        // Ignore abort errors
        if (err.name === 'AbortError') {
          return
        }

        const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
        console.error('[useProModeChat] Error sending message:', err)
        setError(errorMessage)

        // Remove the Maya message placeholder on error
        setMessages((prev) => prev.filter((msg) => msg.id !== mayaMessageId))
      } finally {
        setIsLoading(false)
        abortControllerRef.current = null
      }
    },
    [messages, imageLibrary]
  )

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    setMessages([])
    setError(null)
    setLastTrigger(null)
  }, [])

  /**
   * Reset trigger state
   */
  const resetTrigger = useCallback(() => {
    setLastTrigger(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    lastTrigger,
    resetTrigger,
  }
}
