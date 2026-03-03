import { NextRequest, NextResponse } from 'next/server'
import { generatePromptSuggestions, type WorkbenchContext } from '@/lib/generation/prompt'
import { checkInternalOnly } from '@/lib/maya/internal-only-guard'

/**
 * PROMPT SUGGESTIONS API (EP-02)
 * 
 * Phase 3A: Migrated to use Prompt Authority Layer
 * Phase 5C: Internal-only enforcement added
 * 
 * Routes prompt suggestion generation through Authority Layer for audit logging
 * while preserving exact behavior (same inputs, same outputs).
 * 
 * Classification: INTERNAL (used by workbench UI only, not public API)
 */
export async function POST(req: NextRequest) {
  // Phase 5C: Internal-only enforcement
  const internalCheck = checkInternalOnly(req, {
    routeId: 'EP-02',
    routePath: '/api/maya/generate-prompt-suggestions',
    kind: 'internal',
  })
  if (!internalCheck.allowed) {
    return NextResponse.json({ error: internalCheck.error }, { status: 403 })
  }
  
  try {
    const body = await req.json()
    const { workbenchImages, userIntent, previousMessages, contentType, userPreferences } = body
    
    // Build context (unchanged from original)
    const context: WorkbenchContext = {
      images: workbenchImages || [],
      userIntent: userIntent || 'Create engaging Instagram content',
      contentType: contentType || 'custom', // Will be determined by engine
      previousPrompts: previousMessages?.map((msg: any) => msg.prompt).filter(Boolean) || [],
      userPreferences: userPreferences || undefined
    }
    
    // Generate suggestions via Prompt Authority Layer (Phase 3A migration)
    const suggestions = await generatePromptSuggestions(context)
    
    // Return top 3 suggestions (unchanged behavior)
    const topSuggestions = suggestions.slice(0, 3)
    
    return NextResponse.json({
      success: true,
      suggestions: topSuggestions,
      totalGenerated: suggestions.length
    })
    
  } catch (error) {
    console.error('Error generating prompt suggestions:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate suggestions' 
      },
      { status: 500 }
    )
  }
}

































