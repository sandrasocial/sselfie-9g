// @vitest-environment node
import fs from "fs"
import path from "path"

const ROOT = process.cwd()

function extractDormantMembersQuery(contents: string): string {
  const marker = "const dormantMembers = await sql`"
  const start = contents.indexOf(marker)

  if (start === -1) {
    throw new Error("Could not find dormantMembers query")
  }

  const queryStart = start + marker.length
  const end = contents.indexOf("`", queryStart)

  if (end === -1) {
    throw new Error("Could not find closing SQL template literal for dormantMembers query")
  }

  return contents.slice(queryStart, end)
}

function extractQuery(contents: string, variableName: string): string {
  const marker = `const ${variableName} = await sql\``
  const start = contents.indexOf(marker)
  if (start === -1) throw new Error(`Could not find ${variableName} query`)
  const queryStart = start + marker.length
  const end = contents.indexOf("`", queryStart)
  if (end === -1) throw new Error(`Could not find closing SQL for ${variableName}`)
  return contents.slice(queryStart, end)
}

describe("win-back dormant member query", () => {
  it("includes ORDER BY columns in the DISTINCT select list", () => {
    const routePath = path.join(ROOT, "app/api/cron/win-back-sequence/route.ts")
    const contents = fs.readFileSync(routePath, "utf8")
    const dormantQuery = extractDormantMembersQuery(contents)

    expect(dormantQuery).toContain("SELECT DISTINCT")
    expect(dormantQuery).toContain("ORDER BY u.created_at DESC")

    const selectSectionMatch = dormantQuery.match(/SELECT\s+DISTINCT([\s\S]*?)FROM\s+users\s+u/i)
    expect(selectSectionMatch).not.toBeNull()

    const selectClause = selectSectionMatch?.[1] || ""
    expect(selectClause).toContain("u.created_at")
  })

  it.each(["day3Candidates", "day7Candidates", "day14Candidates"])(
    "excludes legacy test subscription rows from %s and live-reactivation checks",
    variableName => {
      const contents = fs.readFileSync(
        path.join(ROOT, "app/api/cron/win-back-sequence/route.ts"),
        "utf8"
      )
      const query = extractQuery(contents, variableName)

      expect(query).toMatch(/COALESCE\(s\.is_test_mode,\s*FALSE\)\s*=\s*FALSE/i)
      expect(query).toMatch(/COALESCE\(s2\.is_test_mode,\s*FALSE\)\s*=\s*FALSE/i)
    }
  )
})
