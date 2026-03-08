import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        stone: {
          deepest: "#0d0c0b",
          dark: "#1c1b19",
          mid: "#2e2c29",
          raw: "#2a2720",
          granite: "#1a1815",
          quarry: "#3a3630",
          accent: "#a8a49c",
          pale: "#c8c4bb",
        },
        // Legacy names mapped to new stone values (backwards compat)
        obsidian: "#0d0c0b",
        porcelain: "#f0ede8",
        pearl: "#2e2c29",
        smoke: "#8a8780",
        whisper: "#c8c4bb",
      },
    },
  },
}

export default config
