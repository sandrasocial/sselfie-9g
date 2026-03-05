import { sql } from "@/lib/db/client"

type DbError = {
  code?: string
  column?: string
  message?: string
}

function isMissingUserIdConflictConstraint(error: unknown): boolean {
  const err = error as DbError
  if (err?.code === "42P10") return true
  const message = String(err?.message || "").toLowerCase()
  return message.includes("on conflict") && message.includes("no unique or exclusion constraint")
}

function isLegacyRequiredColumnError(error: unknown): boolean {
  const err = error as DbError
  if (err?.code !== "23502") return false
  const column = String(err?.column || "").toLowerCase()
  if (column === "memory_type" || column === "key" || column === "value") return true
  const message = String(err?.message || "").toLowerCase()
  return message.includes("memory_type") || message.includes('column "key"') || message.includes("column \"value\"")
}

function isDuplicateError(error: unknown): boolean {
  const err = error as DbError
  return err?.code === "23505"
}

export async function mergeMayaMemoryData(
  userId: string | number,
  memoryPatch: Record<string, unknown>,
): Promise<void> {
  const normalizedUserId = String(userId || "").trim()
  if (!normalizedUserId) {
    throw new Error("Cannot merge Maya memory without a user id")
  }

  const patchJson = JSON.stringify(memoryPatch || {})

  try {
    await sql`
      INSERT INTO maya_personal_memory (user_id, memory_data, updated_at)
      VALUES (${normalizedUserId}, ${patchJson}::jsonb, NOW())
      ON CONFLICT (user_id) DO UPDATE
      SET
        memory_data = COALESCE(maya_personal_memory.memory_data, '{}'::jsonb) || ${patchJson}::jsonb,
        updated_at = NOW()
    `
    return
  } catch (error) {
    if (!isMissingUserIdConflictConstraint(error)) {
      throw error
    }
  }

  const updatedRows = await sql`
    UPDATE maya_personal_memory
    SET
      memory_data = COALESCE(maya_personal_memory.memory_data, '{}'::jsonb) || ${patchJson}::jsonb,
      updated_at = NOW()
    WHERE user_id = ${normalizedUserId}
    RETURNING id
  `

  if (updatedRows.length > 0) {
    return
  }

  try {
    await sql`
      INSERT INTO maya_personal_memory (user_id, memory_data, updated_at)
      VALUES (${normalizedUserId}, ${patchJson}::jsonb, NOW())
    `
    return
  } catch (insertError) {
    if (isDuplicateError(insertError)) {
      await sql`
        UPDATE maya_personal_memory
        SET
          memory_data = COALESCE(maya_personal_memory.memory_data, '{}'::jsonb) || ${patchJson}::jsonb,
          updated_at = NOW()
        WHERE user_id = ${normalizedUserId}
      `
      return
    }

    if (!isLegacyRequiredColumnError(insertError)) {
      throw insertError
    }
  }

  await sql`
    INSERT INTO maya_personal_memory (user_id, memory_type, key, value, memory_data, updated_at)
    VALUES (${normalizedUserId}, 'fact', 'maya_memory', '{}', ${patchJson}::jsonb, NOW())
    ON CONFLICT (user_id, memory_type, key) DO UPDATE
    SET
      memory_data = COALESCE(maya_personal_memory.memory_data, '{}'::jsonb) || ${patchJson}::jsonb,
      value = EXCLUDED.value,
      updated_at = NOW()
  `
}
