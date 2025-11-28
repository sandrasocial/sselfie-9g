/**
 * Agent Memory System Types
 * Long-term memory and context management
 */

export interface MemoryEntry {
  id: string
  userId: string
  agentRole: string
  type: "fact" | "preference" | "interaction" | "insight"
  content: string
  metadata?: Record<string, any>
  importance: number // 0-1 scale
  createdAt: Date
  lastAccessedAt?: Date
  accessCount: number
}

export interface MemoryQuery {
  userId: string
  query?: string
  agentRole?: string
  type?: MemoryEntry["type"]
  limit?: number
  minImportance?: number
}

export interface MemorySearchResult {
  entries: MemoryEntry[]
  relevanceScores: number[]
}
