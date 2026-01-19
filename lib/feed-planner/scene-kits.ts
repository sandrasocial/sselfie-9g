/**
 * Scene Kit System
 * 
 * Replaces "template free-for-all" with curated scene packs that ensure coherence.
 * Each SceneKit contains 9 scenes that belong together - no mixing across kits.
 * 
 * Structure:
 * - Each kit has 9 scenes with required scene types
 * - Scenes have structured metadata (locations, outfit modes, banned materials)
 * - Scene kits are selected based on category + mood + fashionStyle
 */

export type SceneType = 'portrait' | 'movement' | 'detail' | 'environment'
export type FrameType = 'full' | 'mid' | 'closeup' | 'detail'
export type OutfitMode = 'activewear' | 'elevated_athleisure' | 'casual' | 'classic' | 'business' | 'wellness'
export type KitId = 
  | 'athletic_minimal'
  | 'athletic_warm'
  | 'athletic_luxury'
  | 'wellness_minimal'
  | 'wellness_warm'
  | 'casual_minimal'
  | 'casual_warm'
  | 'luxury_classic'
  | 'business_classic'
  | 'minimal_classic'

export interface SceneKitScene {
  id: string
  sceneType: SceneType
  frameType: FrameType
  allowedLocations: string[]
  bannedLocations: string[]
  outfitMode: OutfitMode
  bannedMaterials: string[] // e.g., cashmere for pure gym scenes
  optionalProps: string[]
  descriptionTemplate: string
}

export interface SceneKit {
  id: KitId
  category: string
  mood: string
  fashionStyle: string
  scenes: SceneKitScene[]
}

// ============================================================================
// SCENE KIT DEFINITIONS
// ============================================================================

export const SCENE_KITS: Record<KitId, SceneKit> = {
  // ==========================================================================
  // ATHLETIC KITS
  // ==========================================================================
  
  athletic_minimal: {
    id: 'athletic_minimal',
    category: 'minimal',
    mood: 'minimal',
    fashionStyle: 'athletic',
    scenes: [
      {
        id: 'athletic_minimal_1',
        sceneType: 'portrait',
        frameType: 'full',
        allowedLocations: ['gym', 'studio', 'minimal space', 'architectural', 'outdoor track'],
        bannedLocations: ['gallery', 'office', 'cafe', 'conference room'],
        outfitMode: 'activewear',
        bannedMaterials: ['cashmere', 'cardigan', 'blazer', 'trench', 'silk blouse'],
        optionalProps: ['water bottle', 'towel'],
        descriptionTemplate: 'standing confidently in matching athletic set, minimalist gym aesthetic'
      },
      {
        id: 'athletic_minimal_2',
        sceneType: 'detail',
        frameType: 'detail',
        allowedLocations: ['minimal surface', 'clean surface'],
        bannedLocations: ['desk', 'workspace'],
        outfitMode: 'activewear',
        bannedMaterials: ['laptop', 'coffee', 'notebook'],
        optionalProps: ['water bottle', 'white sneakers', 'gym gloves'],
        descriptionTemplate: 'overhead lifestyle detail photo featuring water bottle, white sneakers, and gym essentials arranged naturally on clean surface'
      },
      {
        id: 'athletic_minimal_3',
        sceneType: 'portrait',
        frameType: 'mid',
        allowedLocations: ['gym', 'studio', 'minimal space'],
        bannedLocations: ['gallery', 'office'],
        outfitMode: 'activewear',
        bannedMaterials: ['cashmere', 'cardigan', 'blazer'],
        optionalProps: ['resistance bands'],
        descriptionTemplate: 'mid-shot in athletic wear, natural movement pose, clean minimal background'
      },
      {
        id: 'athletic_minimal_4',
        sceneType: 'movement',
        frameType: 'full',
        allowedLocations: ['outdoor track', 'park', 'gym', 'studio'],
        bannedLocations: ['gallery', 'office', 'cafe'],
        outfitMode: 'activewear',
        bannedMaterials: ['cashmere', 'cardigan', 'blazer'],
        optionalProps: [],
        descriptionTemplate: 'walking naturally in athletic set, dynamic movement, outdoor or gym setting'
      },
      {
        id: 'athletic_minimal_5',
        sceneType: 'environment',
        frameType: 'full',
        allowedLocations: ['minimal architectural space', 'gym entrance', 'studio'],
        bannedLocations: ['gallery', 'office'],
        outfitMode: 'activewear',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'standing in minimal architectural space, establishing location, athletic context'
      },
      {
        id: 'athletic_minimal_6',
        sceneType: 'detail',
        frameType: 'detail',
        allowedLocations: ['minimal surface'],
        bannedLocations: ['desk'],
        outfitMode: 'activewear',
        bannedMaterials: ['laptop', 'coffee'],
        optionalProps: ['folded activewear', 'phone with fitness app'],
        descriptionTemplate: 'overhead detail photo of folded activewear and phone with fitness app visible on minimal surface'
      },
      {
        id: 'athletic_minimal_7',
        sceneType: 'portrait',
        frameType: 'closeup',
        allowedLocations: ['gym', 'studio'],
        bannedLocations: ['gallery'],
        outfitMode: 'activewear',
        bannedMaterials: ['cashmere', 'cardigan'],
        optionalProps: [],
        descriptionTemplate: 'close-up portrait in athletic wear, natural expression, gym or studio background'
      },
      {
        id: 'athletic_minimal_8',
        sceneType: 'movement',
        frameType: 'mid',
        allowedLocations: ['gym', 'studio', 'outdoor'],
        bannedLocations: ['gallery', 'office'],
        outfitMode: 'activewear',
        bannedMaterials: ['cashmere', 'blazer'],
        optionalProps: [],
        descriptionTemplate: 'mid-shot movement scene, athletic pose, gym or outdoor setting'
      },
      {
        id: 'athletic_minimal_9',
        sceneType: 'environment',
        frameType: 'full',
        allowedLocations: ['wellness space', 'fitness studio', 'minimal home workout corner'],
        bannedLocations: ['gallery', 'office'],
        outfitMode: 'activewear',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'environmental scene establishing wellness space, minimal aesthetic, athletic context'
      }
    ]
  },

  athletic_warm: {
    id: 'athletic_warm',
    category: 'warm',
    mood: 'warm',
    fashionStyle: 'athletic',
    scenes: [
      {
        id: 'athletic_warm_1',
        sceneType: 'portrait',
        frameType: 'full',
        allowedLocations: ['gym', 'studio', 'outdoor', 'park', 'wellness space'],
        bannedLocations: ['gallery', 'office'],
        outfitMode: 'activewear',
        bannedMaterials: ['cashmere', 'cardigan', 'blazer'],
        optionalProps: ['water bottle', 'towel'],
        descriptionTemplate: 'standing confidently in warm-toned athletic set, natural lighting'
      },
      {
        id: 'athletic_warm_2',
        sceneType: 'detail',
        frameType: 'detail',
        allowedLocations: ['warm surface', 'natural surface'],
        bannedLocations: ['desk'],
        outfitMode: 'activewear',
        bannedMaterials: ['laptop', 'coffee'],
        optionalProps: ['herbal tea', 'towel', 'warm-toned activewear'],
        descriptionTemplate: 'overhead lifestyle detail photo featuring herbal tea, towel, and warm-toned activewear on natural surface'
      },
      {
        id: 'athletic_warm_3',
        sceneType: 'portrait',
        frameType: 'mid',
        allowedLocations: ['gym', 'studio', 'outdoor'],
        bannedLocations: ['gallery'],
        outfitMode: 'activewear',
        bannedMaterials: ['cashmere', 'cardigan'],
        optionalProps: [],
        descriptionTemplate: 'mid-shot in warm athletic wear, cozy movement pose'
      },
      {
        id: 'athletic_warm_4',
        sceneType: 'movement',
        frameType: 'full',
        allowedLocations: ['park', 'outdoor', 'gym'],
        bannedLocations: ['gallery', 'office'],
        outfitMode: 'activewear',
        bannedMaterials: ['cashmere', 'blazer'],
        optionalProps: [],
        descriptionTemplate: 'walking naturally in warm athletic set, outdoor movement, natural lighting'
      },
      {
        id: 'athletic_warm_5',
        sceneType: 'environment',
        frameType: 'full',
        allowedLocations: ['wellness space', 'fitness studio'],
        bannedLocations: ['gallery'],
        outfitMode: 'activewear',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'environmental scene establishing warm wellness space'
      },
      {
        id: 'athletic_warm_6',
        sceneType: 'detail',
        frameType: 'detail',
        allowedLocations: ['warm surface'],
        bannedLocations: ['desk'],
        outfitMode: 'activewear',
        bannedMaterials: ['laptop'],
        optionalProps: ['cozy gym outfit details', 'soft lighting on wellness items'],
        descriptionTemplate: 'overhead detail photo of cozy gym outfit details and wellness items on warm surface'
      },
      {
        id: 'athletic_warm_7',
        sceneType: 'portrait',
        frameType: 'closeup',
        allowedLocations: ['gym', 'studio'],
        bannedLocations: ['gallery'],
        outfitMode: 'activewear',
        bannedMaterials: ['cashmere'],
        optionalProps: [],
        descriptionTemplate: 'close-up portrait in warm athletic wear, natural expression'
      },
      {
        id: 'athletic_warm_8',
        sceneType: 'movement',
        frameType: 'mid',
        allowedLocations: ['outdoor', 'park'],
        bannedLocations: ['gallery'],
        outfitMode: 'activewear',
        bannedMaterials: ['blazer'],
        optionalProps: [],
        descriptionTemplate: 'mid-shot movement scene, warm athletic pose'
      },
      {
        id: 'athletic_warm_9',
        sceneType: 'environment',
        frameType: 'full',
        allowedLocations: ['wellness space', 'outdoor'],
        bannedLocations: ['gallery'],
        outfitMode: 'activewear',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'environmental scene establishing warm outdoor wellness space'
      }
    ]
  },

  athletic_luxury: {
    id: 'athletic_luxury',
    category: 'luxury',
    mood: 'luxury',
    fashionStyle: 'elevated_athleisure',
    scenes: [
      {
        id: 'athletic_luxury_1',
        sceneType: 'portrait',
        frameType: 'full',
        allowedLocations: ['luxury gym', 'modern spa gym', 'architectural', 'minimal space'],
        bannedLocations: ['gallery', 'office'],
        outfitMode: 'elevated_athleisure',
        bannedMaterials: [], // Elevated athleisure CAN include luxury materials
        optionalProps: ['designer gym bag'],
        descriptionTemplate: 'standing confidently in elevated athleisure, luxury gym aesthetic, sophisticated pose'
      },
      {
        id: 'athletic_luxury_2',
        sceneType: 'detail',
        frameType: 'detail',
        allowedLocations: ['polished surface', 'marble surface'],
        bannedLocations: ['desk'],
        outfitMode: 'elevated_athleisure',
        bannedMaterials: ['laptop', 'coffee'],
        optionalProps: ['neutral-toned gym wear', 'ceramic water bottle', 'designer smartwatch'],
        descriptionTemplate: 'overhead lifestyle detail photo featuring neutral-toned gym wear, ceramic water bottle, and designer smartwatch on polished surface'
      },
      {
        id: 'athletic_luxury_3',
        sceneType: 'portrait',
        frameType: 'mid',
        allowedLocations: ['luxury gym', 'architectural'],
        bannedLocations: ['gallery'],
        outfitMode: 'elevated_athleisure',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'mid-shot in elevated athleisure, sophisticated movement pose, luxury setting'
      },
      {
        id: 'athletic_luxury_4',
        sceneType: 'movement',
        frameType: 'full',
        allowedLocations: ['luxury gym', 'architectural', 'minimal space'],
        bannedLocations: ['gallery'],
        outfitMode: 'elevated_athleisure',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'walking naturally in elevated athleisure, luxury gym setting, sophisticated movement'
      },
      {
        id: 'athletic_luxury_5',
        sceneType: 'environment',
        frameType: 'full',
        allowedLocations: ['luxury gym', 'modern spa gym', 'architectural'],
        bannedLocations: ['gallery'],
        outfitMode: 'elevated_athleisure',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'environmental scene establishing luxury gym space, architectural aesthetic'
      },
      {
        id: 'athletic_luxury_6',
        sceneType: 'detail',
        frameType: 'detail',
        allowedLocations: ['marble surface', 'stone surface'],
        bannedLocations: ['desk'],
        outfitMode: 'elevated_athleisure',
        bannedMaterials: ['laptop'],
        optionalProps: ['leather gym bag detail', 'monochrome sneakers', 'high-end earbuds'],
        descriptionTemplate: 'overhead detail photo of leather gym bag detail, monochrome sneakers, and high-end earbuds on marble surface'
      },
      {
        id: 'athletic_luxury_7',
        sceneType: 'portrait',
        frameType: 'closeup',
        allowedLocations: ['luxury gym', 'architectural'],
        bannedLocations: ['gallery'],
        outfitMode: 'elevated_athleisure',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'close-up portrait in elevated athleisure, sophisticated expression, luxury setting'
      },
      {
        id: 'athletic_luxury_8',
        sceneType: 'movement',
        frameType: 'mid',
        allowedLocations: ['luxury gym', 'architectural'],
        bannedLocations: ['gallery'],
        outfitMode: 'elevated_athleisure',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'mid-shot movement scene, elevated athleisure pose, luxury aesthetic'
      },
      {
        id: 'athletic_luxury_9',
        sceneType: 'environment',
        frameType: 'full',
        allowedLocations: ['modern spa gym', 'architectural'],
        bannedLocations: ['gallery'],
        outfitMode: 'elevated_athleisure',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'environmental scene establishing modern spa gym, luxury wellness aesthetic'
      }
    ]
  },

  // ==========================================================================
  // WELLNESS KITS
  // ==========================================================================
  
  wellness_minimal: {
    id: 'wellness_minimal',
    category: 'minimal',
    mood: 'minimal',
    fashionStyle: 'wellness',
    scenes: [
      {
        id: 'wellness_minimal_1',
        sceneType: 'portrait',
        frameType: 'full',
        allowedLocations: ['wellness space', 'studio', 'minimal space', 'pilates studio'],
        bannedLocations: ['gallery', 'office', 'gym'],
        outfitMode: 'wellness',
        bannedMaterials: ['cashmere', 'cardigan', 'blazer'],
        optionalProps: ['yoga mat'],
        descriptionTemplate: 'standing in wellness wear, minimal studio aesthetic, peaceful pose'
      },
      {
        id: 'wellness_minimal_2',
        sceneType: 'detail',
        frameType: 'detail',
        allowedLocations: ['clean surface'],
        bannedLocations: ['desk'],
        outfitMode: 'wellness',
        bannedMaterials: ['laptop', 'coffee'],
        optionalProps: ['green juice', 'yoga mat edge', 'resistance bands'],
        descriptionTemplate: 'overhead lifestyle detail photo featuring green juice, yoga mat edge, and resistance bands on clean surface'
      },
      {
        id: 'wellness_minimal_3',
        sceneType: 'portrait',
        frameType: 'mid',
        allowedLocations: ['wellness space', 'studio'],
        bannedLocations: ['gallery'],
        outfitMode: 'wellness',
        bannedMaterials: ['cashmere'],
        optionalProps: [],
        descriptionTemplate: 'mid-shot in wellness wear, peaceful movement pose, minimal background'
      },
      {
        id: 'wellness_minimal_4',
        sceneType: 'movement',
        frameType: 'full',
        allowedLocations: ['wellness space', 'studio', 'outdoor'],
        bannedLocations: ['gallery', 'office'],
        outfitMode: 'wellness',
        bannedMaterials: ['blazer'],
        optionalProps: [],
        descriptionTemplate: 'movement scene in wellness wear, peaceful flow, wellness space setting'
      },
      {
        id: 'wellness_minimal_5',
        sceneType: 'environment',
        frameType: 'full',
        allowedLocations: ['wellness space', 'pilates studio', 'minimal space'],
        bannedLocations: ['gallery'],
        outfitMode: 'wellness',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'environmental scene establishing minimal wellness space'
      },
      {
        id: 'wellness_minimal_6',
        sceneType: 'detail',
        frameType: 'detail',
        allowedLocations: ['minimal surface'],
        bannedLocations: ['desk'],
        outfitMode: 'wellness',
        bannedMaterials: ['laptop'],
        optionalProps: ['smoothie bowl', 'wellness accessories'],
        descriptionTemplate: 'overhead detail photo of smoothie bowl and wellness accessories on minimal surface'
      },
      {
        id: 'wellness_minimal_7',
        sceneType: 'portrait',
        frameType: 'closeup',
        allowedLocations: ['wellness space', 'studio'],
        bannedLocations: ['gallery'],
        outfitMode: 'wellness',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'close-up portrait in wellness wear, peaceful expression'
      },
      {
        id: 'wellness_minimal_8',
        sceneType: 'movement',
        frameType: 'mid',
        allowedLocations: ['wellness space', 'studio'],
        bannedLocations: ['gallery'],
        outfitMode: 'wellness',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'mid-shot movement scene, wellness pose, peaceful aesthetic'
      },
      {
        id: 'wellness_minimal_9',
        sceneType: 'environment',
        frameType: 'full',
        allowedLocations: ['wellness space', 'minimal space'],
        bannedLocations: ['gallery'],
        outfitMode: 'wellness',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'environmental scene establishing minimal wellness environment'
      }
    ]
  },

  wellness_warm: {
    id: 'wellness_warm',
    category: 'warm',
    mood: 'warm',
    fashionStyle: 'wellness',
    scenes: [
      {
        id: 'wellness_warm_1',
        sceneType: 'portrait',
        frameType: 'full',
        allowedLocations: ['wellness space', 'studio', 'outdoor'],
        bannedLocations: ['gallery', 'office'],
        outfitMode: 'wellness',
        bannedMaterials: ['cashmere', 'blazer'],
        optionalProps: ['yoga mat'],
        descriptionTemplate: 'standing in warm wellness wear, cozy studio aesthetic'
      },
      {
        id: 'wellness_warm_2',
        sceneType: 'detail',
        frameType: 'detail',
        allowedLocations: ['warm surface'],
        bannedLocations: ['desk'],
        outfitMode: 'wellness',
        bannedMaterials: ['laptop'],
        optionalProps: ['herbal tea', 'warm blanket', 'wellness items'],
        descriptionTemplate: 'overhead lifestyle detail photo featuring herbal tea, warm blanket, and wellness items on warm surface'
      },
      {
        id: 'wellness_warm_3',
        sceneType: 'portrait',
        frameType: 'mid',
        allowedLocations: ['wellness space', 'studio'],
        bannedLocations: ['gallery'],
        outfitMode: 'wellness',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'mid-shot in warm wellness wear, cozy movement pose'
      },
      {
        id: 'wellness_warm_4',
        sceneType: 'movement',
        frameType: 'full',
        allowedLocations: ['wellness space', 'outdoor'],
        bannedLocations: ['gallery'],
        outfitMode: 'wellness',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'movement scene in warm wellness wear, peaceful flow'
      },
      {
        id: 'wellness_warm_5',
        sceneType: 'environment',
        frameType: 'full',
        allowedLocations: ['wellness space', 'outdoor'],
        bannedLocations: ['gallery'],
        outfitMode: 'wellness',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'environmental scene establishing warm wellness space'
      },
      {
        id: 'wellness_warm_6',
        sceneType: 'detail',
        frameType: 'detail',
        allowedLocations: ['warm surface'],
        bannedLocations: ['desk'],
        outfitMode: 'wellness',
        bannedMaterials: [],
        optionalProps: ['cozy wellness items'],
        descriptionTemplate: 'overhead detail photo of cozy wellness items on warm surface'
      },
      {
        id: 'wellness_warm_7',
        sceneType: 'portrait',
        frameType: 'closeup',
        allowedLocations: ['wellness space'],
        bannedLocations: ['gallery'],
        outfitMode: 'wellness',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'close-up portrait in warm wellness wear'
      },
      {
        id: 'wellness_warm_8',
        sceneType: 'movement',
        frameType: 'mid',
        allowedLocations: ['wellness space'],
        bannedLocations: ['gallery'],
        outfitMode: 'wellness',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'mid-shot movement scene, warm wellness pose'
      },
      {
        id: 'wellness_warm_9',
        sceneType: 'environment',
        frameType: 'full',
        allowedLocations: ['wellness space'],
        bannedLocations: ['gallery'],
        outfitMode: 'wellness',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'environmental scene establishing warm wellness environment'
      }
    ]
  },

  // ==========================================================================
  // CASUAL KITS
  // ==========================================================================
  
  casual_minimal: {
    id: 'casual_minimal',
    category: 'minimal',
    mood: 'minimal',
    fashionStyle: 'casual',
    scenes: [
      {
        id: 'casual_minimal_1',
        sceneType: 'portrait',
        frameType: 'full',
        allowedLocations: ['cafe', 'street', 'minimal space', 'home'],
        bannedLocations: ['gym', 'gallery'],
        outfitMode: 'casual',
        bannedMaterials: [],
        optionalProps: ['coffee'],
        descriptionTemplate: 'standing confidently in casual minimal outfit, relaxed pose'
      },
      {
        id: 'casual_minimal_2',
        sceneType: 'detail',
        frameType: 'detail',
        allowedLocations: ['clean surface', 'cafe table'],
        bannedLocations: [],
        outfitMode: 'casual',
        bannedMaterials: [],
        optionalProps: ['coffee', 'pastry', 'phone'],
        descriptionTemplate: 'overhead lifestyle detail photo featuring coffee, pastry, and phone on cafe table'
      },
      {
        id: 'casual_minimal_3',
        sceneType: 'portrait',
        frameType: 'mid',
        allowedLocations: ['cafe', 'street', 'home'],
        bannedLocations: ['gym'],
        outfitMode: 'casual',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'mid-shot in casual minimal outfit, natural pose'
      },
      {
        id: 'casual_minimal_4',
        sceneType: 'environment',
        frameType: 'full',
        allowedLocations: ['cafe', 'street', 'minimal space'],
        bannedLocations: ['gym'],
        outfitMode: 'casual',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'environmental scene establishing casual minimal space'
      },
      {
        id: 'casual_minimal_5',
        sceneType: 'detail',
        frameType: 'detail',
        allowedLocations: ['clean surface'],
        bannedLocations: [],
        outfitMode: 'casual',
        bannedMaterials: [],
        optionalProps: ['book', 'beverage'],
        descriptionTemplate: 'overhead detail photo of book and beverage on clean surface'
      },
      {
        id: 'casual_minimal_6',
        sceneType: 'portrait',
        frameType: 'closeup',
        allowedLocations: ['cafe', 'home'],
        bannedLocations: ['gym'],
        outfitMode: 'casual',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'close-up portrait in casual minimal outfit'
      },
      {
        id: 'casual_minimal_7',
        sceneType: 'environment',
        frameType: 'full',
        allowedLocations: ['street', 'minimal space'],
        bannedLocations: ['gym'],
        outfitMode: 'casual',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'environmental scene establishing minimal street setting'
      },
      {
        id: 'casual_minimal_8',
        sceneType: 'detail',
        frameType: 'detail',
        allowedLocations: ['clean surface'],
        bannedLocations: [],
        outfitMode: 'casual',
        bannedMaterials: [],
        optionalProps: ['everyday items'],
        descriptionTemplate: 'overhead detail photo of everyday items arranged naturally on clean surface'
      },
      {
        id: 'casual_minimal_9',
        sceneType: 'portrait',
        frameType: 'full',
        allowedLocations: ['home', 'cafe'],
        bannedLocations: ['gym'],
        outfitMode: 'casual',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'full-body portrait in casual minimal outfit, relaxed setting'
      }
    ]
  },

  casual_warm: {
    id: 'casual_warm',
    category: 'warm',
    mood: 'warm',
    fashionStyle: 'casual',
    scenes: [
      {
        id: 'casual_warm_1',
        sceneType: 'portrait',
        frameType: 'full',
        allowedLocations: ['cafe', 'street', 'home'],
        bannedLocations: ['gym'],
        outfitMode: 'casual',
        bannedMaterials: [],
        optionalProps: ['coffee'],
        descriptionTemplate: 'standing confidently in warm casual outfit, cozy pose'
      },
      {
        id: 'casual_warm_2',
        sceneType: 'detail',
        frameType: 'detail',
        allowedLocations: ['warm surface', 'cafe table'],
        bannedLocations: [],
        outfitMode: 'casual',
        bannedMaterials: [],
        optionalProps: ['latte', 'pastry'],
        descriptionTemplate: 'overhead lifestyle detail photo featuring latte and pastry on warm surface'
      },
      {
        id: 'casual_warm_3',
        sceneType: 'portrait',
        frameType: 'mid',
        allowedLocations: ['cafe', 'home'],
        bannedLocations: ['gym'],
        outfitMode: 'casual',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'mid-shot in warm casual outfit, cozy pose'
      },
      {
        id: 'casual_warm_4',
        sceneType: 'environment',
        frameType: 'full',
        allowedLocations: ['cafe', 'home'],
        bannedLocations: ['gym'],
        outfitMode: 'casual',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'environmental scene establishing warm casual space'
      },
      {
        id: 'casual_warm_5',
        sceneType: 'detail',
        frameType: 'detail',
        allowedLocations: ['warm surface'],
        bannedLocations: [],
        outfitMode: 'casual',
        bannedMaterials: [],
        optionalProps: ['cozy items'],
        descriptionTemplate: 'overhead detail photo of cozy items on warm surface'
      },
      {
        id: 'casual_warm_6',
        sceneType: 'portrait',
        frameType: 'closeup',
        allowedLocations: ['cafe', 'home'],
        bannedLocations: ['gym'],
        outfitMode: 'casual',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'close-up portrait in warm casual outfit'
      },
      {
        id: 'casual_warm_7',
        sceneType: 'environment',
        frameType: 'full',
        allowedLocations: ['home', 'cafe'],
        bannedLocations: ['gym'],
        outfitMode: 'casual',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'environmental scene establishing warm home setting'
      },
      {
        id: 'casual_warm_8',
        sceneType: 'detail',
        frameType: 'detail',
        allowedLocations: ['warm surface'],
        bannedLocations: [],
        outfitMode: 'casual',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'overhead detail photo on warm surface'
      },
      {
        id: 'casual_warm_9',
        sceneType: 'portrait',
        frameType: 'full',
        allowedLocations: ['cafe', 'home'],
        bannedLocations: ['gym'],
        outfitMode: 'casual',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'full-body portrait in warm casual outfit'
      }
    ]
  },

  // ==========================================================================
  // LUXURY KITS
  // ==========================================================================
  
  luxury_classic: {
    id: 'luxury_classic',
    category: 'luxury',
    mood: 'luxury',
    fashionStyle: 'classic',
    scenes: [
      {
        id: 'luxury_classic_1',
        sceneType: 'portrait',
        frameType: 'full',
        allowedLocations: ['gallery', 'luxury hotel lobby', 'architectural', 'luxury space'],
        bannedLocations: ['gym'],
        outfitMode: 'classic',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'standing confidently in luxury classic outfit, sophisticated pose, gallery or luxury setting'
      },
      {
        id: 'luxury_classic_2',
        sceneType: 'detail',
        frameType: 'detail',
        allowedLocations: ['polished surface', 'marble surface'],
        bannedLocations: [],
        outfitMode: 'classic',
        bannedMaterials: [],
        optionalProps: ['laptop', 'coffee', 'planner'],
        descriptionTemplate: 'overhead lifestyle detail photo featuring laptop, coffee, and planner on polished surface'
      },
      {
        id: 'luxury_classic_3',
        sceneType: 'portrait',
        frameType: 'mid',
        allowedLocations: ['gallery', 'luxury space', 'architectural'],
        bannedLocations: ['gym'],
        outfitMode: 'classic',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'mid-shot in luxury classic outfit, sophisticated pose, gallery background'
      },
      {
        id: 'luxury_classic_4',
        sceneType: 'environment',
        frameType: 'full',
        allowedLocations: ['gallery', 'luxury hotel lobby', 'architectural'],
        bannedLocations: ['gym'],
        outfitMode: 'classic',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'environmental scene establishing luxury gallery or architectural space'
      },
      {
        id: 'luxury_classic_5',
        sceneType: 'detail',
        frameType: 'detail',
        allowedLocations: ['marble surface'],
        bannedLocations: [],
        outfitMode: 'classic',
        bannedMaterials: [],
        optionalProps: ['elegant accessories'],
        descriptionTemplate: 'overhead detail photo of elegant accessories on marble surface'
      },
      {
        id: 'luxury_classic_6',
        sceneType: 'portrait',
        frameType: 'closeup',
        allowedLocations: ['gallery', 'luxury space'],
        bannedLocations: ['gym'],
        outfitMode: 'classic',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'close-up portrait in luxury classic outfit, sophisticated expression'
      },
      {
        id: 'luxury_classic_7',
        sceneType: 'environment',
        frameType: 'full',
        allowedLocations: ['architectural', 'luxury space'],
        bannedLocations: ['gym'],
        outfitMode: 'classic',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'environmental scene establishing luxury architectural space'
      },
      {
        id: 'luxury_classic_8',
        sceneType: 'detail',
        frameType: 'detail',
        allowedLocations: ['polished surface'],
        bannedLocations: [],
        outfitMode: 'classic',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'overhead detail photo on polished surface'
      },
      {
        id: 'luxury_classic_9',
        sceneType: 'portrait',
        frameType: 'full',
        allowedLocations: ['gallery', 'luxury space'],
        bannedLocations: ['gym'],
        outfitMode: 'classic',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'full-body portrait in luxury classic outfit, gallery setting'
      }
    ]
  },

  // ==========================================================================
  // BUSINESS KITS
  // ==========================================================================
  
  business_classic: {
    id: 'business_classic',
    category: 'professional',
    mood: 'minimal',
    fashionStyle: 'business',
    scenes: [
      {
        id: 'business_classic_1',
        sceneType: 'portrait',
        frameType: 'full',
        allowedLocations: ['office', 'conference room', 'coworking', 'hotel lobby'],
        bannedLocations: ['gym', 'gallery'],
        outfitMode: 'business',
        bannedMaterials: [],
        optionalProps: ['laptop'],
        descriptionTemplate: 'standing confidently in business outfit, professional pose, office setting'
      },
      {
        id: 'business_classic_2',
        sceneType: 'detail',
        frameType: 'detail',
        allowedLocations: ['desk', 'workspace'],
        bannedLocations: [],
        outfitMode: 'business',
        bannedMaterials: [],
        optionalProps: ['laptop', 'coffee', 'planner'],
        descriptionTemplate: 'overhead lifestyle detail photo featuring laptop, coffee, and planner on desk'
      },
      {
        id: 'business_classic_3',
        sceneType: 'portrait',
        frameType: 'mid',
        allowedLocations: ['office', 'conference room'],
        bannedLocations: ['gym'],
        outfitMode: 'business',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'mid-shot in business outfit, professional pose, office background'
      },
      {
        id: 'business_classic_4',
        sceneType: 'environment',
        frameType: 'full',
        allowedLocations: ['office', 'conference room', 'coworking'],
        bannedLocations: ['gym'],
        outfitMode: 'business',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'environmental scene establishing professional office space'
      },
      {
        id: 'business_classic_5',
        sceneType: 'detail',
        frameType: 'detail',
        allowedLocations: ['workspace'],
        bannedLocations: [],
        outfitMode: 'business',
        bannedMaterials: [],
        optionalProps: ['professional accessories'],
        descriptionTemplate: 'overhead detail photo of professional accessories on workspace'
      },
      {
        id: 'business_classic_6',
        sceneType: 'portrait',
        frameType: 'closeup',
        allowedLocations: ['office'],
        bannedLocations: ['gym'],
        outfitMode: 'business',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'close-up portrait in business outfit, professional expression'
      },
      {
        id: 'business_classic_7',
        sceneType: 'environment',
        frameType: 'full',
        allowedLocations: ['coworking', 'hotel lobby'],
        bannedLocations: ['gym'],
        outfitMode: 'business',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'environmental scene establishing professional coworking space'
      },
      {
        id: 'business_classic_8',
        sceneType: 'detail',
        frameType: 'detail',
        allowedLocations: ['desk'],
        bannedLocations: [],
        outfitMode: 'business',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'overhead detail photo on desk'
      },
      {
        id: 'business_classic_9',
        sceneType: 'portrait',
        frameType: 'full',
        allowedLocations: ['office', 'conference room'],
        bannedLocations: ['gym'],
        outfitMode: 'business',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'full-body portrait in business outfit, office setting'
      }
    ]
  },

  // ==========================================================================
  // MINIMAL CLASSIC KIT
  // ==========================================================================
  
  minimal_classic: {
    id: 'minimal_classic',
    category: 'minimal',
    mood: 'minimal',
    fashionStyle: 'classic',
    scenes: [
      {
        id: 'minimal_classic_1',
        sceneType: 'portrait',
        frameType: 'full',
        allowedLocations: ['gallery', 'minimal space', 'architectural'],
        bannedLocations: ['gym'],
        outfitMode: 'classic',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'standing confidently in minimal classic outfit, gallery or minimal space'
      },
      {
        id: 'minimal_classic_2',
        sceneType: 'detail',
        frameType: 'detail',
        allowedLocations: ['clean surface'],
        bannedLocations: [],
        outfitMode: 'classic',
        bannedMaterials: [],
        optionalProps: ['minimal accessories'],
        descriptionTemplate: 'overhead lifestyle detail photo featuring minimal accessories on clean surface'
      },
      {
        id: 'minimal_classic_3',
        sceneType: 'portrait',
        frameType: 'mid',
        allowedLocations: ['gallery', 'minimal space'],
        bannedLocations: ['gym'],
        outfitMode: 'classic',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'mid-shot in minimal classic outfit, gallery background'
      },
      {
        id: 'minimal_classic_4',
        sceneType: 'environment',
        frameType: 'full',
        allowedLocations: ['gallery', 'architectural'],
        bannedLocations: ['gym'],
        outfitMode: 'classic',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'environmental scene establishing minimal gallery space'
      },
      {
        id: 'minimal_classic_5',
        sceneType: 'detail',
        frameType: 'detail',
        allowedLocations: ['clean surface'],
        bannedLocations: [],
        outfitMode: 'classic',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'overhead detail photo on clean surface'
      },
      {
        id: 'minimal_classic_6',
        sceneType: 'portrait',
        frameType: 'closeup',
        allowedLocations: ['gallery'],
        bannedLocations: ['gym'],
        outfitMode: 'classic',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'close-up portrait in minimal classic outfit'
      },
      {
        id: 'minimal_classic_7',
        sceneType: 'environment',
        frameType: 'full',
        allowedLocations: ['architectural', 'minimal space'],
        bannedLocations: ['gym'],
        outfitMode: 'classic',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'environmental scene establishing minimal architectural space'
      },
      {
        id: 'minimal_classic_8',
        sceneType: 'detail',
        frameType: 'detail',
        allowedLocations: ['clean surface'],
        bannedLocations: [],
        outfitMode: 'classic',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'overhead detail photo on clean surface'
      },
      {
        id: 'minimal_classic_9',
        sceneType: 'portrait',
        frameType: 'full',
        allowedLocations: ['gallery', 'minimal space'],
        bannedLocations: ['gym'],
        outfitMode: 'classic',
        bannedMaterials: [],
        optionalProps: [],
        descriptionTemplate: 'full-body portrait in minimal classic outfit, gallery setting'
      }
    ]
  }
}

/**
 * Get scene kit by ID
 */
export function getSceneKit(kitId: KitId): SceneKit {
  const kit = SCENE_KITS[kitId]
  if (!kit) {
    throw new Error(`Scene kit not found: ${kitId}`)
  }
  return kit
}

/**
 * Get all scene kits
 */
export function getAllSceneKits(): SceneKit[] {
  return Object.values(SCENE_KITS)
}
