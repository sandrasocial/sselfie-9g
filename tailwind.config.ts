import type { Config } from "tailwindcss"

import { SSELFIE_NOIR_GLASS_COLORS as noir } from "./lib/brand/bold-editorial-tokens"

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Compatibility utilities aligned to SSELFIE Noir Glass.
        // New design work should use the semantic --ss-brand-* variables.
        stone: {
          deepest: noir.obsidian,
          dark: noir.graphite,
          mid: noir.slate,
          raw: noir.graphite,
          granite: noir.obsidian,
          quarry: noir.slate,
          accent: noir.steel,
          pale: noir.silver,
        },
        // Legacy names mapped to current values (backwards compatibility only).
        obsidian: noir.obsidian,
        porcelain: noir.pearl,
        pearl: noir.coolMist,
        smoke: noir.slate,
        whisper: noir.silver,
      },
    },
  },
}

export default config
