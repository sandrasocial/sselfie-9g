export interface PromptContext {
  userIntent?: string
  brandProfile?: Record<string, unknown>
  userPreferences?: Record<string, unknown>
  [key: string]: unknown
}

export interface PromptVariation {
  name: string
  moodAdjustment?: string
  lightingAdjustment?: string
  styleKeywords?: string
  [key: string]: unknown
}

export interface PromptTemplate {
  id: string
  name: string
  description?: string
  useCases?: string[]
  requiredImages?: {
    min?: number
    max?: number
    types?: string[]
  }
  promptStructure: (context: PromptContext) => string
  variations?: PromptVariation[]
  [key: string]: unknown
}
