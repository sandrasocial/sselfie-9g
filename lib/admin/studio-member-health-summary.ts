export type StudioMemberHealthMember = {
  id: string
  email: string
  memberSince: string | null
  trainingStarted: boolean
  trainingCompleted: boolean
  trainingCompletedAt: string | null
  classicGenerations: number
  quickGenerations: number
  proGenerations: number
  aiGenerations: number
  lastGeneratedAt: string | null
  isSmokeTest: boolean
}

export type StudioMemberHealthReport = {
  totalMembers: number
  trainingStarted: number
  trainingCompleted: number
  classicGenerators: number
  quickPhotoGenerators: number
  proGenerators: number
  everGenerated: number
  neverGenerated: number
  neverGeneratedRealMembers: number
  neverGeneratedMembers: StudioMemberHealthMember[]
  generatedMembers: StudioMemberHealthMember[]
  source: "subscriptions + user_models + generated_images + ai_images"
}

export type StudioMemberHealthRow = {
  id: string
  email: string
  member_since: Date | string | null
  training_started: boolean | null
  training_completed: boolean | null
  training_completed_at: Date | string | null
  classic_generations: number | string | null
  quick_generations: number | string | null
  pro_generations: number | string | null
  ai_generations: number | string | null
  last_generated_at: Date | string | null
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function asNumber(value: number | string | null | undefined): number {
  return Number(value || 0)
}

function isSmokeTestEmail(email: string): boolean {
  return /@sselfie-smoke\.test$/i.test(email)
}

export function summarizeStudioMemberHealth(rows: StudioMemberHealthRow[]): StudioMemberHealthReport {
  const members: StudioMemberHealthMember[] = rows.map((row) => {
    const classicGenerations = asNumber(row.classic_generations)
    const aiGenerations = asNumber(row.ai_generations)

    return {
      id: row.id,
      email: row.email,
      memberSince: toIso(row.member_since),
      trainingStarted: Boolean(row.training_started),
      trainingCompleted: Boolean(row.training_completed),
      trainingCompletedAt: toIso(row.training_completed_at),
      classicGenerations,
      quickGenerations: asNumber(row.quick_generations),
      proGenerations: asNumber(row.pro_generations),
      aiGenerations,
      lastGeneratedAt: toIso(row.last_generated_at),
      isSmokeTest: isSmokeTestEmail(row.email),
    }
  })

  const generatedMembers = members.filter((member) => member.classicGenerations + member.aiGenerations > 0)
  const neverGeneratedMembers = members.filter((member) => member.classicGenerations + member.aiGenerations === 0)

  return {
    totalMembers: members.length,
    trainingStarted: members.filter((member) => member.trainingStarted).length,
    trainingCompleted: members.filter((member) => member.trainingCompleted).length,
    classicGenerators: members.filter((member) => member.classicGenerations > 0).length,
    quickPhotoGenerators: members.filter((member) => member.quickGenerations > 0).length,
    proGenerators: members.filter((member) => member.proGenerations > 0).length,
    everGenerated: generatedMembers.length,
    neverGenerated: neverGeneratedMembers.length,
    neverGeneratedRealMembers: neverGeneratedMembers.filter((member) => !member.isSmokeTest).length,
    neverGeneratedMembers,
    generatedMembers,
    source: "subscriptions + user_models + generated_images + ai_images",
  }
}
