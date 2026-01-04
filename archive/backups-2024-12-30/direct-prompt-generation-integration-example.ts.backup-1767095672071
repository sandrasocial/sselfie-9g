/**
 * INTEGRATION EXAMPLE: How to replace old prompt builder with direct generation
 * 
 * This file shows the migration path from:
 * - Old: Maya generates descriptions → System extracts → System rebuilds prompts
 * - New: Maya generates final prompts directly → System applies fixes → Done
 */

import { 
  generateConceptsWithFinalPrompts,
  applyProgrammaticFixes,
  validatePromptLight,
  type DirectPromptContext
} from './direct-prompt-generation'

/**
 * EXAMPLE 1: Studio Pro Mode Concept Generation
 * 
 * OLD WAY (in app/api/maya/pro/generate-concepts/route.ts):
 */
async function oldWay_StudioPro() {
  // 1. Maya generates concepts with descriptions
  const concepts = await mayaGenerateConcepts({
    userRequest: "Christmas loft scene",
    count: 6
  })
  
  // 2. For each concept, extract and rebuild prompt
  for (let i = 0; i < concepts.length; i++) {
    const concept = concepts[i]
    
    // Extract scene elements
    const scene = extractCompleteScene(concept.description)
    
    // Build sections
    const outfit = buildOutfitSection(scene)
    const pose = buildPoseSection(scene)
    const setting = buildSettingSection(scene)
    const lighting = buildLightingSection(scene)
    
    // Assemble prompt
    concept.prompt = assemblePrompt(outfit, pose, setting, lighting, {
      conceptIndex: i,
      mode: 'pro'
    })
  }
  
  return concepts
}

/**
 * NEW WAY (using direct generation):
 */
export async function newWay_StudioPro(
  userRequest: string,
  options: {
    triggerWord?: string
    gender?: string
    ethnicity?: string
    physicalPreferences?: string
    conversationContext?: string
  }
) {
  
  // 1. Maya generates FINAL PROMPTS directly
  const concepts = await generateConceptsWithFinalPrompts(userRequest, {
    count: 6,
    mode: 'pro',
    ...options
  })
  
  // 2. Apply programmatic fixes only (camera style based on conceptIndex)
  for (let i = 0; i < concepts.length; i++) {
    const context: DirectPromptContext = {
      userRequest,
      category: concepts[i].category,
      conceptIndex: i,
      triggerWord: options.triggerWord || '',
      gender: options.gender || 'woman',
      ethnicity: options.ethnicity,
      physicalPreferences: options.physicalPreferences,
      mode: 'pro'
    }
    
    // Fix camera style if needed
    concepts[i].prompt = applyProgrammaticFixes(concepts[i].prompt, context)
    
    // Validate (catch critical issues only)
    const validation = validatePromptLight(concepts[i].prompt, context)
    
    if (validation.critical.length > 0) {
      console.warn(`[DIRECT] Concept ${i + 1} has critical issues:`, validation.critical)
      // Optionally retry or use fallback
    }
    
    if (validation.warnings.length > 0) {
      console.log(`[DIRECT] Concept ${i + 1} warnings:`, validation.warnings)
    }
  }
  
  return concepts
}

/**
 * EXAMPLE 2: Classic Mode Concept Generation
 */
export async function newWay_Classic(
  userRequest: string,
  options: {
    triggerWord: string
    gender?: string
    ethnicity?: string
    physicalPreferences?: string
  }
) {
  
  // Maya generates final prompts directly (30-60 words)
  const concepts = await generateConceptsWithFinalPrompts(userRequest, {
    count: 6,
    mode: 'classic',
    triggerWord: options.triggerWord,
    gender: options.gender || 'woman',
    ethnicity: options.ethnicity,
    physicalPreferences: options.physicalPreferences
  })
  
  // Apply fixes (trigger word enforcement)
  for (let i = 0; i < concepts.length; i++) {
    const context: DirectPromptContext = {
      userRequest,
      category: concepts[i].category,
      conceptIndex: i,
      triggerWord: options.triggerWord,
      gender: options.gender || 'woman',
      ethnicity: options.ethnicity,
      physicalPreferences: options.physicalPreferences,
      mode: 'classic'
    }
    
    concepts[i].prompt = applyProgrammaticFixes(concepts[i].prompt, context)
    
    // Validate
    const validation = validatePromptLight(concepts[i].prompt, context)
    
    if (validation.critical.length > 0) {
      console.warn(`[DIRECT] Classic concept ${i + 1} critical:`, validation.critical)
    }
  }
  
  return concepts
}

/**
 * EXAMPLE 3: Integration into existing route
 * 
 * In app/api/maya/pro/generate-concepts/route.ts:
 * 
 * REPLACE THIS (around line 631):
 */
function oldIntegration() {
  /*
  const { fullPrompt: generatedPrompt, category: promptCategoryResult } = await buildProModePrompt(
    promptCategory,
    conceptComponents,
    library,
    userRequest,
    undefined,
    index
  )
  */
}

/**
 * WITH THIS:
 */
export async function newIntegration(
  concept: { title: string; description: string; category: string },
  index: number,
  userRequest: string,
  options: {
    triggerWord?: string
    gender?: string
    ethnicity?: string
  }
) {
  
  // Use direct generation for this concept
  const context: DirectPromptContext = {
    userRequest: `${userRequest} ${concept.description}`.trim(),
    category: concept.category,
    conceptIndex: index,
    triggerWord: options.triggerWord || '',
    gender: options.gender || 'woman',
    ethnicity: options.ethnicity,
    mode: 'pro'
  }
  
  // Generate prompt directly
  const { generatePromptDirect } = await import('./direct-prompt-generation')
  const result = await generatePromptDirect(context)
  
  return {
    fullPrompt: result.prompt,
    category: concept.category
  }
}

/**
 * MIGRATION CHECKLIST:
 * 
 * [ ] 1. Update system prompt to ask for final prompts (not descriptions)
 * [ ] 2. Replace buildProModePrompt calls with generatePromptDirect
 * [ ] 3. Remove extractCompleteScene, buildOutfitSection, etc.
 * [ ] 4. Keep programmatic fixes (camera style, trigger word)
 * [ ] 5. Keep validation (lightweight)
 * [ ] 6. Test with both Classic and Pro modes
 * [ ] 7. Compare quality vs old system
 * [ ] 8. Remove old prompt-builder.ts once validated
 */
