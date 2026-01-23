import { readFile } from "fs/promises"
import path from "path"
import { MARKETING_SEGMENTS } from "@/lib/email/config"
import { getSegmentSizes, ResendSegmentSummary } from "@/lib/resend/query-segments"

export interface ActiveSequenceSegment {
  id: string
  name: string
  size: number
  key: string
}

export interface ActiveSequenceStatus {
  jobName: string
  label: string
  schedule: string | null
  nextRun: string | null
  eligibleCount: number
  active: boolean
  segments: ActiveSequenceSegment[]
}

const SEQUENCE_SEGMENTS: Array<{
  jobName: string
  label: string
  segmentKeys: Array<keyof typeof MARKETING_SEGMENTS>
}> = [
  {
    jobName: "send-blueprint-followups",
    label: "Blueprint Follow-ups",
    segmentKeys: ["blueprintDay3", "blueprintDay7", "blueprintDay14"],
  },
  {
    jobName: "nurture-sequence",
    label: "Nurture Sequence",
    segmentKeys: ["nurtureDay1", "nurtureDay3", "nurtureDay7", "nurtureDay10"],
  },
  {
    jobName: "welcome-sequence",
    label: "Welcome Sequence",
    segmentKeys: ["welcomeDay0", "welcomeDay3", "welcomeDay7"],
  },
  {
    jobName: "reactivation-campaigns",
    label: "Reactivation Campaigns",
    segmentKeys: [
      "reactivationDay0",
      "reactivationDay2",
      "reactivationDay5",
      "reactivationDay7",
      "reactivationDay10",
      "reactivationDay14",
      "reactivationDay20",
      "reactivationDay25",
    ],
  },
  {
    jobName: "reengagement-campaigns",
    label: "Reengagement Campaigns",
    segmentKeys: ["reengagementDay0", "reengagementDay7", "reengagementDay14"],
  },
  {
    jobName: "upsell-campaigns",
    label: "Upsell Campaigns",
    segmentKeys: ["upsellDay10", "upsellFreebieMembership"],
  },
  {
    jobName: "blueprint-discovery-funnel",
    label: "Blueprint Discovery Funnel",
    segmentKeys: ["discoveryDay0", "discoveryDay3", "discoveryDay5", "discoveryDay7", "discoveryDay10"],
  },
]

function humanizeSegmentKey(key: string) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/day/gi, "Day")
    .replace(/\s+/g, " ")
    .trim()
}

async function getCronScheduleMap() {
  try {
    const vercelPath = path.join(process.cwd(), "vercel.json")
    const raw = await readFile(vercelPath, "utf-8")
    const parsed = JSON.parse(raw)
    const crons = Array.isArray(parsed?.crons) ? parsed.crons : []

    const scheduleMap = new Map<string, string>()
    for (const cron of crons) {
      const cronPath = cron?.path
      const schedule = cron?.schedule
      if (typeof cronPath === "string" && typeof schedule === "string") {
        const jobName = cronPath.split("/").pop() || cronPath
        scheduleMap.set(jobName, schedule)
      }
    }
    return scheduleMap
  } catch (error) {
    console.error("[email] Failed to read vercel.json for cron schedules:", error)
    return new Map<string, string>()
  }
}

function getNextRun(schedule: string | null): string | null {
  if (!schedule) return null
  const parts = schedule.trim().split(/\s+/)
  if (parts.length !== 5) return null

  const [minutePart, hourPart] = parts
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), 0, 0))

  const minuteEveryMatch = minutePart.match(/^\*\/(\d+)$/)
  if (minuteEveryMatch && hourPart === "*") {
    const interval = Number(minuteEveryMatch[1])
    if (!Number.isFinite(interval) || interval <= 0) return null

    const currentMinute = next.getUTCMinutes()
    const remainder = currentMinute % interval
    const delta = remainder === 0 ? interval : interval - remainder
    next.setUTCMinutes(currentMinute + delta)
    return next.toISOString()
  }

  const minute = Number(minutePart)
  const hour = hourPart === "*" ? null : Number(hourPart)

  if (!Number.isFinite(minute)) return null

  if (hour === null) {
    const currentMinute = next.getUTCMinutes()
    if (currentMinute >= minute) {
      next.setUTCHours(next.getUTCHours() + 1)
    }
    next.setUTCMinutes(minute)
    return next.toISOString()
  }

  if (!Number.isFinite(hour)) return null

  next.setUTCHours(hour, minute, 0, 0)
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1)
  }
  return next.toISOString()
}

function buildSegmentInfo(
  key: keyof typeof MARKETING_SEGMENTS,
  segmentSizes: ResendSegmentSummary[],
): ActiveSequenceSegment {
  const id = MARKETING_SEGMENTS[key] || ""
  const match = id ? segmentSizes.find((segment) => segment.id === id) : undefined

  return {
    id,
    name: match?.name || humanizeSegmentKey(key),
    size: match?.size || 0,
    key,
  }
}

export async function getActiveSequenceStatus(
  segmentSizes?: ResendSegmentSummary[],
): Promise<ActiveSequenceStatus[]> {
  const segments = segmentSizes || (await getSegmentSizes())
  const scheduleMap = await getCronScheduleMap()

  return SEQUENCE_SEGMENTS.map((sequence) => {
    const schedule = scheduleMap.get(sequence.jobName) || null
    const segmentInfo = sequence.segmentKeys.map((key) => buildSegmentInfo(key, segments))
    const eligibleCount = segmentInfo.reduce((total, segment) => total + (segment.id ? segment.size : 0), 0)

    return {
      jobName: sequence.jobName,
      label: sequence.label,
      schedule,
      nextRun: getNextRun(schedule),
      eligibleCount,
      active: eligibleCount > 0,
      segments: segmentInfo,
    }
  })
}
