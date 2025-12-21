/**
 * Smart Setting Builder
 * 
 * Calibrates setting detail level based on camera framing
 * Close-ups get simple bokeh, environmental gets full detail
 */

import { FramingType } from './camera-composition'

/**
 * Get appropriate setting detail level for framing type
 */
export function getSettingDetailLevel(framing: FramingType): 'minimal-bokeh' | 'simple' | 'medium' | 'detailed' | 'full' {
  switch (framing) {
    case 'close-up':
    case 'medium':
      return 'minimal-bokeh' // Just bokeh atmosphere
    
    case 'half-body':
      return 'simple' // Immediate surroundings only
    
    case 'three-quarter':
      return 'medium' // Some environment context
    
    case 'full-body':
      return 'detailed' // Show setting for outfit context
    
    case 'environmental':
      return 'full' // Complete room/location description
  }
}

/**
 * Build bokeh-appropriate background for close-ups
 */
export function buildBokehBackground(
  originalSetting: string,
  seasonal?: 'christmas' | 'new-years' | null
): string {
  // Extract key atmospheric elements from full setting
  // Return simple bokeh-friendly description
  
  if (seasonal === 'christmas') {
    // Check if original setting is market - markets need special bokeh handling
    if (/market|shopping|outdoor|stall/i.test(originalSetting)) {
      return 'twinkling holiday market lights creating soft golden bokeh in background, warm festive atmosphere'
    }
    return 'warm Christmas tree lights creating soft golden bokeh in background, hints of fireplace glow, cozy holiday atmosphere'
  }
  
  if (seasonal === 'new-years') {
    return 'soft champagne and gold balloon bokeh in background, warm ambient party lighting, celebratory atmosphere'
  }
  
  // For non-seasonal, extract atmosphere
  if (/coastal|beach|ocean/i.test(originalSetting)) {
    return 'soft natural light through windows with subtle ocean view bokeh, coastal atmosphere'
  }
  
  if (/fireplace|cozy/i.test(originalSetting)) {
    return 'warm fireplace glow creating soft bokeh background, cozy intimate atmosphere'
  }
  
  if (/studio|white.*backdrop/i.test(originalSetting)) {
    return 'clean white studio backdrop, professional photography setting'
  }
  
  if (/urban|city|street/i.test(originalSetting)) {
    return 'soft urban bokeh background with hints of architecture, city atmosphere'
  }
  
  // Default: Scandinavian interior bokeh
  return 'soft natural window light with subtle interior bokeh, minimalist Scandinavian atmosphere'
}

/**
 * Build simple setting for half-body shots
 */
export function buildSimpleSetting(
  originalSetting: string,
  seasonal?: 'christmas' | 'new-years' | null
): string {
  // Mention immediate surroundings only
  
  // 🔴 SPECIAL CASE: Market settings need more detail even in simple settings
  if (/market|shopping|outdoor|stall/i.test(originalSetting)) {
    if (seasonal === 'christmas') {
      return 'walking through festive holiday market, wooden stalls with twinkling lights, evergreen garlands, warm golden hour atmosphere'
    }
    return 'outdoor market setting with stalls and natural daylight'
  }
  
  if (seasonal === 'christmas') {
    // Check if it's indoor vs outdoor
    if (/market|shopping|outdoor/i.test(originalSetting)) {
      return 'walking through festive holiday market, wooden stalls with twinkling lights, evergreen garlands, warm golden hour atmosphere'
    }
    return 'seated on tufted sofa in warm sand bouclé, white Christmas tree with golden ornaments visible in background, cozy living room'
  }
  
  if (seasonal === 'new-years') {
    return 'modern living room with champagne bar setup visible, minimal gold balloon installation in background, celebration setting'
  }
  
  // Extract key furniture/immediate setting
  if (/sofa|couch/i.test(originalSetting)) {
    return 'seated on organic curved sofa in natural linen, Scandinavian living room, floor-to-ceiling windows in background'
  }
  
  if (/armchair/i.test(originalSetting)) {
    return 'seated in bouclé armchair, elegant interior setting with soft natural light'
  }
  
  if (/kitchen/i.test(originalSetting)) {
    return 'modern kitchen with marble countertop, natural light through windows'
  }
  
  return 'Scandinavian interior with natural light, minimalist aesthetic'
}

/**
 * Build medium setting for 3/4 body shots
 */
export function buildMediumSetting(
  originalSetting: string,
  seasonal?: 'christmas' | 'new-years' | null
): string {
  // Include furniture and some architectural elements
  
  if (seasonal === 'christmas') {
    return 'Scandinavian living room with tufted velvet sofa in warm sand, white flocked Christmas tree (6ft) with brass ornaments, marble fireplace with warm glow, bleached oak flooring, soft holiday lighting'
  }
  
  if (seasonal === 'new-years') {
    return 'modern luxury living room with velvet sofa, champagne bar on oak console, minimal balloon installation in champagne and gold, marble surfaces, evening celebration atmosphere'
  }
  
  // Use partial original setting
  return originalSetting
}

/**
 * Smartly build setting based on framing
 */
export function buildSmartSetting(
  framing: FramingType,
  originalFullSetting: string,
  seasonal?: 'christmas' | 'new-years' | null
): string {
  const detailLevel = getSettingDetailLevel(framing)
  
  switch (detailLevel) {
    case 'minimal-bokeh':
      return buildBokehBackground(originalFullSetting, seasonal)
    
    case 'simple':
      return buildSimpleSetting(originalFullSetting, seasonal)
    
    case 'medium':
      return buildMediumSetting(originalFullSetting, seasonal)
    
    case 'detailed':
    case 'full':
      // Use full original setting for full-body and environmental
      return originalFullSetting
  }
}
