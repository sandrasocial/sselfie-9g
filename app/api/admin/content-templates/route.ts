import { NextResponse } from "next/server"
import { readFile, readdir } from "fs/promises"
import { join } from "path"
import { createServerClient } from "@/lib/supabase/server"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function GET() {
  try {
    // Check admin authentication
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const templatesDir = join(process.cwd(), "content-templates", "instagram")
    const files = await readdir(templatesDir)

    const templates: Record<string, string> = {}

    for (const file of files) {
      if (file.endsWith(".md") && file !== "README.md") {
        const filePath = join(templatesDir, file)
        const content = await readFile(filePath, "utf-8")
        templates[file] = content
      }
    }

    return NextResponse.json({ templates })
  } catch (error) {
    console.error("[v0] Error reading content templates:", error)
    return NextResponse.json(
      { error: "Failed to read templates" },
      { status: 500 }
    )
  }
}



