/**
 * Influencer Outfit Library
 * 
 * Comprehensive outfit formulas for each category with brand mixing strategies
 * 81 curated outfits across 6 categories (15+ per category)
 * Based on 2025 influencer trends: baggy jeans, cargo pants, oversized blazers, layered jewelry
 */

export interface OutfitFormula {
  category: string
  top: string
  bottom?: string
  outerwear?: string
  shoes: string
  accessories: string
  hair?: string
  brands: {
    luxury?: string[]
    contemporary?: string[]
    basics?: string[]
  }
}

// ============================================================================
// LIFESTYLE OUTFITS (15 outfits)
// ============================================================================

export const LIFESTYLE_OUTFITS: OutfitFormula[] = [
  {
    category: 'LIFESTYLE',
    top: 'Black ribbed crop top',
    bottom: 'Baggy straight-leg jeans in light wash',
    outerwear: 'Oversized black leather moto jacket, cropped and boxy fit',
    shoes: 'White chunky sneakers',
    accessories: 'Black angular sunglasses, minimal gold hoops',
    hair: 'Low slicked bun or loose waves',
    brands: {
      luxury: ['Acne Studios'],
      contemporary: ['AllSaints'],
      basics: ['Zara', 'Skims'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'Brown or taupe fitted crop top, long sleeves',
    bottom: 'Beige cargo pants, high-waisted with wide straight leg and utility pockets',
    outerwear: 'Chocolate brown leather jacket, cropped boxy fit',
    shoes: 'Chunky lug-sole boots or sneakers',
    accessories: 'Small brown leather shoulder bag, round sunglasses',
    hair: 'Straight sleek with center part',
    brands: {
      contemporary: ['Ganni', '& Other Stories', 'COS'],
      basics: ['Zara', 'H&M', 'Mango'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'Black bandeau or strapless corset top',
    bottom: 'Light wash baggy wide-leg jeans, high-waisted',
    shoes: 'Black and white Nike Dunks or Adidas Sambas',
    accessories: 'Mini black shoulder bag, delicate gold necklaces layered',
    hair: 'Sleek straight or natural waves',
    brands: {
      luxury: ['Acne Studios'],
      contemporary: ['Reformation', 'House of CB'],
      basics: ['Zara', 'Skims'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'Black crop bralette or bandeau',
    outerwear: 'Oversized black blazer worn as dress, loose fit',
    shoes: 'Black loafers or white sneakers',
    accessories: 'Baseball cap (black, neutral logo), layered gold chain necklaces, leather crossbody or mini bag',
    hair: 'Effortless waves or sleek low bun',
    brands: {
      luxury: ['The Row', 'Toteme'],
      contemporary: ['The Frankie Shop', 'Zara'],
      basics: ['Mango', 'Skims'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'Oversized cream cashmere crewneck sweater',
    bottom: 'Baggy wide-leg jeans in medium wash',
    shoes: 'White leather sneakers',
    accessories: 'Gold minimal jewelry, crossbody bag in tan leather',
    hair: 'Loose natural waves',
    brands: {
      luxury: ['Jenni Kayne', 'The Row'],
      contemporary: ['Everlane', 'Quince'],
      basics: ['Uniqlo', 'COS'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'White ribbed tank or baby tee',
    bottom: 'White baggy straight-leg jeans',
    outerwear: 'Cream oversized blazer or linen shirt jacket',
    shoes: 'White chunky sandals or loafers',
    accessories: 'Tan leather belt, gold jewelry, straw tote bag',
    hair: 'Loose waves or messy bun',
    brands: {
      luxury: ['The Row', 'Toteme'],
      contemporary: ['COS', 'Rib & Linen stores'],
      basics: ['Skims', 'Citizens of Humanity'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'Black fitted turtleneck or long-sleeve crop',
    bottom: 'Black leather wide-leg pants or black leather midi skirt',
    outerwear: 'Black leather trench or oversized leather blazer',
    shoes: 'Black pointed-toe boots',
    accessories: 'Mini black bag, silver jewelry',
    hair: 'Sleek low bun',
    brands: {
      luxury: ['Acne Studios'],
      contemporary: ['The Frankie Shop', '& Other Stories'],
      basics: ['Zara', 'Wolford'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'Oversized chambray or denim shirt, worn open over white tank',
    bottom: 'Baggy light-wash jeans (different wash than shirt)',
    shoes: 'White sneakers or tan leather loafers',
    accessories: 'Brown leather belt, structured tote bag',
    hair: 'Loose waves or messy bun',
    brands: {
      contemporary: ['Levi\'s', 'Madewell', 'Agolde'],
      basics: ['Mother', 'Zara'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'Oversized hoodie in cream, grey, or black',
    bottom: 'Wide-leg sweatpants or matching set bottoms',
    shoes: 'Chunky white sneakers',
    accessories: 'Baseball cap, small shoulder bag, gold hoops',
    hair: 'Low ponytail or messy bun',
    brands: {
      contemporary: ['Entireworld', 'Alo', 'Lululemon'],
      basics: ['Skims', 'Zara'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'White t-shirt or black bodysuit',
    bottom: 'Baggy straight-leg jeans in dark wash',
    outerwear: 'Oversized trench coat in beige or black',
    shoes: 'Black loafers or ankle boots',
    accessories: 'Structured leather tote, sunglasses',
    hair: 'Sleek ponytail',
    brands: {
      luxury: ['The Row', 'Toteme'],
      contemporary: ['COS', 'Zara'],
      basics: ['Uniqlo', 'Agolde'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'Fitted black turtleneck or mock neck',
    bottom: 'Barrel jeans in medium wash',
    shoes: 'Pointed-toe flats or heeled mules',
    accessories: 'Leather crossbody bag, gold jewelry',
    hair: 'Sleek low bun',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Mango', 'COS'],
      basics: ['Zara', 'H&M', 'Everlane'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'Oversized button-down white shirt',
    bottom: 'Wide-leg linen pants in cream or black',
    shoes: 'Leather slides or ballet flats',
    accessories: 'Structured leather tote, minimal gold jewelry',
    hair: 'Sleek ponytail or tucked behind ears',
    brands: {
      luxury: ['The Row', 'Toteme'],
      contemporary: ['COS', 'Zara'],
      basics: ['Quince', 'Everlane'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'White ribbed tank or black fitted tee',
    outerwear: 'Black leather jacket, cropped and boxy',
    bottom: 'Midi slip skirt in satin (black, cream, brown)',
    shoes: 'Strappy heeled sandals or chunky boots',
    accessories: 'Mini bag, layered necklaces',
    hair: 'Loose waves or sleek low bun',
    brands: {
      luxury: ['Acne Studios'],
      contemporary: ['AllSaints', 'Reformation', '& Other Stories'],
      basics: ['Zara', 'H&M'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'Matching knit cardigan and bralette set (cream, black, taupe)',
    bottom: 'Baggy wide-leg jeans in light wash',
    shoes: 'White sneakers or loafers',
    accessories: 'Mini shoulder bag, gold jewelry',
    hair: 'Loose waves',
    brands: {
      contemporary: ['Skims', 'Zara', 'Mango'],
      basics: ['Mother', 'Agolde'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'Ribbed turtleneck in neutral tone',
    bottom: 'Wool wide-leg trousers in charcoal or camel',
    outerwear: 'Oversized wool coat',
    shoes: 'Leather loafers or ankle boots',
    accessories: 'Structured leather bag, minimal jewelry',
    hair: 'Sleek low bun',
    brands: {
      luxury: ['Toteme'],
      contemporary: ['COS', '& Other Stories'],
      basics: ['Zara', 'Uniqlo'],
    },
  },
]

// ============================================================================
// FASHION OUTFITS (15 outfits)
// ============================================================================

export const FASHION_OUTFITS: OutfitFormula[] = [
  {
    category: 'FASHION',
    top: 'Black satin corset or structured bandeau top',
    bottom: 'Light wash baggy wide-leg jeans with raw hem',
    outerwear: 'Oversized black blazer, tailored shoulders',
    shoes: 'Pointed-toe heeled mules or chunky combat boots',
    accessories: 'Mini shoulder bag with chain strap, layered gold necklaces, black sunglasses',
    hair: 'Loose waves or sleek ponytail',
    brands: {
      luxury: ['The Row', 'Bottega Veneta'],
      contemporary: ['Reformation', 'For Love & Lemons', 'The Frankie Shop'],
      basics: ['Zara', 'Anine Bing'],
    },
  },
  {
    category: 'FASHION',
    top: 'Silk camisole in ivory or champagne',
    bottom: 'Black leather wide-leg pants',
    outerwear: 'Cream or tan blazer, oversized fit',
    shoes: 'Black pointed heels or leather loafers',
    accessories: 'Structured leather bag, gold jewelry, black sunglasses',
    hair: 'Sleek ponytail or loose waves',
    brands: {
      luxury: ['The Row', 'Toteme'],
      contemporary: ['Equipment', 'Vince', 'Mango'],
      basics: ['Zara', '& Other Stories', 'Nanushka'],
    },
  },
  {
    category: 'FASHION',
    top: 'Black turtleneck bodysuit',
    bottom: 'Black barrel jeans or wide-leg trousers',
    outerwear: 'Black leather trench coat',
    shoes: 'Black pointed boots',
    accessories: 'Black mini bag, silver jewelry',
    hair: 'Sleek low bun',
    brands: {
      luxury: ['Khaite', 'The Row'],
      contemporary: ['The Frankie Shop', 'COS'],
      basics: ['Wolford', 'Commando', 'Zara'],
    },
  },
  {
    category: 'FASHION',
    top: 'Satin slip dress in champagne, black, or emerald green',
    outerwear: 'Oversized blazer or leather jacket (contrasting color)',
    shoes: 'Strappy heeled sandals or pointed-toe pumps',
    accessories: 'Metallic clutch, delicate jewelry',
    hair: 'Loose waves or sleek low bun',
    brands: {
      luxury: ['The Row', 'Bottega Veneta'],
      contemporary: ['Reformation', 'Zara'],
      basics: ['H&M'],
    },
  },
  {
    category: 'FASHION',
    top: 'Black ribbed tank or fitted black turtleneck',
    bottom: 'White baggy straight-leg jeans',
    outerwear: 'Black leather jacket or cream blazer',
    shoes: 'Black heeled boots or white sneakers',
    accessories: 'Black shoulder bag, gold jewelry',
    hair: 'Sleek ponytail or loose waves',
    brands: {
      luxury: ['The Row', 'Toteme'],
      contemporary: ['Citizens of Humanity', 'Frame'],
      basics: ['Zara', 'Uniqlo'],
    },
  },
  {
    category: 'FASHION',
    top: 'Fitted crop top in neutral (beige, black, brown)',
    bottom: 'High-waisted cargo pants in olive, black, or cream with utility pockets',
    outerwear: 'Cropped leather jacket',
    shoes: 'Chunky platform boots or sneakers',
    accessories: 'Small crossbody bag, layered necklaces',
    hair: 'Loose waves or sleek ponytail',
    brands: {
      luxury: ['Acne Studios'],
      contemporary: ['Ganni', 'Reformation'],
      basics: ['Zara', 'H&M'],
    },
  },
  {
    category: 'FASHION',
    top: 'Velvet blazer in deep burgundy, forest green, or black',
    bottom: 'Matching velvet pants or black leather pants',
    shoes: 'Pointed-toe pumps',
    accessories: 'Mini velvet bag, gold jewelry',
    hair: 'Sleek low bun',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Ganni', 'Zara'],
      basics: ['H&M'],
    },
  },
  {
    category: 'FASHION',
    top: 'Fitted ribbed tank or crop top',
    bottom: 'Maxi skirt in satin, silk, or knit (black, cream, chocolate)',
    outerwear: 'Cropped leather jacket or denim jacket',
    shoes: 'Heeled sandals or boots',
    accessories: 'Crossbody bag, layered jewelry',
    hair: 'Loose waves or sleek ponytail',
    brands: {
      luxury: ['The Row', 'Bottega Veneta'],
      contemporary: ['Reformation', '& Other Stories'],
      basics: ['Zara', 'H&M'],
    },
  },
  {
    category: 'FASHION',
    top: 'Simple black turtleneck or white tee',
    bottom: 'Baggy jeans in any wash',
    outerwear: 'Statement coat - faux fur, plaid oversized, or colored wool',
    shoes: 'Ankle boots or chunky loafers',
    accessories: 'Structured bag',
    hair: 'Sleek ponytail or loose waves',
    brands: {
      luxury: ['Max Mara', 'Toteme'],
      contemporary: ['Stand Studio', 'Zara', 'Mango'],
      basics: ['H&M'],
    },
  },
  {
    category: 'FASHION',
    top: 'Sheer black mesh top over black bralette',
    bottom: 'Black wide-leg trousers or leather pants',
    outerwear: 'Oversized blazer (optional)',
    shoes: 'Pointed heels or boots',
    accessories: 'Mini bag, silver jewelry',
    hair: 'Sleek ponytail or loose waves',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Zara', 'H&M'],
      basics: ['Skims'],
    },
  },
  {
    category: 'FASHION',
    top: 'Matching knit polo and midi skirt set',
    shoes: 'Knee-high boots or loafers',
    accessories: 'Shoulder bag, gold jewelry',
    hair: 'Sleek ponytail or loose waves',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Zara', 'Sézane', 'Mango'],
      basics: ['H&M'],
    },
  },
  {
    category: 'FASHION',
    top: 'Crisp white button-down',
    bottom: 'High-waisted tailored trousers in black, grey, or pinstripe',
    shoes: 'Pointed-toe pumps or loafers',
    accessories: 'Structured tote, minimal jewelry',
    hair: 'Sleek ponytail or tucked behind ears',
    brands: {
      luxury: ['The Row', 'Toteme'],
      contemporary: ['COS', 'Everlane', 'The Frankie Shop'],
      basics: ['Zara', 'Mango'],
    },
  },
  {
    category: 'FASHION',
    top: 'Graphic tee or plain white tee',
    bottom: 'Black leather pants or coated jeans',
    outerwear: 'Oversized black leather jacket with hardware details',
    shoes: 'Chunky combat boots',
    accessories: 'Chain bag, layered necklaces',
    hair: 'Loose waves or sleek ponytail',
    brands: {
      luxury: ['Acne Studios', 'Saint Laurent'],
      contemporary: ['AllSaints'],
      basics: ['Zara', 'J Brand', 'AG'],
    },
  },
  {
    category: 'FASHION',
    top: 'Fitted turtleneck or mockneck',
    bottom: 'Pleated midi skirt in satin or metallic',
    shoes: 'Heeled boots or pumps',
    accessories: 'Mini bag, delicate jewelry',
    hair: 'Sleek low bun',
    brands: {
      luxury: ['The Row', 'Bottega Veneta'],
      contemporary: ['Zara', '& Other Stories'],
      basics: ['H&M'],
    },
  },
  {
    category: 'FASHION',
    top: 'Fitted black bodysuit',
    bottom: 'Wide-leg jeans with embellished details, contrast stitching, or unique wash',
    shoes: 'Heeled mules or boots',
    accessories: 'Mini bag, statement jewelry',
    hair: 'Loose waves or sleek ponytail',
    brands: {
      luxury: ['Acne Studios'],
      contemporary: ['Mother', 'Agolde', 'Ganni'],
      basics: ['Zara', 'Skims'],
    },
  },
]

// ============================================================================
// BEAUTY OUTFITS (12 outfits)
// ============================================================================

export const BEAUTY_OUTFITS: OutfitFormula[] = [
  {
    category: 'BEAUTY',
    top: 'Cream ribbed tank or satin camisole',
    bottom: 'High-waisted wide-leg linen pants in cream or beige',
    shoes: 'Nude heeled sandals or ballet flats',
    accessories: 'Delicate gold jewelry, small leather bag',
    hair: 'Soft glam, glossy lips, natural flush',
    brands: {
      luxury: ['The Row', 'Toteme'],
      contemporary: ['Skims', 'COS', 'Quince'],
      basics: ['Zara', 'Uniqlo'],
    },
  },
  {
    category: 'BEAUTY',
    top: 'Blush pink knit sweater or ribbed top',
    bottom: 'Pink-toned wide-leg pants or midi skirt',
    shoes: 'Nude sandals or ballet flats',
    accessories: 'Rose gold jewelry, nude bag',
    hair: 'Rosy tones, dewy skin',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Reformation', 'Sézane'],
      basics: ['Zara', 'H&M'],
    },
  },
  {
    category: 'BEAUTY',
    top: 'White linen button-down or ribbed tank',
    bottom: 'White wide-leg pants or flowing white skirt',
    shoes: 'Nude sandals or ballet flats',
    accessories: 'Gold jewelry, woven bag',
    hair: 'Fresh, minimal, glossy',
    brands: {
      luxury: ['The Row', 'Toteme'],
      contemporary: ['COS', 'Everlane'],
      basics: ['Zara', 'Uniqlo'],
    },
  },
  {
    category: 'BEAUTY',
    top: 'Satin slip dress in champagne, nude, or blush',
    shoes: 'Strappy nude heels',
    accessories: 'Delicate jewelry, small clutch',
    hair: 'Luminous skin, nude lips',
    brands: {
      luxury: ['The Row', 'Bottega Veneta'],
      contemporary: ['Reformation', 'Zara'],
      basics: ['H&M'],
    },
  },
  {
    category: 'BEAUTY',
    top: 'Matching knit cardigan and shorts/skirt set in soft neutrals',
    shoes: 'Ballet flats or heeled mules',
    accessories: 'Pearl jewelry, mini bag',
    hair: 'Soft and romantic',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Skims', 'Zara'],
      basics: ['H&M'],
    },
  },
  {
    category: 'BEAUTY',
    top: 'Fitted bodysuit in nude, white, or cream',
    bottom: 'High-waisted wide-leg trousers in matching neutral',
    shoes: 'Nude flats or sandals',
    accessories: 'Minimal jewelry, structured bag',
    hair: 'Clean and polished',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Wolford', 'Skims'],
      basics: ['Zara', 'Uniqlo'],
    },
  },
  {
    category: 'BEAUTY',
    top: 'Silk button-down blouse in ivory or champagne',
    bottom: 'Tailored pants or midi skirt in neutral',
    shoes: 'Nude flats or heels',
    accessories: 'Pearl earrings, leather bag',
    hair: 'Classic and refined',
    brands: {
      luxury: ['The Row', 'Equipment'],
      contemporary: ['Vince', 'COS'],
      basics: ['Zara', 'Uniqlo'],
    },
  },
  {
    category: 'BEAUTY',
    top: 'Full tonal outfit in shades of beige/camel/tan (mix textures: knit, silk, linen)',
    shoes: 'Tan sandals or nude flats',
    accessories: 'Gold jewelry, tan leather bag',
    hair: 'Bronze and gold tones',
    brands: {
      luxury: ['The Row', 'Toteme'],
      contemporary: ['COS', 'Quince'],
      basics: ['Zara', 'Uniqlo'],
    },
  },
  {
    category: 'BEAUTY',
    top: 'Pastel knit sweater (lavender, mint, baby blue)',
    bottom: 'White or cream wide-leg pants',
    shoes: 'Nude sandals or ballet flats',
    accessories: 'Silver jewelry, light-colored bag',
    hair: 'Soft and fresh',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Sézane', '& Other Stories'],
      basics: ['Zara', 'H&M'],
    },
  },
  {
    category: 'BEAUTY',
    top: 'Matching cashmere or fine knit set',
    shoes: 'Nude slides or ballet flats',
    accessories: 'Minimal gold jewelry',
    hair: 'Natural glam',
    brands: {
      luxury: ['Jenni Kayne', 'The Row'],
      contemporary: ['Quince', 'Everlane'],
      basics: ['Uniqlo'],
    },
  },
  {
    category: 'BEAUTY',
    top: 'Fitted wrap top or ballet-inspired cardigan',
    bottom: 'Flowing midi skirt or soft wide-leg pants',
    shoes: 'Ballet flats',
    accessories: 'Ribbon details, pearl jewelry',
    hair: 'Soft and romantic',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Zara', 'Sézane'],
      basics: ['H&M'],
    },
  },
  {
    category: 'BEAUTY',
    top: 'Floral midi or maxi dress in soft colors',
    shoes: 'Strappy sandals or espadrilles',
    accessories: 'Delicate gold jewelry',
    hair: 'Fresh and dewy',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Reformation', 'Zara', 'Sézane'],
      basics: ['H&M'],
    },
  },
]

// ============================================================================
// WELLNESS OUTFITS (12 outfits)
// ============================================================================

export const WELLNESS_OUTFITS: OutfitFormula[] = [
  {
    category: 'WELLNESS',
    top: 'Oversized hoodie in cream, sage, or grey',
    bottom: 'Matching high-waisted leggings or wide-leg sweatpants',
    shoes: 'White chunky sneakers',
    accessories: 'Yoga mat, water bottle, minimal gold jewelry',
    hair: 'Low ponytail or messy bun',
    brands: {
      contemporary: ['Alo', 'Lululemon', 'Entireworld'],
      basics: ['Skims', 'Nike'],
    },
  },
  {
    category: 'WELLNESS',
    top: 'Ribbed tank or sports bra in neutral',
    bottom: 'High-waisted Pilates pants or bike shorts',
    shoes: 'Grip socks or sneakers',
    accessories: 'Hair claw clip, simple jewelry',
    hair: 'Low ponytail or messy bun',
    brands: {
      contemporary: ['Alo', 'Outdoor Voices', 'Skims'],
      basics: ['Lululemon', 'Nike'],
    },
  },
  {
    category: 'WELLNESS',
    top: 'Matching yoga set (bra + leggings) in earth tones',
    outerwear: 'Oversized linen shirt or open cardigan',
    shoes: 'Barefoot or slides',
    accessories: 'Yoga mat, minimal jewelry',
    hair: 'Low ponytail or messy bun',
    brands: {
      contemporary: ['Alo', 'Lululemon', 'Outdoor Voices'],
      basics: ['Nike', 'Adidas'],
    },
  },
  {
    category: 'WELLNESS',
    top: 'Technical tank or long-sleeve running top',
    bottom: 'High-waisted running shorts or leggings',
    shoes: 'Running sneakers',
    accessories: 'Baseball cap, running belt',
    hair: 'Low ponytail or messy bun',
    brands: {
      contemporary: ['Nike', 'Lululemon', 'On Running'],
      basics: ['Adidas', 'Hoka'],
    },
  },
  {
    category: 'WELLNESS',
    top: 'Fitted base layer or technical tee',
    bottom: 'High-waisted hiking pants or shorts',
    outerwear: 'Lightweight puffer or fleece vest',
    shoes: 'Hiking boots or trail runners',
    accessories: 'Backpack, sunglasses',
    hair: 'Low ponytail or messy bun',
    brands: {
      contemporary: ['Patagonia', 'Outdoor Voices', 'The North Face'],
      basics: ['Nike', 'Adidas'],
    },
  },
  {
    category: 'WELLNESS',
    top: 'White tennis dress or pleated skirt with sports bra',
    shoes: 'White tennis sneakers',
    accessories: 'Visor or cap, minimal jewelry',
    hair: 'Low ponytail or messy bun',
    brands: {
      contemporary: ['Outdoor Voices', 'Alo'],
      basics: ['New Balance', 'On', 'Nike'],
    },
  },
  {
    category: 'WELLNESS',
    top: 'Fitted cycling jersey or tank',
    bottom: 'High-waisted bike shorts',
    shoes: 'Cycling shoes or sneakers',
    accessories: 'Hair tied back, sporty sunglasses',
    hair: 'Low ponytail or messy bun',
    brands: {
      contemporary: ['Lululemon', 'Alo'],
      basics: ['Nike', 'Adidas'],
    },
  },
  {
    category: 'WELLNESS',
    top: 'Oversized crewneck sweatshirt',
    bottom: 'High-waisted leggings or joggers',
    shoes: 'Chunky sneakers',
    accessories: 'Tote bag, baseball cap',
    hair: 'Low ponytail or messy bun',
    brands: {
      contemporary: ['Aritzia', 'Lululemon'],
      basics: ['Alo Yoga', 'Nike'],
    },
  },
  {
    category: 'WELLNESS',
    top: 'Cropped hoodie or sweatshirt',
    bottom: 'High-waisted leggings',
    outerwear: 'Oversized puffer jacket',
    shoes: 'Sneakers',
    accessories: 'Crossbody bag, sunglasses, coffee cup',
    hair: 'Low ponytail or messy bun',
    brands: {
      contemporary: ['The North Face', 'Patagonia'],
      basics: ['Nike', 'Adidas'],
    },
  },
  {
    category: 'WELLNESS',
    top: 'Matching sweat set (hoodie + sweatpants) in neutral or pastel',
    shoes: 'White sneakers or slides',
    accessories: 'Minimal jewelry',
    hair: 'Low ponytail or messy bun',
    brands: {
      contemporary: ['Alo', 'Skims', 'Entireworld'],
      basics: ['Lululemon', 'Nike'],
    },
  },
  {
    category: 'WELLNESS',
    top: 'Linen co-ord set or soft loungewear',
    shoes: 'Slides or slippers',
    accessories: 'Silk headband, minimal jewelry',
    hair: 'Low ponytail or messy bun',
    brands: {
      contemporary: ['COS', 'Quince'],
      basics: ['Zara', 'H&M'],
    },
  },
  {
    category: 'WELLNESS',
    top: 'Flowy linen button-down',
    bottom: 'Linen wide-leg pants',
    shoes: 'Leather sandals',
    accessories: 'Straw bag, natural jewelry',
    hair: 'Loose waves or messy bun',
    brands: {
      luxury: ['The Row'],
      contemporary: ['COS', 'Quince'],
      basics: ['Zara', 'H&M'],
    },
  },
]

// ============================================================================
// LUXURY OUTFITS (15 outfits - all luxury brands)
// ============================================================================

export const LUXURY_OUTFITS: OutfitFormula[] = [
  {
    category: 'LUXURY',
    top: 'Silk charmeuse camisole',
    bottom: 'Wide-leg wool trousers',
    shoes: 'Leather loafers or pumps',
    accessories: 'Margaux bag, minimal gold jewelry',
    hair: 'Sleek low bun',
    brands: {
      luxury: ['The Row'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Cashmere ribbed bodysuit',
    bottom: 'Barrel jeans or leather pants',
    outerwear: 'Oversized blazer or cardigan',
    shoes: 'Heeled boots',
    accessories: 'Mini bag, gold jewelry',
    hair: 'Sleek ponytail or loose waves',
    brands: {
      luxury: ['Khaite'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Crisp white button-down',
    bottom: 'High-waisted wide-leg jeans or trousers',
    outerwear: 'Oversized wool coat or leather jacket',
    shoes: 'Leather loafers',
    accessories: 'Structured leather bag',
    hair: 'Sleek ponytail or tucked behind ears',
    brands: {
      luxury: ['Toteme'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Cashmere crewneck sweater',
    bottom: 'Wide-leg cashmere pants or silk trousers',
    shoes: 'Suede loafers',
    accessories: 'Cashmere scarf, leather bag',
    hair: 'Loose waves or sleek ponytail',
    brands: {
      luxury: ['Loro Piana'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Silk blouse or leather top',
    bottom: 'Black leather pants or jeans',
    outerwear: 'Leather jacket',
    shoes: 'Heeled ankle boots',
    accessories: 'Chain bag, statement jewelry',
    hair: 'Sleek ponytail or loose waves',
    brands: {
      luxury: ['Saint Laurent'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Leather bustier or silk camisole',
    bottom: 'Leather pants or skirt',
    shoes: 'Woven leather flats or heels',
    accessories: 'Intrecciato bag, gold jewelry',
    hair: 'Sleek ponytail or loose waves',
    brands: {
      luxury: ['Bottega Veneta'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Silk blouse or cashmere knit',
    bottom: 'Tailored trousers or wide-leg jeans',
    shoes: 'Box leather loafers or heels',
    accessories: 'Triomphe bag, sunglasses',
    hair: 'Sleek ponytail or loose waves',
    brands: {
      luxury: ['Celine'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Cashmere turtleneck',
    bottom: 'Wool trousers',
    outerwear: 'Iconic camel coat',
    shoes: 'Leather boots',
    accessories: 'Leather bag',
    hair: 'Sleek low bun',
    brands: {
      luxury: ['Max Mara'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Silk scarf worn as top or with simple cashmere',
    bottom: 'High-waisted trousers',
    shoes: 'Leather loafers or heels',
    accessories: 'Birkin or Kelly bag, silk scarf, gold jewelry',
    hair: 'Sleek ponytail or loose waves',
    brands: {
      luxury: ['Hermès'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Classic tweed jacket',
    bottom: 'Matching tweed skirt or contrasting black pants',
    shoes: 'Two-tone pumps or loafers',
    accessories: 'Classic flap bag, pearl jewelry',
    hair: 'Sleek low bun',
    brands: {
      luxury: ['Chanel'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Technical nylon jacket or vest',
    bottom: 'Tailored pants',
    shoes: 'Leather loafers or sneakers',
    accessories: 'Prada nylon bag, minimal jewelry',
    hair: 'Sleek ponytail',
    brands: {
      luxury: ['Prada'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Leather jacket or knit sweater',
    bottom: 'Wide-leg jeans or trousers',
    shoes: 'Leather boots or loafers',
    accessories: 'Puzzle bag or Hammock bag, leather jewelry',
    hair: 'Sleek ponytail or loose waves',
    brands: {
      luxury: ['Loewe'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Cashmere crewneck with monili beading',
    bottom: 'Wide-leg trousers in wool or cotton',
    shoes: 'Suede sneakers or loafers',
    accessories: 'Leather bag with monili details',
    hair: 'Loose waves or sleek ponytail',
    brands: {
      luxury: ['Brunello Cucinelli'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Draped silk top or knit sweater',
    bottom: 'Wide-leg pants or leather skirt',
    shoes: 'Heeled boots or mules',
    accessories: 'PS bag, modern jewelry',
    hair: 'Sleek ponytail or loose waves',
    brands: {
      luxury: ['Proenza Schouler'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Minimalist silk blouse or knit',
    bottom: 'Wide-leg trousers with architectural cut',
    shoes: 'Leather flats or minimal heels',
    accessories: 'Structured leather bag, no jewelry (pure minimalism)',
    hair: 'Sleek low bun',
    brands: {
      luxury: ['Jil Sander'],
    },
  },
]

// ============================================================================
// TRAVEL OUTFITS (12 outfits)
// ============================================================================

export const TRAVEL_OUTFITS: OutfitFormula[] = [
  {
    category: 'TRAVEL',
    top: 'Oversized cashmere crewneck or hoodie',
    bottom: 'Wide-leg sweatpants or linen pants',
    shoes: 'White sneakers or slides',
    accessories: 'Crossbody bag, baseball cap, sunglasses, AirPods',
    hair: 'Low ponytail or messy bun',
    brands: {
      luxury: ['Jenni Kayne', 'The Row'],
      contemporary: ['Quince', 'Skims', 'Alo'],
      basics: ['Entireworld', 'Zara'],
    },
  },
  {
    category: 'TRAVEL',
    top: 'Linen button-down shirt in white or neutral',
    bottom: 'Linen wide-leg pants or midi skirt',
    shoes: 'Leather sandals or espadrilles',
    accessories: 'Straw bag, sunglasses, gold jewelry',
    hair: 'Loose waves or beach waves',
    brands: {
      luxury: ['The Row', 'Toteme'],
      contemporary: ['Reformation', 'COS'],
      basics: ['Zara', 'H&M'],
    },
  },
  {
    category: 'TRAVEL',
    top: 'Striped linen tee or boxy linen shirt',
    bottom: 'White linen pants or denim shorts',
    shoes: 'Leather slides',
    accessories: 'Woven tote, sunglasses',
    hair: 'Beach waves or messy bun',
    brands: {
      luxury: ['The Row'],
      contemporary: ['COS', 'Reformation'],
      basics: ['Zara', 'H&M'],
    },
  },
  {
    category: 'TRAVEL',
    top: 'White tee or black tank',
    bottom: 'Baggy straight-leg jeans',
    outerwear: 'Denim jacket or leather jacket',
    shoes: 'Comfortable sneakers',
    accessories: 'Crossbody bag, sunglasses',
    hair: 'Loose waves or messy bun',
    brands: {
      luxury: ['Acne Studios'],
      contemporary: ['Agolde', 'Mother', 'AllSaints'],
      basics: ['New Balance', 'On'],
    },
  },
  {
    category: 'TRAVEL',
    top: 'Flowing maxi dress in neutral or print',
    shoes: 'Heeled sandals or wedges',
    accessories: 'Straw clutch, statement earrings',
    hair: 'Loose waves or beach waves',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Reformation', 'Zimmermann'],
      basics: ['Zara', 'H&M'],
    },
  },
  {
    category: 'TRAVEL',
    top: 'Linen safari shirt in khaki or olive',
    bottom: 'Matching linen shorts or pants',
    shoes: 'Hiking boots or leather sneakers',
    accessories: 'Wide-brim hat, crossbody bag',
    hair: 'Low ponytail or messy bun',
    brands: {
      luxury: ['The Row'],
      contemporary: ['COS', 'Reformation'],
      basics: ['Zara', 'H&M'],
    },
  },
  {
    category: 'TRAVEL',
    top: 'Crochet or knit tank',
    bottom: 'Flowing wide-leg pants in bright color',
    shoes: 'Strappy sandals',
    accessories: 'Woven bag, shell jewelry',
    hair: 'Beach waves or loose waves',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Reformation', '& Other Stories'],
      basics: ['Zara', 'H&M'],
    },
  },
  {
    category: 'TRAVEL',
    top: 'Chunky knit sweater',
    bottom: 'Wide-leg wool trousers or jeans',
    outerwear: 'Puffer jacket or wool coat',
    shoes: 'Hiking boots or shearling boots',
    accessories: 'Beanie, crossbody bag',
    hair: 'Low ponytail or messy bun',
    brands: {
      luxury: ['Jenni Kayne', 'Toteme'],
      contemporary: ['COS', 'Quince'],
      basics: ['Zara', 'Uniqlo'],
    },
  },
  {
    category: 'TRAVEL',
    top: 'Simple bikini or one-piece',
    outerwear: 'Oversized linen shirt or caftan',
    shoes: 'Slides or flip-flops',
    accessories: 'Straw hat, tote bag',
    hair: 'Beach waves or messy bun',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Solid & Striped', 'Hunza G'],
      basics: ['Zara', 'H&M'],
    },
  },
  {
    category: 'TRAVEL',
    top: 'Matching cashmere or soft knit set',
    outerwear: 'Oversized cardigan or cashmere wrap',
    shoes: 'Slip-on sneakers or slides',
    accessories: 'Large tote, neck pillow',
    hair: 'Low ponytail or messy bun',
    brands: {
      luxury: ['Jenni Kayne', 'The Row'],
      contemporary: ['Quince', 'Everlane'],
      basics: ['Uniqlo'],
    },
  },
  {
    category: 'TRAVEL',
    top: 'Fitted tank or tee',
    bottom: 'High-waisted jeans or trousers',
    outerwear: 'Leather jacket or blazer',
    shoes: 'Ankle boots or loafers',
    accessories: 'Weekender bag, sunglasses',
    hair: 'Loose waves or sleek ponytail',
    brands: {
      luxury: ['The Row', 'Acne Studios'],
      contemporary: ['AllSaints', 'Everlane'],
      basics: ['Zara', 'Uniqlo'],
    },
  },
  {
    category: 'TRAVEL',
    top: 'Flowy linen top in earth tone',
    bottom: 'Linen wide-leg pants or midi skirt',
    shoes: 'Leather sandals',
    accessories: 'Wide-brim hat, leather bag',
    hair: 'Loose waves or beach waves',
    brands: {
      luxury: ['The Row'],
      contemporary: ['COS', 'Reformation'],
      basics: ['Zara', 'H&M'],
    },
  },
]

// ============================================================================
// GLAM OUTFITS - Evening & Party Looks (60+ outfits)
// ============================================================================

// ============================================================================
// FASHION GLAM (20 outfits)
// ============================================================================

export const FASHION_GLAM_OUTFITS: OutfitFormula[] = [
  {
    category: 'FASHION',
    top: 'Black velvet mini dress with scoop neckline and long sleeves',
    shoes: 'Strappy heeled sandals in gold or silver',
    accessories: 'Statement drop earrings with crystals, mini clutch in metallic',
    hair: 'Sleek straight with middle part or bouncy curls',
    brands: {
      luxury: ['Cult Gaia', 'Stuart Weitzman'],
      contemporary: ['Reformation', 'House of CB', 'Rotate'],
      basics: ['Zara', 'by FAR'],
    },
  },
  {
    category: 'FASHION',
    top: 'Champagne or ivory satin slip dress, midi length, cowl neckline',
    outerwear: 'Black leather blazer, oversized and cropped',
    shoes: 'Black strappy heels with barely-there straps',
    accessories: 'Gold layered necklaces (delicate), mini shoulder bag with chain',
    hair: 'Slicked back low bun or loose waves',
    brands: {
      luxury: ['The Row', 'Bottega Veneta'],
      contemporary: ['Reformation', '& Other Stories', 'The Frankie Shop'],
      basics: ['Zara', 'AllSaints'],
    },
  },
  {
    category: 'FASHION',
    top: 'Black sequin tank or cami',
    bottom: 'Black leather mini skirt or high-waisted tailored shorts',
    shoes: 'Black pointed-toe pumps or ankle strap heels',
    accessories: 'Mini black clutch with gold hardware, statement earrings',
    hair: 'High ponytail or voluminous curls',
    brands: {
      contemporary: ['& Other Stories', 'Zara', 'H&M'],
      basics: ['Mango'],
    },
  },
  {
    category: 'FASHION',
    top: 'Satin corset in black, emerald, or burgundy with boning detail',
    bottom: 'High-waisted tailored trousers in matching color or black',
    shoes: 'Pointed-toe heels in matching color',
    accessories: 'Structured mini bag, delicate jewelry',
    hair: 'Sleek middle part or side part waves',
    brands: {
      luxury: ['The Row'],
      contemporary: ['House of CB', 'Reformation', 'The Frankie Shop'],
      basics: ['Zara', 'Mango'],
    },
  },
  {
    category: 'FASHION',
    top: 'Liquid metallic slip dress in silver or gold, midi length',
    shoes: 'Metallic strappy heels or nude heels',
    accessories: 'Metallic clutch, geometric earrings',
    hair: 'Sleek wet-look low ponytail or slicked bun',
    brands: {
      contemporary: ['Rotate', 'Zara', 'H&M'],
      basics: ['Mango'],
    },
  },
  {
    category: 'FASHION',
    top: 'Black bodycon mini dress with strategic cut-out details at waist or sides',
    shoes: 'Black strappy stiletto heels',
    accessories: 'Minimal - small black clutch, statement earrings',
    hair: 'Sleek straight or slicked back',
    brands: {
      contemporary: ['House of CB', 'Meshki', 'Oh Polly'],
      basics: ['Zara'],
    },
  },
  {
    category: 'FASHION',
    top: 'Black sheer lace midi dress with slip underneath',
    shoes: 'Black pointed-toe pumps or ankle strap heels',
    accessories: 'Black mini bag with chain, pearl drop earrings',
    hair: 'Romantic waves or low chignon',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Reformation', '& Other Stories'],
      basics: ['Zara'],
    },
  },
  {
    category: 'FASHION',
    top: 'Mini dress with oversized bow detail at shoulder or back in black or red',
    shoes: 'Classic black pumps or strappy heels',
    accessories: 'Mini clutch, simple jewelry to let bow be statement',
    hair: 'Sleek bun or half-up with volume',
    brands: {
      contemporary: ['Rotate', 'Zara', 'Mango'],
      basics: ['H&M'],
    },
  },
  {
    category: 'FASHION',
    top: 'Silk camisole in ivory, champagne, or black',
    bottom: 'Black leather midi skirt or leather wide-leg pants',
    shoes: 'Black pointed heels or heeled ankle boots',
    accessories: 'Structured leather bag in black or tan, gold jewelry',
    hair: 'Loose waves or sleek straight',
    brands: {
      luxury: ['The Row', 'Acne Studios'],
      contemporary: ['Equipment', 'Vince', 'COS', 'Nanushka'],
      basics: ['Zara', '& Other Stories'],
    },
  },
  {
    category: 'FASHION',
    top: 'White ribbed bodysuit or white silk camisole',
    bottom: 'White tailored wide-leg trousers',
    outerwear: 'White oversized blazer (optional)',
    shoes: 'White or nude pointed-toe pumps',
    accessories: 'White or cream mini bag, gold jewelry',
    hair: 'Sleek and polished',
    brands: {
      luxury: ['The Row', 'Toteme'],
      contemporary: ['COS', 'Zara', 'Mango'],
      basics: ['Skims', 'Wolford'],
    },
  },
  {
    category: 'FASHION',
    top: 'Black silk camisole or bodysuit',
    outerwear: 'Emerald green or burgundy velvet blazer',
    bottom: 'Black leather pants or satin midi skirt',
    shoes: 'Black pointed heels',
    accessories: 'Metallic clutch, statement earrings',
    hair: 'Sleek waves or textured updo',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Ganni', 'Zara', 'Mango'],
      basics: ['H&M'],
    },
  },
  {
    category: 'FASHION',
    top: 'Black top with rhinestone embellishments at neckline or sleeves',
    bottom: 'Black satin wide-leg pants or midi skirt',
    shoes: 'Rhinestone-embellished heels or classic black pumps',
    accessories: 'Rhinestone mini bag or clutch',
    hair: 'Sleek straight or glamorous waves',
    brands: {
      contemporary: ['Zara', 'Mango'],
      basics: ['H&M'],
    },
  },
  {
    category: 'FASHION',
    top: 'Red satin or silk mini dress, slip style or bodycon',
    shoes: 'Black or nude strappy heels',
    accessories: 'Black mini clutch, gold jewelry',
    hair: 'Old Hollywood waves or sleek straight',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Reformation', 'House of CB'],
      basics: ['Zara'],
    },
  },
  {
    category: 'FASHION',
    top: 'Black mini dress or top with feather trim at hem or sleeves',
    shoes: 'Black strappy heels',
    accessories: 'Minimal clutch, statement earrings',
    hair: 'Voluminous curls or sleek updo',
    brands: {
      contemporary: ['Rotate', 'Bronx and Banco', 'Zara'],
      basics: ['H&M'],
    },
  },
  {
    category: 'FASHION',
    top: 'White silk blouse or bodysuit',
    outerwear: 'Black tuxedo blazer with satin lapels',
    bottom: 'Black tuxedo pants with satin stripe or black mini skirt',
    shoes: 'Black pointed-toe pumps',
    accessories: 'Black structured clutch, delicate gold jewelry',
    hair: 'Slicked back low bun or sleek straight',
    brands: {
      luxury: ['The Row', 'Saint Laurent'],
      contemporary: ['The Frankie Shop', 'COS'],
      basics: ['Zara', 'Mango'],
    },
  },
  {
    category: 'FASHION',
    top: 'Simple black slip dress or bodysuit',
    outerwear: 'Faux fur coat in cream, black, or leopard print',
    bottom: 'If bodysuit - leather pants or midi skirt',
    shoes: 'Black heeled boots or pumps',
    accessories: 'Minimal bag, statement earrings',
    hair: 'Sleek and simple to let fur be statement',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Stand Studio', 'Apparis'],
      basics: ['Zara'],
    },
  },
  {
    category: 'FASHION',
    top: 'Lace or satin bralette in black, nude, or champagne',
    outerwear: 'Oversized blazer in matching neutral',
    bottom: 'High-waisted tailored trousers or leather pants',
    shoes: 'Pointed-toe heels',
    accessories: 'Mini bag, delicate jewelry',
    hair: 'Tousled waves or sleek',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Intimissimi', 'The Frankie Shop', 'COS'],
      basics: ['Zara'],
    },
  },
  {
    category: 'FASHION',
    top: 'One-shoulder draped dress in jewel tone (emerald, sapphire, ruby) or black',
    shoes: 'Metallic or nude heels',
    accessories: 'Metallic clutch, statement earring on exposed shoulder',
    hair: 'Side-swept waves or elegant updo',
    brands: {
      luxury: ['The Row', 'Bottega Veneta'],
      contemporary: ['Reformation', '& Other Stories'],
      basics: ['Zara'],
    },
  },
  {
    category: 'FASHION',
    top: 'Black mesh long-sleeve top with high neck',
    bottom: 'Black leather mini skirt or high-waisted leather shorts',
    shoes: 'Black ankle strap heels',
    accessories: 'Small black bag with chain, silver jewelry',
    hair: 'Sleek straight or wet-look style',
    brands: {
      contemporary: ['Zara', 'H&M'],
      basics: ['Skims'],
    },
  },
  {
    category: 'FASHION',
    top: 'Asymmetric hem dress in black or bold color, one-sleeve or cut-out detail',
    shoes: 'Strappy heels in matching or contrasting color',
    accessories: 'Minimal clutch, statement earring',
    hair: 'Sleek side part or asymmetric updo',
    brands: {
      contemporary: ['House of CB', 'Oh Polly'],
      basics: ['Zara'],
    },
  },
]

// ============================================================================
// LIFESTYLE GLAM (15 outfits)
// ============================================================================

export const LIFESTYLE_GLAM_OUTFITS: OutfitFormula[] = [
  {
    category: 'LIFESTYLE',
    top: 'Ivory or champagne satin blouse with oversized bow at neck',
    bottom: 'Black baggy straight-leg jeans or leather pants',
    shoes: 'Black pointed-toe heels or ankle boots',
    accessories: 'Black shoulder bag, gold jewelry',
    hair: 'Loose waves or low ponytail',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Reformation', '& Other Stories'],
      basics: ['Zara', 'Agolde', 'Citizens of Humanity'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'Black turtleneck bodysuit or silk bodysuit',
    bottom: 'Satin midi skirt in champagne, emerald, or burgundy',
    shoes: 'Strappy heels or heeled mules',
    accessories: 'Mini clutch or small shoulder bag',
    hair: 'Sleek bun or bouncy curls',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Wolford', 'Commando', 'Skims', 'Reformation'],
      basics: ['Zara', '& Other Stories'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'Sequin cardigan in black, silver, or champagne',
    bottom: 'Black tailored trousers or leather pants',
    shoes: 'Black pointed heels or loafers',
    accessories: 'Black bag, minimal jewelry',
    hair: 'Sleek straight or loose waves',
    brands: {
      contemporary: ['Zara', 'Mango', '& Other Stories'],
      basics: ['H&M'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'Emerald green or burgundy satin midi dress with cowl neck or wrap style',
    shoes: 'Nude or metallic strappy heels',
    accessories: 'Metallic clutch, gold jewelry',
    hair: 'Romantic waves or sleek low bun',
    brands: {
      luxury: ['The Row', 'Bottega Veneta'],
      contemporary: ['Reformation', '& Other Stories'],
      basics: ['Zara'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'Oversized blazer dress in black, worn as dress with belt at waist',
    shoes: 'Knee-high boots or strappy heels',
    accessories: 'Mini shoulder bag, statement belt, jewelry',
    hair: 'Sleek straight or tousled waves',
    brands: {
      luxury: ['The Row', 'Toteme'],
      contemporary: ['The Frankie Shop', 'Zara', 'Mango'],
      basics: ['H&M'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'Silk camisole or satin blouse in ivory or champagne',
    bottom: 'High-waisted velvet pants in black, burgundy, or emerald',
    shoes: 'Pointed-toe heels in matching or contrasting color',
    accessories: 'Velvet or satin mini bag, gold jewelry',
    hair: 'Sleek and polished',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Zara', '& Other Stories'],
      basics: ['H&M'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'Fitted ribbed turtleneck or mockneck in black or cream',
    bottom: 'Satin slip skirt in matching neutral or contrasting metallic',
    shoes: 'Heeled mules or ankle strap heels',
    accessories: 'Small structured bag, delicate jewelry',
    hair: 'Low ponytail or loose waves',
    brands: {
      luxury: ['The Row', 'Toteme'],
      contemporary: ['COS', '& Other Stories'],
      basics: ['Zara'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'Black bodysuit or silk camisole',
    outerwear: 'Leather blazer, oversized and cropped',
    bottom: 'Black satin midi skirt or tailored trousers',
    shoes: 'Black pointed heels',
    accessories: 'Chain shoulder bag, statement earrings',
    hair: 'Sleek straight or textured waves',
    brands: {
      luxury: ['Acne Studios'],
      contemporary: ['AllSaints', 'The Frankie Shop'],
      basics: ['Zara'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'Black or ivory lace long-sleeve top',
    bottom: 'Black leather mini skirt or high-waisted tailored shorts',
    shoes: 'Black heels or heeled ankle boots',
    accessories: 'Small black bag, pearl jewelry',
    hair: 'Romantic curls or half-up style',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Zara', 'Mango', '& Other Stories'],
      basics: ['H&M'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'Black top with dramatic puff sleeves or statement sleeves',
    bottom: 'Black leather pants or satin trousers',
    shoes: 'Pointed-toe heels',
    accessories: 'Mini clutch, minimal jewelry (sleeves are statement)',
    hair: 'Sleek bun or pulled back to show sleeves',
    brands: {
      contemporary: ['Zara', 'Mango', '& Other Stories'],
      basics: ['H&M'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'Luxury cashmere sweater in cream, camel, or black',
    bottom: 'Satin midi skirt or leather midi skirt',
    shoes: 'Pointed-toe heels or heeled boots',
    accessories: 'Structured leather bag, gold jewelry',
    hair: 'Loose waves or low chignon',
    brands: {
      luxury: ['Jenni Kayne', 'The Row'],
      contemporary: ['Quince', 'Everlane', 'Reformation'],
      basics: ['& Other Stories'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'Black wide-leg jumpsuit with V-neck or halter top',
    shoes: 'Strappy heels or pointed-toe pumps',
    accessories: 'Statement belt (optional), metallic clutch',
    hair: 'Sleek ponytail or glamorous waves',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Reformation', 'Zara', 'Mango'],
      basics: ['H&M'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'Black slip dress, mini or midi length',
    bottom: 'Red opaque tights (trending 2025!)',
    shoes: 'Black pointed-toe heels or Mary Jane heels',
    accessories: 'Black mini bag, gold jewelry',
    hair: 'Sleek and polished',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Reformation', '& Other Stories'],
      basics: ['Zara'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'Tailored vest in black, pinstripe, or houndstooth - worn solo',
    bottom: 'Black tailored wide-leg trousers or leather pants',
    shoes: 'Pointed-toe heels or loafers',
    accessories: 'Structured bag, minimal jewelry',
    hair: 'Slicked back or side-parted sleek',
    brands: {
      luxury: ['The Row'],
      contemporary: ['The Frankie Shop', 'Zara', 'Mango'],
      basics: ['H&M'],
    },
  },
  {
    category: 'LIFESTYLE',
    top: 'Silk or satin maxi dress in champagne, black, or jewel tone with delicate straps',
    shoes: 'Strappy heeled sandals or heeled mules',
    accessories: 'Metallic clutch, delicate jewelry',
    hair: 'Loose waves or romantic updo',
    brands: {
      luxury: ['The Row', 'Bottega Veneta'],
      contemporary: ['Reformation', '& Other Stories'],
      basics: ['Zara'],
    },
  },
]

// ============================================================================
// LUXURY GLAM (15 outfits)
// ============================================================================

export const LUXURY_GLAM_OUTFITS: OutfitFormula[] = [
  {
    category: 'LUXURY',
    top: 'Silk charmeuse camisole in champagne or black',
    bottom: 'Wide-leg silk trousers',
    shoes: 'Leather heeled mules or slingback pumps',
    accessories: 'Margaux bag or evening clutch, minimal gold jewelry',
    hair: 'Sleek low bun or straight center part',
    brands: {
      luxury: ['The Row'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Black silk blouse with pussy bow or leather bustier',
    bottom: 'Black leather pants or sequin mini skirt',
    outerwear: 'Black leather jacket with hardware details',
    shoes: 'Opyum heeled sandals or ankle boots',
    accessories: 'Kate or Loulou bag, gold jewelry',
    hair: 'Tousled waves or sleek rock-and-roll style',
    brands: {
      luxury: ['Saint Laurent'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Leather midi dress in black or cognac',
    shoes: 'Intrecciato leather heels or knee-high boots',
    accessories: 'Intrecciato clutch or Jodie bag, gold jewelry',
    hair: 'Sleek and modern',
    brands: {
      luxury: ['Bottega Veneta'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Cashmere ribbed bodysuit or silk blouse',
    bottom: 'Leather midi skirt or high-waisted tailored trousers',
    outerwear: 'Oversized blazer or cashmere cardigan',
    shoes: 'Heeled boots or pumps',
    accessories: 'Lotus bag or evening clutch, gold jewelry',
    hair: 'Effortless waves or sleek',
    brands: {
      luxury: ['Khaite'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Crisp white silk button-down',
    bottom: 'Black leather pants or silk trousers',
    outerwear: 'Black leather jacket or wool blazer',
    shoes: 'Leather loafers with heels or pumps',
    accessories: 'Structured leather bag, minimal jewelry',
    hair: 'Sleek and modern',
    brands: {
      luxury: ['Toteme'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Cashmere knit with silk details',
    bottom: 'Cashmere or silk wide-leg trousers',
    shoes: 'Suede heeled loafers or pumps',
    accessories: 'Cashmere shawl, leather clutch',
    hair: 'Elegant updo or loose waves',
    brands: {
      luxury: ['Loro Piana'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Silk blouse with bow or draping detail',
    bottom: 'High-waisted tailored trousers or leather pants',
    shoes: 'Triomphe heeled slingbacks or ankle boots',
    accessories: 'Triomphe clutch or shoulder bag, sunglasses removed for evening',
    hair: 'Sleek middle part or elegant updo',
    brands: {
      luxury: ['Celine'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Tweed jacket with metallic threading',
    bottom: 'Black silk midi skirt or matching tweed skirt',
    shoes: 'Classic two-tone pumps or slingbacks',
    accessories: 'Classic flap bag in evening size, pearl jewelry',
    hair: 'Elegant chignon or polished waves',
    brands: {
      luxury: ['Chanel'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Silk blouse with scarf detail',
    bottom: 'High-waisted tailored trousers or silk pants',
    shoes: 'Leather pumps or heeled mules',
    accessories: 'Constance bag or Kelly clutch, silk scarf worn at neck or as bracelet',
    hair: 'Chic and polished',
    brands: {
      luxury: ['Hermès'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Silk or satin top with Prada logo detail',
    bottom: 'Tailored trousers or satin midi skirt',
    outerwear: 'Technical nylon jacket or vest (optional)',
    shoes: 'Leather heels or pumps',
    accessories: 'Prada nylon mini bag with crystals or evening clutch',
    hair: 'Sleek and modern',
    brands: {
      luxury: ['Prada'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Draped leather top or silk blouse with unique draping',
    bottom: 'High-waisted leather pants or tailored trousers',
    shoes: 'Leather heeled boots or pumps',
    accessories: 'Puzzle bag or Flamenco clutch, leather jewelry',
    hair: 'Modern and textured',
    brands: {
      luxury: ['Loewe'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Silk blouse with bold print or embroidered details',
    bottom: 'Velvet pants or silk printed midi skirt',
    shoes: 'Princetown mules with heels or embellished pumps',
    accessories: 'Dionysus bag or evening clutch with hardware, bold jewelry',
    hair: 'Romantic waves or textured updo',
    brands: {
      luxury: ['Gucci'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Silk gown with romantic details (ruffles, bows, draping) in red, black, or nude',
    shoes: 'Rockstud heels or pumps',
    accessories: 'Rockstud clutch, minimal jewelry to let dress shine',
    hair: 'Romantic updo or flowing waves',
    brands: {
      luxury: ['Valentino'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Structured top with architectural details or leather bustier',
    bottom: 'High-waisted tailored trousers or leather pants',
    shoes: 'Shark Lock heeled boots or pumps',
    accessories: 'Antigona clutch or evening bag, bold jewelry',
    hair: 'Sleek and sharp',
    brands: {
      luxury: ['Givenchy'],
    },
  },
  {
    category: 'LUXURY',
    top: 'Draped silk top or knit with unique construction',
    bottom: 'Wide-leg trousers or leather midi skirt',
    shoes: 'Heeled mules or ankle strap heels',
    accessories: 'PS1 or PS11 in evening size, modern jewelry',
    hair: 'Effortlessly undone or sleek',
    brands: {
      luxury: ['Proenza Schouler'],
    },
  },
]

// ============================================================================
// BEAUTY GLAM (10 outfits)
// ============================================================================

export const BEAUTY_GLAM_OUTFITS: OutfitFormula[] = [
  {
    category: 'BEAUTY',
    top: 'Blush pink satin slip dress, midi length',
    shoes: 'Nude or gold strappy heels',
    accessories: 'Gold or pearl clutch, delicate jewelry',
    hair: 'Soft waves or romantic updo',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Reformation', '& Other Stories'],
      basics: ['Zara'],
    },
  },
  {
    category: 'BEAUTY',
    top: 'Ivory silk blouse with delicate details (pussy bow, ruffles)',
    bottom: 'Ivory or cream satin midi skirt',
    shoes: 'Nude or champagne heels',
    accessories: 'Cream or tan leather clutch, pearl jewelry',
    hair: 'Elegant waves or chignon',
    brands: {
      luxury: ['The Row', 'Equipment'],
      contemporary: ['Vince', 'Reformation', '& Other Stories'],
      basics: ['Zara'],
    },
  },
  {
    category: 'BEAUTY',
    top: 'Champagne satin gown or midi dress with cowl neck',
    shoes: 'Gold or nude strappy heels',
    accessories: 'Gold clutch, delicate gold jewelry',
    hair: 'Old Hollywood waves',
    brands: {
      luxury: ['The Row', 'Bottega Veneta'],
      contemporary: ['Reformation'],
      basics: ['Zara'],
    },
  },
  {
    category: 'BEAUTY',
    top: 'White or ivory lace midi dress',
    shoes: 'Nude or white heeled sandals',
    accessories: 'White or cream clutch, pearl jewelry',
    hair: 'Loose romantic curls',
    brands: {
      luxury: ['The Row'],
      contemporary: ['Reformation', '& Other Stories'],
      basics: ['Zara'],
    },
  },
  {
    category: 'BEAUTY',
    top: 'Matching pink satin set - camisole and midi skirt',
    shoes: 'Pink or nude heels',
    accessories: 'Pink or nude clutch, rose gold jewelry',
    hair: 'Soft waves or sleek low bun',
    brands: {
      contemporary: ['Zara', '& Other Stories', 'Reformation'],
      basics: ['H&M'],
    },
  },
  {
    category: 'BEAUTY',
    top: 'Lavender or lilac satin slip dress or midi dress',
    shoes: 'Silver or nude heels',
    accessories: 'Silver clutch, delicate silver jewelry',
    hair: 'Romantic waves or half-up style',
    brands: {
      contemporary: ['Reformation', 'Zara'],
      basics: ['H&M'],
    },
  },
  {
    category: 'BEAUTY',
    top: 'Cream cashmere sweater with delicate details',
    bottom: 'Cream satin midi skirt or silk pants',
    shoes: 'Nude or cream heels',
    accessories: 'Cream or tan leather bag, gold jewelry',
    hair: 'Soft and natural',
    brands: {
      luxury: ['Jenni Kayne', 'The Row'],
      contemporary: ['Quince', 'Reformation', '& Other Stories'],
      basics: ['Zara'],
    },
  },
  {
    category: 'BEAUTY',
    top: 'White silk bodysuit or camisole',
    bottom: 'White satin wide-leg pants or midi skirt',
    shoes: 'White or nude heels',
    accessories: 'White or cream clutch, gold jewelry',
    hair: 'Sleek and polished',
    brands: {
      luxury: ['The Row', 'Toteme'],
      contemporary: ['Skims', 'Wolford', 'Reformation'],
      basics: ['Zara'],
    },
  },
  {
    category: 'BEAUTY',
    top: 'Rose gold or dusty rose metallic dress, midi or mini',
    shoes: 'Rose gold or nude heels',
    accessories: 'Rose gold clutch or bag',
    hair: 'Sleek or soft waves',
    brands: {
      contemporary: ['Zara', 'H&M', '& Other Stories'],
      basics: ['Mango'],
    },
  },
  {
    category: 'BEAUTY',
    top: 'Black silk camisole or slip dress',
    shoes: 'Black heels or pumps',
    accessories: 'STATEMENT pearl jewelry - multiple strands, oversized pearls, pearl earrings, black or pearl-embellished clutch',
    hair: 'Sleek updo to show pearl jewelry',
    brands: {
      luxury: ['The Row', 'Chanel'],
      contemporary: ['Reformation', '& Other Stories'],
      basics: ['Zara'],
    },
  },
]

// ============================================================================
// WELLNESS GLAM (1 outfit - Athletic Luxe Evening)
// ============================================================================

export const WELLNESS_GLAM_OUTFITS: OutfitFormula[] = [
  {
    category: 'WELLNESS',
    top: 'Luxe sports bra with embellishments or metallic finish',
    bottom: 'High-waisted wide-leg athletic pants in satin finish',
    outerwear: 'Oversized cashmere hoodie or bomber jacket',
    shoes: 'Luxury sneakers or heeled ankle boots',
    accessories: 'Luxury belt bag or small crossbody, minimal jewelry',
    hair: 'Sleek ponytail or loose waves',
    brands: {
      luxury: ['The Row', 'Golden Goose'],
      contemporary: ['Entireworld', 'Alo', 'Lululemon'],
      basics: ['Common Projects', 'Outdoor Voices'],
    },
  },
]

// ============================================================================
// TRAVEL GLAM (1 outfit - Airport & Vacation Evening)
// ============================================================================

export const TRAVEL_GLAM_OUTFITS: OutfitFormula[] = [
  {
    category: 'TRAVEL',
    top: 'Cashmere turtleneck or crewneck in luxe neutral',
    bottom: 'Tailored wide-leg trousers in black or camel',
    outerwear: 'Long cashmere or wool coat',
    shoes: 'Heeled ankle boots or luxury sneakers',
    accessories: 'Structured tote, sunglasses, cashmere scarf',
    hair: 'Effortlessly chic - low bun or loose waves',
    brands: {
      luxury: ['Max Mara', 'Toteme', 'Jenni Kayne', 'The Row'],
      contemporary: ['COS', 'Quince'],
      basics: ['Uniqlo'],
    },
  },
]

// ============================================================================
// BRAND MIXING STRATEGIES
// ============================================================================

/**
 * Select brand combination based on strategy
 */
export function selectOutfitBrands(
  outfit: OutfitFormula,
  brandStrategy: 'all_luxury' | 'high_low_mix' | 'contemporary_focus' | 'basics_elevated'
): string {
  switch (brandStrategy) {
    case 'all_luxury':
      return outfit.brands.luxury?.[0] || outfit.brands.contemporary?.[0] || ''
    
    case 'high_low_mix': {
      const luxury = outfit.brands.luxury?.[0] || ''
      const basics = outfit.brands.basics?.[0] || ''
      if (luxury && basics) {
        return `${luxury}, ${basics}`
      }
      return luxury || basics || outfit.brands.contemporary?.[0] || ''
    }
    
    case 'contemporary_focus':
      return outfit.brands.contemporary?.[0] || outfit.brands.basics?.[0] || ''
    
    case 'basics_elevated':
      return outfit.brands.basics?.[0] || outfit.brands.contemporary?.[0] || ''
    
    default:
      return outfit.brands.contemporary?.[0] || outfit.brands.basics?.[0] || ''
  }
}

/**
 * Get brand strategy for category
 */
export function getBrandStrategy(category: string): 'all_luxury' | 'high_low_mix' | 'contemporary_focus' | 'basics_elevated' {
  const CATEGORY_BRAND_STRATEGY: Record<string, ReturnType<typeof getBrandStrategy>> = {
    LUXURY: 'all_luxury',
    FASHION: 'high_low_mix',
    LIFESTYLE: 'high_low_mix',
    BEAUTY: 'contemporary_focus',
    WELLNESS: 'contemporary_focus',
    TRAVEL: 'contemporary_focus',
  }
  
  return CATEGORY_BRAND_STRATEGY[category] || 'contemporary_focus'
}

/**
 * Select random outfit from category
 */
export function selectOutfit(category: string): OutfitFormula {
  const outfits: Record<string, OutfitFormula[]> = {
    LIFESTYLE: LIFESTYLE_OUTFITS,
    FASHION: FASHION_OUTFITS,
    BEAUTY: BEAUTY_OUTFITS,
    WELLNESS: WELLNESS_OUTFITS,
    LUXURY: LUXURY_OUTFITS,
    TRAVEL: TRAVEL_OUTFITS,
  }
  
  const categoryOutfits = outfits[category.toUpperCase()] || LIFESTYLE_OUTFITS
  
  if (categoryOutfits.length === 0) {
    // Fallback to first lifestyle outfit if category has no outfits
    return LIFESTYLE_OUTFITS[0]
  }
  
  return categoryOutfits[Math.floor(Math.random() * categoryOutfits.length)]
}

/**
 * Build outfit description from formula
 */
export function buildOutfitFromFormula(outfit: OutfitFormula, brandStrategy?: 'all_luxury' | 'high_low_mix' | 'contemporary_focus' | 'basics_elevated'): string {
  const strategy = brandStrategy || getBrandStrategy(outfit.category)
  const brands = selectOutfitBrands(outfit, strategy)
  
  const parts: string[] = []
  
  if (outfit.top) parts.push(outfit.top)
  if (outfit.bottom) parts.push(outfit.bottom)
  if (outfit.outerwear) parts.push(outfit.outerwear)
  parts.push(outfit.shoes)
  
  const description = parts.join(', ')
  
  if (brands) {
    return `${description} (${brands}). ${outfit.accessories}`
  }
  
  return `${description}. ${outfit.accessories}`
}