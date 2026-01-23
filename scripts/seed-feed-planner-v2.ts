import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

const FEED_STYLES = [
  {
    name: "Dark & Moody",
    description:
      "Urban sophisticated aesthetic with editorial fashion influence. Features all-black or dark-toned outfits (black, charcoal, dark gray). Locations include upscale bars, city streets at dusk, modern coffee shops, concrete architecture, urban nightlife. Activities: night out, city exploration, sophisticated coffee culture. Mood: confident, editorial, modern, influencer-style. Color grade: deep blacks, cool grays, high contrast, dramatic shadows. Objects: wine glasses, espresso cups, iPhone, designer accessories, minimal jewelry. Think: fashion blogger in the city, editorial sophistication.",
  },
  {
    name: "Beige Aesthetic",
    description:
      "Warm cozy aesthetic centered on coffee culture and comfort. Features beige, cream, tan, caramel-toned outfits (beige sweaters, cream pants, tan coats). Locations include cozy cafes, warm home interiors, beige-toned architecture, wooden coffee shops. Activities: morning coffee, cozy reading, home comfort, cafe meetings. Mood: warm, inviting, comfortable, authentic. Color grade: warm beiges, soft creams, golden light, gentle shadows. Objects: latte art, croissants, books, candles, cozy blankets, wooden surfaces. Think: cozy lifestyle blogger, warm comfort aesthetic.",
  },
  {
    name: "Light & Minimalistic",
    description:
      "Bright airy aesthetic with Scandinavian minimalist influence. Features all-white or light neutral outfits (white shirts, cream knits, light gray). Locations include bright white interiors, minimalist spaces, clean architecture, Scandinavian-style homes, bright natural settings. Activities: minimal living, clean aesthetics, morning routines, peaceful moments. Mood: serene, clean, fresh, fashionista-meets-minimalism. Color grade: bright whites, soft creams, airy lighting, minimal shadows. Objects: white ceramics, minimal flowers, light wood, clean surfaces, simple books. Think: Scandinavian influencer, minimalist lifestyle.",
  },
  {
    name: "Luxury Future Self",
    description:
      "High-end aspirational aesthetic with luxury fashion and lifestyle. Features designer outfits with luxury materials (silk, cashmere, leather), high-end brands visible but subtle. Locations include luxury hotels, upscale restaurants, designer stores, luxury car interiors, high-rise city views, private clubs. Activities: luxury shopping, fine dining, travel in style, executive lifestyle. Mood: aspirational, sophisticated, powerful, luxury editorial. Color grade: rich tones, balanced lighting, editorial quality, luxury color grading. Objects: designer handbags, luxury cars (Mercedes, Range Rover), champagne, fine dining, designer packaging, high-end technology. Think: luxury lifestyle influencer, aspirational content.",
  },
  {
    name: "Casual Bohemian",
    description:
      "Relaxed artsy aesthetic with natural bohemian influence. Features flowing natural fabrics (linen, cotton), earth tones, layered jewelry, relaxed fits. Locations include outdoor markets, art galleries, nature settings, vintage shops, artisan cafes, parks, natural light spaces. Activities: weekend markets, art exploration, outdoor walks, creative hobbies, relaxed moments. Mood: relaxed, artistic, natural, authentic, creative. Color grade: warm natural tones, soft earth colors, natural lighting, organic feel. Objects: vintage items, artisan goods, natural materials, plants, handmade accessories, woven bags, journals. Think: artsy lifestyle, authentic bohemian aesthetic.",
  },
  {
    name: "Athletic & Wellness",
    description:
      "Active wellness aesthetic with premium athletic fashion. Features high-end athletic wear (ALO Yoga, Lululemon style), sleek athletic sets, sports bras with leggings, athletic jackets. Locations include modern gyms, yoga studios, running paths, juice bars, wellness centers, outdoor fitness settings. Activities: gym workouts, yoga sessions, morning runs, post-workout smoothies, wellness routines. Mood: energetic, healthy, strong, wellness-focused, active lifestyle. Color grade: clean natural light, fresh tones, energetic feel. Objects: Apple AirPods, gym bags, water bottles (Hydro Flask style), yoga mats, resistance bands, smoothie bowls, green juice, protein shakers, fitness trackers. Think: fitness influencer, wellness lifestyle.",
  },
  {
    name: "Coastal Aesthetics",
    description:
      "Luxury coastal lifestyle aesthetic with pastel tones and beach elegance. Features light flowing fabrics (linen dresses, white cotton), soft pastels (blush pink, powder blue, sage green), beach-appropriate luxury. Locations include beach settings, luxury coastal resorts, oceanfront cafes, beach clubs, sunset views, poolside, beachfront villas. Activities: beach walks, luxury travel, resort relaxation, sunset moments, coastal dining. Mood: breezy, elegant, vacation-mode, luxury travel, coastal sophistication. Color grade: soft pastels, warm golden hour light, beach-appropriate brightness, dreamy tones. Objects: sun hats, designer sunglasses, beach bags, tropical drinks, seashells, resort amenities, luxury travel items. Think: luxury travel influencer, coastal lifestyle.",
  },
]

async function seed() {
  for (const style of FEED_STYLES) {
    await sql`
      INSERT INTO feed_styles_v2 (
        name,
        description,
        enabled,
        updated_at
      )
      VALUES (
        ${style.name},
        ${style.description},
        true,
        NOW()
      )
      ON CONFLICT (name)
      DO UPDATE SET
        description = EXCLUDED.description,
        enabled = EXCLUDED.enabled,
        updated_at = NOW()
    `
    console.log(`[Seed V2] Upserted feed style: ${style.name}`)
  }
}

seed()
  .then(() => {
    console.log("[Seed V2] Complete")
    process.exit(0)
  })
  .catch((error) => {
    console.error("[Seed V2] Failed:", error)
    process.exit(1)
  })
