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
})
