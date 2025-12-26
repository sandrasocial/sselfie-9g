/**
 * Luxury Lifestyle Settings
 * 
 * REFERENCE MATERIAL ONLY - Used as guidance in system prompts
 * Maya (Claude Sonnet 4) uses this to understand how to elevate content with luxury markers,
 * but integrates these elements naturally based on context.
 * 
 * NOT used for random selection - this is guidance on luxury elements, not a limited array.
 */
export const LUXURY_LIFESTYLE_SETTINGS = `
=== LUXURY LIFESTYLE ELEVATION ===

You're creating content for an ASPIRATIONAL Instagram feed. Every concept should include subtle luxury markers that make content SAVE-WORTHY and scroll-stopping.

## LUXURY TRANSPORTATION (Use Contextually)

When concepts involve travel, cars, or movement moments:
- **G-Wagon** (Mercedes G-Class) - black, white, or matte finishes
- **Porsche Cayenne** - sleek luxury SUV
- **Range Rover** - classic luxury status
- **Tesla Model X/S** - modern luxury tech
- **Mercedes S-Class** - timeless elegance
- **BMW X7** - spacious luxury

**How to include naturally:**
"leaning against black G-Wagon in driveway"
"coffee in hand, walking past parked white Range Rover"
"sitting on hood of matte black Porsche"
"loading shopping bags into cream G-Wagon"

## LUXURY SETTINGS (Elevate Every Location)

### Five-Star Hotels & Resorts
- Rooftop terraces with city views
- Marble lobbies with dramatic lighting
- Infinity pool edges
- Luxury suite balconies
- Hotel room floor-to-ceiling windows
- Elegant hotel restaurant settings

### High-End Residential
- Penthouse terraces with skyline views
- Modern kitchens with marble countertops
- Floor-to-ceiling windows with city/ocean views
- Designer furniture (Barcelona chairs, Eames loungers)
- Marble bathroom vanities
- Walk-in closets with designer pieces visible

### Upscale Dining & Social
- Michelin-star restaurant ambiance
- Champagne bars with mood lighting
- Rooftop lounge settings
- Private dining rooms
- Wine cellars with mood lighting

### Luxury Retail & Lifestyle
- Designer boutique interiors (marble, gold accents)
- High-end coffee shops (marble tables, velvet chairs)
- Art gallery white walls
- Luxury gym/wellness spaces (modern, minimal)

## LUXURY PROPS & ACCESSORIES (Subtle Inclusion)

### Beverages & Food
- Champagne glasses (crystal, elegant stems)
- Espresso in designer cups
- Cocktails in luxury glassware
- Charcuterie boards on marble surfaces
- Pastries from high-end patisseries

### Tech & Accessories
- Latest iPhone (visible in hand or nearby)
- AirPods Max headphones
- Designer sunglasses (on face or held casually)
- Luxury watches (gold, leather straps, visible)
- Designer handbags (Bottega, Celine, The Row)

### Environmental Details
- Fresh flowers (white roses, peonies, orchids)
- Coffee table books (fashion, art, design)
- Marble surfaces (countertops, tables, vanities)
- Gold/brass hardware and fixtures
- Plush textiles (cashmere throws, velvet pillows)
- Ambient candles (luxury brand candles)

## HOW TO INTEGRATE LUXURY NATURALLY

**DON'T**: Force luxury elements into every concept
**DO**: Choose 1-2 subtle luxury markers that fit the STORY

**BAD EXAMPLE**: 
"Woman in designer outfit, holding champagne, next to G-Wagon, wearing luxury watch, in marble penthouse"
(Too much, feels fake and try-hard)

**GOOD EXAMPLES**:

"Morning coffee run - cream cashmere turtleneck and high-waisted jeans, gold watch visible, walking past parked black G-Wagon on quiet street"
(Natural, one luxury car in background)

"Rooftop moment - black leather blazer over white tank, standing at marble-topped bar with champagne glass nearby, city skyline at golden hour"
(Luxury setting + one prop, feels authentic)

"Cozy evening - oversized grey knit sweater and cream lounge pants, sitting on velvet sofa with coffee table book, fresh white peonies in background"
(Luxury home details, natural moment)

## LUXURY CONTEXT MATCHING

Match luxury level to the AESTHETIC:

**Quiet Luxury / Old Money**: 
- Less obvious, more tasteful
- Designer pieces without logos
- Elegant settings over flashy

**Mob Wife / Maximalist**:
- Bold luxury markers appropriate
- Fur coats, gold jewelry, champagne
- Dramatic settings fit the vibe

**Clean Girl / Minimal**:
- Subtle luxury only
- Fresh flowers, marble surfaces
- One elegant piece, not overwhelming

**Urban Street Style**:
- G-Wagon, luxury sneakers, designer bags
- Architectural luxury settings
- Modern, edgy luxury markers

## THE GOLDEN RULE

Every concept should answer: "Would someone SAVE this for inspiration or aspiration?"

If the answer is no, add ONE luxury element that elevates it from "nice" to "GOALS."
`

export function getLuxuryLifestyleSettings(): string {
  return LUXURY_LIFESTYLE_SETTINGS
}
