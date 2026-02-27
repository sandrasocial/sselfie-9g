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
        obsidian: "#0a0a0a",
        porcelain: "#ffffff",
        pearl: "#f5f5f5",
        smoke: "#666666",
        whisper: "#e5e5e5",
      },
    },
  },
}

export default config
