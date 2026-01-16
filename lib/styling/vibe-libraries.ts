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

export interface OutfitFormula {
  id: string
  name: string
  description: string
  pieces: string[]
  occasion: string
  brands?: string[]
}

export interface LocationDescription {
  id: string
  name: string
  description: string
  lighting: string
  mood: string
  setting: 'indoor' | 'outdoor' | 'urban'
}

export interface AccessorySet {
  id: string
  name: string
  items: string[]
  vibe: string
  description?: string
}

export interface VibeLibrary {
  vibe: string
  fashionStyles: {
    business: OutfitFormula[]
    casual: OutfitFormula[]
    bohemian: OutfitFormula[]
    classic: OutfitFormula[]
    trendy: OutfitFormula[]
    athletic: OutfitFormula[]
  }
  locations: LocationDescription[]
  accessories: AccessorySet[]
  colorPalette: string[]
  textures: string[]
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
    vibe: 'luxury_dark_moody',
    fashionStyles: {
      business: [
        {
          id: 'lux_dark_biz_001',
          name: 'Power CEO Black Suit',
          description: 'Tailored black suit with sculpted shoulders, silk blouse, pointed-toe pumps',
          pieces: ['black velvet blazer', 'matching velvet trousers', 'silk charcoal blouse', 'black pointed-toe pumps'],
          occasion: 'boardroom, high-stakes meeting',
          brands: ['The Row', 'Khaite', 'Toteme']
        },
        {
          id: 'lux_dark_biz_002',
          name: 'Leather Power Dressing',
          description: 'Black leather separates with gold hardware, sophisticated edge',
          pieces: ['structured black leather blazer', 'black leather pencil skirt', 'silk charcoal top', 'kitten heel pumps'],
          occasion: 'executive presentation, power lunch',
          brands: ['Saint Laurent', 'The Row', 'Nour Hammour']
        },
        {
          id: 'lux_dark_biz_003',
          name: 'Velvet Executive',
          description: 'Black velvet blazer with sculpted shoulders, charcoal wool trousers, silk blouse',
          pieces: ['black velvet blazer', 'charcoal wool trousers', 'silk charcoal blouse', 'black leather pumps'],
          occasion: 'evening business event, luxury meeting',
          brands: ['The Row', 'Khaite', 'Toteme']
        },
        {
          id: 'lux_dark_biz_004',
          name: 'Tailored Sophistication',
          description: 'Black tailored blazer, matching trousers, white silk blouse, gold jewelry',
          pieces: ['black tailored blazer', 'matching black trousers', 'white silk blouse', 'gold jewelry', 'black pumps'],
          occasion: 'corporate event, professional setting',
          brands: ['The Row', 'Toteme', 'Khaite']
        }
      ],
      casual: [
        {
          id: 'lux_dark_cas_001',
          name: 'Oversized Cashmere Chic',
          description: 'Oversized charcoal cashmere sweater, black denim, designer sneakers',
          pieces: ['oversized charcoal cashmere sweater', 'black straight-leg jeans', 'Celine leather sneakers', 'crossbody bag'],
          occasion: 'weekend, coffee run, gallery hopping',
          brands: ['The Row', 'Khaite denim', 'Celine']
        },
        {
          id: 'lux_dark_cas_002',
          name: 'Leather Casual',
          description: 'Black leather jacket, black turtleneck, black jeans, combat boots',
          pieces: ['black leather moto jacket', 'black cashmere turtleneck', 'black straight-leg jeans', 'black combat boots'],
          occasion: 'urban exploration, casual evening',
          brands: ['Saint Laurent', 'The Row', 'Acne Studios']
        },
        {
          id: 'lux_dark_cas_003',
          name: 'Relaxed Luxury',
          description: 'Oversized black blazer, white tee, black trousers, designer sneakers',
          pieces: ['oversized black blazer', 'white ribbed tank', 'black wide-leg trousers', 'designer sneakers'],
          occasion: 'casual day out, shopping, brunch',
          brands: ['The Row', 'Toteme', 'Celine']
        },
        {
          id: 'lux_dark_cas_004',
          name: 'Cozy Evening',
          description: 'Charcoal cashmere cardigan, black bodysuit, black jeans, ankle boots',
          pieces: ['charcoal cashmere cardigan', 'black bodysuit', 'black straight-leg jeans', 'black ankle boots'],
          occasion: 'evening casual, dinner, drinks',
          brands: ['The Row', 'Khaite', 'Toteme']
        }
      ],
      bohemian: [
        {
          id: 'lux_dark_boh_001',
          name: 'Dark Bohemian',
          description: 'Black maxi dress with flowy sleeves, layered gold jewelry, ankle boots',
          pieces: ['black maxi dress', 'layered gold necklaces', 'gold cuffs', 'black ankle boots'],
          occasion: 'art gallery, creative event, evening',
          brands: ['Free People', 'Anthropologie', 'Vintage']
        },
        {
          id: 'lux_dark_boh_002',
          name: 'Moody Layers',
          description: 'Black kimono-style cardigan, black slip dress, gold jewelry, sandals',
          pieces: ['black kimono cardigan', 'black slip dress', 'layered gold jewelry', 'black sandals'],
          occasion: 'creative gathering, evening event',
          brands: ['Free People', 'Anthropologie']
        },
        {
          id: 'lux_dark_boh_003',
          name: 'Charcoal Flowy',
          description: 'Charcoal midi dress with flowy sleeves, layered gold necklaces, black ankle boots',
          pieces: ['charcoal flowy midi dress', 'layered gold necklaces', 'gold cuffs', 'black ankle boots'],
          occasion: 'art gallery, brunch, creative event',
          brands: ['Free People', 'Anthropologie', 'The Row']
        }
      ],
      classic: [
        {
          id: 'lux_dark_cla_001',
          name: 'Timeless Black',
          description: 'Classic black blazer, white blouse, black trousers, pumps',
          pieces: ['classic black blazer', 'white silk blouse', 'black tailored trousers', 'black pumps'],
          occasion: 'professional, timeless elegance',
          brands: ['The Row', 'Toteme', 'Khaite']
        },
        {
          id: 'lux_dark_cla_002',
          name: 'Sophisticated Classic',
          description: 'Black coat, cream sweater, black trousers, leather boots',
          pieces: ['black wool coat', 'cream cashmere sweater', 'black trousers', 'black leather boots'],
          occasion: 'classic elegance, refined setting',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'lux_dark_cla_003',
          name: 'Elegant Suit',
          description: 'Black tailored suit, white silk blouse, black pumps, gold jewelry',
          pieces: ['black tailored suit', 'white silk blouse', 'black pumps', 'gold jewelry'],
          occasion: 'professional, timeless elegance',
          brands: ['The Row', 'Toteme', 'Khaite']
        }
      ],
      trendy: [
        {
          id: 'lux_dark_tre_001',
          name: 'Edgy Trendy',
          description: 'Black oversized blazer, black bodysuit, leather pants, platform boots',
          pieces: ['black oversized blazer', 'black bodysuit', 'black leather pants', 'platform boots'],
          occasion: 'trendy event, fashion-forward setting',
          brands: ['Saint Laurent', 'Acne Studios', 'The Row']
        },
        {
          id: 'lux_dark_tre_002',
          name: 'Modern Edge',
          description: 'Black puffer jacket, black turtleneck, black jeans, designer sneakers',
          pieces: ['black puffer jacket', 'black cashmere turtleneck', 'black jeans', 'designer sneakers'],
          occasion: 'urban trendy, modern setting',
          brands: ['The Row', 'Khaite', 'Celine']
        },
        {
          id: 'lux_dark_tre_003',
          name: 'Cropped Statement',
          description: 'Cropped black jacket, high-waisted black trousers, platform boots, silver chains',
          pieces: ['cropped black jacket', 'high-waisted black trousers', 'platform boots', 'silver chains'],
          occasion: 'trendy casual, modern setting',
          brands: ['The Row', 'Khaite']
        }
      ],
      athletic: [
        {
          id: 'lux_dark_ath_001',
          name: 'Athleisure Luxury',
          description: 'Black athletic set, oversized blazer, designer sneakers',
          pieces: ['black athletic set', 'oversized black blazer', 'designer sneakers'],
          occasion: 'athleisure, active lifestyle',
          brands: ['Alo', 'Lululemon', 'The Row']
        },
        {
          id: 'lux_dark_ath_002',
          name: 'Dark Active Luxe',
          description: 'Black leggings, charcoal ribbed top, oversized black cashmere hoodie, gold jewelry',
          pieces: ['black high-waisted leggings', 'charcoal ribbed sports bra', 'oversized black cashmere hoodie', 'black designer sneakers', 'gold jewelry'],
          occasion: 'post-workout luxury, active lifestyle',
          brands: ['Alo', 'The Row', 'Outdoor Voices']
        },
        {
          id: 'lux_dark_ath_003',
          name: 'Black Athletic Dress',
          description: 'Black athletic dress, charcoal bomber jacket, black sneakers, black leather gym bag',
          pieces: ['black athletic dress', 'charcoal bomber jacket', 'black designer sneakers', 'black leather gym bag'],
          occasion: 'athleisure lifestyle, luxury active',
          brands: ['Alo', 'The Row', 'Lululemon']
        }
      ]
    },
    locations: [
      {
        id: 'lux_dark_loc_001',
        name: 'Brutalist Concrete Staircase',
        description: 'Geometric shadows of a brutalist concrete staircase outside a high-rise building. The evening light creates dramatic shadows across the dark stone surfaces. Modern architectural backdrop with angular concrete forms and industrial elegance.',
        lighting: 'evening golden hour with dramatic shadows',
        mood: 'powerful, architectural, sophisticated',
        setting: 'outdoor'
      },
      {
        id: 'lux_dark_loc_002',
        name: 'Dark Marble Hotel Lobby',
        description: 'Luxurious hotel lobby with floor-to-ceiling dark marble walls and geometric patterns. Ambient lighting from modern fixtures creates moody atmosphere. Designer furniture in charcoal and black tones.',
        lighting: 'ambient, moody interior lighting',
        mood: 'luxurious, intimate, sophisticated',
        setting: 'indoor'
      },
      {
        id: 'lux_dark_loc_003',
        name: 'Urban Street at Dusk',
        description: 'City street at dusk with yellow road markings visible. Modern urban architecture in background. Evening atmosphere with warm street lamps and dramatic shadows.',
        lighting: 'evening street lighting, warm shadows',
        mood: 'urban, sophisticated, evening',
        setting: 'outdoor'
      },
      {
        id: 'lux_dark_loc_004',
        name: 'Minimalist Dark Desk',
        description: 'Dark minimalist desk with laptop and coffee. Overhead view of workspace. Clean lines, sophisticated setting, professional atmosphere.',
        lighting: 'ambient desk lighting, moody',
        mood: 'professional, sophisticated, focused',
        setting: 'indoor'
      },
      {
        id: 'lux_dark_loc_005',
        name: 'Modern Interior',
        description: 'Modern interior with dark walls and contemporary furniture. Clean architectural lines. Sophisticated urban living space.',
        lighting: 'ambient interior lighting',
        mood: 'modern, sophisticated, intimate',
        setting: 'indoor'
      },
      {
        id: 'lux_dark_loc_006',
        name: 'Architectural Gray Wall',
        description: 'Full-body against gray wall with urban background. Modern architectural backdrop. Clean lines, sophisticated setting.',
        lighting: 'natural daylight with shadows',
        mood: 'architectural, powerful, urban',
        setting: 'outdoor'
      }
    ],
    accessories: [
      {
        id: 'lux_dark_acc_001',
        name: 'Gold Jewelry Luxury Set',
        description: 'chunky gold cuffs, layered gold necklaces (Glamoratti 80s influence), statement gold rings, pearl studs',
        items: ['chunky gold cuffs', 'layered gold necklaces', 'statement rings', 'pearl studs'],
        vibe: 'luxury_dark_moody'
      },
      {
        id: 'lux_dark_acc_002',
        name: 'Designer Bag Focus',
        description: 'The Row Margaux tote in black leather, Toteme T-Lock bag, gold watch, leather gloves',
        items: ['The Row Margaux tote', 'gold Rolex', 'leather gloves', 'designer sunglasses'],
        vibe: 'luxury_dark_moody'
      },
      {
        id: 'lux_dark_acc_003',
        name: 'Minimalist Gold',
        description: 'delicate gold necklace, gold watch, minimal gold rings, pearl studs',
        items: ['delicate gold necklace', 'gold watch', 'minimal gold rings', 'pearl studs'],
        vibe: 'luxury_dark_moody'
      }
    ],
    colorPalette: [
      'deep blacks (matte, glossy, textured)',
      'rich charcoals (soft, architectural)',
      'midnight navy',
      'gold accents (jewelry, hardware)',
      'warm shadows with depth'
    ],
    textures: [
      'velvet (trousers, blazers - Hailey Bieber influence)',
      'leather (jackets, pants, bags)',
      'cashmere (sweaters, coats)',
      'suede (boots, bags - The Row aesthetic)',
      'silk (blouses, slip dresses)',
      'wool (coats, tailoring)'
    ]
  },

  luxury_light_minimalistic: {
    vibe: 'luxury_light_minimalistic',
    fashionStyles: {
      business: [
        {
          id: 'lux_light_biz_001',
          name: 'White Tailored Suit',
          description: 'Crisp white tailored blazer and trousers, silk cream blouse, nude pumps',
          pieces: ['white tailored blazer', 'matching white trousers', 'silk cream blouse', 'nude pointed-toe pumps'],
          occasion: 'luxury office, high-end meeting',
          brands: ['The Row', 'Toteme', 'Khaite']
        },
        {
          id: 'lux_light_biz_002',
          name: 'Cream Power Dressing',
          description: 'Cream wool blazer, white trousers, minimal gold jewelry',
          pieces: ['cream wool blazer', 'white tailored trousers', 'white silk blouse', 'minimal gold jewelry', 'nude heels'],
          occasion: 'executive presentation, luxury event',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'lux_light_biz_003',
          name: 'Ivory Sophistication',
          description: 'Ivory blazer, cream wide-leg trousers, white button-down',
          pieces: ['ivory tailored blazer', 'cream wide-leg trousers', 'white button-down shirt', 'nude pumps'],
          occasion: 'luxury business setting, refined meeting',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'lux_light_biz_004',
          name: 'White Double-Breasted Suit',
          description: 'White double-breasted blazer, matching trousers, cream silk blouse, nude pumps',
          pieces: ['white double-breasted blazer', 'matching white trousers', 'cream silk blouse', 'nude pointed-toe pumps', 'gold jewelry'],
          occasion: 'boardroom, high-stakes meeting',
          brands: ['The Row', 'Khaite', 'Toteme']
        }
      ],
      casual: [
        {
          id: 'lux_light_cas_001',
          name: 'White Linen Chic',
          description: 'Oversized white linen shirt, cream trousers, designer sneakers',
          pieces: ['oversized white linen shirt', 'cream wide-leg trousers', 'Celine leather sneakers', 'minimal crossbody bag'],
          occasion: 'weekend, gallery visit, luxury casual',
          brands: ['The Row', 'Toteme', 'Celine']
        },
        {
          id: 'lux_light_cas_002',
          name: 'Cream Cashmere Relaxed',
          description: 'Cream cashmere sweater, white jeans, white sneakers',
          pieces: ['cream cashmere sweater', 'white straight-leg jeans', 'white designer sneakers', 'cream tote bag'],
          occasion: 'casual luxury, brunch, shopping',
          brands: ['The Row', 'Khaite', 'Celine']
        },
        {
          id: 'lux_light_cas_003',
          name: 'White Minimalist',
          description: 'White oversized blazer, cream tank, white trousers',
          pieces: ['white oversized blazer', 'cream ribbed tank', 'white wide-leg trousers', 'minimal sandals'],
          occasion: 'casual day out, luxury setting',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'lux_light_cas_004',
          name: 'Ivory Relaxed',
          description: 'Ivory cashmere cardigan, white tee, cream trousers, nude sandals',
          pieces: ['ivory cashmere cardigan', 'white ribbed tank', 'cream wide-leg trousers', 'nude sandals', 'cream tote bag'],
          occasion: 'evening casual, dinner, drinks',
          brands: ['The Row', 'Khaite', 'Toteme']
        }
      ],
      bohemian: [
        {
          id: 'lux_light_boh_001',
          name: 'White Flowy',
          description: 'White maxi dress with minimal details, gold jewelry',
          pieces: ['white flowy maxi dress', 'delicate gold necklaces', 'gold cuffs', 'white sandals'],
          occasion: 'luxury casual, art gallery',
          brands: ['Free People', 'Anthropologie']
        },
        {
          id: 'lux_light_boh_002',
          name: 'Cream Midi Dress',
          description: 'Cream midi dress with flowy sleeves, layered gold necklaces, white sandals',
          pieces: ['cream midi dress', 'layered gold necklaces', 'gold cuffs', 'white sandals'],
          occasion: 'brunch, casual event, gallery',
          brands: ['Free People', 'Anthropologie', 'The Row']
        },
        {
          id: 'lux_light_boh_003',
          name: 'Ivory Layered Look',
          description: 'Ivory kimono cardigan, white slip dress, gold jewelry, beige sandals',
          pieces: ['ivory kimono cardigan', 'white slip dress', 'layered gold jewelry', 'beige sandals'],
          occasion: 'evening casual, creative gathering',
          brands: ['Free People', 'Anthropologie']
        }
      ],
      classic: [
        {
          id: 'lux_light_cla_001',
          name: 'Timeless White',
          description: 'Classic white blazer, cream blouse, white trousers',
          pieces: ['classic white blazer', 'cream silk blouse', 'white tailored trousers', 'nude pumps'],
          occasion: 'timeless elegance, luxury setting',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'lux_light_cla_002',
          name: 'Cream Coat Classic',
          description: 'Cream wool coat, white sweater, beige trousers, tan boots',
          pieces: ['cream wool coat', 'white cashmere sweater', 'beige trousers', 'tan leather boots'],
          occasion: 'classic elegance, refined setting',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'lux_light_cla_003',
          name: 'Sophisticated Suit',
          description: 'Ivory suit, cream blouse, nude heels, gold jewelry',
          pieces: ['ivory tailored suit', 'cream silk blouse', 'nude heels', 'gold jewelry'],
          occasion: 'professional, timeless elegance',
          brands: ['The Row', 'Toteme', 'Khaite']
        }
      ],
      trendy: [
        {
          id: 'lux_light_tre_001',
          name: 'Modern White',
          description: 'White oversized blazer, white bodysuit, cream trousers',
          pieces: ['white oversized blazer', 'white bodysuit', 'cream wide-leg trousers', 'white platform boots'],
          occasion: 'trendy luxury, fashion-forward',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'lux_light_tre_002',
          name: 'Cropped Statement',
          description: 'Cropped white jacket, high-waisted cream trousers, white sneakers, minimal gold jewelry',
          pieces: ['cropped white jacket', 'high-waisted cream trousers', 'white designer sneakers', 'minimal gold jewelry'],
          occasion: 'trendy casual, modern setting',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'lux_light_tre_003',
          name: 'Oversized Chic',
          description: 'Oversized cream coat, white tee, white jeans, nude boots',
          pieces: ['oversized cream coat', 'white ribbed tank', 'white straight-leg jeans', 'nude ankle boots'],
          occasion: 'trendy day out, modern casual',
          brands: ['The Row', 'Toteme', 'Celine']
        }
      ],
      athletic: [
        {
          id: 'lux_light_ath_001',
          name: 'White Athleisure',
          description: 'White athletic set, cream cardigan, white sneakers',
          pieces: ['white athletic set', 'cream cashmere cardigan', 'white designer sneakers'],
          occasion: 'luxury athleisure, active lifestyle',
          brands: ['Alo', 'Lululemon', 'The Row']
        },
        {
          id: 'lux_light_ath_002',
          name: 'Bright Active Luxury',
          description: 'Cream leggings, white ribbed top, oversized white cashmere hoodie, gold jewelry',
          pieces: ['cream high-waisted leggings', 'white ribbed sports bra', 'oversized white cashmere hoodie', 'nude designer sneakers', 'gold jewelry'],
          occasion: 'post-workout luxury, active lifestyle',
          brands: ['Alo', 'The Row', 'Outdoor Voices']
        },
        {
          id: 'lux_light_ath_003',
          name: 'Ivory Athletic Dress',
          description: 'Ivory athletic dress, cream bomber jacket, white sneakers, tan leather gym bag',
          pieces: ['ivory athletic dress', 'cream bomber jacket', 'white designer sneakers', 'tan leather gym bag'],
          occasion: 'athleisure lifestyle, luxury active',
          brands: ['Alo', 'The Row', 'Lululemon']
        }
      ]
    },
    locations: [
      {
        id: 'lux_light_loc_001',
        name: 'Bright White Penthouse',
        description: 'Bright white penthouse interior with floor-to-ceiling windows. Clean modern architecture with minimal furniture. Natural daylight flooding the space. Airy and sophisticated atmosphere.',
        lighting: 'bright natural daylight, soft shadows',
        mood: 'airy, clean, sophisticated',
        setting: 'indoor'
      },
      {
        id: 'lux_light_loc_002',
        name: 'Luxury Hotel Lobby',
        description: 'Luxury hotel lobby with white marble floors and natural light. Clean modern design with minimal decor. Bright and airy space with sophisticated simplicity.',
        lighting: 'bright natural light, well-lit',
        mood: 'luxurious, clean, bright',
        setting: 'indoor'
      },
      {
        id: 'lux_light_loc_003',
        name: 'White Architectural Space',
        description: 'Modern white architectural space with clean lines. Minimalist design with natural light. Sophisticated and airy atmosphere.',
        lighting: 'bright natural daylight',
        mood: 'architectural, clean, modern',
        setting: 'indoor'
      },
      {
        id: 'lux_light_loc_004',
        name: 'Bright Minimalist Desk',
        description: 'Bright minimalist desk with laptop and coffee. Overhead view of clean workspace. White surfaces with natural light.',
        lighting: 'bright natural daylight',
        mood: 'clean, focused, minimal',
        setting: 'indoor'
      },
      {
        id: 'lux_light_loc_005',
        name: 'White Modern Interior',
        description: 'Modern white interior with contemporary furniture. Clean lines and natural light. Sophisticated minimalism.',
        lighting: 'bright natural light',
        mood: 'modern, clean, sophisticated',
        setting: 'indoor'
      },
      {
        id: 'lux_light_loc_006',
        name: 'Architectural White Background',
        description: 'Full-body against white architectural background. Clean modern backdrop. Bright and airy setting.',
        lighting: 'bright natural daylight',
        mood: 'architectural, clean, bright',
        setting: 'outdoor'
      }
    ],
    accessories: [
      {
        id: 'lux_light_acc_001',
        name: 'Minimal Gold Jewelry',
        description: 'delicate gold necklace, minimal gold rings, pearl studs, gold watch',
        items: ['delicate gold necklace', 'minimal gold rings', 'pearl studs', 'gold watch'],
        vibe: 'luxury_light_minimalistic'
      },
      {
        id: 'lux_light_acc_002',
        name: 'White Designer Bag',
        description: 'The Row Margaux tote in white, cream leather bag, minimal gold jewelry',
        items: ['The Row Margaux tote', 'cream leather bag', 'minimal gold jewelry', 'white sunglasses'],
        vibe: 'luxury_light_minimalistic'
      },
      {
        id: 'lux_light_acc_003',
        name: 'Cream Accessories',
        description: 'cream leather bag, gold watch, minimal jewelry, white accessories',
        items: ['cream leather bag', 'gold watch', 'minimal jewelry', 'white accessories'],
        vibe: 'luxury_light_minimalistic'
      }
    ],
    colorPalette: [
      'bright whites (crisp, clean)',
      'soft creams (warm, elegant)',
      'ivory tones',
      'warm beiges',
      'gentle shadows with depth'
    ],
    textures: [
      'linen (shirts, trousers - relaxed luxury)',
      'silk (blouses, dresses - refined elegance)',
      'cashmere (sweaters, cardigans - soft luxury)',
      'wool (blazers, coats - tailored sophistication)',
      'leather (bags, shoes - quality details)'
    ]
  },

  luxury_beige_aesthetic: {
    vibe: 'luxury_beige_aesthetic',
    fashionStyles: {
      business: [
        {
          id: 'lux_beige_biz_001',
          name: 'Camel Power Suit',
          description: 'Camel tailored blazer and trousers, cream blouse, tan pumps',
          pieces: ['camel tailored blazer', 'matching camel trousers', 'cream silk blouse', 'tan pointed-toe pumps'],
          occasion: 'luxury business, sophisticated meeting',
          brands: ['The Row', 'Toteme', 'Khaite']
        },
        {
          id: 'lux_beige_biz_002',
          name: 'Beige Tailored',
          description: 'Beige wool blazer, tan trousers, cream blouse, gold jewelry',
          pieces: ['beige wool blazer', 'tan tailored trousers', 'cream blouse', 'gold jewelry', 'nude heels'],
          occasion: 'executive setting, luxury event',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'lux_beige_biz_003',
          name: 'Tan Sophistication',
          description: 'Tan tailored blazer, beige trousers, cream silk blouse, tan pumps',
          pieces: ['tan tailored blazer', 'beige wide-leg trousers', 'cream silk blouse', 'tan pointed-toe pumps', 'gold jewelry'],
          occasion: 'luxury business setting, refined meeting',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'lux_beige_biz_004',
          name: 'Camel Double-Breasted Suit',
          description: 'Camel double-breasted blazer, matching trousers, cream blouse, nude pumps',
          pieces: ['camel double-breasted blazer', 'matching camel trousers', 'cream silk blouse', 'nude pointed-toe pumps', 'gold jewelry'],
          occasion: 'boardroom, high-stakes meeting',
          brands: ['The Row', 'Khaite', 'Toteme']
        }
      ],
      casual: [
        {
          id: 'lux_beige_cas_001',
          name: 'Camel Cashmere',
          description: 'Camel cashmere sweater, beige trousers, tan boots',
          pieces: ['camel cashmere sweater', 'beige wide-leg trousers', 'tan leather boots', 'camel tote bag'],
          occasion: 'luxury casual, weekend, brunch',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'lux_beige_cas_002',
          name: 'Beige Linen',
          description: 'Beige linen shirt, camel pants, tan sandals',
          pieces: ['beige linen shirt', 'camel straight-leg pants', 'tan sandals', 'cream bag'],
          occasion: 'casual luxury, relaxed setting',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'lux_beige_cas_003',
          name: 'Tan Relaxed',
          description: 'Tan cashmere cardigan, beige tee, camel trousers, tan sandals',
          pieces: ['tan cashmere cardigan', 'beige ribbed tank', 'camel wide-leg trousers', 'tan sandals', 'camel tote bag'],
          occasion: 'evening casual, dinner, drinks',
          brands: ['The Row', 'Khaite', 'Toteme']
        },
        {
          id: 'lux_beige_cas_004',
          name: 'Camel Oversized',
          description: 'Oversized camel blazer, beige tank, tan jeans, nude boots',
          pieces: ['oversized camel blazer', 'beige ribbed tank', 'tan straight-leg jeans', 'nude ankle boots', 'camel bag'],
          occasion: 'casual day out, luxury setting',
          brands: ['The Row', 'Toteme']
        }
      ],
      bohemian: [
        {
          id: 'lux_beige_boh_001',
          name: 'Beige Flowy',
          description: 'Beige maxi dress, gold jewelry, tan sandals',
          pieces: ['beige flowy maxi dress', 'layered gold necklaces', 'tan sandals'],
          occasion: 'luxury bohemian, art gallery',
          brands: ['Free People', 'Anthropologie']
        },
        {
          id: 'lux_beige_boh_002',
          name: 'Camel Midi Dress',
          description: 'Camel midi dress with flowy sleeves, layered gold necklaces, tan sandals',
          pieces: ['camel midi dress', 'layered gold necklaces', 'gold cuffs', 'tan sandals'],
          occasion: 'brunch, casual event, gallery',
          brands: ['Free People', 'Anthropologie', 'The Row']
        },
        {
          id: 'lux_beige_boh_003',
          name: 'Tan Layered Look',
          description: 'Tan kimono cardigan, beige slip dress, gold jewelry, tan sandals',
          pieces: ['tan kimono cardigan', 'beige slip dress', 'layered gold jewelry', 'tan sandals'],
          occasion: 'evening casual, creative gathering',
          brands: ['Free People', 'Anthropologie']
        }
      ],
      classic: [
        {
          id: 'lux_beige_cla_001',
          name: 'Timeless Camel',
          description: 'Camel coat, cream sweater, beige trousers',
          pieces: ['camel wool coat', 'cream cashmere sweater', 'beige trousers', 'tan boots'],
          occasion: 'timeless elegance, luxury setting',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'lux_beige_cla_002',
          name: 'Beige Suit Classic',
          description: 'Beige tailored suit, cream blouse, tan heels, gold jewelry',
          pieces: ['beige tailored suit', 'cream silk blouse', 'tan heels', 'gold jewelry'],
          occasion: 'professional, timeless elegance',
          brands: ['The Row', 'Toteme', 'Khaite']
        },
        {
          id: 'lux_beige_cla_003',
          name: 'Camel Blazer Classic',
          description: 'Camel blazer, beige blouse, cream trousers, nude pumps',
          pieces: ['camel blazer', 'beige silk blouse', 'cream trousers', 'nude pumps'],
          occasion: 'classic elegance, refined setting',
          brands: ['The Row', 'Toteme']
        }
      ],
      trendy: [
        {
          id: 'lux_beige_tre_001',
          name: 'Modern Beige',
          description: 'Beige oversized blazer, camel bodysuit, tan trousers',
          pieces: ['beige oversized blazer', 'camel bodysuit', 'tan wide-leg trousers', 'tan platform boots'],
          occasion: 'trendy luxury, fashion-forward',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'lux_beige_tre_002',
          name: 'Cropped Statement',
          description: 'Cropped beige jacket, high-waisted tan trousers, tan sneakers, minimal gold jewelry',
          pieces: ['cropped beige jacket', 'high-waisted tan trousers', 'tan designer sneakers', 'minimal gold jewelry'],
          occasion: 'trendy casual, modern setting',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'lux_beige_tre_003',
          name: 'Oversized Chic',
          description: 'Oversized tan coat, beige tee, camel jeans, tan boots',
          pieces: ['oversized tan coat', 'beige ribbed tank', 'camel straight-leg jeans', 'tan ankle boots'],
          occasion: 'trendy day out, modern casual',
          brands: ['The Row', 'Toteme', 'Celine']
        }
      ],
      athletic: [
        {
          id: 'lux_beige_ath_001',
          name: 'Beige Athleisure',
          description: 'Beige athletic set, camel cardigan, tan sneakers',
          pieces: ['beige athletic set', 'camel cashmere cardigan', 'tan designer sneakers'],
          occasion: 'luxury athleisure',
          brands: ['Alo', 'Lululemon', 'The Row']
        },
        {
          id: 'lux_beige_ath_002',
          name: 'Camel Active Luxe',
          description: 'Camel leggings, beige ribbed top, oversized tan hoodie, gold watch',
          pieces: ['camel high-waisted leggings', 'beige ribbed sports bra', 'oversized tan cashmere hoodie', 'nude athletic sneakers', 'gold minimalist watch'],
          occasion: 'post-workout luxury, active lifestyle',
          brands: ['Alo', 'The Row', 'Outdoor Voices']
        },
        {
          id: 'lux_beige_ath_003',
          name: 'Sand Athletic Dress',
          description: 'Sand athletic dress, camel bomber jacket, beige sneakers, tan leather gym bag',
          pieces: ['sand athletic dress', 'camel bomber jacket', 'beige designer sneakers', 'tan leather gym bag'],
          occasion: 'athleisure lifestyle, luxury active',
          brands: ['Alo', 'The Row', 'Lululemon']
        }
      ]
    },
    locations: [
      {
        id: 'lux_beige_loc_001',
        name: 'Beige Stone Architecture',
        description: 'Warm beige stone architecture with golden hour light. European elegance with sophisticated warmth. Timeless luxury setting.',
        lighting: 'golden hour warmth, soft shadows',
        mood: 'warm, elegant, sophisticated',
        setting: 'outdoor'
      },
      {
        id: 'lux_beige_loc_002',
        name: 'Warm Luxury Apartment',
        description: 'Warm-toned luxury apartment interior with beige walls and natural wood. Golden hour light streaming through windows. Sophisticated warmth.',
        lighting: 'warm golden hour light, soft shadows',
        mood: 'warm, luxurious, inviting',
        setting: 'indoor'
      },
      {
        id: 'lux_beige_loc_003',
        name: 'Tan Leather Interior',
        description: 'Luxury interior with tan leather furniture and beige walls. Warm lighting creating cozy sophistication. Timeless elegance.',
        lighting: 'warm ambient lighting',
        mood: 'warm, sophisticated, cozy',
        setting: 'indoor'
      },
      {
        id: 'lux_beige_loc_004',
        name: 'Beige Minimal Desk',
        description: 'Warm beige minimal desk with coffee and notebook. Overhead view of cozy workspace. Golden hour light.',
        lighting: 'warm golden hour light',
        mood: 'warm, focused, cozy',
        setting: 'indoor'
      },
      {
        id: 'lux_beige_loc_005',
        name: 'Golden Hour City Street',
        description: 'City street at golden hour with warm beige tones. European architecture with sophisticated warmth.',
        lighting: 'golden hour warmth',
        mood: 'warm, urban, elegant',
        setting: 'outdoor'
      }
    ],
    accessories: [
      {
        id: 'lux_beige_acc_001',
        name: 'Gold Jewelry Set',
        description: 'layered gold necklaces, gold cuffs, statement rings, pearl studs',
        items: ['layered gold necklaces', 'gold cuffs', 'statement rings', 'pearl studs'],
        vibe: 'luxury_beige_aesthetic'
      },
      {
        id: 'lux_beige_acc_002',
        name: 'Tan Designer Bag',
        description: 'The Row Margaux tote in tan, camel leather bag, gold watch',
        items: ['The Row Margaux tote', 'camel leather bag', 'gold watch', 'tan sunglasses'],
        vibe: 'luxury_beige_aesthetic'
      },
      {
        id: 'lux_beige_acc_003',
        name: 'Warm Accessories',
        description: 'camel leather bag, gold jewelry, tan accessories, warm tones',
        items: ['camel leather bag', 'gold jewelry', 'tan accessories', 'warm-toned items'],
        vibe: 'luxury_beige_aesthetic'
      }
    ],
    colorPalette: [
      'warm beiges (sophisticated, elegant)',
      'camel tones (rich, luxurious)',
      'cream highlights',
      'tan accents',
      'golden hour warmth'
    ],
    textures: [
      'cashmere (sweaters, coats - soft luxury)',
      'silk (blouses, dresses - refined elegance)',
      'wool (blazers, tailoring - sophisticated)',
      'leather (bags, boots - quality details)',
      'linen (shirts, trousers - relaxed luxury)'
    ]
  },

  minimal_dark_moody: {
    vibe: 'minimal_dark_moody',
    fashionStyles: {
      business: [
        {
          id: 'min_dark_biz_001',
          name: 'Black Minimal Suit',
          description: 'Black tailored blazer, black trousers, white blouse, black pumps',
          pieces: ['black tailored blazer', 'black trousers', 'white button-down', 'black pumps'],
          occasion: 'minimal office, clean setting',
          brands: ['Toteme', 'Arket', 'COS']
        },
        {
          id: 'min_dark_biz_002',
          name: 'Charcoal Minimal',
          description: 'Charcoal blazer, black trousers, white tee, minimal accessories',
          pieces: ['charcoal wool blazer', 'black trousers', 'white tee', 'minimal jewelry', 'black boots'],
          occasion: 'minimal business, clean aesthetic',
          brands: ['Toteme', 'COS']
        },
        {
          id: 'min_dark_biz_003',
          name: 'Black Tailored Suit',
          description: 'Black tailored suit, white silk blouse, black pumps, minimal jewelry',
          pieces: ['black tailored suit', 'white silk blouse', 'black pumps', 'minimal jewelry'],
          occasion: 'minimal office, clean setting',
          brands: ['Toteme', 'Arket', 'COS']
        },
        {
          id: 'min_dark_biz_004',
          name: 'Charcoal Double-Breasted',
          description: 'Charcoal double-breasted blazer, matching trousers, white button-down, black boots',
          pieces: ['charcoal double-breasted blazer', 'matching charcoal trousers', 'white button-down', 'black boots', 'minimal accessories'],
          occasion: 'boardroom, high-stakes meeting',
          brands: ['Toteme', 'COS', 'Arket']
        }
      ],
      casual: [
        {
          id: 'min_dark_cas_001',
          name: 'Black Minimal Casual',
          description: 'Black oversized sweater, black jeans, white sneakers',
          pieces: ['black oversized sweater', 'black straight-leg jeans', 'white sneakers', 'black tote'],
          occasion: 'minimal casual, everyday',
          brands: ['Toteme', 'Arket', 'COS']
        },
        {
          id: 'min_dark_cas_002',
          name: 'Charcoal Relaxed',
          description: 'Charcoal cardigan, black tee, black trousers, minimal sneakers',
          pieces: ['charcoal cardigan', 'black tee', 'black trousers', 'minimal sneakers'],
          occasion: 'minimal casual, relaxed',
          brands: ['Toteme', 'COS']
        },
        {
          id: 'min_dark_cas_003',
          name: 'Black Oversized',
          description: 'Black oversized blazer, white tee, black jeans, white sneakers',
          pieces: ['black oversized blazer', 'white ribbed tank', 'black straight-leg jeans', 'white sneakers', 'black tote'],
          occasion: 'evening casual, dinner, drinks',
          brands: ['Toteme', 'Arket', 'COS']
        },
        {
          id: 'min_dark_cas_004',
          name: 'Charcoal Minimalist',
          description: 'Charcoal sweater, black trousers, minimal sneakers, simple bag',
          pieces: ['charcoal cashmere sweater', 'black wide-leg trousers', 'minimal sneakers', 'simple black bag'],
          occasion: 'casual day out, minimal setting',
          brands: ['Toteme', 'COS']
        }
      ],
      bohemian: [
        {
          id: 'min_dark_boh_001',
          name: 'Black Minimal Boho',
          description: 'Black maxi dress, minimal jewelry, black sandals',
          pieces: ['black flowy maxi dress', 'minimal gold jewelry', 'black sandals'],
          occasion: 'minimal bohemian, clean aesthetic',
          brands: ['Free People', 'Arket']
        },
        {
          id: 'min_dark_boh_002',
          name: 'Charcoal Midi Dress',
          description: 'Charcoal midi dress with flowy sleeves, minimal gold necklaces, black sandals',
          pieces: ['charcoal midi dress', 'minimal gold necklaces', 'black sandals'],
          occasion: 'brunch, casual event, gallery',
          brands: ['Free People', 'Arket', 'COS']
        },
        {
          id: 'min_dark_boh_003',
          name: 'Black Layered Look',
          description: 'Black kimono cardigan, charcoal slip dress, minimal gold jewelry, black sandals',
          pieces: ['black kimono cardigan', 'charcoal slip dress', 'minimal gold jewelry', 'black sandals'],
          occasion: 'evening casual, creative gathering',
          brands: ['Free People', 'Arket']
        }
      ],
      classic: [
        {
          id: 'min_dark_cla_001',
          name: 'Timeless Black',
          description: 'Black blazer, white blouse, black trousers, black pumps',
          pieces: ['black blazer', 'white blouse', 'black trousers', 'black pumps'],
          occasion: 'timeless minimal, clean',
          brands: ['Toteme', 'COS']
        },
        {
          id: 'min_dark_cla_002',
          name: 'Charcoal Coat Classic',
          description: 'Charcoal wool coat, black sweater, charcoal trousers, black boots',
          pieces: ['charcoal wool coat', 'black cashmere sweater', 'charcoal trousers', 'black leather boots'],
          occasion: 'classic elegance, refined setting',
          brands: ['Toteme', 'COS', 'Arket']
        },
        {
          id: 'min_dark_cla_003',
          name: 'Black Suit Classic',
          description: 'Black tailored suit, white blouse, black pumps, minimal jewelry',
          pieces: ['black tailored suit', 'white silk blouse', 'black pumps', 'minimal jewelry'],
          occasion: 'professional, timeless elegance',
          brands: ['Toteme', 'COS', 'Arket']
        }
      ],
      trendy: [
        {
          id: 'min_dark_tre_001',
          name: 'Modern Minimal',
          description: 'Black oversized blazer, black bodysuit, black trousers',
          pieces: ['black oversized blazer', 'black bodysuit', 'black wide-leg trousers', 'black boots'],
          occasion: 'trendy minimal, modern',
          brands: ['Toteme', 'COS']
        },
        {
          id: 'min_dark_tre_002',
          name: 'Cropped Statement',
          description: 'Cropped black jacket, high-waisted black trousers, black sneakers, minimal accessories',
          pieces: ['cropped black jacket', 'high-waisted black trousers', 'black sneakers', 'minimal accessories'],
          occasion: 'trendy casual, modern setting',
          brands: ['Toteme', 'COS']
        },
        {
          id: 'min_dark_tre_003',
          name: 'Oversized Chic',
          description: 'Oversized charcoal coat, black tee, black jeans, black boots',
          pieces: ['oversized charcoal coat', 'black ribbed tank', 'black straight-leg jeans', 'black ankle boots'],
          occasion: 'trendy day out, modern casual',
          brands: ['Toteme', 'COS', 'Arket']
        }
      ],
      athletic: [
        {
          id: 'min_dark_ath_001',
          name: 'Black Athleisure',
          description: 'Black athletic set, black cardigan, white sneakers',
          pieces: ['black athletic set', 'black cardigan', 'white sneakers'],
          occasion: 'minimal athleisure',
          brands: ['Alo', 'Lululemon', 'Toteme']
        },
        {
          id: 'min_dark_ath_002',
          name: 'Clean Dark Active',
          description: 'Charcoal leggings, black ribbed top, oversized black hoodie, minimal accessories',
          pieces: ['charcoal high-waisted leggings', 'black ribbed sports bra', 'oversized black hoodie', 'white sneakers', 'minimal accessories'],
          occasion: 'post-workout minimal, active lifestyle',
          brands: ['Alo', 'Toteme', 'Outdoor Voices']
        },
        {
          id: 'min_dark_ath_003',
          name: 'Black Athletic Dress',
          description: 'Black athletic dress, charcoal bomber jacket, white sneakers, simple tote bag',
          pieces: ['black athletic dress', 'charcoal bomber jacket', 'white sneakers', 'simple tote bag'],
          occasion: 'athleisure lifestyle, minimal active',
          brands: ['Alo', 'Toteme', 'Lululemon']
        }
      ]
    },
    locations: [
      {
        id: 'min_dark_loc_001',
        name: 'Minimal Dark Interior',
        description: 'Minimal dark interior with clean lines. Black and gray tones with natural light. Clean architectural backdrop.',
        lighting: 'natural light with shadows',
        mood: 'minimal, clean, architectural',
        setting: 'indoor'
      },
      {
        id: 'min_dark_loc_002',
        name: 'Dark Minimal Desk',
        description: 'Dark minimal desk with laptop. Overhead view of clean workspace. Minimal styling.',
        lighting: 'natural light, soft shadows',
        mood: 'minimal, focused, clean',
        setting: 'indoor'
      },
      {
        id: 'min_dark_loc_003',
        name: 'Gray Architectural Wall',
        description: 'Full-body against gray architectural wall. Clean minimal backdrop. Modern and simple.',
        lighting: 'natural daylight with shadows',
        mood: 'architectural, minimal, clean',
        setting: 'outdoor'
      },
      {
        id: 'min_dark_loc_004',
        name: 'Minimal Urban Street',
        description: 'Urban street with minimal architecture. Clean lines and simple backdrop.',
        lighting: 'overcast daylight, soft shadows',
        mood: 'urban, minimal, clean',
        setting: 'outdoor'
      },
      {
        id: 'min_dark_loc_005',
        name: 'Dark Minimal Space',
        description: 'Dark minimal space with contemporary furniture. Clean lines and natural light.',
        lighting: 'natural light with shadows',
        mood: 'minimal, modern, clean',
        setting: 'indoor'
      }
    ],
    accessories: [
      {
        id: 'min_dark_acc_001',
        name: 'Minimal Black Accessories',
        description: 'black leather bag, minimal jewelry, black accessories',
        items: ['black leather bag', 'minimal jewelry', 'black accessories', 'simple watch'],
        vibe: 'minimal_dark_moody'
      },
      {
        id: 'min_dark_acc_002',
        name: 'Clean Minimal Set',
        description: 'minimal black bag, simple jewelry, clean accessories',
        items: ['minimal black bag', 'simple jewelry', 'clean accessories', 'minimal watch'],
        vibe: 'minimal_dark_moody'
      },
      {
        id: 'min_dark_acc_003',
        name: 'Simple Black',
        description: 'black tote bag, minimal gold jewelry, simple accessories',
        items: ['black tote bag', 'minimal gold jewelry', 'simple accessories', 'black sunglasses'],
        vibe: 'minimal_dark_moody'
      }
    ],
    colorPalette: [
      'deep blacks (clean, minimal)',
      'charcoal grays (soft, architectural)',
      'white accents',
      'minimal shadows'
    ],
    textures: [
      'wool (blazers, coats - clean minimal)',
      'cotton (tees, sweaters - simple)',
      'leather (bags, shoes - quality minimal)',
      'denim (jeans - clean lines)'
    ]
  },

  minimal_light_minimalistic: {
    vibe: 'minimal_light_minimalistic',
    fashionStyles: {
      business: [
        {
          id: 'min_light_biz_001',
          name: 'White Minimal Suit',
          description: 'White blazer, white trousers, white blouse, nude pumps',
          pieces: ['white tailored blazer', 'white trousers', 'white button-down', 'nude pumps'],
          occasion: 'minimal office, bright setting',
          brands: ['Toteme', 'Arket', 'COS']
        },
        {
          id: 'min_light_biz_002',
          name: 'Cream Minimal',
          description: 'Cream blazer, white trousers, minimal accessories',
          pieces: ['cream wool blazer', 'white trousers', 'white tee', 'minimal jewelry', 'nude heels'],
          occasion: 'minimal business, clean aesthetic',
          brands: ['Toteme', 'COS']
        },
        {
          id: 'min_light_biz_003',
          name: 'White Tailored Suit',
          description: 'White tailored suit, cream silk blouse, nude pumps, minimal jewelry',
          pieces: ['white tailored suit', 'cream silk blouse', 'nude pumps', 'minimal jewelry'],
          occasion: 'minimal office, bright setting',
          brands: ['Toteme', 'Arket', 'COS']
        },
        {
          id: 'min_light_biz_004',
          name: 'Cream Double-Breasted',
          description: 'Cream double-breasted blazer, matching trousers, white button-down, nude boots',
          pieces: ['cream double-breasted blazer', 'matching cream trousers', 'white button-down', 'nude boots', 'minimal accessories'],
          occasion: 'boardroom, high-stakes meeting',
          brands: ['Toteme', 'COS', 'Arket']
        }
      ],
      casual: [
        {
          id: 'min_light_cas_001',
          name: 'White Minimal Casual',
          description: 'White oversized shirt, white jeans, white sneakers',
          pieces: ['white oversized shirt', 'white straight-leg jeans', 'white sneakers', 'white tote'],
          occasion: 'minimal casual, everyday',
          brands: ['Toteme', 'Arket', 'COS']
        },
        {
          id: 'min_light_cas_002',
          name: 'Cream Relaxed',
          description: 'Cream cardigan, white tee, cream trousers, minimal sneakers',
          pieces: ['cream cardigan', 'white tee', 'cream trousers', 'white sneakers'],
          occasion: 'minimal casual, relaxed',
          brands: ['Toteme', 'COS']
        },
        {
          id: 'min_light_cas_003',
          name: 'White Oversized',
          description: 'White oversized blazer, cream tee, white jeans, white sneakers',
          pieces: ['white oversized blazer', 'cream ribbed tank', 'white straight-leg jeans', 'white sneakers', 'white tote'],
          occasion: 'evening casual, dinner, drinks',
          brands: ['Toteme', 'Arket', 'COS']
        },
        {
          id: 'min_light_cas_004',
          name: 'Cream Minimalist',
          description: 'Cream sweater, white trousers, minimal sneakers, simple bag',
          pieces: ['cream cashmere sweater', 'white wide-leg trousers', 'minimal sneakers', 'simple white bag'],
          occasion: 'casual day out, minimal setting',
          brands: ['Toteme', 'COS']
        }
      ],
      bohemian: [
        {
          id: 'min_light_boh_001',
          name: 'White Minimal Boho',
          description: 'White maxi dress, minimal jewelry, white sandals',
          pieces: ['white flowy maxi dress', 'minimal gold jewelry', 'white sandals'],
          occasion: 'minimal bohemian, clean aesthetic',
          brands: ['Free People', 'Arket']
        },
        {
          id: 'min_light_boh_002',
          name: 'Cream Midi Dress',
          description: 'Cream midi dress with flowy sleeves, minimal gold necklaces, white sandals',
          pieces: ['cream midi dress', 'minimal gold necklaces', 'white sandals'],
          occasion: 'brunch, casual event, gallery',
          brands: ['Free People', 'Arket', 'COS']
        },
        {
          id: 'min_light_boh_003',
          name: 'White Layered Look',
          description: 'White kimono cardigan, cream slip dress, minimal gold jewelry, beige sandals',
          pieces: ['white kimono cardigan', 'cream slip dress', 'minimal gold jewelry', 'beige sandals'],
          occasion: 'evening casual, creative gathering',
          brands: ['Free People', 'Arket']
        }
      ],
      classic: [
        {
          id: 'min_light_cla_001',
          name: 'Timeless White',
          description: 'White blazer, white blouse, white trousers, nude pumps',
          pieces: ['white blazer', 'white blouse', 'white trousers', 'nude pumps'],
          occasion: 'timeless minimal, clean',
          brands: ['Toteme', 'COS']
        },
        {
          id: 'min_light_cla_002',
          name: 'Cream Coat Classic',
          description: 'Cream wool coat, white sweater, cream trousers, tan boots',
          pieces: ['cream wool coat', 'white cashmere sweater', 'cream trousers', 'tan leather boots'],
          occasion: 'classic elegance, refined setting',
          brands: ['Toteme', 'COS', 'Arket']
        },
        {
          id: 'min_light_cla_003',
          name: 'White Suit Classic',
          description: 'White tailored suit, cream blouse, nude heels, minimal jewelry',
          pieces: ['white tailored suit', 'cream silk blouse', 'nude heels', 'minimal jewelry'],
          occasion: 'professional, timeless elegance',
          brands: ['Toteme', 'COS', 'Arket']
        }
      ],
      trendy: [
        {
          id: 'min_light_tre_001',
          name: 'Modern Minimal',
          description: 'White oversized blazer, white bodysuit, cream trousers',
          pieces: ['white oversized blazer', 'white bodysuit', 'cream wide-leg trousers', 'white boots'],
          occasion: 'trendy minimal, modern',
          brands: ['Toteme', 'COS']
        },
        {
          id: 'min_light_tre_002',
          name: 'Cropped Statement',
          description: 'Cropped white jacket, high-waisted cream trousers, white sneakers, minimal accessories',
          pieces: ['cropped white jacket', 'high-waisted cream trousers', 'white sneakers', 'minimal accessories'],
          occasion: 'trendy casual, modern setting',
          brands: ['Toteme', 'COS']
        },
        {
          id: 'min_light_tre_003',
          name: 'Oversized Chic',
          description: 'Oversized cream coat, white tee, white jeans, beige boots',
          pieces: ['oversized cream coat', 'white ribbed tank', 'white straight-leg jeans', 'beige ankle boots'],
          occasion: 'trendy day out, modern casual',
          brands: ['Toteme', 'COS', 'Arket']
        }
      ],
      athletic: [
        {
          id: 'min_light_ath_001',
          name: 'White Athleisure',
          description: 'White athletic set, cream cardigan, white sneakers',
          pieces: ['white athletic set', 'cream cardigan', 'white sneakers'],
          occasion: 'minimal athleisure',
          brands: ['Alo', 'Lululemon', 'Toteme']
        },
        {
          id: 'min_light_ath_002',
          name: 'Clean Active Minimal',
          description: 'Cream leggings, white ribbed top, oversized white hoodie, minimal watch',
          pieces: ['cream high-waisted leggings', 'white ribbed sports bra', 'oversized white hoodie', 'white sneakers', 'minimal watch'],
          occasion: 'post-workout minimal, active lifestyle',
          brands: ['Alo', 'Toteme', 'Outdoor Voices']
        },
        {
          id: 'min_light_ath_003',
          name: 'White Athletic Dress',
          description: 'White athletic dress, cream bomber jacket, white sneakers, simple tote bag',
          pieces: ['white athletic dress', 'cream bomber jacket', 'white sneakers', 'simple tote bag'],
          occasion: 'athleisure lifestyle, minimal active',
          brands: ['Alo', 'Toteme', 'Lululemon']
        }
      ]
    },
    locations: [
      {
        id: 'min_light_loc_001',
        name: 'Bright Minimal Interior',
        description: 'Bright minimal interior with clean white walls. Natural daylight flooding the space. Clean and airy atmosphere.',
        lighting: 'bright natural daylight',
        mood: 'minimal, clean, bright',
        setting: 'indoor'
      },
      {
        id: 'min_light_loc_002',
        name: 'White Minimal Desk',
        description: 'White minimal desk with laptop. Overhead view of clean workspace. Bright natural light.',
        lighting: 'bright natural daylight',
        mood: 'minimal, focused, clean',
        setting: 'indoor'
      },
      {
        id: 'min_light_loc_003',
        name: 'White Architectural Wall',
        description: 'Full-body against white architectural wall. Clean minimal backdrop. Bright and simple.',
        lighting: 'bright natural daylight',
        mood: 'architectural, minimal, clean',
        setting: 'outdoor'
      },
      {
        id: 'min_light_loc_004',
        name: 'Minimal Bright Space',
        description: 'Bright minimal space with contemporary furniture. Clean lines and natural light.',
        lighting: 'bright natural light',
        mood: 'minimal, modern, bright',
        setting: 'indoor'
      },
      {
        id: 'min_light_loc_005',
        name: 'Clean White Background',
        description: 'Clean white background with minimal elements. Bright and airy setting.',
        lighting: 'bright natural daylight',
        mood: 'minimal, clean, bright',
        setting: 'indoor'
      }
    ],
    accessories: [
      {
        id: 'min_light_acc_001',
        name: 'Minimal White Accessories',
        description: 'white leather bag, minimal jewelry, white accessories',
        items: ['white leather bag', 'minimal jewelry', 'white accessories', 'simple watch'],
        vibe: 'minimal_light_minimalistic'
      },
      {
        id: 'min_light_acc_002',
        name: 'Clean Minimal Set',
        description: 'minimal white bag, simple jewelry, clean accessories',
        items: ['minimal white bag', 'simple jewelry', 'clean accessories', 'minimal watch'],
        vibe: 'minimal_light_minimalistic'
      },
      {
        id: 'min_light_acc_003',
        name: 'Simple White',
        description: 'white tote bag, minimal gold jewelry, simple accessories',
        items: ['white tote bag', 'minimal gold jewelry', 'simple accessories', 'white sunglasses'],
        vibe: 'minimal_light_minimalistic'
      }
    ],
    colorPalette: [
      'bright whites (clean, minimal)',
      'soft creams (warm, minimal)',
      'warm beiges',
      'minimal shadows'
    ],
    textures: [
      'cotton (shirts, tees - simple)',
      'wool (blazers, coats - clean minimal)',
      'leather (bags, shoes - quality minimal)',
      'linen (shirts, trousers - relaxed minimal)'
    ]
  },

  minimal_beige_aesthetic: {
    vibe: 'minimal_beige_aesthetic',
    fashionStyles: {
      business: [
        {
          id: 'min_beige_biz_001',
          name: 'Beige Minimal Suit',
          description: 'Beige blazer, beige trousers, cream blouse, nude pumps',
          pieces: ['beige tailored blazer', 'beige trousers', 'cream button-down', 'nude pumps'],
          occasion: 'minimal office, warm setting',
          brands: ['Toteme', 'Arket', 'COS']
        },
        {
          id: 'min_beige_biz_002',
          name: 'Sand Minimal',
          description: 'Sand blazer, beige trousers, cream tee, minimal accessories',
          pieces: ['sand wool blazer', 'beige trousers', 'cream tee', 'minimal jewelry', 'nude heels'],
          occasion: 'minimal business, clean aesthetic',
          brands: ['Toteme', 'COS']
        },
        {
          id: 'min_beige_biz_003',
          name: 'Beige Tailored Suit',
          description: 'Beige tailored suit, cream silk blouse, nude pumps, minimal jewelry',
          pieces: ['beige tailored suit', 'cream silk blouse', 'nude pumps', 'minimal jewelry'],
          occasion: 'minimal office, warm setting',
          brands: ['Toteme', 'Arket', 'COS']
        },
        {
          id: 'min_beige_biz_004',
          name: 'Sand Double-Breasted',
          description: 'Sand double-breasted blazer, matching trousers, cream button-down, tan boots',
          pieces: ['sand double-breasted blazer', 'matching sand trousers', 'cream button-down', 'tan boots', 'minimal accessories'],
          occasion: 'boardroom, high-stakes meeting',
          brands: ['Toteme', 'COS', 'Arket']
        }
      ],
      casual: [
        {
          id: 'min_beige_cas_001',
          name: 'Beige Minimal Casual',
          description: 'Beige oversized sweater, beige jeans, tan sneakers',
          pieces: ['beige oversized sweater', 'beige straight-leg jeans', 'tan sneakers', 'beige tote'],
          occasion: 'minimal casual, everyday',
          brands: ['Toteme', 'Arket', 'COS']
        },
        {
          id: 'min_beige_cas_002',
          name: 'Sand Relaxed',
          description: 'Sand cardigan, cream tee, beige trousers, minimal sneakers',
          pieces: ['sand cardigan', 'cream tee', 'beige trousers', 'tan sneakers'],
          occasion: 'minimal casual, relaxed',
          brands: ['Toteme', 'COS']
        },
        {
          id: 'min_beige_cas_003',
          name: 'Beige Oversized',
          description: 'Beige oversized blazer, sand tee, tan jeans, tan sneakers',
          pieces: ['beige oversized blazer', 'sand ribbed tank', 'tan straight-leg jeans', 'tan sneakers', 'beige tote'],
          occasion: 'evening casual, dinner, drinks',
          brands: ['Toteme', 'Arket', 'COS']
        },
        {
          id: 'min_beige_cas_004',
          name: 'Sand Minimalist',
          description: 'Sand sweater, beige trousers, minimal sneakers, simple bag',
          pieces: ['sand cashmere sweater', 'beige wide-leg trousers', 'minimal sneakers', 'simple beige bag'],
          occasion: 'casual day out, minimal setting',
          brands: ['Toteme', 'COS']
        }
      ],
      bohemian: [
        {
          id: 'min_beige_boh_001',
          name: 'Beige Minimal Boho',
          description: 'Beige maxi dress, minimal jewelry, tan sandals',
          pieces: ['beige flowy maxi dress', 'minimal gold jewelry', 'tan sandals'],
          occasion: 'minimal bohemian, clean aesthetic',
          brands: ['Free People', 'Arket']
        },
        {
          id: 'min_beige_boh_002',
          name: 'Sand Midi Dress',
          description: 'Sand midi dress with flowy sleeves, minimal gold necklaces, tan sandals',
          pieces: ['sand midi dress', 'minimal gold necklaces', 'tan sandals'],
          occasion: 'brunch, casual event, gallery',
          brands: ['Free People', 'Arket', 'COS']
        },
        {
          id: 'min_beige_boh_003',
          name: 'Beige Layered Look',
          description: 'Beige kimono cardigan, sand slip dress, minimal gold jewelry, tan sandals',
          pieces: ['beige kimono cardigan', 'sand slip dress', 'minimal gold jewelry', 'tan sandals'],
          occasion: 'evening casual, creative gathering',
          brands: ['Free People', 'Arket']
        }
      ],
      classic: [
        {
          id: 'min_beige_cla_001',
          name: 'Timeless Beige',
          description: 'Beige blazer, cream blouse, beige trousers, nude pumps',
          pieces: ['beige blazer', 'cream blouse', 'beige trousers', 'nude pumps'],
          occasion: 'timeless minimal, clean',
          brands: ['Toteme', 'COS']
        },
        {
          id: 'min_beige_cla_002',
          name: 'Sand Coat Classic',
          description: 'Sand wool coat, beige sweater, sand trousers, tan boots',
          pieces: ['sand wool coat', 'beige cashmere sweater', 'sand trousers', 'tan leather boots'],
          occasion: 'classic elegance, refined setting',
          brands: ['Toteme', 'COS', 'Arket']
        },
        {
          id: 'min_beige_cla_003',
          name: 'Beige Suit Classic',
          description: 'Beige tailored suit, cream blouse, nude heels, minimal jewelry',
          pieces: ['beige tailored suit', 'cream silk blouse', 'nude heels', 'minimal jewelry'],
          occasion: 'professional, timeless elegance',
          brands: ['Toteme', 'COS', 'Arket']
        }
      ],
      trendy: [
        {
          id: 'min_beige_tre_001',
          name: 'Modern Minimal',
          description: 'Beige oversized blazer, cream bodysuit, sand trousers',
          pieces: ['beige oversized blazer', 'cream bodysuit', 'sand wide-leg trousers', 'tan boots'],
          occasion: 'trendy minimal, modern',
          brands: ['Toteme', 'COS']
        },
        {
          id: 'min_beige_tre_002',
          name: 'Cropped Statement',
          description: 'Cropped beige jacket, high-waisted sand trousers, tan sneakers, minimal accessories',
          pieces: ['cropped beige jacket', 'high-waisted sand trousers', 'tan sneakers', 'minimal accessories'],
          occasion: 'trendy casual, modern setting',
          brands: ['Toteme', 'COS']
        },
        {
          id: 'min_beige_tre_003',
          name: 'Oversized Chic',
          description: 'Oversized sand coat, beige tee, tan jeans, tan boots',
          pieces: ['oversized sand coat', 'beige ribbed tank', 'tan straight-leg jeans', 'tan ankle boots'],
          occasion: 'trendy day out, modern casual',
          brands: ['Toteme', 'COS', 'Arket']
        }
      ],
      athletic: [
        {
          id: 'min_beige_ath_001',
          name: 'Beige Athleisure',
          description: 'Beige athletic set, sand cardigan, tan sneakers',
          pieces: ['beige athletic set', 'sand cardigan', 'tan sneakers'],
          occasion: 'minimal athleisure',
          brands: ['Alo', 'Lululemon', 'Toteme']
        },
        {
          id: 'min_beige_ath_002',
          name: 'Sand Active Minimal',
          description: 'Sand leggings, beige ribbed top, oversized tan hoodie, minimal accessories',
          pieces: ['sand high-waisted leggings', 'beige ribbed sports bra', 'oversized tan hoodie', 'tan sneakers', 'minimal accessories'],
          occasion: 'post-workout minimal, active lifestyle',
          brands: ['Alo', 'Toteme', 'Outdoor Voices']
        },
        {
          id: 'min_beige_ath_003',
          name: 'Beige Athletic Dress',
          description: 'Beige athletic dress, sand bomber jacket, tan sneakers, simple tote bag',
          pieces: ['beige athletic dress', 'sand bomber jacket', 'tan sneakers', 'simple tote bag'],
          occasion: 'athleisure lifestyle, minimal active',
          brands: ['Alo', 'Toteme', 'Lululemon']
        }
      ]
    },
    locations: [
      {
        id: 'min_beige_loc_001',
        name: 'Beige Minimal Interior',
        description: 'Beige minimal interior with clean lines. Soft Nordic light, beige walls, quiet sophistication.',
        lighting: 'soft Nordic light, gentle shadows',
        mood: 'minimal, calm, sophisticated',
        setting: 'indoor'
      },
      {
        id: 'min_beige_loc_002',
        name: 'Beige Minimal Desk',
        description: 'Beige minimal desk with coffee cup. Overhead view of calm workspace. Soft natural light.',
        lighting: 'soft natural light, gentle shadows',
        mood: 'minimal, focused, calm',
        setting: 'indoor'
      },
      {
        id: 'min_beige_loc_003',
        name: 'Beige Architectural Wall',
        description: 'Full-body against beige architectural wall. Clean minimal backdrop. Soft and calm.',
        lighting: 'soft natural daylight, gentle shadows',
        mood: 'architectural, minimal, calm',
        setting: 'outdoor'
      },
      {
        id: 'min_beige_loc_004',
        name: 'Minimal Beige Space',
        description: 'Beige minimal space with contemporary furniture. Clean lines and soft natural light.',
        lighting: 'soft natural light',
        mood: 'minimal, modern, calm',
        setting: 'indoor'
      },
      {
        id: 'min_beige_loc_005',
        name: 'Sand Colored Surface',
        description: 'Sand-colored surface with minimal elements. Soft and calm setting.',
        lighting: 'soft natural daylight',
        mood: 'minimal, calm, quiet',
        setting: 'indoor'
      }
    ],
    accessories: [
      {
        id: 'min_beige_acc_001',
        name: 'Minimal Beige Accessories',
        description: 'beige leather bag, minimal jewelry, beige accessories',
        items: ['beige leather bag', 'minimal jewelry', 'beige accessories', 'simple watch'],
        vibe: 'minimal_beige_aesthetic'
      },
      {
        id: 'min_beige_acc_002',
        name: 'Clean Minimal Set',
        description: 'minimal beige bag, simple jewelry, clean accessories',
        items: ['minimal beige bag', 'simple jewelry', 'clean accessories', 'minimal watch'],
        vibe: 'minimal_beige_aesthetic'
      },
      {
        id: 'min_beige_acc_003',
        name: 'Simple Beige',
        description: 'beige tote bag, minimal gold jewelry, simple accessories',
        items: ['beige tote bag', 'minimal gold jewelry', 'simple accessories', 'tan sunglasses'],
        vibe: 'minimal_beige_aesthetic'
      }
    ],
    colorPalette: [
      'neutral beiges (calm, minimal)',
      'sand tones (soft, elegant)',
      'warm beiges',
      'gentle shadows'
    ],
    textures: [
      'cotton (shirts, sweaters - simple)',
      'wool (blazers, coats - clean minimal)',
      'leather (bags, shoes - quality minimal)',
      'linen (shirts, trousers - relaxed minimal)'
    ]
  },

  beige_dark_moody: {
    vibe: 'beige_dark_moody',
    fashionStyles: {
      business: [
        {
          id: 'beige_dark_biz_001',
          name: 'Chocolate Brown Suit',
          description: 'Chocolate brown blazer, camel trousers, cream blouse, brown pumps',
          pieces: ['chocolate brown blazer', 'camel trousers', 'cream silk blouse', 'brown pumps'],
          occasion: 'luxury business, warm setting',
          brands: ['The Row', 'Toteme', 'Khaite']
        },
        {
          id: 'beige_dark_biz_002',
          name: 'Camel Power Dressing',
          description: 'Camel wool blazer, brown trousers, cream blouse, gold jewelry',
          pieces: ['camel wool blazer', 'brown tailored trousers', 'cream blouse', 'gold jewelry', 'brown heels'],
          occasion: 'executive setting, warm luxury',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'beige_dark_biz_003',
          name: 'Brown Tailored Suit',
          description: 'Brown tailored suit, camel silk blouse, tan pumps, gold jewelry',
          pieces: ['brown tailored suit', 'camel silk blouse', 'tan pumps', 'gold jewelry'],
          occasion: 'luxury business, warm setting',
          brands: ['The Row', 'Toteme', 'Khaite']
        },
        {
          id: 'beige_dark_biz_004',
          name: 'Camel Double-Breasted',
          description: 'Camel double-breasted blazer, matching trousers, cream button-down, brown boots',
          pieces: ['camel double-breasted blazer', 'matching camel trousers', 'cream button-down', 'brown boots', 'gold jewelry'],
          occasion: 'boardroom, high-stakes meeting',
          brands: ['The Row', 'Khaite', 'Toteme']
        }
      ],
      casual: [
        {
          id: 'beige_dark_cas_001',
          name: 'Chocolate Brown Casual',
          description: 'Chocolate brown coat, camel sweater, brown jeans, tan boots',
          pieces: ['chocolate brown wool coat', 'camel cashmere sweater', 'brown straight-leg jeans', 'tan leather boots'],
          occasion: 'luxury casual, cozy evening',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'beige_dark_cas_002',
          name: 'Camel Cozy',
          description: 'Camel cardigan, brown tee, camel pants, brown suede boots',
          pieces: ['camel cashmere cardigan', 'brown tee', 'camel trousers', 'brown suede boots'],
          occasion: 'casual luxury, relaxed',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'beige_dark_cas_003',
          name: 'Brown Oversized',
          description: 'Brown oversized blazer, camel tee, brown jeans, tan boots',
          pieces: ['brown oversized blazer', 'camel ribbed tank', 'brown straight-leg jeans', 'tan boots', 'brown tote'],
          occasion: 'evening casual, dinner, drinks',
          brands: ['The Row', 'Khaite', 'Toteme']
        },
        {
          id: 'beige_dark_cas_004',
          name: 'Camel Relaxed',
          description: 'Camel sweater, brown trousers, tan boots, warm bag',
          pieces: ['camel cashmere sweater', 'brown wide-leg trousers', 'tan leather boots', 'warm beige bag'],
          occasion: 'casual day out, warm setting',
          brands: ['The Row', 'Toteme']
        }
      ],
      bohemian: [
        {
          id: 'beige_dark_boh_001',
          name: 'Brown Flowy',
          description: 'Chocolate brown maxi dress, gold jewelry, brown sandals',
          pieces: ['chocolate brown flowy maxi dress', 'layered gold necklaces', 'brown sandals'],
          occasion: 'luxury bohemian, warm aesthetic',
          brands: ['Free People', 'Anthropologie']
        },
        {
          id: 'beige_dark_boh_002',
          name: 'Camel Midi Dress',
          description: 'Camel midi dress with flowy sleeves, layered gold necklaces, brown sandals',
          pieces: ['camel midi dress', 'layered gold necklaces', 'gold cuffs', 'brown sandals'],
          occasion: 'brunch, casual event, gallery',
          brands: ['Free People', 'Anthropologie', 'The Row']
        },
        {
          id: 'beige_dark_boh_003',
          name: 'Brown Layered Look',
          description: 'Brown kimono cardigan, camel slip dress, gold jewelry, brown sandals',
          pieces: ['brown kimono cardigan', 'camel slip dress', 'layered gold jewelry', 'brown sandals'],
          occasion: 'evening casual, creative gathering',
          brands: ['Free People', 'Anthropologie']
        }
      ],
      classic: [
        {
          id: 'beige_dark_cla_001',
          name: 'Timeless Brown',
          description: 'Chocolate brown coat, camel sweater, brown trousers, tan boots',
          pieces: ['chocolate brown coat', 'camel cashmere sweater', 'brown trousers', 'tan boots'],
          occasion: 'timeless elegance, warm luxury',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'beige_dark_cla_002',
          name: 'Brown Suit Classic',
          description: 'Brown tailored suit, camel blouse, tan heels, gold jewelry',
          pieces: ['brown tailored suit', 'camel silk blouse', 'tan heels', 'gold jewelry'],
          occasion: 'professional, timeless elegance',
          brands: ['The Row', 'Toteme', 'Khaite']
        },
        {
          id: 'beige_dark_cla_003',
          name: 'Camel Blazer Classic',
          description: 'Camel blazer, brown blouse, beige trousers, tan pumps',
          pieces: ['camel blazer', 'brown silk blouse', 'beige trousers', 'tan pumps'],
          occasion: 'classic elegance, refined setting',
          brands: ['The Row', 'Toteme']
        }
      ],
      trendy: [
        {
          id: 'beige_dark_tre_001',
          name: 'Modern Brown',
          description: 'Brown oversized blazer, camel bodysuit, brown trousers, tan boots',
          pieces: ['brown oversized blazer', 'camel bodysuit', 'brown wide-leg trousers', 'tan platform boots'],
          occasion: 'trendy luxury, warm aesthetic',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'beige_dark_tre_002',
          name: 'Cropped Statement',
          description: 'Cropped brown jacket, high-waisted camel trousers, tan sneakers, minimal gold jewelry',
          pieces: ['cropped brown jacket', 'high-waisted camel trousers', 'tan designer sneakers', 'minimal gold jewelry'],
          occasion: 'trendy casual, modern setting',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'beige_dark_tre_003',
          name: 'Oversized Chic',
          description: 'Oversized camel coat, brown tee, beige jeans, tan boots',
          pieces: ['oversized camel coat', 'brown ribbed tank', 'beige straight-leg jeans', 'tan ankle boots'],
          occasion: 'trendy day out, modern casual',
          brands: ['The Row', 'Toteme', 'Celine']
        }
      ],
      athletic: [
        {
          id: 'beige_dark_ath_001',
          name: 'Brown Athleisure',
          description: 'Brown athletic set, camel cardigan, tan sneakers',
          pieces: ['brown athletic set', 'camel cashmere cardigan', 'tan designer sneakers'],
          occasion: 'luxury athleisure, warm tones',
          brands: ['Alo', 'Lululemon', 'The Row']
        },
        {
          id: 'beige_dark_ath_002',
          name: 'Cozy Active Luxe',
          description: 'Chocolate leggings, camel ribbed top, oversized brown hoodie, gold watch',
          pieces: ['chocolate high-waisted leggings', 'camel ribbed sports bra', 'oversized brown cashmere hoodie', 'tan athletic sneakers', 'gold minimalist watch'],
          occasion: 'post-workout luxury, cozy active',
          brands: ['Alo', 'The Row', 'Outdoor Voices']
        },
        {
          id: 'beige_dark_ath_003',
          name: 'Brown Athletic Dress',
          description: 'Brown athletic dress, camel bomber jacket, tan sneakers, brown leather gym bag',
          pieces: ['brown athletic dress', 'camel bomber jacket', 'tan designer sneakers', 'brown leather gym bag'],
          occasion: 'athleisure lifestyle, warm luxury',
          brands: ['Alo', 'The Row', 'Lululemon']
        }
      ]
    },
    locations: [
      {
        id: 'beige_dark_loc_001',
        name: 'Evening City Street',
        description: 'Evening city street with warm street lamps. Chocolate brown and camel tones in background. Cozy autumn atmosphere with golden evening light.',
        lighting: 'evening golden hour, warm shadows',
        mood: 'warm, cozy, evening',
        setting: 'outdoor'
      },
      {
        id: 'beige_dark_loc_002',
        name: 'Warm Cafe Interior',
        description: 'Warm-lit cafe interior with brown leather furniture. Cozy atmosphere with evening ambiance. Chocolate brown and camel tones.',
        lighting: 'warm cafe lighting, cozy ambiance',
        mood: 'cozy, warm, intimate',
        setting: 'indoor'
      },
      {
        id: 'beige_dark_loc_003',
        name: 'Cozy Workspace',
        description: 'Cozy workspace with brown leather bag and coffee. Overhead view of warm desk. Evening atmosphere with warm lighting.',
        lighting: 'warm desk lamp, evening ambiance',
        mood: 'cozy, warm, focused',
        setting: 'indoor'
      },
      {
        id: 'beige_dark_loc_004',
        name: 'Autumn Street',
        description: 'Autumn street with fallen leaves. Warm brown and camel tones. Evening golden hour glow.',
        lighting: 'golden hour, warm shadows',
        mood: 'warm, autumn, cozy',
        setting: 'outdoor'
      },
      {
        id: 'beige_dark_loc_005',
        name: 'Warm Interior',
        description: 'Warm interior with brown walls and camel furniture. Cozy atmosphere with evening light.',
        lighting: 'warm interior lighting',
        mood: 'warm, cozy, intimate',
        setting: 'indoor'
      }
    ],
    accessories: [
      {
        id: 'beige_dark_acc_001',
        name: 'Gold Jewelry Warm Set',
        description: 'layered gold necklaces, gold cuffs, statement rings, warm tones',
        items: ['layered gold necklaces', 'gold cuffs', 'statement rings', 'gold watch'],
        vibe: 'beige_dark_moody'
      },
      {
        id: 'beige_dark_acc_002',
        name: 'Brown Leather Bag',
        description: 'brown leather bag, cognac accessories, gold jewelry, warm tones',
        items: ['brown leather bag', 'cognac accessories', 'gold jewelry', 'brown sunglasses'],
        vibe: 'beige_dark_moody'
      },
      {
        id: 'beige_dark_acc_003',
        name: 'Camel Accessories',
        description: 'camel leather bag, gold jewelry, brown accessories, warm aesthetic',
        items: ['camel leather bag', 'gold jewelry', 'brown accessories', 'tan accessories'],
        vibe: 'beige_dark_moody'
      }
    ],
    colorPalette: [
      'chocolate browns (rich, warm)',
      'camel tones (luxurious, cozy)',
      'taupe shadows',
      'golden evening light',
      'warm cozy tones'
    ],
    textures: [
      'cashmere (sweaters, coats - soft luxury)',
      'wool (blazers, coats - warm sophistication)',
      'leather (bags, boots - rich quality)',
      'suede (boots, bags - buttery soft)',
      'silk (blouses - refined elegance)'
    ]
  },

  beige_light_minimalistic: {
    vibe: 'beige_light_minimalistic',
    fashionStyles: {
      business: [
        {
          id: 'beige_light_biz_001',
          name: 'Cream Beige Suit',
          description: 'Cream blazer, sand trousers, white blouse, nude pumps',
          pieces: ['cream tailored blazer', 'sand trousers', 'white button-down', 'nude pumps'],
          occasion: 'luxury business, bright setting',
          brands: ['The Row', 'Toteme', 'Khaite']
        },
        {
          id: 'beige_light_biz_002',
          name: 'Sand Power Dressing',
          description: 'Sand wool blazer, cream trousers, white blouse, gold jewelry',
          pieces: ['sand wool blazer', 'cream tailored trousers', 'white blouse', 'gold jewelry', 'nude heels'],
          occasion: 'executive setting, coastal luxury',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'beige_light_biz_003',
          name: 'Cream Tailored Suit',
          description: 'Cream tailored suit, white silk blouse, nude pumps, gold jewelry',
          pieces: ['cream tailored suit', 'white silk blouse', 'nude pumps', 'gold jewelry'],
          occasion: 'luxury business, bright setting',
          brands: ['The Row', 'Toteme', 'Khaite']
        },
        {
          id: 'beige_light_biz_004',
          name: 'Sand Double-Breasted',
          description: 'Sand double-breasted blazer, matching trousers, white button-down, nude boots',
          pieces: ['sand double-breasted blazer', 'matching sand trousers', 'white button-down', 'nude boots', 'gold jewelry'],
          occasion: 'boardroom, high-stakes meeting',
          brands: ['The Row', 'Khaite', 'Toteme']
        }
      ],
      casual: [
        {
          id: 'beige_light_cas_001',
          name: 'Cream Coastal Casual',
          description: 'Cream linen dress, sand accessories, nude sandals',
          pieces: ['cream linen dress', 'sand cotton shirt', 'ivory wide-leg pants', 'nude sandals'],
          occasion: 'coastal casual, beach elegance',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'beige_light_cas_002',
          name: 'Sand Relaxed',
          description: 'Sand linen shirt, cream pants, tan sneakers',
          pieces: ['sand linen shirt', 'cream wide-leg pants', 'tan sneakers', 'cream tote'],
          occasion: 'casual luxury, relaxed',
          brands: ['The Row', 'COS']
        },
        {
          id: 'beige_light_cas_003',
          name: 'Cream Oversized',
          description: 'Cream oversized blazer, sand tee, cream jeans, nude sandals',
          pieces: ['cream oversized blazer', 'sand ribbed tank', 'cream straight-leg jeans', 'nude sandals', 'cream tote'],
          occasion: 'evening casual, dinner, drinks',
          brands: ['The Row', 'Khaite', 'Toteme']
        },
        {
          id: 'beige_light_cas_004',
          name: 'Sand Coastal',
          description: 'Sand sweater, cream trousers, nude sandals, coastal bag',
          pieces: ['sand cashmere sweater', 'cream wide-leg trousers', 'nude sandals', 'coastal beige bag'],
          occasion: 'casual day out, coastal setting',
          brands: ['The Row', 'Toteme']
        }
      ],
      bohemian: [
        {
          id: 'beige_light_boh_001',
          name: 'Cream Flowy',
          description: 'Cream maxi dress, minimal gold jewelry, nude sandals',
          pieces: ['cream flowy maxi dress', 'minimal gold jewelry', 'nude sandals'],
          occasion: 'coastal bohemian, beach elegance',
          brands: ['Free People', 'Anthropologie']
        },
        {
          id: 'beige_light_boh_002',
          name: 'Sand Midi Dress',
          description: 'Sand midi dress with flowy sleeves, layered gold necklaces, nude sandals',
          pieces: ['sand midi dress', 'layered gold necklaces', 'gold cuffs', 'nude sandals'],
          occasion: 'brunch, casual event, gallery',
          brands: ['Free People', 'Anthropologie', 'The Row']
        },
        {
          id: 'beige_light_boh_003',
          name: 'Cream Layered Look',
          description: 'Cream kimono cardigan, sand slip dress, gold jewelry, nude sandals',
          pieces: ['cream kimono cardigan', 'sand slip dress', 'layered gold jewelry', 'nude sandals'],
          occasion: 'evening casual, creative gathering',
          brands: ['Free People', 'Anthropologie']
        }
      ],
      classic: [
        {
          id: 'beige_light_cla_001',
          name: 'Timeless Cream',
          description: 'Cream blazer, white blouse, sand trousers, nude pumps',
          pieces: ['cream blazer', 'white blouse', 'sand trousers', 'nude pumps'],
          occasion: 'timeless elegance, coastal luxury',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'beige_light_cla_002',
          name: 'Sand Coat Classic',
          description: 'Sand wool coat, cream sweater, beige trousers, tan boots',
          pieces: ['sand wool coat', 'cream cashmere sweater', 'beige trousers', 'tan leather boots'],
          occasion: 'classic elegance, refined setting',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'beige_light_cla_003',
          name: 'Cream Suit Classic',
          description: 'Cream tailored suit, white blouse, nude heels, gold jewelry',
          pieces: ['cream tailored suit', 'white silk blouse', 'nude heels', 'gold jewelry'],
          occasion: 'professional, timeless elegance',
          brands: ['The Row', 'Toteme', 'Khaite']
        }
      ],
      trendy: [
        {
          id: 'beige_light_tre_001',
          name: 'Modern Cream',
          description: 'Cream oversized blazer, sand bodysuit, ivory trousers, tan boots',
          pieces: ['cream oversized blazer', 'sand bodysuit', 'ivory wide-leg trousers', 'tan platform boots'],
          occasion: 'trendy coastal, modern luxury',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'beige_light_tre_002',
          name: 'Cropped Statement',
          description: 'Cropped cream jacket, high-waisted sand trousers, tan sneakers, minimal gold jewelry',
          pieces: ['cropped cream jacket', 'high-waisted sand trousers', 'tan designer sneakers', 'minimal gold jewelry'],
          occasion: 'trendy casual, modern setting',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'beige_light_tre_003',
          name: 'Oversized Chic',
          description: 'Oversized sand coat, cream tee, beige jeans, tan boots',
          pieces: ['oversized sand coat', 'cream ribbed tank', 'beige straight-leg jeans', 'tan ankle boots'],
          occasion: 'trendy day out, modern casual',
          brands: ['The Row', 'Toteme', 'Celine']
        }
      ],
      athletic: [
        {
          id: 'beige_light_ath_001',
          name: 'Cream Athleisure',
          description: 'Cream athletic set, sand cardigan, tan sneakers',
          pieces: ['cream athletic set', 'sand cardigan', 'tan designer sneakers'],
          occasion: 'coastal athleisure, luxury active',
          brands: ['Alo', 'Lululemon', 'The Row']
        },
        {
          id: 'beige_light_ath_002',
          name: 'Coastal Active Luxe',
          description: 'Sand leggings, cream ribbed top, oversized tan hoodie, gold jewelry',
          pieces: ['sand high-waisted leggings', 'cream ribbed sports bra', 'oversized tan cashmere hoodie', 'nude athletic sneakers', 'gold jewelry'],
          occasion: 'post-workout luxury, coastal active',
          brands: ['Alo', 'The Row', 'Outdoor Voices']
        },
        {
          id: 'beige_light_ath_003',
          name: 'Cream Athletic Dress',
          description: 'Cream athletic dress, sand bomber jacket, tan sneakers, tan leather gym bag',
          pieces: ['cream athletic dress', 'sand bomber jacket', 'tan designer sneakers', 'tan leather gym bag'],
          occasion: 'athleisure lifestyle, coastal luxury',
          brands: ['Alo', 'The Row', 'Lululemon']
        }
      ]
    },
    locations: [
      {
        id: 'beige_light_loc_001',
        name: 'Bright Beach House',
        description: 'Bright beach house interior with white-washed walls and natural light. Coastal elegance with sand and cream tones. Airy and sophisticated.',
        lighting: 'bright coastal daylight, soft shadows',
        mood: 'coastal, bright, elegant',
        setting: 'indoor'
      },
      {
        id: 'beige_light_loc_002',
        name: 'Coastal Cafe',
        description: 'Coastal cafe with white table and natural light. Bright and airy setting with beach elegance.',
        lighting: 'bright natural light, coastal glow',
        mood: 'coastal, bright, airy',
        setting: 'indoor'
      },
      {
        id: 'beige_light_loc_003',
        name: 'Sandy Beach Background',
        description: 'Full-body with sandy beach background. Bright coastal daylight. Ocean visible in distance.',
        lighting: 'bright coastal daylight',
        mood: 'coastal, bright, beach',
        setting: 'outdoor'
      },
      {
        id: 'beige_light_loc_004',
        name: 'White-Washed Architecture',
        description: 'White-washed architectural backdrop. Bright natural light. Coastal sophistication.',
        lighting: 'bright natural daylight',
        mood: 'architectural, coastal, bright',
        setting: 'outdoor'
      },
      {
        id: 'beige_light_loc_005',
        name: 'Bright Workspace',
        description: 'Bright workspace with iced coffee. Overhead view of coastal desk. Natural light flooding in.',
        lighting: 'bright natural daylight',
        mood: 'coastal, bright, focused',
        setting: 'indoor'
      }
    ],
    accessories: [
      {
        id: 'beige_light_acc_001',
        name: 'Minimal Gold Coastal',
        description: 'minimal gold jewelry, woven cream bag, nude sandals, coastal accessories',
        items: ['minimal gold jewelry', 'woven cream bag', 'nude sandals', 'coastal accessories'],
        vibe: 'beige_light_minimalistic'
      },
      {
        id: 'beige_light_acc_002',
        name: 'Cream Designer Bag',
        description: 'cream leather bag, minimal gold jewelry, tan accessories, coastal elegance',
        items: ['cream leather bag', 'minimal gold jewelry', 'tan accessories', 'cream sunglasses'],
        vibe: 'beige_light_minimalistic'
      },
      {
        id: 'beige_light_acc_003',
        name: 'Sand Accessories',
        description: 'sand tote bag, gold jewelry, cream accessories, coastal minimal',
        items: ['sand tote bag', 'gold jewelry', 'cream accessories', 'tan accessories'],
        vibe: 'beige_light_minimalistic'
      }
    ],
    colorPalette: [
      'bright creams (coastal, elegant)',
      'sand tones (soft, beach)',
      'ivory highlights',
      'coastal natural light',
      'soft breezy shadows'
    ],
    textures: [
      'linen (dresses, shirts - coastal luxury)',
      'cotton (shirts, pants - relaxed elegance)',
      'leather (bags, sandals - quality coastal)',
      'woven (bags - beach elegance)',
      'silk (dresses - refined coastal)'
    ]
  },

  beige_beige_aesthetic: {
    vibe: 'beige_beige_aesthetic',
    fashionStyles: {
      business: [
        {
          id: 'beige_beige_biz_001',
          name: 'Camel Classic Suit',
          description: 'Camel blazer, tan trousers, cream blouse, nude pumps',
          pieces: ['camel tailored blazer', 'tan trousers', 'cream silk blouse', 'nude pumps'],
          occasion: 'classic business, timeless elegance',
          brands: ['The Row', 'Toteme', 'Khaite']
        },
        {
          id: 'beige_beige_biz_002',
          name: 'Beige Tailored',
          description: 'Beige wool blazer, camel trousers, cream blouse, gold jewelry',
          pieces: ['beige wool blazer', 'camel tailored trousers', 'cream blouse', 'gold jewelry', 'nude heels'],
          occasion: 'timeless business, classic elegance',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'beige_beige_biz_003',
          name: 'Camel Tailored Suit',
          description: 'Camel tailored suit, cream silk blouse, tan pumps, gold jewelry',
          pieces: ['camel tailored suit', 'cream silk blouse', 'tan pumps', 'gold jewelry'],
          occasion: 'classic business, timeless elegance',
          brands: ['The Row', 'Toteme', 'Khaite']
        },
        {
          id: 'beige_beige_biz_004',
          name: 'Beige Double-Breasted',
          description: 'Beige double-breasted blazer, matching trousers, cream button-down, tan boots',
          pieces: ['beige double-breasted blazer', 'matching beige trousers', 'cream button-down', 'tan boots', 'gold jewelry'],
          occasion: 'boardroom, high-stakes meeting',
          brands: ['The Row', 'Khaite', 'Toteme']
        }
      ],
      casual: [
        {
          id: 'beige_beige_cas_001',
          name: 'Camel Knit Classic',
          description: 'Camel knit sweater, tan pants, gold jewelry, nude heels',
          pieces: ['camel knit sweater', 'tan trousers', 'layered gold jewelry', 'nude heels', 'tan leather bag'],
          occasion: 'classic casual, timeless elegance',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'beige_beige_cas_002',
          name: 'Beige Linen Classic',
          description: 'Beige linen shirt, cream pants, tan sandals',
          pieces: ['beige linen shirt', 'cream wide-leg pants', 'tan sandals', 'camel bag'],
          occasion: 'classic casual, European elegance',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'beige_beige_cas_003',
          name: 'Camel Oversized',
          description: 'Camel oversized blazer, beige tee, tan jeans, tan sandals',
          pieces: ['camel oversized blazer', 'beige ribbed tank', 'tan straight-leg jeans', 'tan sandals', 'camel bag'],
          occasion: 'evening casual, dinner, drinks',
          brands: ['The Row', 'Khaite', 'Toteme']
        },
        {
          id: 'beige_beige_cas_004',
          name: 'Beige Classic',
          description: 'Beige sweater, camel trousers, tan boots, classic bag',
          pieces: ['beige cashmere sweater', 'camel wide-leg trousers', 'tan leather boots', 'classic beige bag'],
          occasion: 'casual day out, timeless setting',
          brands: ['The Row', 'Toteme']
        }
      ],
      bohemian: [
        {
          id: 'beige_beige_boh_001',
          name: 'Camel Flowy',
          description: 'Camel maxi dress, layered gold jewelry, tan sandals',
          pieces: ['camel flowy maxi dress', 'layered gold necklaces', 'tan sandals'],
          occasion: 'classic bohemian, timeless elegance',
          brands: ['Free People', 'Anthropologie']
        },
        {
          id: 'beige_beige_boh_002',
          name: 'Beige Midi Dress',
          description: 'Beige midi dress with flowy sleeves, layered gold necklaces, tan sandals',
          pieces: ['beige midi dress', 'layered gold necklaces', 'gold cuffs', 'tan sandals'],
          occasion: 'brunch, casual event, gallery',
          brands: ['Free People', 'Anthropologie', 'The Row']
        },
        {
          id: 'beige_beige_boh_003',
          name: 'Camel Layered Look',
          description: 'Camel kimono cardigan, beige slip dress, gold jewelry, tan sandals',
          pieces: ['camel kimono cardigan', 'beige slip dress', 'layered gold jewelry', 'tan sandals'],
          occasion: 'evening casual, creative gathering',
          brands: ['Free People', 'Anthropologie']
        }
      ],
      classic: [
        {
          id: 'beige_beige_cla_001',
          name: 'Timeless Camel',
          description: 'Camel coat, cream sweater, beige trousers, tan boots',
          pieces: ['camel wool coat', 'cream cashmere sweater', 'beige trousers', 'tan leather boots'],
          occasion: 'timeless elegance, classic luxury',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'beige_beige_cla_002',
          name: 'Beige Suit Classic',
          description: 'Beige tailored suit, cream blouse, tan heels, gold jewelry',
          pieces: ['beige tailored suit', 'cream silk blouse', 'tan heels', 'gold jewelry'],
          occasion: 'professional, timeless elegance',
          brands: ['The Row', 'Toteme', 'Khaite']
        },
        {
          id: 'beige_beige_cla_003',
          name: 'Camel Blazer Classic',
          description: 'Camel blazer, beige blouse, cream trousers, nude pumps',
          pieces: ['camel blazer', 'beige silk blouse', 'cream trousers', 'nude pumps'],
          occasion: 'classic elegance, refined setting',
          brands: ['The Row', 'Toteme']
        }
      ],
      trendy: [
        {
          id: 'beige_beige_tre_001',
          name: 'Modern Camel',
          description: 'Camel oversized blazer, beige bodysuit, tan trousers, camel boots',
          pieces: ['camel oversized blazer', 'beige bodysuit', 'tan wide-leg trousers', 'camel platform boots'],
          occasion: 'trendy classic, modern elegance',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'beige_beige_tre_002',
          name: 'Cropped Statement',
          description: 'Cropped camel jacket, high-waisted beige trousers, tan sneakers, minimal gold jewelry',
          pieces: ['cropped camel jacket', 'high-waisted beige trousers', 'tan designer sneakers', 'minimal gold jewelry'],
          occasion: 'trendy casual, modern setting',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'beige_beige_tre_003',
          name: 'Oversized Chic',
          description: 'Oversized tan coat, beige tee, camel jeans, tan boots',
          pieces: ['oversized tan coat', 'beige ribbed tank', 'camel straight-leg jeans', 'tan ankle boots'],
          occasion: 'trendy day out, modern casual',
          brands: ['The Row', 'Toteme', 'Celine']
        }
      ],
      athletic: [
        {
          id: 'beige_beige_ath_001',
          name: 'Camel Athleisure',
          description: 'Camel athletic set, beige cardigan, tan sneakers',
          pieces: ['camel athletic set', 'beige cashmere cardigan', 'tan designer sneakers'],
          occasion: 'classic athleisure, timeless active',
          brands: ['Alo', 'Lululemon', 'The Row']
        },
        {
          id: 'beige_beige_ath_002',
          name: 'Classic Active Luxe',
          description: 'Camel leggings, beige ribbed top, oversized tan hoodie, gold watch',
          pieces: ['camel high-waisted leggings', 'beige ribbed sports bra', 'oversized tan cashmere hoodie', 'nude athletic sneakers', 'gold minimalist watch'],
          occasion: 'post-workout luxury, active lifestyle',
          brands: ['Alo', 'The Row', 'Outdoor Voices']
        },
        {
          id: 'beige_beige_ath_003',
          name: 'Tan Athletic Dress',
          description: 'Tan athletic dress, camel bomber jacket, beige sneakers, tan leather gym bag',
          pieces: ['tan athletic dress', 'camel bomber jacket', 'beige designer sneakers', 'tan leather gym bag'],
          occasion: 'athleisure lifestyle, luxury active',
          brands: ['Alo', 'The Row', 'Lululemon']
        }
      ]
    },
    locations: [
      {
        id: 'beige_beige_loc_001',
        name: 'Beige Townhouse',
        description: 'Beige townhouse exterior with classic architecture. Natural London daylight. Timeless elegance with warm beige tones.',
        lighting: 'natural London daylight, soft shadows',
        mood: 'classic, elegant, timeless',
        setting: 'outdoor'
      },
      {
        id: 'beige_beige_loc_002',
        name: 'Classic Cafe',
        description: 'Classic cafe with neutral modern design. Warm beige and camel tones. Timeless sophistication.',
        lighting: 'warm natural light, soft shadows',
        mood: 'classic, warm, elegant',
        setting: 'indoor'
      },
      {
        id: 'beige_beige_loc_003',
        name: 'Neutral Hallway',
        description: 'Full-body in neutral hallway with beige walls. Classic European architecture. Timeless elegance.',
        lighting: 'natural daylight, soft shadows',
        mood: 'classic, elegant, timeless',
        setting: 'indoor'
      },
      {
        id: 'beige_beige_loc_004',
        name: 'Classic Workspace',
        description: 'Classic workspace with coffee and tan notebook. Overhead view of timeless desk. Warm natural light.',
        lighting: 'warm natural daylight',
        mood: 'classic, focused, elegant',
        setting: 'indoor'
      },
      {
        id: 'beige_beige_loc_005',
        name: 'Beige Stone Wall',
        description: 'Beige stone wall with classic architecture. Natural afternoon light. Timeless backdrop.',
        lighting: 'natural afternoon light, soft shadows',
        mood: 'architectural, classic, elegant',
        setting: 'outdoor'
      }
    ],
    accessories: [
      {
        id: 'beige_beige_acc_001',
        name: 'Classic Gold Jewelry',
        description: 'layered gold necklaces, gold watch, classic rings, pearl studs',
        items: ['layered gold necklaces', 'gold watch', 'classic rings', 'pearl studs'],
        vibe: 'beige_beige_aesthetic'
      },
      {
        id: 'beige_beige_acc_002',
        name: 'Tan Leather Classic',
        description: 'tan leather bag, gold jewelry, classic accessories, timeless elegance',
        items: ['tan leather bag', 'gold jewelry', 'classic accessories', 'tan sunglasses'],
        vibe: 'beige_beige_aesthetic'
      },
      {
        id: 'beige_beige_acc_003',
        name: 'Camel Accessories',
        description: 'camel leather bag, gold jewelry, beige accessories, classic elegance',
        items: ['camel leather bag', 'gold jewelry', 'beige accessories', 'classic accessories'],
        vibe: 'beige_beige_aesthetic'
      }
    ],
    colorPalette: [
      'warm camels (timeless, elegant)',
      'classic beiges (sophisticated)',
      'cream highlights',
      'natural London daylight',
      'gentle shadows'
    ],
    textures: [
      'cashmere (sweaters, coats - timeless luxury)',
      'wool (blazers, tailoring - classic sophistication)',
      'leather (bags, boots - quality classic)',
      'linen (shirts, trousers - relaxed elegance)',
      'silk (blouses - refined classic)'
    ]
  },

  warm_dark_moody: {
    vibe: 'warm_dark_moody',
    fashionStyles: {
      business: [
        {
          id: 'warm_dark_biz_001',
          name: 'Rust Power Suit',
          description: 'Rust blazer, burgundy trousers, cream blouse, cognac pumps',
          pieces: ['rust wool blazer', 'burgundy trousers', 'cream silk blouse', 'cognac pumps'],
          occasion: 'warm business, Italian elegance',
          brands: ['The Row', 'Toteme', 'Khaite']
        },
        {
          id: 'warm_dark_biz_002',
          name: 'Burgundy Power Dressing',
          description: 'Burgundy wool blazer, rust trousers, terracotta blouse, gold jewelry',
          pieces: ['burgundy wool blazer', 'rust tailored trousers', 'terracotta blouse', 'gold jewelry', 'cognac heels'],
          occasion: 'executive setting, warm luxury',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'warm_dark_biz_003',
          name: 'Rust Tailored Suit',
          description: 'Rust tailored suit, burgundy silk blouse, cognac pumps, gold jewelry',
          pieces: ['rust tailored suit', 'burgundy silk blouse', 'cognac pumps', 'gold jewelry'],
          occasion: 'warm business, Italian elegance',
          brands: ['The Row', 'Toteme', 'Khaite']
        },
        {
          id: 'warm_dark_biz_004',
          name: 'Burgundy Double-Breasted',
          description: 'Burgundy double-breasted blazer, matching trousers, cream button-down, cognac boots',
          pieces: ['burgundy double-breasted blazer', 'matching burgundy trousers', 'cream button-down', 'cognac boots', 'gold jewelry'],
          occasion: 'boardroom, high-stakes meeting',
          brands: ['The Row', 'Khaite', 'Toteme']
        }
      ],
      casual: [
        {
          id: 'warm_dark_cas_001',
          name: 'Rust Cozy Casual',
          description: 'Rust knit sweater, burgundy dress underneath, chocolate coat, cognac boots',
          pieces: ['rust knit sweater', 'burgundy dress', 'chocolate brown coat', 'cognac boots'],
          occasion: 'warm casual, cozy evening',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'warm_dark_cas_002',
          name: 'Burgundy Relaxed',
          description: 'Burgundy cardigan, terracotta top, brown pants, cognac boots',
          pieces: ['burgundy cardigan', 'terracotta top', 'brown pants', 'cognac boots'],
          occasion: 'warm casual, Italian vibe',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'warm_dark_cas_003',
          name: 'Rust Oversized',
          description: 'Rust oversized blazer, burgundy tee, brown jeans, cognac boots',
          pieces: ['rust oversized blazer', 'burgundy ribbed tank', 'brown straight-leg jeans', 'cognac boots', 'warm tote'],
          occasion: 'evening casual, dinner, drinks',
          brands: ['The Row', 'Khaite', 'Toteme']
        },
        {
          id: 'warm_dark_cas_004',
          name: 'Burgundy Cozy',
          description: 'Burgundy sweater, rust trousers, cognac boots, warm bag',
          pieces: ['burgundy cashmere sweater', 'rust wide-leg trousers', 'cognac leather boots', 'warm brown bag'],
          occasion: 'casual day out, warm setting',
          brands: ['The Row', 'Toteme']
        }
      ],
      bohemian: [
        {
          id: 'warm_dark_boh_001',
          name: 'Burgundy Flowy',
          description: 'Burgundy maxi dress, gold jewelry, cognac sandals',
          pieces: ['burgundy flowy maxi dress', 'layered gold necklaces', 'cognac sandals'],
          occasion: 'warm bohemian, romantic',
          brands: ['Free People', 'Anthropologie']
        },
        {
          id: 'warm_dark_boh_002',
          name: 'Terracotta Midi Dress',
          description: 'Terracotta midi dress with flowy sleeves, layered gold necklaces, cognac sandals',
          pieces: ['terracotta midi dress', 'layered gold necklaces', 'gold cuffs', 'cognac sandals'],
          occasion: 'brunch, casual event, gallery',
          brands: ['Free People', 'Anthropologie', 'The Row']
        },
        {
          id: 'warm_dark_boh_003',
          name: 'Burgundy Layered Look',
          description: 'Burgundy kimono cardigan, terracotta slip dress, gold jewelry, cognac sandals',
          pieces: ['burgundy kimono cardigan', 'terracotta slip dress', 'layered gold jewelry', 'cognac sandals'],
          occasion: 'evening casual, creative gathering',
          brands: ['Free People', 'Anthropologie']
        }
      ],
      classic: [
        {
          id: 'warm_dark_cla_001',
          name: 'Timeless Rust',
          description: 'Rust coat, burgundy sweater, brown trousers, cognac boots',
          pieces: ['rust wool coat', 'burgundy cashmere sweater', 'brown trousers', 'cognac boots'],
          occasion: 'timeless warmth, Italian elegance',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'warm_dark_cla_002',
          name: 'Burgundy Suit Classic',
          description: 'Burgundy tailored suit, terracotta blouse, cognac heels, gold jewelry',
          pieces: ['burgundy tailored suit', 'terracotta silk blouse', 'cognac heels', 'gold jewelry'],
          occasion: 'professional, timeless elegance',
          brands: ['The Row', 'Toteme', 'Khaite']
        },
        {
          id: 'warm_dark_cla_003',
          name: 'Rust Blazer Classic',
          description: 'Rust blazer, burgundy blouse, brown trousers, cognac pumps',
          pieces: ['rust blazer', 'burgundy silk blouse', 'brown trousers', 'cognac pumps'],
          occasion: 'classic elegance, refined setting',
          brands: ['The Row', 'Toteme']
        }
      ],
      trendy: [
        {
          id: 'warm_dark_tre_001',
          name: 'Modern Warm',
          description: 'Burgundy oversized blazer, terracotta bodysuit, rust trousers, cognac boots',
          pieces: ['burgundy oversized blazer', 'terracotta bodysuit', 'rust wide-leg trousers', 'cognac platform boots'],
          occasion: 'trendy warm, modern Italian',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'warm_dark_tre_002',
          name: 'Cropped Statement',
          description: 'Cropped burgundy jacket, high-waisted rust trousers, cognac sneakers, gold jewelry',
          pieces: ['cropped burgundy jacket', 'high-waisted rust trousers', 'cognac designer sneakers', 'gold jewelry'],
          occasion: 'trendy casual, modern setting',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'warm_dark_tre_003',
          name: 'Oversized Chic',
          description: 'Oversized rust coat, burgundy tee, brown jeans, cognac boots',
          pieces: ['oversized rust coat', 'burgundy ribbed tank', 'brown straight-leg jeans', 'cognac ankle boots'],
          occasion: 'trendy day out, modern casual',
          brands: ['The Row', 'Toteme', 'Celine']
        }
      ],
      athletic: [
        {
          id: 'warm_dark_ath_001',
          name: 'Warm Athleisure',
          description: 'Burgundy athletic set, rust cardigan, cognac sneakers',
          pieces: ['burgundy athletic set', 'rust cashmere cardigan', 'cognac designer sneakers'],
          occasion: 'warm athleisure, Italian active',
          brands: ['Alo', 'Lululemon', 'The Row']
        },
        {
          id: 'warm_dark_ath_002',
          name: 'Italian Active Luxe',
          description: 'Burgundy leggings, terracotta ribbed top, oversized rust hoodie, gold watch',
          pieces: ['burgundy high-waisted leggings', 'terracotta ribbed sports bra', 'oversized rust cashmere hoodie', 'cognac athletic sneakers', 'gold minimalist watch'],
          occasion: 'post-workout luxury, Italian active',
          brands: ['Alo', 'The Row', 'Outdoor Voices']
        },
        {
          id: 'warm_dark_ath_003',
          name: 'Burgundy Athletic Dress',
          description: 'Burgundy athletic dress, rust bomber jacket, cognac sneakers, brown leather gym bag',
          pieces: ['burgundy athletic dress', 'rust bomber jacket', 'cognac designer sneakers', 'brown leather gym bag'],
          occasion: 'athleisure lifestyle, warm luxury',
          brands: ['Alo', 'The Row', 'Lululemon']
        }
      ]
    },
    locations: [
      {
        id: 'warm_dark_loc_001',
        name: 'Evening Italian Street',
        description: 'Evening Italian street with warm-lit trattorias. Rust and burgundy tones. Romantic atmosphere with warm evening glow.',
        lighting: 'warm Italian evening light, romantic glow',
        mood: 'warm, romantic, evening',
        setting: 'outdoor'
      },
      {
        id: 'warm_dark_loc_002',
        name: 'Warm Wine Bar',
        description: 'Cozy wine bar with warm lighting. Rust and burgundy tones. Intimate atmosphere with candlelit ambiance.',
        lighting: 'warm candlelit atmosphere, romantic',
        mood: 'warm, intimate, romantic',
        setting: 'indoor'
      },
      {
        id: 'warm_dark_loc_003',
        name: 'Cozy Evening Setup',
        description: 'Cozy evening setup with wine and journal. Overhead view of warm workspace. Candlelit atmosphere.',
        lighting: 'warm candlelight, evening ambiance',
        mood: 'warm, cozy, intimate',
        setting: 'indoor'
      },
      {
        id: 'warm_dark_loc_004',
        name: 'Sunset Architecture',
        description: 'Terracotta architecture at sunset. Warm Italian tones. Golden hour warmth.',
        lighting: 'sunset warm light, golden hour',
        mood: 'warm, romantic, sunset',
        setting: 'outdoor'
      },
      {
        id: 'warm_dark_loc_005',
        name: 'Warm Interior',
        description: 'Warm interior with rust walls and burgundy furniture. Cozy atmosphere with evening light.',
        lighting: 'warm interior lighting, romantic',
        mood: 'warm, cozy, intimate',
        setting: 'indoor'
      }
    ],
    accessories: [
      {
        id: 'warm_dark_acc_001',
        name: 'Gold Jewelry Warm',
        description: 'layered gold necklaces, gold cuffs, statement rings, warm romantic',
        items: ['layered gold necklaces', 'gold cuffs', 'statement rings', 'gold watch'],
        vibe: 'warm_dark_moody'
      },
      {
        id: 'warm_dark_acc_002',
        name: 'Cognac Leather',
        description: 'cognac leather bag, gold jewelry, burgundy accessories, warm tones',
        items: ['cognac leather bag', 'gold jewelry', 'burgundy accessories', 'warm-toned items'],
        vibe: 'warm_dark_moody'
      },
      {
        id: 'warm_dark_acc_003',
        name: 'Rust Accessories',
        description: 'rust accessories, gold jewelry, burgundy bag, warm aesthetic',
        items: ['rust accessories', 'gold jewelry', 'burgundy bag', 'cognac accessories'],
        vibe: 'warm_dark_moody'
      }
    ],
    colorPalette: [
      'rich rusts (warm, romantic)',
      'deep burgundy (intimate, warm)',
      'chocolate browns',
      'golden evening light',
      'warm romantic shadows'
    ],
    textures: [
      'cashmere (sweaters, coats - soft warmth)',
      'wool (blazers, coats - warm sophistication)',
      'leather (bags, boots - rich quality)',
      'velvet (dresses - romantic luxury)',
      'silk (blouses - refined warmth)'
    ]
  },

  warm_light_minimalistic: {
    vibe: 'warm_light_minimalistic',
    fashionStyles: {
      business: [
        {
          id: 'warm_light_biz_001',
          name: 'Ivory Warm Suit',
          description: 'Ivory blazer, cream trousers, white blouse, nude pumps',
          pieces: ['ivory tailored blazer', 'cream trousers', 'white button-down', 'nude pumps'],
          occasion: 'warm business, bright setting',
          brands: ['The Row', 'Toteme', 'Khaite']
        },
        {
          id: 'warm_light_biz_002',
          name: 'Cream Power Dressing',
          description: 'Cream wool blazer, ivory trousers, white blouse, gold jewelry',
          pieces: ['cream wool blazer', 'ivory tailored trousers', 'white blouse', 'gold jewelry', 'nude heels'],
          occasion: 'executive setting, zen luxury',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'warm_light_biz_003',
          name: 'Ivory Tailored Suit',
          description: 'Ivory tailored suit, white silk blouse, nude pumps, gold jewelry',
          pieces: ['ivory tailored suit', 'white silk blouse', 'nude pumps', 'gold jewelry'],
          occasion: 'warm business, bright setting',
          brands: ['The Row', 'Toteme', 'Khaite']
        },
        {
          id: 'warm_light_biz_004',
          name: 'Cream Double-Breasted',
          description: 'Cream double-breasted blazer, matching trousers, white button-down, beige boots',
          pieces: ['cream double-breasted blazer', 'matching cream trousers', 'white button-down', 'beige boots', 'gold jewelry'],
          occasion: 'boardroom, high-stakes meeting',
          brands: ['The Row', 'Khaite', 'Toteme']
        }
      ],
      casual: [
        {
          id: 'warm_light_cas_001',
          name: 'Ivory Japanese Casual',
          description: 'Ivory oversized shirt, cream wide-leg pants, white sneakers',
          pieces: ['ivory oversized shirt', 'cream wide-leg pants', 'white minimal dresses', 'white sneakers'],
          occasion: 'bright casual, zen warmth',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'warm_light_cas_002',
          name: 'Cream Relaxed',
          description: 'Cream cardigan, white tee, cream pants, white sneakers',
          pieces: ['cream knit cardigan', 'white tee', 'cream trousers', 'white sneakers'],
          occasion: 'warm casual, relaxed',
          brands: ['The Row', 'COS']
        },
        {
          id: 'warm_light_cas_003',
          name: 'Ivory Oversized',
          description: 'Ivory oversized blazer, cream tee, white jeans, beige sandals',
          pieces: ['ivory oversized blazer', 'cream ribbed tank', 'white straight-leg jeans', 'beige sandals', 'warm tote'],
          occasion: 'evening casual, dinner, drinks',
          brands: ['The Row', 'Khaite', 'Toteme']
        },
        {
          id: 'warm_light_cas_004',
          name: 'Cream Zen',
          description: 'Cream sweater, ivory trousers, nude sandals, warm bag',
          pieces: ['cream cashmere sweater', 'ivory wide-leg trousers', 'nude sandals', 'warm beige bag'],
          occasion: 'casual day out, zen setting',
          brands: ['The Row', 'Toteme']
        }
      ],
      bohemian: [
        {
          id: 'warm_light_boh_001',
          name: 'Ivory Flowy',
          description: 'Ivory maxi dress, minimal gold jewelry, white sandals',
          pieces: ['ivory flowy maxi dress', 'minimal gold jewelry', 'white sandals'],
          occasion: 'warm bohemian, zen simplicity',
          brands: ['Free People', 'Anthropologie']
        },
        {
          id: 'warm_light_boh_002',
          name: 'Cream Midi Dress',
          description: 'Cream midi dress with flowy sleeves, layered gold necklaces, white sandals',
          pieces: ['cream midi dress', 'layered gold necklaces', 'gold cuffs', 'white sandals'],
          occasion: 'brunch, casual event, gallery',
          brands: ['Free People', 'Anthropologie', 'The Row']
        },
        {
          id: 'warm_light_boh_003',
          name: 'Ivory Layered Look',
          description: 'Ivory kimono cardigan, cream slip dress, gold jewelry, beige sandals',
          pieces: ['ivory kimono cardigan', 'cream slip dress', 'layered gold jewelry', 'beige sandals'],
          occasion: 'evening casual, creative gathering',
          brands: ['Free People', 'Anthropologie']
        }
      ],
      classic: [
        {
          id: 'warm_light_cla_001',
          name: 'Timeless Ivory',
          description: 'Ivory coat, cream sweater, white trousers, nude pumps',
          pieces: ['ivory wool coat', 'cream cashmere sweater', 'white trousers', 'nude pumps'],
          occasion: 'timeless warmth, zen elegance',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'warm_light_cla_002',
          name: 'Cream Suit Classic',
          description: 'Cream tailored suit, white blouse, nude heels, gold jewelry',
          pieces: ['cream tailored suit', 'white silk blouse', 'nude heels', 'gold jewelry'],
          occasion: 'professional, timeless elegance',
          brands: ['The Row', 'Toteme', 'Khaite']
        },
        {
          id: 'warm_light_cla_003',
          name: 'Ivory Blazer Classic',
          description: 'Ivory blazer, cream blouse, white trousers, beige pumps',
          pieces: ['ivory blazer', 'cream silk blouse', 'white trousers', 'beige pumps'],
          occasion: 'classic elegance, refined setting',
          brands: ['The Row', 'Toteme']
        }
      ],
      trendy: [
        {
          id: 'warm_light_tre_001',
          name: 'Modern Warm',
          description: 'Ivory oversized blazer, white bodysuit, cream trousers, white boots',
          pieces: ['ivory oversized blazer', 'white bodysuit', 'cream wide-leg trousers', 'white platform boots'],
          occasion: 'trendy warm, modern zen',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'warm_light_tre_002',
          name: 'Cropped Statement',
          description: 'Cropped ivory jacket, high-waisted cream trousers, white sneakers, gold jewelry',
          pieces: ['cropped ivory jacket', 'high-waisted cream trousers', 'white designer sneakers', 'gold jewelry'],
          occasion: 'trendy casual, modern setting',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'warm_light_tre_003',
          name: 'Oversized Chic',
          description: 'Oversized cream coat, white tee, ivory jeans, beige boots',
          pieces: ['oversized cream coat', 'white ribbed tank', 'ivory straight-leg jeans', 'beige ankle boots'],
          occasion: 'trendy day out, modern casual',
          brands: ['The Row', 'Toteme', 'Celine']
        }
      ],
      athletic: [
        {
          id: 'warm_light_ath_001',
          name: 'Warm Athleisure',
          description: 'Ivory athletic set, cream cardigan, white sneakers',
          pieces: ['ivory athletic set', 'cream cashmere cardigan', 'white designer sneakers'],
          occasion: 'warm athleisure, zen active',
          brands: ['Alo', 'Lululemon', 'The Row']
        },
        {
          id: 'warm_light_ath_002',
          name: 'Zen Active Luxe',
          description: 'Cream leggings, ivory ribbed top, oversized white hoodie, gold jewelry',
          pieces: ['cream high-waisted leggings', 'ivory ribbed sports bra', 'oversized white cashmere hoodie', 'white athletic sneakers', 'gold jewelry'],
          occasion: 'post-workout luxury, zen active',
          brands: ['Alo', 'The Row', 'Outdoor Voices']
        },
        {
          id: 'warm_light_ath_003',
          name: 'Ivory Athletic Dress',
          description: 'Ivory athletic dress, cream bomber jacket, white sneakers, tan leather gym bag',
          pieces: ['ivory athletic dress', 'cream bomber jacket', 'white designer sneakers', 'tan leather gym bag'],
          occasion: 'athleisure lifestyle, warm luxury',
          brands: ['Alo', 'The Row', 'Lululemon']
        }
      ]
    },
    locations: [
      {
        id: 'warm_light_loc_001',
        name: 'Bright Tokyo Apartment',
        description: 'Bright Tokyo apartment with minimal Japanese interiors. Warm sunlight streaming through windows. Zen warmth with clean design.',
        lighting: 'bright Japanese daylight, warm sun',
        mood: 'bright, zen, warm',
        setting: 'indoor'
      },
      {
        id: 'warm_light_loc_002',
        name: 'Minimal Japanese Interior',
        description: 'Minimal Japanese interior with clean spaces. Bright natural light. Zen simplicity with warm tones.',
        lighting: 'bright natural daylight, warm',
        mood: 'zen, clean, bright',
        setting: 'indoor'
      },
      {
        id: 'warm_light_loc_003',
        name: 'Sunny Modern Space',
        description: 'Sunny modern space with contemporary furniture. Clean lines and warm natural light.',
        lighting: 'warm natural daylight',
        mood: 'modern, bright, zen',
        setting: 'indoor'
      },
      {
        id: 'warm_light_loc_004',
        name: 'Bright Workspace',
        description: 'Bright workspace with matcha tea. Overhead view of minimal desk. Warm daylight flooding in.',
        lighting: 'warm natural daylight',
        mood: 'zen, focused, bright',
        setting: 'indoor'
      },
      {
        id: 'warm_light_loc_005',
        name: 'Window Seat',
        description: 'Window seat with warm natural light. Peaceful zen atmosphere. Bright and airy.',
        lighting: 'warm natural light, zen',
        mood: 'zen, peaceful, bright',
        setting: 'indoor'
      }
    ],
    accessories: [
      {
        id: 'warm_light_acc_001',
        name: 'Minimal Gold Zen',
        description: 'minimal gold jewelry, cream canvas bag, white accessories, zen simplicity',
        items: ['minimal gold jewelry', 'cream canvas bag', 'white accessories', 'simple watch'],
        vibe: 'warm_light_minimalistic'
      },
      {
        id: 'warm_light_acc_002',
        name: 'Cream Designer Bag',
        description: 'cream leather bag, minimal gold jewelry, white accessories, zen elegance',
        items: ['cream leather bag', 'minimal gold jewelry', 'white accessories', 'cream sunglasses'],
        vibe: 'warm_light_minimalistic'
      },
      {
        id: 'warm_light_acc_003',
        name: 'Ivory Accessories',
        description: 'ivory tote bag, gold jewelry, cream accessories, zen minimal',
        items: ['ivory tote bag', 'gold jewelry', 'cream accessories', 'white accessories'],
        vibe: 'warm_light_minimalistic'
      }
    ],
    colorPalette: [
      'warm ivories (zen, bright)',
      'soft creams (warm, minimal)',
      'bright whites',
      'warm natural daylight',
      'minimal shadows'
    ],
    textures: [
      'cotton (shirts, pants - simple zen)',
      'cashmere (sweaters, cardigans - soft warmth)',
      'wool (blazers, coats - clean minimal)',
      'leather (bags, shoes - quality minimal)',
      'linen (shirts, trousers - relaxed zen)'
    ]
  },

  warm_beige_aesthetic: {
    vibe: 'warm_beige_aesthetic',
    fashionStyles: {
      business: [
        {
          id: 'warm_beige_biz_001',
          name: 'Caramel Business Suit',
          description: 'Caramel blazer, sand trousers, cream blouse, tan pumps',
          pieces: ['caramel tailored blazer', 'sand trousers', 'cream silk blouse', 'tan pumps'],
          occasion: 'warm business, Barcelona elegance',
          brands: ['The Row', 'Toteme', 'Khaite']
        },
        {
          id: 'warm_beige_biz_002',
          name: 'Sand Power Dressing',
          description: 'Sand wool blazer, caramel trousers, cream blouse, gold jewelry',
          pieces: ['sand wool blazer', 'caramel tailored trousers', 'cream blouse', 'gold jewelry', 'tan heels'],
          occasion: 'executive setting, Mediterranean luxury',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'warm_beige_biz_003',
          name: 'Caramel Tailored Suit',
          description: 'Caramel tailored suit, sand silk blouse, tan pumps, gold jewelry',
          pieces: ['caramel tailored suit', 'sand silk blouse', 'tan pumps', 'gold jewelry'],
          occasion: 'warm business, Barcelona elegance',
          brands: ['The Row', 'Toteme', 'Khaite']
        },
        {
          id: 'warm_beige_biz_004',
          name: 'Sand Double-Breasted',
          description: 'Sand double-breasted blazer, matching trousers, cream button-down, tan boots',
          pieces: ['sand double-breasted blazer', 'matching sand trousers', 'cream button-down', 'tan boots', 'gold jewelry'],
          occasion: 'boardroom, high-stakes meeting',
          brands: ['The Row', 'Khaite', 'Toteme']
        }
      ],
      casual: [
        {
          id: 'warm_beige_cas_001',
          name: 'Caramel Barcelona Casual',
          description: 'Caramel ribbed knit, sand linen pants, toffee sweater, nude sandals',
          pieces: ['caramel ribbed knit', 'sand linen pants', 'toffee sweater', 'nude sandals'],
          occasion: 'warm casual, Mediterranean lifestyle',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'warm_beige_cas_002',
          name: 'Sand Relaxed',
          description: 'Sand linen shirt, caramel pants, tan sandals',
          pieces: ['sand linen shirt', 'caramel wide-leg pants', 'tan sandals', 'warm beige bag'],
          occasion: 'warm casual, relaxed',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'warm_beige_cas_003',
          name: 'Caramel Oversized',
          description: 'Caramel oversized blazer, sand tee, tan jeans, tan sandals',
          pieces: ['caramel oversized blazer', 'sand ribbed tank', 'tan straight-leg jeans', 'tan sandals', 'warm tote'],
          occasion: 'evening casual, dinner, drinks',
          brands: ['The Row', 'Khaite', 'Toteme']
        },
        {
          id: 'warm_beige_cas_004',
          name: 'Sand Mediterranean',
          description: 'Sand sweater, caramel trousers, tan sandals, warm bag',
          pieces: ['sand cashmere sweater', 'caramel wide-leg trousers', 'tan sandals', 'warm Mediterranean bag'],
          occasion: 'casual day out, Mediterranean setting',
          brands: ['The Row', 'Toteme']
        }
      ],
      bohemian: [
        {
          id: 'warm_beige_boh_001',
          name: 'Toffee Flowy',
          description: 'Toffee maxi dress, layered gold jewelry, tan sandals',
          pieces: ['toffee flowy maxi dress', 'layered gold necklaces', 'tan sandals'],
          occasion: 'warm bohemian, Mediterranean',
          brands: ['Free People', 'Anthropologie']
        },
        {
          id: 'warm_beige_boh_002',
          name: 'Caramel Midi Dress',
          description: 'Caramel midi dress with flowy sleeves, layered gold necklaces, tan sandals',
          pieces: ['caramel midi dress', 'layered gold necklaces', 'gold cuffs', 'tan sandals'],
          occasion: 'brunch, casual event, gallery',
          brands: ['Free People', 'Anthropologie', 'The Row']
        },
        {
          id: 'warm_beige_boh_003',
          name: 'Toffee Layered Look',
          description: 'Toffee kimono cardigan, caramel slip dress, gold jewelry, tan sandals',
          pieces: ['toffee kimono cardigan', 'caramel slip dress', 'layered gold jewelry', 'tan sandals'],
          occasion: 'evening casual, creative gathering',
          brands: ['Free People', 'Anthropologie']
        }
      ],
      classic: [
        {
          id: 'warm_beige_cla_001',
          name: 'Timeless Caramel',
          description: 'Caramel coat, sand sweater, beige trousers, tan boots',
          pieces: ['caramel wool coat', 'sand cashmere sweater', 'beige trousers', 'tan leather boots'],
          occasion: 'timeless warmth, Mediterranean elegance',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'warm_beige_cla_002',
          name: 'Caramel Suit Classic',
          description: 'Caramel tailored suit, sand blouse, tan heels, gold jewelry',
          pieces: ['caramel tailored suit', 'sand silk blouse', 'tan heels', 'gold jewelry'],
          occasion: 'professional, timeless elegance',
          brands: ['The Row', 'Toteme', 'Khaite']
        },
        {
          id: 'warm_beige_cla_003',
          name: 'Sand Blazer Classic',
          description: 'Sand blazer, caramel blouse, beige trousers, tan pumps',
          pieces: ['sand blazer', 'caramel silk blouse', 'beige trousers', 'tan pumps'],
          occasion: 'classic elegance, refined setting',
          brands: ['The Row', 'Toteme']
        }
      ],
      trendy: [
        {
          id: 'warm_beige_tre_001',
          name: 'Modern Warm',
          description: 'Caramel oversized blazer, sand bodysuit, toffee trousers, tan boots',
          pieces: ['caramel oversized blazer', 'sand bodysuit', 'toffee wide-leg trousers', 'tan platform boots'],
          occasion: 'trendy warm, modern Mediterranean',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'warm_beige_tre_002',
          name: 'Cropped Statement',
          description: 'Cropped caramel jacket, high-waisted sand trousers, tan sneakers, gold jewelry',
          pieces: ['cropped caramel jacket', 'high-waisted sand trousers', 'tan designer sneakers', 'gold jewelry'],
          occasion: 'trendy casual, modern setting',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'warm_beige_tre_003',
          name: 'Oversized Chic',
          description: 'Oversized sand coat, caramel tee, beige jeans, tan boots',
          pieces: ['oversized sand coat', 'caramel ribbed tank', 'beige straight-leg jeans', 'tan ankle boots'],
          occasion: 'trendy day out, modern casual',
          brands: ['The Row', 'Toteme', 'Celine']
        }
      ],
      athletic: [
        {
          id: 'warm_beige_ath_001',
          name: 'Warm Athleisure',
          description: 'Caramel athletic set, sand cardigan, tan sneakers',
          pieces: ['caramel athletic set', 'sand cashmere cardigan', 'tan designer sneakers'],
          occasion: 'warm athleisure, Mediterranean active',
          brands: ['Alo', 'Lululemon', 'The Row']
        },
        {
          id: 'warm_beige_ath_002',
          name: 'Mediterranean Active',
          description: 'Caramel leggings, sand ribbed top, oversized tan hoodie, gold watch',
          pieces: ['caramel high-waisted leggings', 'sand ribbed sports bra', 'oversized tan cashmere hoodie', 'nude athletic sneakers', 'gold minimalist watch'],
          occasion: 'post-workout luxury, Mediterranean active',
          brands: ['Alo', 'The Row', 'Outdoor Voices']
        },
        {
          id: 'warm_beige_ath_003',
          name: 'Caramel Athletic Dress',
          description: 'Caramel athletic dress, sand bomber jacket, tan sneakers, tan leather gym bag',
          pieces: ['caramel athletic dress', 'sand bomber jacket', 'tan designer sneakers', 'tan leather gym bag'],
          occasion: 'athleisure lifestyle, warm luxury',
          brands: ['Alo', 'The Row', 'Lululemon']
        }
      ]
    },
    locations: [
      {
        id: 'warm_beige_loc_001',
        name: 'Barcelona Terrace',
        description: 'Barcelona terrace with golden afternoon light. Warm Mediterranean streets. Cozy cafes with golden hour glow.',
        lighting: 'golden afternoon Barcelona light, warm',
        mood: 'warm, Mediterranean, golden hour',
        setting: 'outdoor'
      },
      {
        id: 'warm_beige_loc_002',
        name: 'Warm Cafe',
        description: 'Warm cafe with terracotta tiles. Golden afternoon light. Mediterranean warmth.',
        lighting: 'warm natural light, golden hour',
        mood: 'warm, cozy, Mediterranean',
        setting: 'indoor'
      },
      {
        id: 'warm_beige_loc_003',
        name: 'Mediterranean Street',
        description: 'Mediterranean street at golden hour. Warm beige and caramel tones. Lifestyle elegance.',
        lighting: 'golden hour glow, warm shadows',
        mood: 'warm, Mediterranean, golden',
        setting: 'outdoor'
      },
      {
        id: 'warm_beige_loc_004',
        name: 'Warm Workspace',
        description: 'Warm workspace with coffee and notebook. Overhead view of cozy desk. Golden afternoon light.',
        lighting: 'golden afternoon light, warm',
        mood: 'warm, focused, cozy',
        setting: 'indoor'
      },
      {
        id: 'warm_beige_loc_005',
        name: 'Warm Stone Wall',
        description: 'Warm stone wall with Mediterranean architecture. Golden hour warmth. Lifestyle backdrop.',
        lighting: 'golden hour, warm shadows',
        mood: 'warm, Mediterranean, elegant',
        setting: 'outdoor'
      }
    ],
    accessories: [
      {
        id: 'warm_beige_acc_001',
        name: 'Gold Jewelry Mediterranean',
        description: 'layered gold necklaces, gold watch, statement rings, Mediterranean elegance',
        items: ['layered gold necklaces', 'gold watch', 'statement rings', 'gold jewelry'],
        vibe: 'warm_beige_aesthetic'
      },
      {
        id: 'warm_beige_acc_002',
        name: 'Tan Leather Mediterranean',
        description: 'tan leather bag, gold jewelry, caramel accessories, warm tones',
        items: ['tan leather bag', 'gold jewelry', 'caramel accessories', 'tan sunglasses'],
        vibe: 'warm_beige_aesthetic'
      },
      {
        id: 'warm_beige_acc_003',
        name: 'Caramel Accessories',
        description: 'caramel bag, gold jewelry, sand accessories, warm Mediterranean',
        items: ['caramel bag', 'gold jewelry', 'sand accessories', 'warm-toned items'],
        vibe: 'warm_beige_aesthetic'
      }
    ],
    colorPalette: [
      'warm caramels (Mediterranean, golden)',
      'golden sands (lifestyle, warm)',
      'toffee highlights',
      'Mediterranean golden light',
      'warm shadows'
    ],
    textures: [
      'cashmere (sweaters, cardigans - soft warmth)',
      'wool (blazers, coats - warm sophistication)',
      'leather (bags, boots - quality warm)',
      'linen (shirts, pants - relaxed Mediterranean)',
      'ribbed knit (sweaters - cozy warmth)'
    ]
  },

  edgy_dark_moody: {
    vibe: 'edgy_dark_moody',
    fashionStyles: {
      business: [
        {
          id: 'edgy_dark_biz_001',
          name: 'Black Edgy Suit',
          description: 'Black leather blazer, black jeans, band tee, combat boots',
          pieces: ['black leather blazer', 'black distressed jeans', 'band t-shirt', 'combat boots'],
          occasion: 'edgy business, urban edge',
          brands: ['Saint Laurent', 'Acne Studios', 'The Row']
        },
        {
          id: 'edgy_dark_biz_002',
          name: 'Charcoal Edgy Power',
          description: 'Charcoal leather blazer, black trousers, black tee, silver chains',
          pieces: ['charcoal leather blazer', 'black tailored trousers', 'black tee', 'silver chains', 'combat boots'],
          occasion: 'executive setting, edgy luxury',
          brands: ['Saint Laurent', 'The Row']
        },
        {
          id: 'edgy_dark_biz_003',
          name: 'Black Tailored Edgy',
          description: 'Black tailored suit, black tee, combat boots, silver chains',
          pieces: ['black tailored suit', 'black tee', 'combat boots', 'silver chains'],
          occasion: 'edgy business, urban edge',
          brands: ['Saint Laurent', 'Acne Studios', 'The Row']
        },
        {
          id: 'edgy_dark_biz_004',
          name: 'Charcoal Double-Breasted Edgy',
          description: 'Charcoal double-breasted blazer, matching trousers, black button-down, combat boots',
          pieces: ['charcoal double-breasted blazer', 'matching charcoal trousers', 'black button-down', 'combat boots', 'silver chains'],
          occasion: 'boardroom, high-stakes meeting',
          brands: ['Saint Laurent', 'Acne Studios', 'The Row']
        }
      ],
      casual: [
        {
          id: 'edgy_dark_cas_001',
          name: 'All Black Edgy',
          description: 'Black leather jacket, band tee, distressed black jeans, combat boots',
          pieces: ['black leather jacket', 'band t-shirt', 'distressed black jeans', 'combat boots', 'silver chains'],
          occasion: 'edgy casual, urban nightlife',
          brands: ['Saint Laurent', 'Acne Studios']
        },
        {
          id: 'edgy_dark_cas_002',
          name: 'Leather Edgy',
          description: 'Black leather pants, black hoodie, silver chains, combat boots',
          pieces: ['black leather pants', 'black hoodie', 'silver chains', 'combat boots'],
          occasion: 'edgy casual, underground',
          brands: ['Saint Laurent', 'The Row']
        },
        {
          id: 'edgy_dark_cas_003',
          name: 'Black Oversized Edgy',
          description: 'Black oversized blazer, charcoal tee, black jeans, combat boots',
          pieces: ['black oversized blazer', 'charcoal ribbed tank', 'black straight-leg jeans', 'combat boots', 'silver chains'],
          occasion: 'evening casual, dinner, drinks',
          brands: ['Saint Laurent', 'Acne Studios', 'The Row']
        },
        {
          id: 'edgy_dark_cas_004',
          name: 'Charcoal Street',
          description: 'Charcoal sweater, black trousers, combat boots, edgy bag',
          pieces: ['charcoal cashmere sweater', 'black wide-leg trousers', 'combat boots', 'edgy black bag'],
          occasion: 'casual day out, urban setting',
          brands: ['Saint Laurent', 'The Row']
        }
      ],
      bohemian: [
        {
          id: 'edgy_dark_boh_001',
          name: 'Black Edgy Boho',
          description: 'Black maxi dress, silver chains, combat boots',
          pieces: ['black flowy maxi dress', 'silver chain necklaces', 'combat boots'],
          occasion: 'edgy bohemian, urban',
          brands: ['Free People', 'Saint Laurent']
        },
        {
          id: 'edgy_dark_boh_002',
          name: 'Charcoal Midi Dress',
          description: 'Charcoal midi dress with flowy sleeves, silver chains, combat boots',
          pieces: ['charcoal midi dress', 'silver chain necklaces', 'combat boots'],
          occasion: 'brunch, casual event, gallery',
          brands: ['Free People', 'Saint Laurent', 'Acne Studios']
        },
        {
          id: 'edgy_dark_boh_003',
          name: 'Black Layered Look',
          description: 'Black kimono cardigan, charcoal slip dress, silver chains, combat boots',
          pieces: ['black kimono cardigan', 'charcoal slip dress', 'silver chain necklaces', 'combat boots'],
          occasion: 'evening casual, creative gathering',
          brands: ['Free People', 'Saint Laurent']
        }
      ],
      classic: [
        {
          id: 'edgy_dark_cla_001',
          name: 'Edgy Classic',
          description: 'Black blazer, black tee, black jeans, combat boots',
          pieces: ['black blazer', 'black tee', 'black jeans', 'combat boots'],
          occasion: 'edgy classic, urban',
          brands: ['Saint Laurent', 'Acne Studios']
        },
        {
          id: 'edgy_dark_cla_002',
          name: 'Black Suit Edgy',
          description: 'Black tailored suit, black tee, combat boots, silver chains',
          pieces: ['black tailored suit', 'black tee', 'combat boots', 'silver chains'],
          occasion: 'professional, edgy elegance',
          brands: ['Saint Laurent', 'Acne Studios', 'The Row']
        },
        {
          id: 'edgy_dark_cla_003',
          name: 'Charcoal Blazer Classic',
          description: 'Charcoal blazer, black blouse, black trousers, combat boots',
          pieces: ['charcoal blazer', 'black silk blouse', 'black trousers', 'combat boots'],
          occasion: 'classic elegance, urban setting',
          brands: ['Saint Laurent', 'Acne Studios']
        }
      ],
      trendy: [
        {
          id: 'edgy_dark_tre_001',
          name: 'Modern Edgy',
          description: 'Black oversized blazer, black bodysuit, leather pants, platform boots',
          pieces: ['black oversized blazer', 'black bodysuit', 'black leather pants', 'platform boots'],
          occasion: 'trendy edgy, fashion-forward',
          brands: ['Saint Laurent', 'Acne Studios', 'The Row']
        },
        {
          id: 'edgy_dark_tre_002',
          name: 'Cropped Statement',
          description: 'Cropped black jacket, high-waisted black trousers, platform boots, silver chains',
          pieces: ['cropped black jacket', 'high-waisted black trousers', 'platform boots', 'silver chains'],
          occasion: 'trendy casual, modern setting',
          brands: ['Saint Laurent', 'Acne Studios']
        },
        {
          id: 'edgy_dark_tre_003',
          name: 'Oversized Chic',
          description: 'Oversized charcoal coat, black tee, black jeans, combat boots',
          pieces: ['oversized charcoal coat', 'black ribbed tank', 'black straight-leg jeans', 'combat boots'],
          occasion: 'trendy day out, modern casual',
          brands: ['Saint Laurent', 'Acne Studios', 'The Row']
        }
      ],
      athletic: [
        {
          id: 'edgy_dark_ath_001',
          name: 'Edgy Athleisure',
          description: 'Black athletic set, black blazer, combat boots',
          pieces: ['black athletic set', 'black oversized blazer', 'combat boots'],
          occasion: 'edgy athleisure, urban active',
          brands: ['Alo', 'Lululemon', 'Saint Laurent']
        },
        {
          id: 'edgy_dark_ath_002',
          name: 'Urban Street Active',
          description: 'Black leggings, charcoal ribbed top, oversized black hoodie, silver chains',
          pieces: ['black high-waisted leggings', 'charcoal ribbed sports bra', 'oversized black hoodie', 'combat boots', 'silver chains'],
          occasion: 'post-workout edgy, urban active',
          brands: ['Alo', 'Saint Laurent', 'Acne Studios']
        },
        {
          id: 'edgy_dark_ath_003',
          name: 'Black Athletic Dress',
          description: 'Black athletic dress, black bomber jacket, combat boots, black gym bag',
          pieces: ['black athletic dress', 'black bomber jacket', 'combat boots', 'black gym bag'],
          occasion: 'athleisure lifestyle, edgy active',
          brands: ['Alo', 'Saint Laurent', 'Lululemon']
        }
      ]
    },
    locations: [
      {
        id: 'edgy_dark_loc_001',
        name: 'Industrial London Street',
        description: 'Industrial London street with graffiti walls. Harsh urban lighting with neon accents. Underground nightlife atmosphere.',
        lighting: 'harsh urban lighting, neon glow',
        mood: 'edgy, urban, industrial',
        setting: 'outdoor'
      },
      {
        id: 'edgy_dark_loc_002',
        name: 'Underground Venue',
        description: 'Underground venue with industrial design. Harsh lighting and gritty atmosphere. Urban nightlife setting.',
        lighting: 'harsh industrial light, neon',
        mood: 'edgy, underground, moody',
        setting: 'indoor'
      },
      {
        id: 'edgy_dark_loc_003',
        name: 'Graffiti Wall',
        description: 'Graffiti wall with urban backdrop. Industrial edge with neon accents. Edgy urban setting.',
        lighting: 'harsh urban light, neon',
        mood: 'edgy, urban, industrial',
        setting: 'outdoor'
      },
      {
        id: 'edgy_dark_loc_004',
        name: 'Dark Workspace',
        description: 'Dark workspace with laptop and stickers. Overhead view of industrial desk. Harsh lighting.',
        lighting: 'harsh light, industrial',
        mood: 'edgy, focused, urban',
        setting: 'indoor'
      },
      {
        id: 'edgy_dark_loc_005',
        name: 'Neon-Lit Alley',
        description: 'Neon-lit alley with urban architecture. Industrial backdrop with edgy atmosphere.',
        lighting: 'neon lighting, harsh urban',
        mood: 'edgy, urban, nightlife',
        setting: 'outdoor'
      }
    ],
    accessories: [
      {
        id: 'edgy_dark_acc_001',
        name: 'Silver Chains Edgy',
        description: 'silver chain necklaces, studded accessories, dark sunglasses, leather bags',
        items: ['silver chain necklaces', 'studded accessories', 'dark sunglasses', 'leather bags'],
        vibe: 'edgy_dark_moody'
      },
      {
        id: 'edgy_dark_acc_002',
        name: 'Black Edgy Set',
        description: 'black leather bag, silver chains, studded accessories, edgy urban',
        items: ['black leather bag', 'silver chains', 'studded accessories', 'edgy urban items'],
        vibe: 'edgy_dark_moody'
      },
      {
        id: 'edgy_dark_acc_003',
        name: 'Industrial Accessories',
        description: 'silver chains, black accessories, studded details, urban edge',
        items: ['silver chains', 'black accessories', 'studded details', 'urban edge items'],
        vibe: 'edgy_dark_moody'
      }
    ],
    colorPalette: [
      'deep blacks (gritty, urban)',
      'cool grays (industrial)',
      'neon accents (red/blue)',
      'harsh contrast',
      'heavy grain'
    ],
    textures: [
      'leather (jackets, pants - worn, edgy)',
      'denim (jeans - distressed)',
      'metal (chains, studs - industrial)',
      'cotton (tees, hoodies - casual edgy)',
      'suede (boots - worn quality)'
    ]
  },

  edgy_light_minimalistic: {
    vibe: 'edgy_light_minimalistic',
    fashionStyles: {
      business: [
        {
          id: 'edgy_light_biz_001',
          name: 'White-Black Contrast Suit',
          description: 'White blazer, black leather pants, white tee, platform sneakers',
          pieces: ['white oversized blazer', 'black leather pants', 'white t-shirt', 'platform sneakers'],
          occasion: 'edgy business, modern street',
          brands: ['Saint Laurent', 'Acne Studios', 'The Row']
        },
        {
          id: 'edgy_light_biz_002',
          name: 'Cream Edgy Power',
          description: 'Cream leather blazer, white trousers, black tee, silver chains',
          pieces: ['cream leather blazer', 'white tailored trousers', 'black tee', 'silver chains', 'platform sneakers'],
          occasion: 'executive setting, edgy luxury',
          brands: ['Saint Laurent', 'The Row']
        },
        {
          id: 'edgy_light_biz_003',
          name: 'White Tailored Edgy',
          description: 'White tailored suit, black tee, platform sneakers, silver chains',
          pieces: ['white tailored suit', 'black tee', 'platform sneakers', 'silver chains'],
          occasion: 'edgy business, modern street',
          brands: ['Saint Laurent', 'Acne Studios', 'The Row']
        },
        {
          id: 'edgy_light_biz_004',
          name: 'Cream Double-Breasted Edgy',
          description: 'Cream double-breasted blazer, matching trousers, white button-down, platform sneakers',
          pieces: ['cream double-breasted blazer', 'matching cream trousers', 'white button-down', 'platform sneakers', 'silver chains'],
          occasion: 'boardroom, high-stakes meeting',
          brands: ['Saint Laurent', 'Acne Studios', 'The Row']
        }
      ],
      casual: [
        {
          id: 'edgy_light_cas_001',
          name: 'White-Black Street',
          description: 'White oversized shirt, black leather pants, platform sneakers, crossbody bag',
          pieces: ['white oversized shirt', 'black leather pants', 'platform sneakers', 'crossbody bag'],
          occasion: 'edgy casual, Seoul street style',
          brands: ['Saint Laurent', 'Acne Studios']
        },
        {
          id: 'edgy_light_cas_002',
          name: 'Modern Contrast',
          description: 'Black leather pants, white tee, platforms, minimal silver jewelry',
          pieces: ['black leather pants', 'white tee', 'platform sneakers', 'minimal silver jewelry'],
          occasion: 'edgy casual, contemporary cool',
          brands: ['Saint Laurent', 'The Row']
        },
        {
          id: 'edgy_light_cas_003',
          name: 'White Oversized Edgy',
          description: 'White oversized blazer, cream tee, black jeans, platform sneakers',
          pieces: ['white oversized blazer', 'cream ribbed tank', 'black straight-leg jeans', 'platform sneakers', 'silver chains'],
          occasion: 'evening casual, dinner, drinks',
          brands: ['Saint Laurent', 'Acne Studios', 'The Row']
        },
        {
          id: 'edgy_light_cas_004',
          name: 'Cream Street',
          description: 'Cream sweater, white trousers, platform sneakers, edgy bag',
          pieces: ['cream cashmere sweater', 'white wide-leg trousers', 'platform sneakers', 'edgy white bag'],
          occasion: 'casual day out, modern setting',
          brands: ['Saint Laurent', 'The Row']
        }
      ],
      bohemian: [
        {
          id: 'edgy_light_boh_001',
          name: 'White Edgy Boho',
          description: 'White maxi dress, minimal silver jewelry, white sandals',
          pieces: ['white flowy maxi dress', 'minimal silver jewelry', 'white sandals'],
          occasion: 'edgy bohemian, modern',
          brands: ['Free People', 'Saint Laurent']
        },
        {
          id: 'edgy_light_boh_002',
          name: 'Cream Midi Dress',
          description: 'Cream midi dress with flowy sleeves, silver chains, white sandals',
          pieces: ['cream midi dress', 'silver chain necklaces', 'white sandals'],
          occasion: 'brunch, casual event, gallery',
          brands: ['Free People', 'Saint Laurent', 'Acne Studios']
        },
        {
          id: 'edgy_light_boh_003',
          name: 'White Layered Look',
          description: 'White kimono cardigan, cream slip dress, silver chains, white sandals',
          pieces: ['white kimono cardigan', 'cream slip dress', 'silver chain necklaces', 'white sandals'],
          occasion: 'evening casual, creative gathering',
          brands: ['Free People', 'Saint Laurent']
        }
      ],
      classic: [
        {
          id: 'edgy_light_cla_001',
          name: 'Edgy Classic',
          description: 'White blazer, black tee, black jeans, white sneakers',
          pieces: ['white blazer', 'black tee', 'black jeans', 'white sneakers'],
          occasion: 'edgy classic, modern',
          brands: ['Saint Laurent', 'Acne Studios']
        },
        {
          id: 'edgy_light_cla_002',
          name: 'White Suit Edgy',
          description: 'White tailored suit, black tee, white sneakers, silver chains',
          pieces: ['white tailored suit', 'black tee', 'white sneakers', 'silver chains'],
          occasion: 'professional, edgy elegance',
          brands: ['Saint Laurent', 'Acne Studios', 'The Row']
        },
        {
          id: 'edgy_light_cla_003',
          name: 'Cream Blazer Classic',
          description: 'Cream blazer, white blouse, black trousers, white sneakers',
          pieces: ['cream blazer', 'white silk blouse', 'black trousers', 'white sneakers'],
          occasion: 'classic elegance, modern setting',
          brands: ['Saint Laurent', 'Acne Studios']
        }
      ],
      trendy: [
        {
          id: 'edgy_light_tre_001',
          name: 'Modern Edgy',
          description: 'White oversized blazer, black bodysuit, white trousers, platform boots',
          pieces: ['white oversized blazer', 'black bodysuit', 'white wide-leg trousers', 'platform boots'],
          occasion: 'trendy edgy, Seoul fashion',
          brands: ['Saint Laurent', 'Acne Studios', 'The Row']
        },
        {
          id: 'edgy_light_tre_002',
          name: 'Cropped Statement',
          description: 'Cropped white jacket, high-waisted white trousers, platform sneakers, silver chains',
          pieces: ['cropped white jacket', 'high-waisted white trousers', 'platform sneakers', 'silver chains'],
          occasion: 'trendy casual, modern setting',
          brands: ['Saint Laurent', 'Acne Studios']
        },
        {
          id: 'edgy_light_tre_003',
          name: 'Oversized Chic',
          description: 'Oversized cream coat, white tee, black jeans, white sneakers',
          pieces: ['oversized cream coat', 'white ribbed tank', 'black straight-leg jeans', 'white sneakers'],
          occasion: 'trendy day out, modern casual',
          brands: ['Saint Laurent', 'Acne Studios', 'The Row']
        }
      ],
      athletic: [
        {
          id: 'edgy_light_ath_001',
          name: 'Edgy Athleisure',
          description: 'White athletic set, black blazer, platform sneakers',
          pieces: ['white athletic set', 'black oversized blazer', 'platform sneakers'],
          occasion: 'edgy athleisure, modern active',
          brands: ['Alo', 'Lululemon', 'Saint Laurent']
        },
        {
          id: 'edgy_light_ath_002',
          name: 'Urban Active Edge',
          description: 'White leggings, black ribbed top, oversized black hoodie, silver chains',
          pieces: ['white high-waisted leggings', 'black ribbed sports bra', 'oversized black hoodie', 'platform sneakers', 'silver chains'],
          occasion: 'post-workout edgy, urban active',
          brands: ['Alo', 'Saint Laurent', 'Acne Studios']
        },
        {
          id: 'edgy_light_ath_003',
          name: 'White Athletic Dress',
          description: 'White athletic dress, black bomber jacket, platform sneakers, black gym bag',
          pieces: ['white athletic dress', 'black bomber jacket', 'platform sneakers', 'black gym bag'],
          occasion: 'athleisure lifestyle, edgy active',
          brands: ['Alo', 'Saint Laurent', 'Lululemon']
        }
      ]
    },
    locations: [
      {
        id: 'edgy_light_loc_001',
        name: 'Modern Seoul Street',
        description: 'Modern Seoul street with bright subway stations. Contemporary architecture with clean urban spaces. Bright daylight with street style cool.',
        lighting: 'bright Seoul daylight, clean',
        mood: 'modern, urban, bright',
        setting: 'outdoor'
      },
      {
        id: 'edgy_light_loc_002',
        name: 'Bright Subway Station',
        description: 'Bright subway station with contemporary design. Clean modern spaces with bright light.',
        lighting: 'bright daylight, clean',
        mood: 'modern, clean, bright',
        setting: 'indoor'
      },
      {
        id: 'edgy_light_loc_003',
        name: 'Contemporary Architecture',
        description: 'Contemporary architecture with clean lines. Modern urban backdrop. Bright and clean.',
        lighting: 'bright clean light',
        mood: 'architectural, modern, bright',
        setting: 'outdoor'
      },
      {
        id: 'edgy_light_loc_004',
        name: 'Bright Workspace',
        description: 'Bright workspace with iced coffee. Overhead view of modern desk. Bright daylight.',
        lighting: 'bright daylight, clean',
        mood: 'modern, focused, bright',
        setting: 'indoor'
      },
      {
        id: 'edgy_light_loc_005',
        name: 'White Urban Bench',
        description: 'White urban bench with modern building. Bright daylight. Contemporary styling.',
        lighting: 'bright clean daylight',
        mood: 'modern, urban, bright',
        setting: 'outdoor'
      }
    ],
    accessories: [
      {
        id: 'edgy_light_acc_001',
        name: 'Minimal Silver Modern',
        description: 'minimal silver jewelry, crossbody bags, modern sunglasses, clean accessories',
        items: ['minimal silver jewelry', 'crossbody bags', 'modern sunglasses', 'clean accessories'],
        vibe: 'edgy_light_minimalistic'
      },
      {
        id: 'edgy_light_acc_002',
        name: 'White-Black Contrast',
        description: 'white bag, black accessories, silver jewelry, modern contrast',
        items: ['white bag', 'black accessories', 'silver jewelry', 'modern contrast items'],
        vibe: 'edgy_light_minimalistic'
      },
      {
        id: 'edgy_light_acc_003',
        name: 'Modern Accessories',
        description: 'modern accessories, silver rings, clean design, contemporary cool',
        items: ['modern accessories', 'silver rings', 'clean design items', 'contemporary cool'],
        vibe: 'edgy_light_minimalistic'
      }
    ],
    colorPalette: [
      'bright whites (clean, modern)',
      'deep blacks (contrast)',
      'clean contrast',
      'bright Seoul daylight',
      'minimal shadows'
    ],
    textures: [
      'leather (pants, bags - modern quality)',
      'cotton (shirts, tees - clean)',
      'metal (jewelry - minimal silver)',
      'denim (jeans - clean lines)',
      'synthetic (sneakers - modern)'
    ]
  },

  edgy_beige_aesthetic: {
    vibe: 'edgy_beige_aesthetic',
    fashionStyles: {
      business: [
        {
          id: 'edgy_beige_biz_001',
          name: 'Tan Utility Suit',
          description: 'Tan utility jacket, cargo pants, combat boots, minimal accessories',
          pieces: ['tan utility jacket', 'cargo pants', 'combat boots', 'minimal leather accessories'],
          occasion: 'edgy business, urban workwear',
          brands: ['The Row', 'Acne Studios']
        },
        {
          id: 'edgy_beige_biz_002',
          name: 'Beige Edgy Power',
          description: 'Beige utility blazer, tan trousers, beige tee, silver chains',
          pieces: ['beige utility blazer', 'tan tailored trousers', 'beige tee', 'silver chains', 'combat boots'],
          occasion: 'executive setting, edgy luxury',
          brands: ['The Row', 'Acne Studios']
        },
        {
          id: 'edgy_beige_biz_003',
          name: 'Tan Tailored Edgy',
          description: 'Tan tailored suit, beige tee, combat boots, silver chains',
          pieces: ['tan tailored suit', 'beige tee', 'combat boots', 'silver chains'],
          occasion: 'edgy business, urban workwear',
          brands: ['The Row', 'Acne Studios', 'Saint Laurent']
        },
        {
          id: 'edgy_beige_biz_004',
          name: 'Beige Double-Breasted Edgy',
          description: 'Beige double-breasted blazer, matching trousers, tan button-down, combat boots',
          pieces: ['beige double-breasted blazer', 'matching beige trousers', 'tan button-down', 'combat boots', 'silver chains'],
          occasion: 'boardroom, high-stakes meeting',
          brands: ['The Row', 'Acne Studios', 'Saint Laurent']
        }
      ],
      casual: [
        {
          id: 'edgy_beige_cas_001',
          name: 'Tan Utility Casual',
          description: 'Tan utility jacket, cargo pants, combat boots, canvas bag',
          pieces: ['tan utility jacket', 'cargo pants', 'combat boots', 'beige canvas bag'],
          occasion: 'edgy casual, Brooklyn street',
          brands: ['The Row', 'Acne Studios']
        },
        {
          id: 'edgy_beige_cas_002',
          name: 'Beige Workwear',
          description: 'Beige workwear pieces, tan cargo pants, combat boots',
          pieces: ['beige workwear pieces', 'tan cargo pants', 'combat boots', 'neutral cap'],
          occasion: 'edgy casual, urban cool',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'edgy_beige_cas_003',
          name: 'Tan Oversized Edgy',
          description: 'Tan oversized blazer, beige tee, tan jeans, combat boots',
          pieces: ['tan oversized blazer', 'beige ribbed tank', 'tan straight-leg jeans', 'combat boots', 'silver chains'],
          occasion: 'evening casual, dinner, drinks',
          brands: ['The Row', 'Acne Studios', 'Saint Laurent']
        },
        {
          id: 'edgy_beige_cas_004',
          name: 'Beige Urban',
          description: 'Beige sweater, tan trousers, combat boots, edgy bag',
          pieces: ['beige cashmere sweater', 'tan wide-leg trousers', 'combat boots', 'edgy beige bag'],
          occasion: 'casual day out, urban setting',
          brands: ['The Row', 'Acne Studios']
        }
      ],
      bohemian: [
        {
          id: 'edgy_beige_boh_001',
          name: 'Tan Edgy Boho',
          description: 'Tan maxi dress, minimal leather accessories, combat boots',
          pieces: ['tan flowy maxi dress', 'minimal leather accessories', 'combat boots'],
          occasion: 'edgy bohemian, urban',
          brands: ['Free People', 'The Row']
        },
        {
          id: 'edgy_beige_boh_002',
          name: 'Beige Midi Dress',
          description: 'Beige midi dress with flowy sleeves, silver chains, combat boots',
          pieces: ['beige midi dress', 'silver chain necklaces', 'combat boots'],
          occasion: 'brunch, casual event, gallery',
          brands: ['Free People', 'The Row', 'Acne Studios']
        },
        {
          id: 'edgy_beige_boh_003',
          name: 'Tan Layered Look',
          description: 'Tan kimono cardigan, beige slip dress, silver chains, combat boots',
          pieces: ['tan kimono cardigan', 'beige slip dress', 'silver chain necklaces', 'combat boots'],
          occasion: 'evening casual, creative gathering',
          brands: ['Free People', 'The Row']
        }
      ],
      classic: [
        {
          id: 'edgy_beige_cla_001',
          name: 'Edgy Classic',
          description: 'Tan blazer, beige tee, cargo pants, combat boots',
          pieces: ['tan blazer', 'beige tee', 'cargo pants', 'combat boots'],
          occasion: 'edgy classic, urban',
          brands: ['The Row', 'Acne Studios']
        },
        {
          id: 'edgy_beige_cla_002',
          name: 'Tan Suit Edgy',
          description: 'Tan tailored suit, beige tee, combat boots, silver chains',
          pieces: ['tan tailored suit', 'beige tee', 'combat boots', 'silver chains'],
          occasion: 'professional, edgy elegance',
          brands: ['The Row', 'Acne Studios', 'Saint Laurent']
        },
        {
          id: 'edgy_beige_cla_003',
          name: 'Beige Blazer Classic',
          description: 'Beige blazer, tan blouse, cargo pants, combat boots',
          pieces: ['beige blazer', 'tan silk blouse', 'cargo pants', 'combat boots'],
          occasion: 'classic elegance, urban setting',
          brands: ['The Row', 'Acne Studios']
        }
      ],
      trendy: [
        {
          id: 'edgy_beige_tre_001',
          name: 'Modern Edgy',
          description: 'Tan oversized utility jacket, beige bodysuit, cargo pants, platform boots',
          pieces: ['tan oversized utility jacket', 'beige bodysuit', 'cargo pants', 'platform boots'],
          occasion: 'trendy edgy, modern workwear',
          brands: ['The Row', 'Acne Studios']
        },
        {
          id: 'edgy_beige_tre_002',
          name: 'Cropped Statement',
          description: 'Cropped tan jacket, high-waisted beige trousers, combat boots, silver chains',
          pieces: ['cropped tan jacket', 'high-waisted beige trousers', 'combat boots', 'silver chains'],
          occasion: 'trendy casual, modern setting',
          brands: ['The Row', 'Acne Studios']
        },
        {
          id: 'edgy_beige_tre_003',
          name: 'Oversized Chic',
          description: 'Oversized beige coat, tan tee, cargo pants, combat boots',
          pieces: ['oversized beige coat', 'tan ribbed tank', 'cargo pants', 'combat boots'],
          occasion: 'trendy day out, modern casual',
          brands: ['The Row', 'Acne Studios', 'Saint Laurent']
        }
      ],
      athletic: [
        {
          id: 'edgy_beige_ath_001',
          name: 'Edgy Athleisure',
          description: 'Tan athletic set, utility jacket, combat boots',
          pieces: ['tan athletic set', 'utility jacket', 'combat boots'],
          occasion: 'edgy athleisure, urban active',
          brands: ['Alo', 'Lululemon', 'The Row']
        },
        {
          id: 'edgy_beige_ath_002',
          name: 'Urban Workwear Active',
          description: 'Tan leggings, beige ribbed top, oversized utility jacket, combat boots',
          pieces: ['tan high-waisted leggings', 'beige ribbed sports bra', 'oversized utility jacket', 'combat boots', 'silver chains'],
          occasion: 'post-workout edgy, urban active',
          brands: ['Alo', 'The Row', 'Acne Studios']
        },
        {
          id: 'edgy_beige_ath_003',
          name: 'Tan Athletic Dress',
          description: 'Tan athletic dress, utility bomber jacket, combat boots, black gym bag',
          pieces: ['tan athletic dress', 'utility bomber jacket', 'combat boots', 'black gym bag'],
          occasion: 'athleisure lifestyle, edgy active',
          brands: ['Alo', 'The Row', 'Lululemon']
        }
      ]
    },
    locations: [
      {
        id: 'edgy_beige_loc_001',
        name: 'Brooklyn Industrial Area',
        description: 'Brooklyn industrial area with neutral urban spaces. Natural shadows with industrial beige tones. Urban workwear cool atmosphere.',
        lighting: 'natural Brooklyn shadows, urban',
        mood: 'urban, industrial, cool',
        setting: 'outdoor'
      },
      {
        id: 'edgy_beige_loc_002',
        name: 'Vintage Warehouse',
        description: 'Vintage warehouse with concrete and metal. Industrial beige spaces with natural shadows.',
        lighting: 'natural urban shadows',
        mood: 'industrial, urban, cool',
        setting: 'indoor'
      },
      {
        id: 'edgy_beige_loc_003',
        name: 'Concrete Wall',
        description: 'Concrete wall with industrial backdrop. Natural shadows. Urban workwear setting.',
        lighting: 'natural shadows, urban',
        mood: 'industrial, urban, edgy',
        setting: 'outdoor'
      },
      {
        id: 'edgy_beige_loc_004',
        name: 'Industrial Workspace',
        description: 'Industrial workspace with coffee. Overhead view of metal desk. Natural window light.',
        lighting: 'natural window light, urban',
        mood: 'industrial, focused, urban',
        setting: 'indoor'
      },
      {
        id: 'edgy_beige_loc_005',
        name: 'Warehouse Interior',
        description: 'Warehouse interior with industrial design. Natural shadows. Urban edge.',
        lighting: 'natural shadows, industrial',
        mood: 'industrial, urban, edgy',
        setting: 'indoor'
      }
    ],
    accessories: [
      {
        id: 'edgy_beige_acc_001',
        name: 'Minimal Leather Urban',
        description: 'minimal leather bracelet, canvas bags, neutral caps, urban accessories',
        items: ['minimal leather bracelet', 'canvas bags', 'neutral caps', 'urban accessories'],
        vibe: 'edgy_beige_aesthetic'
      },
      {
        id: 'edgy_beige_acc_002',
        name: 'Beige Canvas Bag',
        description: 'beige canvas bag, minimal leather accessories, neutral tones, urban cool',
        items: ['beige canvas bag', 'minimal leather accessories', 'neutral tones', 'urban cool items'],
        vibe: 'edgy_beige_aesthetic'
      },
      {
        id: 'edgy_beige_acc_003',
        name: 'Tan Utility Accessories',
        description: 'tan utility accessories, canvas bags, minimal leather, urban workwear',
        items: ['tan utility accessories', 'canvas bags', 'minimal leather', 'urban workwear items'],
        vibe: 'edgy_beige_aesthetic'
      }
    ],
    colorPalette: [
      'neutral tans (urban, industrial)',
      'concrete grays (industrial)',
      'warm beiges',
      'natural urban shadows',
      'subtle grain'
    ],
    textures: [
      'canvas (bags, jackets - utility)',
      'cotton (tees, pants - workwear)',
      'leather (accessories - minimal)',
      'denim (cargo pants - utility)',
      'metal (hardware - industrial)'
    ]
  },

  professional_dark_moody: {
    vibe: 'professional_dark_moody',
    fashionStyles: {
      business: [
        {
          id: 'prof_dark_biz_001',
          name: 'Black Power Suit',
          description: 'Black tailored blazer, black trousers, black trench coat, black heels',
          pieces: ['black tailored blazer', 'black trousers', 'black trench coat', 'black pointed-toe heels'],
          occasion: 'corporate power, executive presence',
          brands: ['The Row', 'Toteme', 'Khaite']
        },
        {
          id: 'prof_dark_biz_002',
          name: 'Black Executive',
          description: 'Black power suit, arms crossed, minimal gold jewelry, black briefcase',
          pieces: ['black power suit', 'minimal gold jewelry', 'black leather briefcase', 'black heels'],
          occasion: 'executive presentation, CEO energy',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'prof_dark_biz_003',
          name: 'Charcoal Power Dressing',
          description: 'Charcoal wool blazer, black trousers, white blouse, gold jewelry',
          pieces: ['charcoal wool blazer', 'black tailored trousers', 'white blouse', 'gold jewelry', 'black heels'],
          occasion: 'executive setting, corporate luxury',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'prof_dark_biz_004',
          name: 'Black Double-Breasted',
          description: 'Black double-breasted blazer, matching trousers, white button-down, black boots',
          pieces: ['black double-breasted blazer', 'matching black trousers', 'white button-down', 'black boots', 'gold jewelry'],
          occasion: 'boardroom, high-stakes meeting',
          brands: ['The Row', 'Khaite', 'Toteme']
        }
      ],
      casual: [
        {
          id: 'prof_dark_cas_001',
          name: 'Black Professional Casual',
          description: 'Black blazer, black tee, black trousers, black sneakers',
          pieces: ['black blazer', 'black tee', 'black trousers', 'black designer sneakers'],
          occasion: 'professional casual, corporate',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'prof_dark_cas_002',
          name: 'Charcoal Relaxed',
          description: 'Charcoal cardigan, black tee, black trousers, black sneakers',
          pieces: ['charcoal cardigan', 'black ribbed tank', 'black trousers', 'black designer sneakers', 'black tote'],
          occasion: 'evening casual, dinner, drinks',
          brands: ['The Row', 'Khaite', 'Toteme']
        },
        {
          id: 'prof_dark_cas_003',
          name: 'Black Oversized',
          description: 'Black oversized blazer, white tee, black jeans, black boots',
          pieces: ['black oversized blazer', 'white ribbed tank', 'black straight-leg jeans', 'black ankle boots', 'black bag'],
          occasion: 'casual day out, corporate setting',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'prof_dark_cas_004',
          name: 'Charcoal Corporate',
          description: 'Charcoal sweater, black trousers, black boots, professional bag',
          pieces: ['charcoal cashmere sweater', 'black wide-leg trousers', 'black leather boots', 'professional black bag'],
          occasion: 'casual day out, corporate setting',
          brands: ['The Row', 'Toteme']
        }
      ],
      bohemian: [
        {
          id: 'prof_dark_boh_001',
          name: 'Black Professional Boho',
          description: 'Black maxi dress, minimal gold jewelry, black sandals',
          pieces: ['black flowy maxi dress', 'minimal gold jewelry', 'black sandals'],
          occasion: 'professional bohemian, corporate',
          brands: ['The Row', 'Free People']
        },
        {
          id: 'prof_dark_boh_002',
          name: 'Charcoal Midi Dress',
          description: 'Charcoal midi dress with flowy sleeves, layered gold necklaces, black sandals',
          pieces: ['charcoal midi dress', 'layered gold necklaces', 'gold cuffs', 'black sandals'],
          occasion: 'brunch, casual event, gallery',
          brands: ['Free People', 'Anthropologie', 'The Row']
        },
        {
          id: 'prof_dark_boh_003',
          name: 'Black Layered Look',
          description: 'Black kimono cardigan, charcoal slip dress, gold jewelry, black sandals',
          pieces: ['black kimono cardigan', 'charcoal slip dress', 'layered gold jewelry', 'black sandals'],
          occasion: 'evening casual, creative gathering',
          brands: ['Free People', 'Anthropologie']
        }
      ],
      classic: [
        {
          id: 'prof_dark_cla_001',
          name: 'Timeless Black',
          description: 'Black blazer, white blouse, black trousers, black pumps',
          pieces: ['black blazer', 'white blouse', 'black trousers', 'black pumps'],
          occasion: 'timeless professional, corporate',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'prof_dark_cla_002',
          name: 'Charcoal Coat Classic',
          description: 'Charcoal wool coat, black sweater, charcoal trousers, black boots',
          pieces: ['charcoal wool coat', 'black cashmere sweater', 'charcoal trousers', 'black leather boots'],
          occasion: 'classic elegance, refined setting',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'prof_dark_cla_003',
          name: 'Black Suit Classic',
          description: 'Black tailored suit, white blouse, black pumps, gold jewelry',
          pieces: ['black tailored suit', 'white silk blouse', 'black pumps', 'gold jewelry'],
          occasion: 'professional, timeless elegance',
          brands: ['The Row', 'Toteme', 'Khaite']
        }
      ],
      trendy: [
        {
          id: 'prof_dark_tre_001',
          name: 'Modern Professional',
          description: 'Black oversized blazer, black bodysuit, black trousers, black boots',
          pieces: ['black oversized blazer', 'black bodysuit', 'black wide-leg trousers', 'black platform boots'],
          occasion: 'trendy professional, modern corporate',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'prof_dark_tre_002',
          name: 'Cropped Statement',
          description: 'Cropped black jacket, high-waisted black trousers, black sneakers, minimal gold jewelry',
          pieces: ['cropped black jacket', 'high-waisted black trousers', 'black designer sneakers', 'minimal gold jewelry'],
          occasion: 'trendy casual, modern setting',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'prof_dark_tre_003',
          name: 'Oversized Chic',
          description: 'Oversized charcoal coat, black tee, black jeans, black boots',
          pieces: ['oversized charcoal coat', 'black ribbed tank', 'black straight-leg jeans', 'black ankle boots'],
          occasion: 'trendy day out, modern casual',
          brands: ['The Row', 'Toteme', 'Celine']
        }
      ],
      athletic: [
        {
          id: 'prof_dark_ath_001',
          name: 'Professional Athleisure',
          description: 'Black athletic set, black blazer, black sneakers',
          pieces: ['black athletic set', 'black blazer', 'black designer sneakers'],
          occasion: 'professional athleisure, corporate active',
          brands: ['Alo', 'Lululemon', 'The Row']
        },
        {
          id: 'prof_dark_ath_002',
          name: 'Dark Active Power',
          description: 'Charcoal leggings, black ribbed top, oversized black hoodie, gold watch',
          pieces: ['charcoal high-waisted leggings', 'black ribbed sports bra', 'oversized black cashmere hoodie', 'black athletic sneakers', 'gold minimalist watch'],
          occasion: 'post-workout luxury, active lifestyle',
          brands: ['Alo', 'The Row', 'Outdoor Voices']
        },
        {
          id: 'prof_dark_ath_003',
          name: 'Black Athletic Dress',
          description: 'Black athletic dress, charcoal bomber jacket, black sneakers, black leather gym bag',
          pieces: ['black athletic dress', 'charcoal bomber jacket', 'black designer sneakers', 'black leather gym bag'],
          occasion: 'athleisure lifestyle, luxury active',
          brands: ['Alo', 'The Row', 'Lululemon']
        }
      ]
    },
    locations: [
      {
        id: 'prof_dark_loc_001',
        name: 'Singapore Financial District',
        description: 'Singapore financial district at night with dramatic evening city glow. Modern offices with corporate towers. CEO energy with sophisticated power.',
        lighting: 'dramatic evening city glow, high contrast',
        mood: 'corporate, powerful, dramatic',
        setting: 'outdoor'
      },
      {
        id: 'prof_dark_loc_002',
        name: 'Luxury Office',
        description: 'Luxury office with glass walls and city lights. Modern corporate setting with executive presence.',
        lighting: 'dramatic desk lamp, corporate luxury',
        mood: 'luxurious, corporate, sophisticated',
        setting: 'indoor'
      },
      {
        id: 'prof_dark_loc_003',
        name: 'Corporate Tower',
        description: 'Corporate tower with modern architecture. Evening city lights visible. Executive backdrop.',
        lighting: 'dramatic city lights, evening',
        mood: 'corporate, powerful, modern',
        setting: 'outdoor'
      },
      {
        id: 'prof_dark_loc_004',
        name: 'Executive Desk',
        description: 'Executive desk with laptop and espresso. Overhead view of luxury workspace. Desk lamp with evening ambiance.',
        lighting: 'desk lamp, evening workspace',
        mood: 'executive, focused, sophisticated',
        setting: 'indoor'
      },
      {
        id: 'prof_dark_loc_005',
        name: 'Modern Interior',
        description: 'Modern interior with black glass and city reflection. Corporate sophistication with dramatic lighting.',
        lighting: 'dramatic city reflection, evening',
        mood: 'corporate, modern, sophisticated',
        setting: 'indoor'
      }
    ],
    accessories: [
      {
        id: 'prof_dark_acc_001',
        name: 'Minimal Gold Professional',
        description: 'minimal gold watch, gold rings, black leather briefcase, professional accessories',
        items: ['minimal gold watch', 'gold rings', 'black leather briefcase', 'professional accessories'],
        vibe: 'professional_dark_moody'
      },
      {
        id: 'prof_dark_acc_002',
        name: 'Black Leather Executive',
        description: 'black leather briefcase, gold watch, minimal jewelry, executive elegance',
        items: ['black leather briefcase', 'gold watch', 'minimal jewelry', 'executive elegance items'],
        vibe: 'professional_dark_moody'
      },
      {
        id: 'prof_dark_acc_003',
        name: 'Corporate Accessories',
        description: 'black briefcase, gold watch, minimal gold jewelry, corporate sophistication',
        items: ['black briefcase', 'gold watch', 'minimal gold jewelry', 'corporate sophistication items'],
        vibe: 'professional_dark_moody'
      }
    ],
    colorPalette: [
      'deep blacks (corporate, powerful)',
      'charcoal grays (executive)',
      'gold accents (jewelry, hardware)',
      'dramatic city lights',
      'high contrast'
    ],
    textures: [
      'wool (suits, blazers - tailored sophistication)',
      'leather (briefcases, shoes - quality corporate)',
      'silk (blouses - refined elegance)',
      'suede (boots - luxury corporate)',
      'cashmere (coats - executive luxury)'
    ]
  },

  professional_light_minimalistic: {
    vibe: 'professional_light_minimalistic',
    fashionStyles: {
      business: [
        {
          id: 'prof_light_biz_001',
          name: 'White Professional Suit',
          description: 'White tailored blazer, cream trousers, white button-down, nude heels',
          pieces: ['white tailored blazer', 'cream trousers', 'white button-down shirt', 'nude heels'],
          occasion: 'bright professional, Swiss elegance',
          brands: ['The Row', 'Toteme', 'Khaite']
        },
        {
          id: 'prof_light_biz_002',
          name: 'White Executive',
          description: 'White suit, confident stride, minimal gold jewelry, cream leather bag',
          pieces: ['white suit', 'minimal gold jewelry', 'cream leather bag', 'nude heels'],
          occasion: 'executive presentation, refined elegance',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'prof_light_biz_003',
          name: 'Cream Power Dressing',
          description: 'Cream wool blazer, white trousers, white blouse, gold jewelry',
          pieces: ['cream wool blazer', 'white tailored trousers', 'white blouse', 'gold jewelry', 'nude heels'],
          occasion: 'executive setting, bright corporate',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'prof_light_biz_004',
          name: 'White Double-Breasted',
          description: 'White double-breasted blazer, matching trousers, cream button-down, beige boots',
          pieces: ['white double-breasted blazer', 'matching white trousers', 'cream button-down', 'beige boots', 'gold jewelry'],
          occasion: 'boardroom, high-stakes meeting',
          brands: ['The Row', 'Khaite', 'Toteme']
        }
      ],
      casual: [
        {
          id: 'prof_light_cas_001',
          name: 'White Professional Casual',
          description: 'White blazer, cream tee, white trousers, white sneakers',
          pieces: ['white blazer', 'cream tee', 'white trousers', 'white designer sneakers'],
          occasion: 'professional casual, bright corporate',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'prof_light_cas_002',
          name: 'Cream Relaxed',
          description: 'Cream cardigan, white tee, cream trousers, white sneakers',
          pieces: ['cream cardigan', 'white ribbed tank', 'cream trousers', 'white designer sneakers', 'cream tote'],
          occasion: 'evening casual, dinner, drinks',
          brands: ['The Row', 'Khaite', 'Toteme']
        },
        {
          id: 'prof_light_cas_003',
          name: 'White Oversized',
          description: 'White oversized blazer, cream tee, white jeans, beige sandals',
          pieces: ['white oversized blazer', 'cream ribbed tank', 'white straight-leg jeans', 'beige sandals', 'white bag'],
          occasion: 'casual day out, bright corporate',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'prof_light_cas_004',
          name: 'Cream Corporate',
          description: 'Cream sweater, white trousers, beige sandals, professional bag',
          pieces: ['cream cashmere sweater', 'white wide-leg trousers', 'beige sandals', 'professional cream bag'],
          occasion: 'casual day out, bright corporate',
          brands: ['The Row', 'Toteme']
        }
      ],
      bohemian: [
        {
          id: 'prof_light_boh_001',
          name: 'White Professional Boho',
          description: 'White maxi dress, minimal gold jewelry, white sandals',
          pieces: ['white flowy maxi dress', 'minimal gold jewelry', 'white sandals'],
          occasion: 'professional bohemian, bright corporate',
          brands: ['The Row', 'Free People']
        },
        {
          id: 'prof_light_boh_002',
          name: 'Cream Midi Dress',
          description: 'Cream midi dress with flowy sleeves, layered gold necklaces, white sandals',
          pieces: ['cream midi dress', 'layered gold necklaces', 'gold cuffs', 'white sandals'],
          occasion: 'brunch, casual event, gallery',
          brands: ['Free People', 'Anthropologie', 'The Row']
        },
        {
          id: 'prof_light_boh_003',
          name: 'Ivory Layered Look',
          description: 'Ivory kimono cardigan, white slip dress, gold jewelry, beige sandals',
          pieces: ['ivory kimono cardigan', 'white slip dress', 'layered gold jewelry', 'beige sandals'],
          occasion: 'evening casual, creative gathering',
          brands: ['Free People', 'Anthropologie']
        }
      ],
      classic: [
        {
          id: 'prof_light_cla_001',
          name: 'Timeless White',
          description: 'White blazer, white blouse, cream trousers, nude pumps',
          pieces: ['white blazer', 'white blouse', 'cream trousers', 'nude pumps'],
          occasion: 'timeless professional, contemporary polish',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'prof_light_cla_002',
          name: 'Cream Coat Classic',
          description: 'Cream wool coat, white sweater, beige trousers, tan boots',
          pieces: ['cream wool coat', 'white cashmere sweater', 'beige trousers', 'tan leather boots'],
          occasion: 'classic elegance, refined setting',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'prof_light_cla_003',
          name: 'Sophisticated Suit',
          description: 'Ivory suit, cream blouse, nude heels, gold jewelry',
          pieces: ['ivory tailored suit', 'cream silk blouse', 'nude heels', 'gold jewelry'],
          occasion: 'professional, timeless elegance',
          brands: ['The Row', 'Toteme', 'Khaite']
        }
      ],
      trendy: [
        {
          id: 'prof_light_tre_001',
          name: 'Modern Professional',
          description: 'White oversized blazer, cream bodysuit, white trousers, white boots',
          pieces: ['white oversized blazer', 'cream bodysuit', 'white wide-leg trousers', 'white platform boots'],
          occasion: 'trendy professional, modern corporate',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'prof_light_tre_002',
          name: 'Cropped Statement',
          description: 'Cropped white jacket, high-waisted cream trousers, white sneakers, minimal gold jewelry',
          pieces: ['cropped white jacket', 'high-waisted cream trousers', 'white designer sneakers', 'minimal gold jewelry'],
          occasion: 'trendy casual, modern setting',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'prof_light_tre_003',
          name: 'Oversized Chic',
          description: 'Oversized cream coat, white tee, white jeans, nude boots',
          pieces: ['oversized cream coat', 'white ribbed tank', 'white straight-leg jeans', 'nude ankle boots'],
          occasion: 'trendy day out, modern casual',
          brands: ['The Row', 'Toteme', 'Celine']
        }
      ],
      athletic: [
        {
          id: 'prof_light_ath_001',
          name: 'Professional Athleisure',
          description: 'White athletic set, white blazer, white sneakers',
          pieces: ['white athletic set', 'white blazer', 'white designer sneakers'],
          occasion: 'professional athleisure, bright corporate',
          brands: ['Alo', 'Lululemon', 'The Row']
        },
        {
          id: 'prof_light_ath_002',
          name: 'Bright Active Luxe',
          description: 'Cream leggings, white ribbed top, oversized white hoodie, gold watch',
          pieces: ['cream high-waisted leggings', 'white ribbed sports bra', 'oversized white cashmere hoodie', 'nude athletic sneakers', 'gold minimalist watch'],
          occasion: 'post-workout luxury, active lifestyle',
          brands: ['Alo', 'The Row', 'Outdoor Voices']
        },
        {
          id: 'prof_light_ath_003',
          name: 'White Athletic Dress',
          description: 'White athletic dress, cream bomber jacket, white sneakers, tan leather gym bag',
          pieces: ['white athletic dress', 'cream bomber jacket', 'white designer sneakers', 'tan leather gym bag'],
          occasion: 'athleisure lifestyle, luxury active',
          brands: ['Alo', 'The Row', 'Lululemon']
        }
      ]
    },
    locations: [
      {
        id: 'prof_light_loc_001',
        name: 'Zurich Modern Office',
        description: 'Zurich modern office with bright financial district. Clean contemporary architecture with natural light spaces. Bright Swiss daylight with refined elegance.',
        lighting: 'bright Swiss daylight, natural',
        mood: 'professional, bright, refined',
        setting: 'indoor'
      },
      {
        id: 'prof_light_loc_002',
        name: 'Bright Financial District',
        description: 'Bright financial district with modern offices. Clean contemporary architecture with natural light.',
        lighting: 'bright natural daylight',
        mood: 'professional, clean, bright',
        setting: 'outdoor'
      },
      {
        id: 'prof_light_loc_003',
        name: 'Bright Hallway',
        description: 'Bright hallway with modern design. Clean lines and natural light. Professional elegance.',
        lighting: 'bright natural daylight',
        mood: 'professional, clean, bright',
        setting: 'indoor'
      },
      {
        id: 'prof_light_loc_004',
        name: 'Bright Workspace',
        description: 'Bright workspace with laptop and tea. Overhead view of white desk. Bright daylight.',
        lighting: 'bright daylight, contemporary',
        mood: 'professional, focused, bright',
        setting: 'indoor'
      },
      {
        id: 'prof_light_loc_005',
        name: 'Modern Glass Door',
        description: 'Modern glass door with office reflection. Bright natural light. Professional elegance.',
        lighting: 'bright natural light, clean',
        mood: 'professional, modern, bright',
        setting: 'indoor'
      }
    ],
    accessories: [
      {
        id: 'prof_light_acc_001',
        name: 'Minimal Gold Professional',
        description: 'minimal gold necklace, gold pen, cream leather bag, professional elegance',
        items: ['minimal gold necklace', 'gold pen', 'cream leather bag', 'professional elegance items'],
        vibe: 'professional_light_minimalistic'
      },
      {
        id: 'prof_light_acc_002',
        name: 'Cream Leather Professional',
        description: 'cream leather bag, minimal gold jewelry, white accessories, refined elegance',
        items: ['cream leather bag', 'minimal gold jewelry', 'white accessories', 'refined elegance items'],
        vibe: 'professional_light_minimalistic'
      },
      {
        id: 'prof_light_acc_003',
        name: 'White Professional Accessories',
        description: 'white bag, gold jewelry, minimal accessories, contemporary polish',
        items: ['white bag', 'gold jewelry', 'minimal accessories', 'contemporary polish items'],
        vibe: 'professional_light_minimalistic'
      }
    ],
    colorPalette: [
      'bright whites (fresh, sophisticated)',
      'soft creams (refined elegance)',
      'gentle shadows',
      'natural Swiss daylight',
      'minimal grain'
    ],
    textures: [
      'wool (blazers, suits - tailored polish)',
      'silk (blouses - refined elegance)',
      'leather (bags, shoes - quality professional)',
      'cotton (tees, shirts - clean)',
      'cashmere (coats - executive luxury)'
    ]
  },

  professional_beige_aesthetic: {
    vibe: 'professional_beige_aesthetic',
    fashionStyles: {
      business: [
        {
          id: 'prof_beige_biz_001',
          name: 'Camel Professional Suit',
          description: 'Camel blazer, beige trousers, cream blouse, nude heels',
          pieces: ['camel blazer', 'beige trousers', 'cream blouse', 'nude heels'],
          occasion: 'classic professional, Mayfair elegance',
          brands: ['The Row', 'Toteme', 'Khaite']
        },
        {
          id: 'prof_beige_biz_002',
          name: 'Beige Tailored',
          description: 'Beige suit, leather chair, gold jewelry, tan leather bag',
          pieces: ['beige suit', 'gold jewelry', 'tan leather bag', 'nude heels'],
          occasion: 'professional working, established elegance',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'prof_beige_biz_003',
          name: 'Camel Power Dressing',
          description: 'Camel wool blazer, beige trousers, cream blouse, gold jewelry',
          pieces: ['camel wool blazer', 'beige tailored trousers', 'cream blouse', 'gold jewelry', 'tan heels'],
          occasion: 'executive setting, classic elegance',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'prof_beige_biz_004',
          name: 'Beige Double-Breasted',
          description: 'Beige double-breasted blazer, matching trousers, cream button-down, tan boots',
          pieces: ['beige double-breasted blazer', 'matching beige trousers', 'cream button-down', 'tan boots', 'gold jewelry'],
          occasion: 'boardroom, high-stakes meeting',
          brands: ['The Row', 'Khaite', 'Toteme']
        }
      ],
      casual: [
        {
          id: 'prof_beige_cas_001',
          name: 'Camel Professional Casual',
          description: 'Camel blazer, cream blouse, beige trousers, nude heels',
          pieces: ['camel blazer', 'cream blouse', 'beige trousers', 'nude heels'],
          occasion: 'professional casual, classic elegance',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'prof_beige_cas_002',
          name: 'Beige Relaxed',
          description: 'Beige cardigan, camel tee, beige trousers, tan sneakers',
          pieces: ['beige cardigan', 'camel ribbed tank', 'beige trousers', 'tan designer sneakers', 'camel tote'],
          occasion: 'evening casual, dinner, drinks',
          brands: ['The Row', 'Khaite', 'Toteme']
        },
        {
          id: 'prof_beige_cas_003',
          name: 'Camel Oversized',
          description: 'Camel oversized blazer, beige tee, tan jeans, tan sandals',
          pieces: ['camel oversized blazer', 'beige ribbed tank', 'tan straight-leg jeans', 'tan sandals', 'beige bag'],
          occasion: 'casual day out, classic corporate',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'prof_beige_cas_004',
          name: 'Beige Classic',
          description: 'Beige sweater, camel trousers, tan boots, professional bag',
          pieces: ['beige cashmere sweater', 'camel wide-leg trousers', 'tan leather boots', 'professional beige bag'],
          occasion: 'casual day out, classic corporate',
          brands: ['The Row', 'Toteme']
        }
      ],
      bohemian: [
        {
          id: 'prof_beige_boh_001',
          name: 'Camel Professional Boho',
          description: 'Camel maxi dress, gold jewelry, tan sandals',
          pieces: ['camel flowy maxi dress', 'gold jewelry', 'tan sandals'],
          occasion: 'professional bohemian, classic',
          brands: ['The Row', 'Free People']
        },
        {
          id: 'prof_beige_boh_002',
          name: 'Beige Midi Dress',
          description: 'Beige midi dress with flowy sleeves, layered gold necklaces, tan sandals',
          pieces: ['beige midi dress', 'layered gold necklaces', 'gold cuffs', 'tan sandals'],
          occasion: 'brunch, casual event, gallery',
          brands: ['Free People', 'Anthropologie', 'The Row']
        },
        {
          id: 'prof_beige_boh_003',
          name: 'Camel Layered Look',
          description: 'Camel kimono cardigan, beige slip dress, gold jewelry, tan sandals',
          pieces: ['camel kimono cardigan', 'beige slip dress', 'layered gold jewelry', 'tan sandals'],
          occasion: 'evening casual, creative gathering',
          brands: ['Free People', 'Anthropologie']
        }
      ],
      classic: [
        {
          id: 'prof_beige_cla_001',
          name: 'Timeless Camel',
          description: 'Camel coat, cream sweater, beige trousers, tan boots',
          pieces: ['camel coat', 'cream sweater', 'beige trousers', 'tan boots'],
          occasion: 'timeless professional, established elegance',
          brands: ['The Row', 'Toteme']
        },
        {
          id: 'prof_beige_cla_002',
          name: 'Beige Suit Classic',
          description: 'Beige tailored suit, cream blouse, tan heels, gold jewelry',
          pieces: ['beige tailored suit', 'cream silk blouse', 'tan heels', 'gold jewelry'],
          occasion: 'professional, timeless elegance',
          brands: ['The Row', 'Toteme', 'Khaite']
        },
        {
          id: 'prof_beige_cla_003',
          name: 'Camel Blazer Classic',
          description: 'Camel blazer, beige blouse, cream trousers, nude pumps',
          pieces: ['camel blazer', 'beige silk blouse', 'cream trousers', 'nude pumps'],
          occasion: 'classic elegance, refined setting',
          brands: ['The Row', 'Toteme']
        }
      ],
      trendy: [
        {
          id: 'prof_beige_tre_001',
          name: 'Modern Professional',
          description: 'Camel oversized blazer, beige bodysuit, tan trousers, camel boots',
          pieces: ['camel oversized blazer', 'beige bodysuit', 'tan wide-leg trousers', 'camel platform boots'],
          occasion: 'trendy professional, modern classic',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'prof_beige_tre_002',
          name: 'Cropped Statement',
          description: 'Cropped camel jacket, high-waisted beige trousers, tan sneakers, minimal gold jewelry',
          pieces: ['cropped camel jacket', 'high-waisted beige trousers', 'tan designer sneakers', 'minimal gold jewelry'],
          occasion: 'trendy casual, modern setting',
          brands: ['The Row', 'Khaite']
        },
        {
          id: 'prof_beige_tre_003',
          name: 'Oversized Chic',
          description: 'Oversized tan coat, beige tee, camel jeans, tan boots',
          pieces: ['oversized tan coat', 'beige ribbed tank', 'camel straight-leg jeans', 'tan ankle boots'],
          occasion: 'trendy day out, modern casual',
          brands: ['The Row', 'Toteme', 'Celine']
        }
      ],
      athletic: [
        {
          id: 'prof_beige_ath_001',
          name: 'Professional Athleisure',
          description: 'Camel athletic set, beige blazer, tan sneakers',
          pieces: ['camel athletic set', 'beige blazer', 'tan designer sneakers'],
          occasion: 'professional athleisure, classic active',
          brands: ['Alo', 'Lululemon', 'The Row']
        },
        {
          id: 'prof_beige_ath_002',
          name: 'Camel Active Luxe',
          description: 'Camel leggings, beige ribbed top, oversized tan hoodie, gold watch',
          pieces: ['camel high-waisted leggings', 'beige ribbed sports bra', 'oversized tan cashmere hoodie', 'nude athletic sneakers', 'gold minimalist watch'],
          occasion: 'post-workout luxury, active lifestyle',
          brands: ['Alo', 'The Row', 'Outdoor Voices']
        },
        {
          id: 'prof_beige_ath_003',
          name: 'Sand Athletic Dress',
          description: 'Sand athletic dress, camel bomber jacket, beige sneakers, tan leather gym bag',
          pieces: ['sand athletic dress', 'camel bomber jacket', 'beige designer sneakers', 'tan leather gym bag'],
          occasion: 'athleisure lifestyle, luxury active',
          brands: ['Alo', 'The Row', 'Lululemon']
        }
      ]
    },
    locations: [
      {
        id: 'prof_beige_loc_001',
        name: 'Mayfair London Office',
        description: 'Mayfair London office with classic architecture. Traditional business district with natural London daylight. Established elegance with timeless quality.',
        lighting: 'natural London daylight, warm',
        mood: 'classic, established, elegant',
        setting: 'indoor'
      },
      {
        id: 'prof_beige_loc_002',
        name: 'Traditional Business District',
        description: 'Traditional business district with classic architecture. Natural light interiors with established elegance.',
        lighting: 'natural afternoon light, warm',
        mood: 'classic, traditional, elegant',
        setting: 'outdoor'
      },
      {
        id: 'prof_beige_loc_003',
        name: 'Classic Hallway',
        description: 'Classic hallway with traditional design. Natural light and warm tones. Established elegance.',
        lighting: 'natural daylight, warm',
        mood: 'classic, elegant, traditional',
        setting: 'indoor'
      },
      {
        id: 'prof_beige_loc_004',
        name: 'Classic Workspace',
        description: 'Classic workspace with coffee and leather journal. Overhead view of wood desk. Warm daylight from window.',
        lighting: 'warm daylight from window',
        mood: 'classic, focused, elegant',
        setting: 'indoor'
      },
      {
        id: 'prof_beige_loc_005',
        name: 'Traditional Mirror',
        description: 'Traditional mirror with warm bathroom light. Classic styling with established elegance.',
        lighting: 'warm natural bathroom light',
        mood: 'classic, elegant, traditional',
        setting: 'indoor'
      }
    ],
    accessories: [
      {
        id: 'prof_beige_acc_001',
        name: 'Classic Gold Professional',
        description: 'gold watch, gold rings, tan leather bag, classic accessories',
        items: ['gold watch', 'gold rings', 'tan leather bag', 'classic accessories'],
        vibe: 'professional_beige_aesthetic'
      },
      {
        id: 'prof_beige_acc_002',
        name: 'Tan Leather Classic',
        description: 'tan leather bag, gold jewelry, classic accessories, established elegance',
        items: ['tan leather bag', 'gold jewelry', 'classic accessories', 'established elegance items'],
        vibe: 'professional_beige_aesthetic'
      },
      {
        id: 'prof_beige_acc_003',
        name: 'Camel Professional Accessories',
        description: 'camel bag, gold jewelry, beige accessories, timeless quality',
        items: ['camel bag', 'gold jewelry', 'beige accessories', 'timeless quality items'],
        vibe: 'professional_beige_aesthetic'
      }
    ],
    colorPalette: [
      'warm camels (classic, established)',
      'classic beiges (timeless sophistication)',
      'cream highlights',
      'natural London daylight',
      'soft shadows'
    ],
    textures: [
      'wool (blazers, coats - luxury tailoring)',
      'cashmere (sweaters - timeless luxury)',
      'leather (bags, boots - quality classic)',
      'silk (blouses - refined elegance)',
      'suede (boots - buttery classic)'
    ]
  },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get vibe library for a specific vibe key
 * @param vibe - Vibe key (e.g., 'luxury_dark_moody')
 * @returns Vibe library or undefined if not found
 */
export function getVibeLibrary(vibe: string): VibeLibrary | undefined {
  return VIBE_LIBRARIES[vibe as VibeKey]
}

/**
 * Get outfits for a specific vibe and fashion style
 * @param vibe - Vibe key (e.g., 'luxury_dark_moody')
 * @param style - Fashion style (e.g., 'business')
 * @returns Array of outfit formulas or empty array
 */
export function getOutfitsByStyle(vibe: string, style: string): OutfitFormula[] {
  const library = getVibeLibrary(vibe)
  if (!library) {
    return []
  }

  const fashionStyle = style as FashionStyle
  return library.fashionStyles[fashionStyle] || []
}

/**
 * Get random outfit for a specific vibe and fashion style
 * @param vibe - Vibe key (e.g., 'luxury_dark_moody')
 * @param style - Fashion style (e.g., 'business')
 * @returns Outfit formula or undefined if not found
 */
export function getRandomOutfit(vibe: string, style: string): OutfitFormula | undefined {
  const outfits = getOutfitsByStyle(vibe, style)
  if (outfits.length === 0) {
    return undefined
  }

  const randomIndex = Math.floor(Math.random() * outfits.length)
  return outfits[randomIndex]
}

/**
 * Get random location for a specific vibe
 * @param vibe - Vibe key (e.g., 'luxury_dark_moody')
 * @returns Location description or undefined if not found
 */
export function getRandomLocation(vibe: string): LocationDescription | undefined {
  const library = getVibeLibrary(vibe)
  if (!library || library.locations.length === 0) {
    return undefined
  }

  const randomIndex = Math.floor(Math.random() * library.locations.length)
  return library.locations[randomIndex]
}

/**
 * Get random accessory set for a specific vibe
 * @param vibe - Vibe key (e.g., 'luxury_dark_moody')
 * @returns Accessory set or undefined if not found
 */
export function getRandomAccessorySet(vibe: string): AccessorySet | undefined {
  const library = getVibeLibrary(vibe)
  if (!library || library.accessories.length === 0) {
    return undefined
  }

  const randomIndex = Math.floor(Math.random() * library.accessories.length)
  return library.accessories[randomIndex]
}
