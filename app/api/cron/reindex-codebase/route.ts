import { NextResponse } from "next/server"
import { createCronLogger } from "@/lib/cron-logger"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

/**
 * Cron Job: Re-index Codebase
 * 
 * Weekly re-indexing of codebase for semantic search.
 * Runs every Sunday at 3 AM UTC to keep embeddings up to date.
 * 
 * Schedule: 0 3 * * 0 (Sunday 3 AM UTC)
 */
export async function GET(request: Request) {
  const cronLogger = createCronLogger("reindex-codebase")
  await cronLogger.start()

  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.error("[Reindex Codebase] Unauthorized: Invalid or missing CRON_SECRET")
        await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    } else if (!cronSecret && isProduction) {
      console.warn("[Reindex Codebase] WARNING: CRON_SECRET not set in production!")
    }

    // Check for required environment variables
    if (!process.env.UPSTASH_SEARCH_REST_URL || !process.env.UPSTASH_SEARCH_REST_TOKEN) {
      const error = new Error("Missing Upstash Vector environment variables")
      await cronLogger.error(error, { reason: "Missing env vars" })
      return NextResponse.json(
        { error: "Missing Upstash Vector environment variables" },
        { status: 500 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      const error = new Error("Missing OpenAI API key")
      await cronLogger.error(error, { reason: "Missing OPENAI_API_KEY" })
      return NextResponse.json(
        { error: "Missing OpenAI API key" },
        { status: 500 }
      )
    }

    console.log("[Reindex Codebase] Starting weekly re-indexing...")

    // Run indexing script
    const scriptStartTime = Date.now()
    const { stdout, stderr } = await execAsync("npm run index-codebase", {
      cwd: process.cwd(),
      env: process.env,
    })
    const scriptDuration = ((Date.now() - scriptStartTime) / 1000).toFixed(2)

    // Parse output to extract stats
    const indexedMatch = stdout.match(/Files indexed: (\d+)/)
    const skippedMatch = stdout.match(/Files skipped: (\d+)/)
    const errorsMatch = stdout.match(/Errors: (\d+)/)
    const durationMatch = stdout.match(/Duration: ([\d.]+)s/)

    const stats = {
      filesIndexed: indexedMatch ? parseInt(indexedMatch[1], 10) : 0,
      filesSkipped: skippedMatch ? parseInt(skippedMatch[1], 10) : 0,
      errors: errorsMatch ? parseInt(errorsMatch[1], 10) : 0,
      scriptDuration: durationMatch ? `${durationMatch[1]}s` : `${scriptDuration}s`,
    }

    if (stderr && !stderr.includes("UPSTASH_SEARCH_REST_URL")) {
      // Only warn about stderr if it's not the expected env var error
      console.warn("[Reindex Codebase] stderr:", stderr.substring(0, 500))
    }

    await cronLogger.success(stats)

    console.log(`[Reindex Codebase] Completed: ${stats.filesIndexed} files indexed, ${stats.errors} errors`)

    return NextResponse.json({
      success: true,
      stats,
      message: `Re-indexed ${stats.filesIndexed} files successfully`,
    })
  } catch (error) {
    console.error("[Reindex Codebase] Error:", error)
    await cronLogger.error(error instanceof Error ? error : new Error("Unknown error"))
    return NextResponse.json(
      {
        error: "Re-indexing failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
