import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { readFile, writeFile } from "fs/promises"
import { join } from "path"
import { createBackup } from "@/lib/admin/alex-backup-manager"

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
    const { filePath, newContent, backupPath, changes, changeId, reason, testMode } = body

    if (!filePath || !newContent) {
      return NextResponse.json({ error: "filePath and newContent are required" }, { status: 400 })
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

    // Test mode - just validate, don't actually modify
    if (testMode === true) {
      try {
        const currentContent = await readFile(fullPath, 'utf-8')
        
        // Verify changes would work
        let verifiedContent = currentContent
        if (changes && Array.isArray(changes)) {
          for (const change of changes) {
            if (!verifiedContent.includes(change.find)) {
              return NextResponse.json({
                success: false,
                testMode: true,
                error: "File has changed since preview was generated",
                details: "The code to replace was not found in the current file."
              }, { status: 409 })
            }
            verifiedContent = verifiedContent.replace(change.find, change.replace)
          }
        }

        return NextResponse.json({
          success: true,
          testMode: true,
          message: "Test passed - changes would be applied successfully",
          wouldModify: true,
          filePath: filePath
        })
      } catch (error: any) {
        return NextResponse.json({
          success: false,
          testMode: true,
          error: "Test failed",
          details: error.message
        }, { status: 500 })
      }
    }

    try {
      // Create backup using backup manager
      let backup
      try {
        backup = await createBackup(fullPath, reason || 'Code modification')
        console.log("[Alex] Created backup:", backup.backupPath)
      } catch (backupError: any) {
        console.warn("[Alex] Could not create backup (non-critical):", backupError.message)
        // Continue anyway, but warn user
      }

      // Verify the file still exists and content matches expected state
      const currentContent = await readFile(fullPath, 'utf-8')
      
      // Apply changes to verify they still work
      let verifiedContent = currentContent
      if (changes && Array.isArray(changes)) {
        for (const change of changes) {
          if (!verifiedContent.includes(change.find)) {
            return NextResponse.json({
              success: false,
              error: "File has changed since preview was generated. Please regenerate the changes.",
              details: "The code to replace was not found in the current file."
            }, { status: 409 })
          }
          verifiedContent = verifiedContent.replace(change.find, change.replace)
        }
      }

      // Write new content
      await writeFile(fullPath, newContent, 'utf-8')
      
      console.log("[Alex] Modified file:", filePath)

      return NextResponse.json({
        success: true,
        message: `File modified successfully: ${filePath}`,
        filePath: filePath,
        changeId: backup?.changeId || null,
        backupPath: backup?.backupPath || backupPath || null,
        rollbackUrl: backup ? `/api/admin/alex/rollback?changeId=${backup.changeId}` : null
      })
    } catch (error: any) {
      console.error("[Alex] Error applying file changes:", error)
      return NextResponse.json({
        success: false,
        error: "Failed to apply file changes",
        details: error.message
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error("[Alex] Apply file changes error:", error)
    return NextResponse.json(
      { error: "Failed to apply file changes", details: error.message }, 
      { status: 500 }
    )
  }
}

