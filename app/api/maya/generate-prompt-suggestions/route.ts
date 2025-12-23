import { NextRequest, NextResponse } from 'next/server'
import { PromptGenerator, type WorkbenchContext } from '@/lib/maya/prompt-generator'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { workbenchImages, userIntent, previousMessages, contentType, userPreferences } = body
    
    // Build context
    const context: WorkbenchContext = {
      images: workbenchImages || [],
      userIntent: userIntent || 'Create engaging Instagram content',
      contentType: contentType || 'custom', // Will be determined by engine
      previousPrompts: previousMessages?.map((msg: any) => msg.prompt).filter(Boolean) || [],
      userPreferences: userPreferences || undefined
    }
    
    // Generate suggestions
    const generator = new PromptGenerator()
    const suggestions = await generator.generatePromptSuggestions(context)
    
    // Return top 3 suggestions
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


























