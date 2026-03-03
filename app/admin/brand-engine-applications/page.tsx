import { getDb } from "@/lib/db/client"
import Link from "next/link"
import BrandEngineApplicationsClient from "./applications-client"
import { ensureBrandEngineApplicationsSchema } from "@/lib/brand-engine/applications"

export const dynamic = "force-dynamic"

export default async function BrandEngineApplicationsPage() {
  try {
    const sql = getDb()

    // Check if table exists
    let tableExists = false
    try {
      await sql`SELECT 1 FROM brand_engine_applications LIMIT 1`
      tableExists = true
    } catch (error) {
      tableExists = false
    }

    if (!tableExists) {
      return (
        <div className="min-h-screen bg-stone-50 p-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-['Times_New_Roman'] mb-4">Brand Engine Applications</h1>
            <div className="bg-amber-50 border border-amber-300 p-6">
              <p className="mb-4">Database table doesn't exist yet.</p>
              <p className="text-sm text-stone-600 mb-4">Run the migration to create the applications table:</p>
              <code className="block bg-black text-white p-4 text-sm">
                curl -X POST https://sselfie.ai/api/admin/run-migration
              </code>
            </div>
          </div>
        </div>
      )
    }

    await ensureBrandEngineApplicationsSchema(sql)

    // Get all applications, ordered by newest first
    const applications = await sql`
      SELECT *
      FROM brand_engine_applications
      ORDER BY created_at DESC
    `

    return <BrandEngineApplicationsClient applications={applications as any[]} />

  } catch (error) {
    console.error("[Brand Engine Applications] Error:", error)
    return (
      <div className="min-h-screen bg-stone-50 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-['Times_New_Roman'] mb-4">Error</h1>
          <div className="bg-red-50 border border-red-300 p-6">
            <p>Failed to load applications.</p>
            <p className="text-sm text-stone-600 mt-2">{error instanceof Error ? error.message : "Unknown error"}</p>
          </div>
        </div>
      </div>
    )
  }
}
