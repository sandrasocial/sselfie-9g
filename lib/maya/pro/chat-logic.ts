/**
 * Pro Mode Chat Flow Logic
 * 
 * Handles message routing and intent detection for Studio Pro Mode.
 * Detects concept requests, library updates, pivot requests, and builds responses.
 */

import { detectCategory, getAllCategories, type ImageLibrary, type CategoryInfo } from './category-system'

export interface ProModeMessage {
  role: 'user' | 'maya'
  content: string
  timestamp?: string
  imageUrl?: string
}

export type ProModeResponseType = 'generate_concepts' | 'update_library' | 'pivot' | 'chat'

export interface ProModeResponse {
  type: ProModeResponseType
  mayaResponse?: string
  trigger?: string
  category?: CategoryInfo
  action?: LibraryAction
  newCategory?: CategoryInfo
}

export interface LibraryAction {
  type: 'add_images' | 'remove_images' | 'clear_library' | 'update_intent'
  category?: 'selfies' | 'products' | 'people' | 'vibes'
  imageUrls?: string[]
  intent?: string
}

/**
 * Main handler for Pro Mode messages
 * 
 * Routes messages to appropriate handlers based on intent detection.
 */
export function handleProModeMessage(
  message: string,
  library: ImageLibrary,
  chatHistory: ProModeMessage[]
): ProModeResponse {
  const messageLower = message.toLowerCase().trim()

  // 1. Detect concept request
  if (isConceptRequest(message, chatHistory)) {
    const category = detectCategory(message, library)
    return {
      type: 'generate_concepts',
      mayaResponse: buildMayaResponse(message, category),
      trigger: '[GENERATE_CONCEPTS]',
      category,
    }
  }

  // 2. Detect library management
  if (isLibraryUpdate(message)) {
    const action = parseLibraryAction(message)
    return {
      type: 'update_library',
      action,
    }
  }

  // 3. Detect category pivot
  if (isPivotRequest(message, chatHistory)) {
    const newCategory = detectNewCategory(message, library)
    return {
      type: 'pivot',
      newCategory,
    }
  }

  // 4. Default conversation
  return {
    type: 'chat',
    mayaResponse: buildConversationalResponse(message, library),
  }
}

/**
 * Detect if message is a concept generation request
 * 
 * Looks for keywords like: create, generate, make, show me, concepts, photos, images, etc.
 */
export function isConceptRequest(
  message: string,
  chatHistory: ProModeMessage[] = []
): boolean {
  const messageLower = message.toLowerCase().trim()

  // Direct concept request keywords
  const conceptKeywords = [
    'create',
    'generate',
    'make',
    'show me',
    'give me',
    'i want',
    'i need',
    'concepts',
    'concept',
    'photos',
    'images',
    'pictures',
    'content',
    'looks',
    'outfits',
    'styles',
    'ideas',
    'suggestions',
  ]

  // Check if message contains concept keywords
  const hasConceptKeyword = conceptKeywords.some((keyword) =>
    messageLower.includes(keyword)
  )

  // Check for visual content requests
  const visualContentPatterns = [
    /(create|make|generate|show).*(photo|image|picture|content|look|outfit|style)/i,
    /(i want|i need|give me).*(photo|image|picture|content|look|outfit|style)/i,
    /(what.*can.*you.*create|what.*should.*i.*post)/i,
  ]

  const hasVisualPattern = visualContentPatterns.some((pattern) =>
    pattern.test(message)
  )

  // Check if previous message was about concepts (context)
  const recentContext = chatHistory
    .slice(-3)
    .some((msg) => {
      if (msg.role === 'maya') {
        return msg.content.includes('[GENERATE_CONCEPTS]') || 
               msg.content.toLowerCase().includes('concept')
      }
      return false
    })

  return hasConceptKeyword || hasVisualPattern || recentContext
}

/**
 * Detect if message is a library update request
 * 
 * Looks for keywords like: add, remove, delete, update, clear, manage, etc.
 */
export function isLibraryUpdate(message: string): boolean {
  const messageLower = message.toLowerCase().trim()

  const libraryKeywords = [
    'add',
    'remove',
    'delete',
    'update',
    'clear',
    'manage',
    'change',
    'upload',
    'replace',
    'library',
    'images',
    'selfies',
    'products',
    'people',
    'vibes',
    'intent',
  ]

  const libraryPatterns = [
    /(add|remove|delete|update|clear|manage).*(image|photo|selfie|product|people|vibe|library)/i,
    /(upload|change|replace).*(image|photo|selfie|product|people|vibe)/i,
    /(start fresh|clear.*library|reset.*library)/i,
  ]

  return (
    libraryKeywords.some((keyword) => messageLower.includes(keyword)) ||
    libraryPatterns.some((pattern) => pattern.test(message))
  )
}

/**
 * Parse library action from message
 * 
 * Extracts what library operation the user wants to perform.
 */
export function parseLibraryAction(message: string): LibraryAction {
  const messageLower = message.toLowerCase().trim()

  // Detect clear/reset
  if (/clear|reset|start fresh|empty/i.test(message)) {
    return {
      type: 'clear_library',
    }
  }

  // Detect intent update
  if (/intent|goal|purpose|what.*want.*create/i.test(message)) {
    // Extract intent text (everything after intent-related keywords)
    const intentMatch = message.match(/(?:intent|goal|purpose|want to create|want to make)[: ]*(.+)/i)
    const intent = intentMatch ? intentMatch[1].trim() : message
    return {
      type: 'update_intent',
      intent,
    }
  }

  // Detect category-specific operations
  const categoryMatch = message.match(/(selfies?|products?|people|vibes?)/i)
  const category = categoryMatch
    ? (categoryMatch[1].toLowerCase().replace(/s$/, '') as 'selfies' | 'products' | 'people' | 'vibes')
    : undefined

  // Detect add operation
  if (/add|upload|include|put/i.test(message)) {
    return {
      type: 'add_images',
      category,
    }
  }

  // Detect remove operation
  if (/remove|delete|take out|exclude/i.test(message)) {
    return {
      type: 'remove_images',
      category,
    }
  }

  // Default: update intent if no specific action detected
  return {
    type: 'update_intent',
    intent: message,
  }
}

/**
 * Detect if message is a category pivot request
 * 
 * Looks for requests to change category or create different type of content.
 */
export function isPivotRequest(
  message: string,
  chatHistory: ProModeMessage[] = []
): boolean {
  const messageLower = message.toLowerCase().trim()

  const pivotKeywords = [
    'different',
    'change',
    'switch',
    'pivot',
    'instead',
    'try',
    'how about',
    'what about',
    'maybe',
    'or',
    'rather',
  ]

  const pivotPatterns = [
    /(different|change|switch|pivot).*(category|type|style|aesthetic|vibe)/i,
    /(instead|rather|try|how about|what about).*(wellness|luxury|lifestyle|fashion|travel|beauty)/i,
  ]

  // Check if user is asking for different category
  const hasPivotKeyword = pivotKeywords.some((keyword) =>
    messageLower.includes(keyword)
  )
  const hasPivotPattern = pivotPatterns.some((pattern) => pattern.test(message))

  // Check if previous conversation was about concepts (context for pivot)
  const hasPreviousConcepts = chatHistory
    .slice(-5)
    .some((msg) => {
      if (msg.role === 'maya') {
        return msg.content.includes('[GENERATE_CONCEPTS]')
      }
      return false
    })

  return (hasPivotKeyword || hasPivotPattern) && hasPreviousConcepts
}

/**
 * Detect new category from pivot request
 * 
 * Extracts the category the user wants to pivot to.
 */
export function detectNewCategory(
  message: string,
  library: ImageLibrary
): CategoryInfo {
  // Use the same category detection as concept requests
  // This will detect the new category from the message
  return detectCategory(message, library)
}

/**
 * Build Maya's response for concept generation
 * 
 * Creates a warm, enthusiastic response that includes category context and expertise display.
 */
export function buildMayaResponse(
  message: string,
  category: CategoryInfo,
  linkedImages?: string[],
  templateName?: string,
  stylingDetails?: string
): string {
  const categoryName = category.name
  const brandList = category.brands.length > 0
    ? category.brands.slice(0, 2).join(', ')
    : ''

  // Build warm introduction
  let response = `Perfect! Creating ${categoryName.toLowerCase()} content for you now...\n\n`

  // Add expertise display
  response += `**Using:**\n`
  response += `• Category: ${categoryName}\n`
  
  if (templateName) {
    response += `• Template: ${templateName}\n`
  } else {
    response += `• Templates Available: ${category.templates}\n`
  }

  if (brandList) {
    response += `• Brand Database: ${brandList}\n`
  }

  if (linkedImages && linkedImages.length > 0) {
    const imageLabels = linkedImages.map((url, index) => {
      // Try to infer image type from URL or use generic label
      if (url.includes('selfie') || index === 0) return 'Selfie'
      if (url.includes('product')) return 'Product'
      if (url.includes('people') || url.includes('person')) return 'People'
      if (url.includes('vibe') || url.includes('style')) return 'Vibe'
      return `Image ${index + 1}`
    })
    response += `• Your Images: ${imageLabels.join(', ')}\n`
  }

  if (stylingDetails) {
    response += `\n**Styling Details:**\n${stylingDetails}\n`
  }

  // Add closing
  response += `\nI'll show you the concepts below in just a moment.`

  return response
}

/**
 * Build conversational response for regular chat
 * 
 * Creates a warm, helpful response for non-concept requests.
 */
export function buildConversationalResponse(
  message: string,
  library: ImageLibrary
): string {
  const messageLower = message.toLowerCase().trim()

  // Check if user is asking "What can you create?"
  if (/what.*can.*you.*create|what.*do.*you.*do|what.*are.*you|show.*me.*what|capabilities|features/i.test(message)) {
    return buildExpertiseDisplay(library)
  }

  // For now, return a simple acknowledgment
  // In production, this could use AI to generate contextual responses
  const totalImages = library.selfies.length + library.products.length + library.people.length + library.vibes.length

  if (totalImages === 0) {
    return "I'm here to help you create stunning content! Start by adding your images to your library, then tell me what you'd like to create."
  }

  return "I'm here to help! What would you like to create today?"
}

/**
 * Build expertise display when user asks "What can you create?"
 * 
 * Shows all 6 categories with descriptions, brands, and template counts.
 * Includes strategic recommendations based on user's library.
 */
export function buildExpertiseDisplay(library: ImageLibrary): string {
  const categories = getAllCategories()
  const totalImages = library.selfies.length + library.products.length + library.people.length + library.vibes.length

  let display = "I can create content across 6 categories:\n\n"

  // Show each category with details
  categories.forEach((category, index) => {
    const brandList = category.brands.length > 0
      ? category.brands.join(', ')
      : 'General'

    display += `**${category.name}**\n`
    display += `• ${category.description}\n`
    display += `• Brand Database: ${brandList}\n`
    display += `• Templates: ${category.templates} available\n`

    if (index < categories.length - 1) {
      display += '\n'
    }
  })

  // Add strategic recommendations based on library
  if (totalImages > 0) {
    display += '\n**Based on your library:**\n'
    
    if (library.selfies.length > 0) {
      display += `• You have ${library.selfies.length} selfie(s) ready\n`
    }
    if (library.products.length > 0) {
      display += `• You have ${library.products.length} product image(s) - perfect for brand content\n`
    }
    if (library.people.length > 0) {
      display += `• You have ${library.people.length} people image(s) - great for lifestyle content\n`
    }
    if (library.vibes.length > 0) {
      display += `• You have ${library.vibes.length} vibe image(s) - ideal for aesthetic matching\n`
    }

    // Recommend categories based on library content
    const recommendations: string[] = []
    if (library.products.length > 0) {
      recommendations.push('LUXURY', 'FASHION', 'BEAUTY')
    }
    if (library.selfies.length > 0) {
      recommendations.push('WELLNESS', 'LIFESTYLE', 'TRAVEL')
    }

    if (recommendations.length > 0) {
      const uniqueRecommendations = [...new Set(recommendations)]
      display += `\n**Recommended categories:** ${uniqueRecommendations.join(', ')}\n`
    }
  } else {
    display += '\n**Get started:** Add your images to unlock personalized recommendations.\n'
  }

  return display
}

/**
 * Build concept generation expertise display
 * 
 * Shows category, template, brand references, linked images, and styling details.
 */
export function buildConceptGenerationDisplay(
  category: CategoryInfo,
  linkedImages: string[],
  templateName?: string,
  stylingDetails?: string
): string {
  let display = `**Category:** ${category.name}\n`

  if (category.brands.length > 0) {
    display += `**Brand Database:** ${category.brands.join(', ')}\n`
  }

  if (templateName) {
    display += `**Template:** ${templateName}\n`
  } else {
    display += `**Templates Available:** ${category.templates}\n`
  }

  if (linkedImages.length > 0) {
    const imageLabels = linkedImages.map((url, index) => {
      // Try to infer image type from URL or use generic label
      if (url.includes('selfie') || index === 0) return 'Selfie'
      if (url.includes('product')) return 'Product'
      if (url.includes('people') || url.includes('person')) return 'People'
      if (url.includes('vibe') || url.includes('style')) return 'Vibe'
      return `Image ${index + 1}`
    })
    display += `**Linked Images:** ${imageLabels.join(', ')}\n`
  }

  if (stylingDetails) {
    display += `**Styling Details:** ${stylingDetails}\n`
  }

  return display
}







