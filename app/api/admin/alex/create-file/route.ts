import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await req.json()
    const { filePath, code } = body

    if (!filePath || !code) {
      return NextResponse.json({ error: "filePath and code are required" }, { status: 400 })
    }

    // Security: Only allow creating files in app/api directory
    if (!filePath.startsWith('app/api/') || !filePath.endsWith('/route.ts')) {
      return NextResponse.json({ 
        error: "Only API route files (app/api/*/route.ts) can be created" 
      }, { status: 400 })
    }

    // Security: Prevent directory traversal
    if (filePath.includes('..') || filePath.includes('//')) {
      return NextResponse.json({ 
        error: "Invalid file path" 
      }, { status: 400 })
    }

    // Get project root
    const projectRoot = process.cwd()
    const fullPath = join(projectRoot, filePath)

    // Ensure we're still within the project directory
    if (!fullPath.startsWith(projectRoot)) {
      return NextResponse.json({ 
        error: "Invalid file path" 
      }, { status: 400 })
    }

    try {
      // Create directory if it doesn't exist
      const dirPath = join(projectRoot, filePath.substring(0, filePath.lastIndexOf('/')))
      await mkdir(dirPath, { recursive: true })

      // Write file
      await writeFile(fullPath, code, 'utf-8')
      
      console.log("[Alex] Created file:", filePath)

      return NextResponse.json({
        success: true,
        message: `File created successfully at ${filePath}`,
        filePath: filePath
      })
    } catch (error: any) {
      console.error("[Alex] Error creating file:", error)
      return NextResponse.json({
        success: false,
        error: "Failed to create file",
        details: error.message
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error("[Alex] Create file error:", error)
    return NextResponse.json(
      { error: "Failed to create file", details: error.message }, 
      { status: 500 }
    )
  }
}

