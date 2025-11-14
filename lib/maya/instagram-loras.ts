export const INSTAGRAM_LORAS = {
  instagirl: {
    name: "Instagirl V2.5",
    url: "https://civitai.com/models/1822984",
    replicateUrl: "alvdansen/instagirl-v2.5",
    description: "Creates Instagram-native aesthetic with amateur cellphone quality, perfect for authentic social media content",
    triggerWord: "Instagirl",
    promptAdditions: [
      "amateur cellphone quality",
      "visible sensor noise",
      "heavy HDR glow",
      "blown-out highlights",
      "crushed shadows",
      "authentic social media aesthetic",
      "unfiltered raw quality"
    ],
    scale: 0.85,
    bestFor: ["lifestyle", "candid", "street", "portrait"],
    avoid: ["professional studio", "editorial", "high-end fashion"],
    tips: "Use for raw, authentic Instagram Story vibes. Works best with natural lighting scenarios."
  },
  
  ultraRealistic: {
    name: "Flux UltraRealistic LoRA V2",
    url: "https://civitai.com/models/1508321",
    replicateUrl: "enhanceaiteam/flux-lora-ultra-realistic-v2",
    description: "Enhances photorealism with natural skin texture, authentic lighting, and iPhone-quality realism",
    triggerWord: "Ultra realistic",
    promptAdditions: [
      "photorealistic skin texture",
      "natural pores and imperfections",
      "authentic lighting",
      "shot on iPhone 15 Pro",
      "subtle motion blur",
      "natural depth of field"
    ],
    scale: 0.9,
    bestFor: ["portrait", "close-up", "beauty", "lifestyle"],
    avoid: ["abstract", "artistic", "heavily stylized"],
    tips: "Perfect for creating hyper-realistic portraits that look like real iPhone photos. Captures skin detail beautifully."
  },

  cinematicPortrait: {
    name: "Cinematic Portrait LoRA",
    url: "https://civitai.com/models/example",
    replicateUrl: "cinematic-portrait-lora",
    description: "Adds cinematic depth, bokeh, and professional film-like quality to portraits",
    triggerWord: "cinematic portrait",
    promptAdditions: [
      "shallow depth of field",
      "creamy bokeh background",
      "cinematic color grading",
      "film grain texture",
      "professional portrait photography"
    ],
    scale: 0.75,
    bestFor: ["portrait", "editorial", "professional headshots"],
    avoid: ["candid", "amateur", "snapshots"],
    tips: "Use for elevated, professional-looking content with beautiful background separation."
  },

  streetStyle: {
    name: "Street Style LoRA",
    url: "https://civitai.com/models/street-style",
    replicateUrl: "street-style-lora",
    description: "Captures authentic street photography aesthetic with urban grit and spontaneity",
    triggerWord: "street style",
    promptAdditions: [
      "street photography aesthetic",
      "urban documentary style",
      "natural candid moment",
      "environmental context",
      "authentic city life"
    ],
    scale: 0.8,
    bestFor: ["street", "lifestyle", "urban", "fashion"],
    avoid: ["studio", "controlled environments"],
    tips: "Perfect for urban lifestyle content with that authentic 'caught in the moment' vibe."
  },

  goldenHour: {
    name: "Golden Hour LoRA",
    url: "https://civitai.com/models/golden-hour",
    replicateUrl: "golden-hour-lighting-lora",
    description: "Enhances warm, flattering golden hour lighting for Instagram-perfect glow",
    triggerWord: "golden hour",
    promptAdditions: [
      "warm golden hour lighting",
      "soft backlight glow",
      "sun-kissed skin",
      "warm color temperature",
      "natural rim light"
    ],
    scale: 0.7,
    bestFor: ["outdoor portrait", "lifestyle", "travel", "sunset"],
    avoid: ["indoor", "studio", "harsh lighting"],
    tips: "Automatically adds that Instagram-famous golden hour glow to any outdoor scene."
  }
};

// Helper function to get LoRA recommendations based on category
export function getRecommendedLoras(category: string): string[] {
  const recommendations: Record<string, string[]> = {
    lifestyle: ["instagirl", "ultraRealistic", "goldenHour"],
    portrait: ["ultraRealistic", "cinematicPortrait"],
    candid: ["instagirl", "streetStyle"],
    street: ["streetStyle", "instagirl"],
    editorial: ["cinematicPortrait", "ultraRealistic"],
    beauty: ["ultraRealistic", "goldenHour"],
    fashion: ["cinematicPortrait", "streetStyle"],
    travel: ["goldenHour", "streetStyle"],
    fitness: ["ultraRealistic", "goldenHour"],
    food: ["ultraRealistic", "instagirl"]
  };

  return recommendations[category.toLowerCase()] || ["instagirl", "ultraRealistic"];
}

// Helper to get prompt additions for a specific LoRA
export function getLoraPromptAdditions(loraKey: string): string[] {
  const lora = INSTAGRAM_LORAS[loraKey as keyof typeof INSTAGRAM_LORAS];
  return lora ? lora.promptAdditions : [];
}

// Helper to get LoRA details for Maya to reference
export function getLoraDetails(loraKey: string) {
  return INSTAGRAM_LORAS[loraKey as keyof typeof INSTAGRAM_LORAS];
}

// Export formatted knowledge for Maya's context
export function getLoraKnowledgeForMaya(): string {
  return Object.entries(INSTAGRAM_LORAS)
    .map(([key, lora]) => {
      return `
**${lora.name}** (${lora.triggerWord})
- ${lora.description}
- Best for: ${lora.bestFor.join(", ")}
- Adds: ${lora.promptAdditions.slice(0, 3).join(", ")}
- Tip: ${lora.tips}
      `.trim();
    })
    .join("\n\n");
}
