export interface MayaNanoBananaSkill {
  id: "nano_banana_pro"
  version: string
  changelog: string[]
  guidance: string[]
  bannedPatterns: string[]
}

export const NANO_BANANA_PRO_SKILL: MayaNanoBananaSkill = {
  id: "nano_banana_pro",
  version: "2026.03.06",
  changelog: [
    "Initial curated in-repo skill pack from internal Nano Banana prompting references.",
    "Adds deterministic structure for lighting, lens, styling, scene coherence, and realism safeguards.",
  ],
  guidance: [
    "Build prompts in ordered sections: subject identity -> wardrobe/materials -> environment -> camera/lens -> lighting -> pose/action -> realism constraints.",
    "Keep prompts concrete and visual; prefer specific nouns over abstract style buzzwords.",
    "When user gives exact words, preserve those words in chat response while prompt can expand creatively for generation quality.",
    "For product-aware shots, include relation between product and body pose so composition feels intentional.",
    "Favor natural skin texture, physically plausible lighting, and coherent perspective.",
    "Add one concise negative guard clause for common artifacts (extra limbs, warped hands, text artifacts, plastic skin).",
  ],
  bannedPatterns: [
    "generic cinematic masterpiece",
    "overloaded adjective stacks without scene logic",
    "contradictory lens or lighting instructions in the same prompt",
  ],
}
