// @vitest-environment node
import fs from "fs"
import path from "path"

const ROOT = process.cwd()

type QueryMarker = {
  marker: string
  name: string
}

function extractQuery(contents: string, marker: string): string {
  const start = contents.indexOf(marker)

  if (start === -1) {
    throw new Error(`Could not find query marker: ${marker}`)
  }

  const queryStart = start + marker.length
  const end = contents.indexOf("`", queryStart)

  if (end === -1) {
    throw new Error(`Could not find closing SQL template literal for marker: ${marker}`)
  }

  return contents.slice(queryStart, end)
}

describe("onboarding sequence DISTINCT query safety", () => {
  it("includes ORDER BY columns in DISTINCT select lists", () => {
    const routePath = path.join(ROOT, "app/api/cron/onboarding-sequence/route.ts")
    const contents = fs.readFileSync(routePath, "utf8")

    const markers: QueryMarker[] = [
      {
        marker: "const firstGenNudgeUsers = await sql`",
        name: "firstGenNudgeUsers",
      },
      {
        marker: "const postActivationUsers = await sql`",
        name: "postActivationUsers",
      },
      {
        marker: "const freeWelcomeUsers = await sql`",
        name: "freeWelcomeUsers",
      },
    ]

    for (const queryMarker of markers) {
      const query = extractQuery(contents, queryMarker.marker)

      expect(query).toContain("SELECT DISTINCT")
      expect(query).toContain("ORDER BY u.created_at DESC")

      const selectSectionMatch = query.match(/SELECT\s+DISTINCT([\s\S]*?)FROM\s+users\s+u/i)
      expect(selectSectionMatch, `${queryMarker.name} select clause should parse`).not.toBeNull()

      const selectClause = selectSectionMatch?.[1] || ""
      expect(selectClause, `${queryMarker.name} should project u.created_at`).toContain("u.created_at")
    }
  })
})
