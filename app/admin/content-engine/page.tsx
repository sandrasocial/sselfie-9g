import { promises as fs } from "fs"
import path from "path"
import { AdminNav } from "@/components/admin/admin-nav"
import { ContentEnginePlanner, type PlannerPost, type SourceDoc } from "@/components/admin/content-engine-planner"

export const dynamic = "force-dynamic"

const CANDIDATE_DIRS = [
  "/Users/MD760HA/Desktop/SSELFIE-Content-Engine",
  path.join(process.cwd(), "docs", "content-engine"),
]

const SOURCE_FILES = [
  { fileName: "30-day-calendar.md", title: "30-Day Calendar" },
  { fileName: "30-day-instagram-strategy.md", title: "30-Day Instagram Strategy" },
  { fileName: "20-reel-concepts.md", title: "20 Reel Concepts" },
  { fileName: "10-carousel-concepts.md", title: "10 Carousel Concepts" },
  { fileName: "caption-templates.md", title: "Caption Templates" },
  { fileName: "testing-plan-and-fast-wins.md", title: "Testing Plan + Fast Wins" },
  { fileName: "30-DAY-STRATEGY-README.md", title: "Strategy README" },
]

function parseField(block: string, field: string) {
  const pattern = new RegExp(`\\*\\*${field}:\\*\\*\\s*(.+)`, "i")
  const match = block.match(pattern)
  return match?.[1]?.trim() ?? ""
}

function parseCalendarToPosts(calendarMarkdown: string): PlannerPost[] {
  const chunks = calendarMarkdown.split(/^###\s+/m).slice(1)

  return chunks
    .map((chunk, index) => {
      const [headerLine, ...rest] = chunk.split("\n")
      const block = rest.join("\n")
      const [dateLabel = "", formatLabel = "POST"] = headerLine.split("|").map((part) => part.trim())

      const hook = parseField(block, "Hook")
      const pillar = parseField(block, "Pillar")
      const cta = parseField(block, "CTA")
      const production = parseField(block, "Production")
      const postingTime = parseField(block, "Posting Time")
      const captionTheme = parseField(block, "Caption Theme")

      return {
        id: `strategy-${index + 1}`,
        dayLabel: dateLabel,
        format: formatLabel,
        pillar: pillar || "Educational",
        hook: hook || "Refine hook from strategy",
        cta: cta || "Invite comment or save",
        productionNotes: production || "Use available brand assets",
        postingTime: postingTime || "TBD",
        captionTheme: captionTheme || "",
        status: index < 5 ? "ready" : "draft",
      } satisfies PlannerPost
    })
    .slice(0, 30)
}

async function resolveSourceDir() {
  for (const dirPath of CANDIDATE_DIRS) {
    try {
      const stat = await fs.stat(dirPath)
      if (stat.isDirectory()) {
        return dirPath
      }
    } catch {
      // keep searching candidate dirs
    }
  }
  return null
}

async function buildSourceDocs(sourceDir: string | null): Promise<SourceDoc[]> {
  return Promise.all(
    SOURCE_FILES.map(async ({ fileName, title }) => {
      const absolutePath = sourceDir ? path.join(sourceDir, fileName) : ""

      if (!sourceDir) {
        return {
          title,
          fileName,
          absolutePath: "",
          found: false,
          preview: "Source folder not available",
        }
      }

      try {
        const raw = await fs.readFile(absolutePath, "utf8")
        const preview = raw
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 180)

        return {
          title,
          fileName,
          absolutePath,
          found: true,
          preview,
          fullContent: raw,
        }
      } catch {
        return {
          title,
          fileName,
          absolutePath,
          found: false,
          preview: "File not found",
          fullContent: "",
        }
      }
    }),
  )
}

async function buildInitialPosts(sourceDir: string | null) {
  if (!sourceDir) return []

  try {
    const calendarPath = path.join(sourceDir, "30-day-calendar.md")
    const calendarMarkdown = await fs.readFile(calendarPath, "utf8")
    return parseCalendarToPosts(calendarMarkdown)
  } catch {
    return []
  }
}

export default async function AdminContentEnginePage() {
  const sourceDir = await resolveSourceDir()
  const sourceDocs = await buildSourceDocs(sourceDir)
  const parsedPosts = await buildInitialPosts(sourceDir)

  const initialPosts: PlannerPost[] =
    parsedPosts.length > 0
      ? parsedPosts
      : [
          {
            id: "fallback-1",
            dayLabel: "MON",
            format: "CAROUSEL",
            pillar: "Educational",
            hook: "5 selfie framing tweaks that make you look instantly premium",
            cta: "Save this and send it to a business friend",
            productionNotes: "Use 5 image examples from current gallery",
            postingTime: "08:00",
            captionTheme: "Teach then invite a micro action",
            status: "ready",
          },
          {
            id: "fallback-2",
            dayLabel: "TUE",
            format: "REEL",
            pillar: "Story",
            hook: "I built this from EUR12, two kids, and no plan",
            cta: "Comment REBUILD and I will send my checklist",
            productionNotes: "Use one talking-head clip and one b-roll transition",
            postingTime: "12:00",
            captionTheme: "Origin story with practical takeaway",
            status: "draft",
          },
        ]

  return (
    <div className="min-h-screen bg-[#050505] text-stone-100">
      <AdminNav />
      <ContentEnginePlanner initialPosts={initialPosts} sourceDocs={sourceDocs} sourceDirectory={sourceDir} />
    </div>
  )
}
