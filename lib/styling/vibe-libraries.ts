/**
 * Vibe Libraries - Foundation Structure
 * 
 * Contains outfit, location, and accessory libraries organized by visual aesthetic (vibe).
 * Each vibe supports multiple fashion styles and provides rotation-based selection.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type FashionStyle = 'casual' | 'business' | 'bohemian' | 'classic' | 'trendy' | 'athletic'

export interface OutfitVariation {
  outfit: string
  accessories?: string
  brands?: string[]
}

export interface VibeLibrary {
  outfits: Record<FashionStyle, OutfitVariation[]>
  locations: string[]
  accessories: string[]
}

export type VibeKey =
  | 'luxury_dark_moody'
  | 'luxury_light_minimalistic'
  | 'luxury_beige_aesthetic'
  | 'minimal_dark_moody'
  | 'minimal_light_minimalistic'
  | 'minimal_beige_aesthetic'
  | 'beige_dark_moody'
  | 'beige_light_minimalistic'
  | 'beige_beige_aesthetic'
  | 'warm_dark_moody'
  | 'warm_light_minimalistic'
  | 'warm_beige_aesthetic'
  | 'edgy_dark_moody'
  | 'edgy_light_minimalistic'
  | 'edgy_beige_aesthetic'
  | 'professional_dark_moody'
  | 'professional_light_minimalistic'
  | 'professional_beige_aesthetic'

// ============================================================================
// VIBE LIBRARIES
// ============================================================================

export const VIBE_LIBRARIES: Record<VibeKey, VibeLibrary> = {
  luxury_dark_moody: {
    outfits: {
      casual: [],
      business: [],
      bohemian: [],
      classic: [],
      trendy: [],
      athletic: [],
    },
    locations: [],
    accessories: [],
  },

  luxury_light_minimalistic: {
    outfits: {
      casual: [],
      business: [],
      bohemian: [],
      classic: [],
      trendy: [],
      athletic: [],
    },
    locations: [],
    accessories: [],
  },

  luxury_beige_aesthetic: {
    outfits: {
      casual: [],
      business: [],
      bohemian: [],
      classic: [],
      trendy: [],
      athletic: [],
    },
    locations: [],
    accessories: [],
  },

  minimal_dark_moody: {
    outfits: {
      casual: [],
      business: [],
      bohemian: [],
      classic: [],
      trendy: [],
      athletic: [],
    },
    locations: [],
    accessories: [],
  },

  minimal_light_minimalistic: {
    outfits: {
      casual: [],
      business: [],
      bohemian: [],
      classic: [],
      trendy: [],
      athletic: [],
    },
    locations: [],
    accessories: [],
  },

  minimal_beige_aesthetic: {
    outfits: {
      casual: [],
      business: [],
      bohemian: [],
      classic: [],
      trendy: [],
      athletic: [],
    },
    locations: [],
    accessories: [],
  },

  beige_dark_moody: {
    outfits: {
      casual: [],
      business: [],
      bohemian: [],
      classic: [],
      trendy: [],
      athletic: [],
    },
    locations: [],
    accessories: [],
  },

  beige_light_minimalistic: {
    outfits: {
      casual: [],
      business: [],
      bohemian: [],
      classic: [],
      trendy: [],
      athletic: [],
    },
    locations: [],
    accessories: [],
  },

  beige_beige_aesthetic: {
    outfits: {
      casual: [],
      business: [],
      bohemian: [],
      classic: [],
      trendy: [],
      athletic: [],
    },
    locations: [],
    accessories: [],
  },

  warm_dark_moody: {
    outfits: {
      casual: [],
      business: [],
      bohemian: [],
      classic: [],
      trendy: [],
      athletic: [],
    },
    locations: [],
    accessories: [],
  },

  warm_light_minimalistic: {
    outfits: {
      casual: [],
      business: [],
      bohemian: [],
      classic: [],
      trendy: [],
      athletic: [],
    },
    locations: [],
    accessories: [],
  },

  warm_beige_aesthetic: {
    outfits: {
      casual: [],
      business: [],
      bohemian: [],
      classic: [],
      trendy: [],
      athletic: [],
    },
    locations: [],
    accessories: [],
  },

  edgy_dark_moody: {
    outfits: {
      casual: [],
      business: [],
      bohemian: [],
      classic: [],
      trendy: [],
      athletic: [],
    },
    locations: [],
    accessories: [],
  },

  edgy_light_minimalistic: {
    outfits: {
      casual: [],
      business: [],
      bohemian: [],
      classic: [],
      trendy: [],
      athletic: [],
    },
    locations: [],
    accessories: [],
  },

  edgy_beige_aesthetic: {
    outfits: {
      casual: [],
      business: [],
      bohemian: [],
      classic: [],
      trendy: [],
      athletic: [],
    },
    locations: [],
    accessories: [],
  },

  professional_dark_moody: {
    outfits: {
      casual: [],
      business: [],
      bohemian: [],
      classic: [],
      trendy: [],
      athletic: [],
    },
    locations: [],
    accessories: [],
  },

  professional_light_minimalistic: {
    outfits: {
      casual: [],
      business: [],
      bohemian: [],
      classic: [],
      trendy: [],
      athletic: [],
    },
    locations: [],
    accessories: [],
  },

  professional_beige_aesthetic: {
    outfits: {
      casual: [],
      business: [],
      bohemian: [],
      classic: [],
      trendy: [],
      athletic: [],
    },
    locations: [],
    accessories: [],
  },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get outfit for a specific vibe and fashion style at the given index
 * @param vibe - Vibe key (e.g., 'luxury_dark_moody')
 * @param fashionStyle - Fashion style (e.g., 'business')
 * @param index - Index position (will cycle if exceeds array length)
 * @returns Outfit variation or null if not found
 */
export function getOutfitForVibe(
  vibe: VibeKey,
  fashionStyle: FashionStyle,
  index: number
): OutfitVariation | null {
  const library = VIBE_LIBRARIES[vibe]
  if (!library) {
    return null
  }

  const outfits = library.outfits[fashionStyle]
  if (!outfits || outfits.length === 0) {
    return null
  }

  // Cycle index if it exceeds array length
  const cycledIndex = index % outfits.length
  return outfits[cycledIndex]
}

/**
 * Get location for a specific vibe at the given index
 * @param vibe - Vibe key (e.g., 'luxury_dark_moody')
 * @param index - Index position (will cycle if exceeds array length)
 * @returns Location string or null if not found
 */
export function getLocationForVibe(vibe: VibeKey, index: number): string | null {
  const library = VIBE_LIBRARIES[vibe]
  if (!library) {
    return null
  }

  const locations = library.locations
  if (!locations || locations.length === 0) {
    return null
  }

  // Cycle index if it exceeds array length
  const cycledIndex = index % locations.length
  return locations[cycledIndex]
}

/**
 * Get accessories for a specific vibe at the given index
 * @param vibe - Vibe key (e.g., 'luxury_dark_moody')
 * @param index - Index position (will cycle if exceeds array length)
 * @returns Accessories string or null if not found
 */
export function getAccessoriesForVibe(vibe: VibeKey, index: number): string | null {
  const library = VIBE_LIBRARIES[vibe]
  if (!library) {
    return null
  }

  const accessories = library.accessories
  if (!accessories || accessories.length === 0) {
    return null
  }

  // Cycle index if it exceeds array length
  const cycledIndex = index % accessories.length
  return accessories[cycledIndex]
}
