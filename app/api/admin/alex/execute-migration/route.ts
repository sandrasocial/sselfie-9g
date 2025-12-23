import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
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
    const { sql: sqlStatement, indexStatements, rollbackPlan } = body

    if (!sqlStatement || typeof sqlStatement !== 'string') {
      return NextResponse.json({ error: "SQL statement is required" }, { status: 400 })
    }

    // Security: Only allow CREATE TABLE, CREATE INDEX, ALTER TABLE, DROP TABLE statements
    const allowedPrefixes = ['CREATE TABLE', 'CREATE INDEX', 'ALTER TABLE', 'DROP TABLE']
    const sqlUpper = sqlStatement.trim().toUpperCase()
    const isAllowed = allowedPrefixes.some(prefix => sqlUpper.startsWith(prefix))
    
    if (!isAllowed) {
      return NextResponse.json({ 
        error: "Only CREATE TABLE, CREATE INDEX, ALTER TABLE, and DROP TABLE statements are allowed" 
      }, { status: 400 })
    }

    // Security: Prevent dangerous operations
    const dangerousKeywords = ['DELETE', 'TRUNCATE', 'UPDATE', 'INSERT', 'GRANT', 'REVOKE']
    const hasDangerous = dangerousKeywords.some(keyword => sqlUpper.includes(keyword))
    
    if (hasDangerous) {
      return NextResponse.json({ 
        error: "This SQL contains potentially dangerous operations and cannot be executed" 
      }, { status: 400 })
    }

    try {
      // Execute main SQL statement
      // Note: Neon serverless requires using sql.query() for dynamic SQL
      // We've already validated the SQL is safe above
      await sql.query(sqlStatement)
      console.log("[Alex] Executed SQL:", sqlStatement.substring(0, 100))

      // Execute index statements if provided
      if (indexStatements && Array.isArray(indexStatements)) {
        for (const indexSQL of indexStatements) {
          if (typeof indexSQL === 'string' && indexSQL.trim().toUpperCase().startsWith('CREATE INDEX')) {
            try {
              await sql.query(indexSQL)
              console.log("[Alex] Executed index:", indexSQL.substring(0, 100))
            } catch (indexError: any) {
              console.error("[Alex] Error executing index:", indexError)
              // Continue with other indexes even if one fails
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: "Migration executed successfully",
        rollbackPlan: rollbackPlan || null
      })
    } catch (error: any) {
      console.error("[Alex] Migration execution error:", error)
      return NextResponse.json({
        success: false,
        error: "Migration failed",
        details: error.message,
        rollbackPlan: rollbackPlan || null
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error("[Alex] Execute migration error:", error)
    return NextResponse.json(
      { error: "Failed to execute migration", details: error.message }, 
      { status: 500 }
    )
  }
}

