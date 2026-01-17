/**
 * Canonical BrandKit Builder
 * 
 * Phase 1A: Canonical Brand Profile Binding
 * 
 * PURPOSE: Single source of truth for extracting BrandKit from user_personal_brand table.
 * Consolidates all BrandKit extraction logic into one place to ensure consistency.
 * 
 * INPUT: user_personal_brand row (snake_case from database)
 * OUTPUT: BrandKit object (camelCase for TypeScript) + metadata
 * 
 * USAGE:
 * - EP-08 FeedPlanner (Pro Mode): Extract BrandKit for NanoBanana prompts
 * - EP-05 Single Image: Extract BrandKit for brand profile injection
 * - Any other prompt generation that needs brand data
 */

import type { UserPersonalBrand } from '@/lib/data/maya'

/**
 * Extended BrandKit interface for Phase 1A
 * Includes all user-selected brand fields for prompt injection
 */
export interface BrandKit {
  // Core brand identity
  brandVibe?: string | null
  brandVoice?: string | null
  businessType?: string | null
  
  // Visual styling
  colorPalette?: {
    primary?: string | null
    secondary?: string | null
    accent?: string | null
  } | null
  visualAesthetic?: string[] | null
  fashionStyle?: string[] | null
  
  // Communication & audience
  communicationVoice?: string[] | null
  targetAudience?: string | null
  contentPillars?: string | null
  
  // Settings & preferences
  settingsPreference?: string[] | null
  
  // Legacy fields (for backward compatibility with existing BrandKit interface)
  primary_color?: string | null
  secondary_color?: string | null
  accent_color?: string | null
  font_style?: string | null
  brand_tone?: string | null
  name?: string | null
}

/**
 * BrandKit build result with metadata
 */
export interface BrandKitResult {
  brandKit: BrandKit
  metadata: {
    rawSource: 'user_personal_brand'
    missingFields: string[]
    hasColors: boolean
    hasVisualAesthetic: boolean
    hasFashionStyle: boolean
  }
}

/**
 * Parse JSONB field that might be string, array, or object
 */
function parseJsonbField(value: unknown, convertObjectToArray: boolean = false): string[] | null {
  if (!value) return null
  
  // Already an array
  if (Array.isArray(value)) {
    return value.map(item => String(item).trim()).filter(Boolean)
  }
  
  // String - try to parse
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.map(item => String(item).trim()).filter(Boolean)
      }
      if (convertObjectToArray && typeof parsed === 'object' && parsed !== null) {
        // Convert object to array of keys
        return Object.keys(parsed).filter(Boolean)
      }
      // If still a string after parsing, parse again (handles double-stringified)
      if (typeof parsed === 'string') {
        try {
          const doubleParsed = JSON.parse(parsed)
          if (Array.isArray(doubleParsed)) {
            return doubleParsed.map(item => String(item).trim()).filter(Boolean)
          }
          if (convertObjectToArray && typeof doubleParsed === 'object' && doubleParsed !== null) {
            return Object.keys(doubleParsed).filter(Boolean)
          }
          return null
        } catch {
          // If second parse fails, try to extract from string like '{"luxury"}'
          const keyMatch = parsed.match(/"([^"]+)"/)
          if (keyMatch && convertObjectToArray) {
            return [keyMatch[1]]
          }
          return null
        }
      }
      return null
    } catch {
      // If parsing fails, treat as single string value
      return [value.trim()].filter(Boolean)
    }
  }
  
  // Object - convert to array if requested
  if (convertObjectToArray && typeof value === 'object' && value !== null) {
    return Object.keys(value).filter(Boolean)
  }
  
  return null
}

/**
 * Extract color palette from color_palette JSONB field
 */
function extractColorPalette(colorPalette: unknown): {
  primary?: string | null
  secondary?: string | null
  accent?: string | null
} | null {
  if (!colorPalette) return null
  
  try {
    // Parse if string
    const palette = typeof colorPalette === 'string' 
      ? JSON.parse(colorPalette) 
      : colorPalette
    
    // Array format: [{name: "Primary", hex: "#..."}, ...]
    if (Array.isArray(palette) && palette.length > 0) {
      return {
        primary: palette[0]?.hex || palette[0]?.color || null,
        secondary: palette[1]?.hex || palette[1]?.color || null,
        accent: palette[2]?.hex || palette[2]?.color || null,
      }
    }
    
    // Object format: {primary: "#...", secondary: "#...", accent: "#..."}
    if (typeof palette === 'object' && palette !== null) {
      return {
        primary: (palette as any).primary || (palette as any).primary_color || null,
        secondary: (palette as any).secondary || (palette as any).secondary_color || null,
        accent: (palette as any).accent || (palette as any).accent_color || null,
      }
    }
    
    return null
  } catch (e) {
    console.warn('[BUILD-BRAND-KIT] Failed to parse color_palette:', e)
    return null
  }
}

/**
 * Build canonical BrandKit from user_personal_brand row
 * 
 * @param brandProfile - user_personal_brand row (snake_case)
 * @returns BrandKit object (camelCase) + metadata
 */
export function buildBrandKit(brandProfile: Partial<UserPersonalBrand> | null | undefined): BrandKitResult {
  if (!brandProfile) {
    return {
      brandKit: {},
      metadata: {
        rawSource: 'user_personal_brand',
        missingFields: ['all'],
        hasColors: false,
        hasVisualAesthetic: false,
        hasFashionStyle: false,
      },
    }
  }
  
  const missingFields: string[] = []
  
  // Extract color palette
  const colorPalette = extractColorPalette(brandProfile.color_palette)
  const hasColors = !!(colorPalette?.primary || colorPalette?.secondary || colorPalette?.accent)
  
  // Parse JSONB fields
  const visualAesthetic = parseJsonbField(brandProfile.visual_aesthetic, true)
  const fashionStyle = parseJsonbField(brandProfile.fashion_style, true)
  const communicationVoice = parseJsonbField(brandProfile.communication_voice, true)
  const settingsPreference = parseJsonbField(brandProfile.settings_preference, true)
  
  // Track missing fields
  if (!brandProfile.brand_vibe) missingFields.push('brand_vibe')
  if (!brandProfile.brand_voice) missingFields.push('brand_voice')
  if (!brandProfile.business_type) missingFields.push('business_type')
  if (!hasColors) missingFields.push('color_palette')
  if (!visualAesthetic || visualAesthetic.length === 0) missingFields.push('visual_aesthetic')
  if (!fashionStyle || fashionStyle.length === 0) missingFields.push('fashion_style')
  if (!communicationVoice || communicationVoice.length === 0) missingFields.push('communication_voice')
  if (!brandProfile.target_audience) missingFields.push('target_audience')
  if (!settingsPreference || settingsPreference.length === 0) missingFields.push('settings_preference')
  if (!brandProfile.content_pillars) missingFields.push('content_pillars')
  
  // Build BrandKit object
  const brandKit: BrandKit = {
    // Core brand identity
    brandVibe: brandProfile.brand_vibe || null,
    brandVoice: brandProfile.brand_voice || null,
    businessType: brandProfile.business_type || null,
    
    // Visual styling
    colorPalette: colorPalette || null,
    visualAesthetic: visualAesthetic || null,
    fashionStyle: fashionStyle || null,
    
    // Communication & audience
    communicationVoice: communicationVoice || null,
    targetAudience: brandProfile.target_audience || null,
    contentPillars: brandProfile.content_pillars || null,
    
    // Settings & preferences
    settingsPreference: settingsPreference || null,
    
    // Legacy fields (for backward compatibility)
    primary_color: colorPalette?.primary || null,
    secondary_color: colorPalette?.secondary || null,
    accent_color: colorPalette?.accent || null,
    font_style: null, // Not stored in DB (Phase 0 audit finding)
    brand_tone: brandProfile.brand_vibe || brandProfile.color_theme || null,
    name: brandProfile.name || null,
  }
  
  return {
    brandKit,
    metadata: {
      rawSource: 'user_personal_brand',
      missingFields,
      hasColors,
      hasVisualAesthetic: !!(visualAesthetic && visualAesthetic.length > 0),
      hasFashionStyle: !!(fashionStyle && fashionStyle.length > 0),
    },
  }
}

/**
 * Format BrandKit for prompt injection (Phase 1A)
 * Creates a "USER BRAND PROFILE" block for inclusion in prompts
 */
export function formatBrandProfileBlock(brandKit: BrandKit): string {
  const parts: string[] = []
  
  parts.push('=== USER BRAND PROFILE ===')
  
  if (brandKit.brandVibe) {
    parts.push(`Brand Vibe: ${brandKit.brandVibe}`)
  }
  
  if (brandKit.fashionStyle && brandKit.fashionStyle.length > 0) {
    parts.push(`Fashion Style: ${brandKit.fashionStyle.join(', ')}`)
  }
  
  if (brandKit.visualAesthetic && brandKit.visualAesthetic.length > 0) {
    parts.push(`Visual Aesthetic: ${brandKit.visualAesthetic.join(', ')}`)
  }
  
  if (brandKit.colorPalette) {
    const colors: string[] = []
    if (brandKit.colorPalette.primary) colors.push(`Primary: ${brandKit.colorPalette.primary}`)
    if (brandKit.colorPalette.secondary) colors.push(`Secondary: ${brandKit.colorPalette.secondary}`)
    if (brandKit.colorPalette.accent) colors.push(`Accent: ${brandKit.colorPalette.accent}`)
    if (colors.length > 0) {
      parts.push(`Color Palette: ${colors.join(', ')}`)
    }
  }
  
  if (brandKit.communicationVoice && brandKit.communicationVoice.length > 0) {
    parts.push(`Communication Voice: ${brandKit.communicationVoice.join(', ')}`)
  } else if (brandKit.brandVoice) {
    parts.push(`Brand Voice: ${brandKit.brandVoice}`)
  }
  
  if (brandKit.targetAudience) {
    parts.push(`Target Audience: ${brandKit.targetAudience}`)
  }
  
  if (brandKit.settingsPreference && brandKit.settingsPreference.length > 0) {
    parts.push(`Settings Preference: ${brandKit.settingsPreference.join(', ')}`)
  }
  
  if (brandKit.contentPillars) {
    parts.push(`Content Pillars: ${brandKit.contentPillars}`)
  }
  
  if (brandKit.businessType) {
    parts.push(`Business Type: ${brandKit.businessType}`)
  }
  
  // If no brand data, return empty (shouldn't happen if buildBrandKit was called correctly)
  if (parts.length === 1) {
    return ''
  }
  
  return parts.join('\n')
}
