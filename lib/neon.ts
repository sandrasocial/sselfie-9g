import { neon } from "@neondatabase/serverless"

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim().length === 0) {
  throw new Error("[Neon] DATABASE_URL is missing. Set it in your environment variables.")
}

export const sql = neon(process.env.DATABASE_URL)
