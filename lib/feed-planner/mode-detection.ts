/**
 * Pro Mode Detection for Feed Planner
 * 
 * Detects which posts require Pro Mode (carousels, text overlays, quote graphics)
 * vs Classic Mode (standard portrait/object posts using trained model)
 */

/**
 * Detect if a post requires Pro Mode based on its type/description
 */
export function detectRequiredMode(post: any): 'classic' | 'pro' {
  // Posts that always need Pro Mode
  if (post.post_type === 'carousel') return 'pro'
  if (post.post_type === 'infographic') return 'pro'
  if (post.post_type === 'quote') return 'pro'
  
  // Check description/prompt for Pro Mode keywords
  const description = (post.description || '').toLowerCase()
  const prompt = (post.prompt || '').toLowerCase()
  const contentPillar = (post.content_pillar || '').toLowerCase()
  const combined = `${description} ${prompt} ${contentPillar}`
  
  if (
    combined.includes('carousel') ||
    combined.includes('text overlay') ||
    combined.includes('quote graphic') ||
    combined.includes('infographic') ||
    combined.includes('educational') ||
    combined.includes('multiple slides') ||
    combined.includes('slide deck')
  ) {
    return 'pro'
  }
  
  return 'classic'
}

/**
 * Detect specific Pro Mode type based on post content
 */
export function detectProModeType(post: any): string | null {
  if (post.generation_mode !== 'pro') return null
  
  const description = (post.description || '').toLowerCase()
  const prompt = (post.prompt || '').toLowerCase()
  const contentPillar = (post.content_pillar || '').toLowerCase()
  const combined = `${description} ${prompt} ${contentPillar}`
  
  // Carousel slides
  if (combined.includes('carousel') || post.post_type === 'carousel') {
    return 'carousel-slides'
  }
  
  // Quote graphics
  if (combined.includes('quote') || post.post_type === 'quote') {
    return 'quote-graphic'
  }
  
  // Educational/Infographic
  if (combined.includes('educational') || combined.includes('infographic') || post.post_type === 'infographic') {
    return 'educational'
  }
  
  // Text overlay
  if (combined.includes('text overlay')) {
    return 'text-overlay'
  }
  
  // Default to workbench for other Pro Mode posts
  return 'workbench'
}

